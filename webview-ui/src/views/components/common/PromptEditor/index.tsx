import { Extension } from "@tiptap/core"
import Placeholder from "@tiptap/extension-placeholder"
import { PluginKey } from "@tiptap/pm/state"
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Suggestion from "@tiptap/suggestion"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { useSelector } from "react-redux"
import tippy from "tippy.js"
import MentionList from "./components/MentionMenu"
import { ContextMention } from "./extensions/ContextMention"
import { IPromptEditorProps, MenuNode_t, PromptEditorRef } from "./types"

import { selectCurrentKnowledgebaseID, selectKnowledgebaseState } from "@/views/lib/store/knowledgebasesSlice"

import useAutoCreateKnowledgebase from "@/views/hooks/useAutoCreateKnowledgebase"
import { store } from "@/views/lib/store"
import { selectIsUploadingImaage } from "@/views/lib/store/chatSlice"

const PromptEditor = forwardRef<PromptEditorRef, IPromptEditorProps>((props, ref) => {
   const MentionPluginKey = new PluginKey("mention")
   const [contextItems, setContextItems] = useState<MenuNode_t[]>(props.initialContext || [])
   const currentKBID = selectCurrentKnowledgebaseID(store.getState())

   const { indexCodebase } = useAutoCreateKnowledgebase()
   const { isAutoIndexingCodebase } = useSelector(selectKnowledgebaseState)
   const isUploadingImage = useSelector(selectIsUploadingImaage)
   const isUploadingImageRef = useRef(false)
   /**
    * Keep a ref to the latest value of `contextItems` so that we can reliably
    * reference it inside callbacks that are created once (e.g. `onUpdate`).
    */
   const contextItemsRef = useRef<MenuNode_t[]>(contextItems)

   useEffect(() => {
      contextItemsRef.current = contextItems
   }, [contextItems])
   useEffect(() => {
      isUploadingImageRef.current = isUploadingImage
   }, [isUploadingImage])

   useEffect(() => {
      if (currentKBID) {
         setContextItems((prev) => {
            return prev.map((item) => {
               return item.id === "codebase"
                  ? { ...item, meta: { type: "codebase", kbid: currentKBID, content: "" } }
                  : item
            }) as MenuNode_t[]
         })
      }
   }, [currentKBID])
   const KeyPressExtension = Extension.create({
      name: "customKeyPressExtension",
      priority: 101, // higher priority to override default Enter behavior
      addKeyboardShortcuts() {
         return {
            Enter: () => {
               const mentionState = MentionPluginKey.getState(this.editor.state)
               if (mentionState?.active) {
                  return false // let the suggestion plugin handle it
               }
               if (isUploadingImageRef.current) {
                  return true
               }
               if (props.readonly) return false
               props.onSend?.()
               return true // prevent default Enter behavior
            },
         }
      },
   })

   /**
    * Adds an item to the context list, ensuring no duplicates based on the `id`.
    */
   const handleItemAdd = (item: MenuNode_t) => {
      if (item.id === "codebase" && !currentKBID) {
         indexCodebase()
      }
      setContextItems((prev) => (prev.find((i) => i.id === item.id) ? prev : [...prev, item]))
      props.onItemAdd?.(item)
   }
   const handleUpdateItem = (item: MenuNode_t) => {
      setContextItems((prev) => {
         return prev.map((i) => (i.id === item.id ? item : i))
      })
   }
   const handleItemRemove = (id: string) => {
      setContextItems((prev) => prev.filter((item) => item.id !== id))
      props.onItemRemove?.(id)
   }

   const editor = useEditor({
      editorProps: {
         attributes: {
            class: "prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-4 focus:outline-none break-all",
         },
      },
      extensions: [
         StarterKit,
         Placeholder.configure({
            placeholder: "Ask CodeMate anything about your code...",
         }),
         ContextMention.configure({ onItemRemove: handleItemRemove }),
         KeyPressExtension,
         Extension.create({
            name: "mentionSuggestion",
            addProseMirrorPlugins() {
               return [
                  Suggestion({
                     editor: this.editor,
                     char: "@",
                     pluginKey: MentionPluginKey,
                     command: ({ editor, range, props: mentionProps }) => {
                        handleItemAdd(mentionProps as MenuNode_t)
                        // @ts-ignore
                        const { id, name, meta } = mentionProps as MenuNode_t

                        const finalID =
                           "kbid" in meta && id !== meta.kbid
                              ? JSON.stringify({ id: id, kbid: meta.kbid })
                              : id
                        editor
                           .chain()
                           .focus()
                           .insertContentAt(range, {
                              type: "contextMention",
                              attrs: { id: finalID, name, type: meta.type, content: "" },
                           })
                           .run()
                     },
                     items: async ({ query }) => {
                        return await props.menuBuilder(query)
                     },
                     render: () => {
                        let component: ReactRenderer
                        let popup: any

                        return {
                           onStart: (renderProps) => {
                              component = new ReactRenderer(MentionList, {
                                 props: { ...renderProps, command: (item) => renderProps.command(item) },
                                 editor: renderProps.editor,
                              })

                              popup = tippy("body", {
                                 getReferenceClientRect: renderProps.clientRect,
                                 appendTo: () => document.body,
                                 content: component.element,
                                 showOnCreate: true,
                                 interactive: true,
                                 trigger: "manual",
                                 placement: "bottom-start",
                              })
                           },
                           onUpdate(updateProps) {
                              component.updateProps({
                                 ...updateProps,
                                 command: (item) => updateProps.command(item),
                              })
                              popup[0].setProps({
                                 getReferenceClientRect: updateProps.clientRect,
                              })
                           },
                           onKeyDown(keydownProps) {
                              if (keydownProps.event.key === "Escape") {
                                 popup[0].hide()
                                 return true
                              }
                              return (component.ref as any)?.onKeyDown(keydownProps)
                           },
                           onExit() {
                              popup[0].destroy()
                              component.destroy()
                           },
                        }
                     },
                  }),
               ]
            },
         }),
      ],
      content: props.initialContent,
      editable: !props.readonly,
      onUpdate: ({ editor }) => {
         // Notify external change handler first.
         props.onChange?.(serializeContent())

         // ------------------------------------------------------------------
         // Synchronise `contextItems` with the actual mentions present in the
         // editor document. This guarantees that when a mention node is
         // removed through selection + delete (or any other means that doesn't
         // trigger our custom `Backspace` shortcut), the pill & state are
         // updated accordingly. It also implicitly deduplicates the list.
         // ------------------------------------------------------------------

         const itemsInDoc: MenuNode_t[] = []
         const idsInDoc = new Set<string>()

         editor.state.doc.descendants((node) => {
            if (node.type.name === "contextMention") {
               const { id, name, type, content: nodeContent } = node.attrs

               if (idsInDoc.has(id)) return // avoid duplicates while traversing

               idsInDoc.add(id)

               // Try to find a richer existing representation (with icon, etc.)
               const existing = contextItemsRef.current.find((i) => i.id === id)

               if (existing) {
                  itemsInDoc.push(existing)
               } else {
                  // Fallback – we may lose the icon, but state stays consistent
                  let parsedMeta: any = {}
                  try {
                     parsedMeta = JSON.parse(nodeContent || "{}")
                  } catch {
                     parsedMeta = {}
                  }

                  itemsInDoc.push({
                     id,
                     name,
                     icon: existing?.icon ?? null,
                     type: "item",
                     meta: { type, ...parsedMeta },
                  })
               }
            }
         })

         // Merge in non-mention items that should persist (e.g., image attachments)
         const persistentItems: MenuNode_t[] = []
         for (const item of contextItemsRef.current) {
            if (item.type === "item" && (item as any).meta?.type === "image") {
               if (!idsInDoc.has(item.id)) persistentItems.push(item)
            }
         }

         const merged: MenuNode_t[] = []
         const seen = new Set<string>()
         for (const it of [...itemsInDoc, ...persistentItems]) {
            if (seen.has(it.id)) continue
            seen.add(it.id)
            merged.push(it)
         }

         // Only update state if there is any difference to avoid needless re-renders
         setContextItems((prev) => {
            if (prev.length === merged.length && prev.every((item) => seen.has(item.id))) {
               return prev
            }
            return merged
         })
      },
   })

   const serializeContent = useCallback(() => {
      if (!editor) return ""
      const { doc } = editor.state
      let content = ""
      doc.descendants((node) => {
         if (node.type.name === "contextMention") {
            const { id, name, type, content: nodeContent } = node.attrs
            content += `<cm:context>`
            content += `<cm:context:name>${name}</cm:context:name>`
            content += `<cm:context:type>${type}</cm:context:type>`
            content += `<cm:context:id>${id}</cm:context:id>`
            content += `<cm:context:content>${nodeContent}</cm:context:content>`
            content += `</cm:context>`
         } else if (node.isText) {
            content += node.text
         }
      })
      return content
   }, [editor])

   const deserializeContent = (html: string) => {
      if (!editor) return

      const parser = new DOMParser()
      const doc = parser.parseFromString(`<div>${html}</div>`, "text/html")
      const newContent: any[] = []

      doc.body.firstChild?.childNodes.forEach((node) => {
         if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            if (element.tagName.toLowerCase() === "cm:context") {
               let id = ""
               let name = ""
               let type = ""
               let ctxContent = ""

               element.childNodes.forEach((child) => {
                  if (child.nodeType === Node.ELEMENT_NODE) {
                     const tag = (child as Element).tagName.toLowerCase()
                     switch (tag) {
                        case "cm:context:id":
                           id = child.textContent || ""
                           break
                        case "cm:context:name":
                           name = child.textContent || ""
                           break
                        case "cm:context:type":
                           type = child.textContent || ""
                           break
                        case "cm:context:content":
                           ctxContent = child.textContent || ""
                           break
                        default:
                           break
                     }
                  }
               })

               newContent.push({
                  type: "contextMention",
                  attrs: { id, name, type, content: ctxContent },
               })
            } else {
               newContent.push({
                  type: "text",
                  text: element.textContent || "",
               })
            }
         } else if (node.nodeType === Node.TEXT_NODE) {
            newContent.push({
               type: "text",
               text: node.textContent || "",
            })
         }
      })

      editor.commands.setContent({ type: "doc", content: newContent }, true)
   }

   useImperativeHandle(ref, () => ({
      getContent: serializeContent,
      getContextItems: () => contextItemsRef.current,
      setContextItems: (items: MenuNode_t[]) => {
         setContextItems(items)
      },
      addContextItem: handleItemAdd,
      updateContextItem: handleUpdateItem,
      setContent: (content) => deserializeContent(content),
      clearContent: () => {
         editor?.commands.clearContent()
         setContextItems([])
      },
      focus: () => editor?.commands.focus(),
      blur: () => editor?.commands.blur(),
      hasContent: () => editor?.getText().trim().length > 0,
   }))

   return (
      <div className="w-full overflow-hidden">
         {!!contextItems.length && props.contextItemsRenderer?.(contextItems, handleItemRemove)}
         {isAutoIndexingCodebase && contextItems.some((item) => item.id === "codebase") && (
            <div className="text-xs text-white/60 animate-pulse px-4 mt-2 -mb-1">Indexing codebase</div>
         )}
         <EditorContent editor={editor} />
      </div>
   )
})

export default PromptEditor

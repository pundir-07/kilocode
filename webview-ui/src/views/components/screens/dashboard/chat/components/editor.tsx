import { getFolderPathsRecursive } from "@/common/api/ws/socket"
import { DEFAULT_CHAT_MODEL, NEW_CHAT_ID_PREFIX } from "@/common/core/constants"
import { Utils } from "@/common/core/utils"
import { ChatMode } from "@/common/types/chat"
import { KnowledgebaseStatus } from "@/common/types/knowledgebase"
import PromptEditor from "@/views/components/common/PromptEditor"
import { MenuNode_t, PromptEditorRef } from "@/views/components/common/PromptEditor/types"
import { useChatStream } from "@/views/hooks/useChatStream"
import { store } from "@/views/lib/store"
import {
   selectChatMode,
   selectChatModel,
   selectChatWebSearchEnabled,
   selectCurrentChatID,
   selectNextFollowup,
   setChatModel,
   setChatWebSearchEnabled,
   setNextFollowup,
} from "@/views/lib/store/chatSlice"
import { selectCustomInstructions } from "@/views/lib/store/customInstructionsSlice"
import { selectEcoModeDependenciesInstalled } from "@/views/lib/store/dependenciesSlice"
import { selectSettings, selectWorkspacePath } from "@/views/lib/store/globalSlice"
import {
   selectAllKnowledgebases,
   selectCurrentKnowledgebaseID,
   selectKnowledgebaseState,
} from "@/views/lib/store/knowledgebasesSlice"
import {
   AlertCircle,
   AlertTriangle,
   Book,
   CircleAlert,
   Code2,
   File,
   Folder,
   GitBranch,
   Globe,
   Loader2,
   LucideAppWindowMac,
   Package,
   Terminal,
   TextCursorInput,
   X,
} from "lucide-react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

const CONTEXT_ITEM_ICONS = {
   file: <File className="w-4 h-4" />,
   folder: <Folder className="w-4 h-4" />,
   codebase: <Code2 className="w-4 h-4" />,
   terminal: <Terminal className="w-4 h-4" />,
   errors: <AlertCircle className="w-4 h-4 text-red-500" />,
   warnings: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
   commit: <GitBranch className="w-4 h-4" />,
   docs: <Book className="w-4 h-4" />,
   git: <GitBranch className="w-4 h-4" />,
   swagger: <LucideAppWindowMac className="w-4 h-4" />,
   web_search: <Globe className="w-4 h-4" />,
   git_diff: <GitBranch className="w-4 h-4" />,
   pr: <GitBranch className="w-4 h-4" />,
   knowledgebase: <Book className="w-4 h-4" />,
   group: <Folder className="w-4 h-4" />,
}

// Add this export interface for the ref methods
export interface ChatEditorRef {
   send: () => Promise<void>
   hasContent: () => boolean
   addItem: (item: MenuNode_t) => void
   updateItem: (item: MenuNode_t) => void
   getContextItems: () => MenuNode_t[]
}

namespace Components {
   export function EcoModeDependenciesWarning() {
      const navigate = useNavigate()

      return (
         <div className="p-4 text-center">
            <p className="text-[var(--vscode-inputValidation-warningForeground)] mb-3 text-sm">
               Eco Mode requires additional dependencies to be installed for optimal performance
            </p>
            <button
               title="Install Eco Mode Dependencies"
               onClick={() => navigate("/dependencies")}
               className="w-full flex items-center justify-center gap-2 p-2.5 rounded-md bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors"
            >
               <Package className="w-5 h-5" />
               <span className="text-sm font-medium">Install Eco Mode Dependencies</span>
            </button>
         </div>
      )
   }
}

namespace Algorithms {
   // Files
   export const getFilesList = () => {
      return Utils.withTimeout<{ name: string; path: string; description: string }[]>(
         new Promise((resolve) => {
            const handleMessage = (event: MessageEvent) => {
               if (event.data.type === "fileList") {
                  window.removeEventListener("message", handleMessage)
                  resolve(event.data.value)
               }
            }
            window.addEventListener("message", handleMessage)
            tsvscode.postMessage({ type: "get_file_list" })
         }),
         5000,
         () => []
      )
   }

   // Folders
   export const getFolderList = (target: string) => {
      return Utils.withTimeout<{ name: string; path: string }[]>(
         new Promise(async (resolve) => {
            const folders = await getFolderPathsRecursive(target)
            resolve(
               folders.map((item) => ({
                  name: item.name,
                  path: item.path,
               }))
            )
         }),
         5000,
         () => []
      )
   }

   // Git Commits
   export const getGitCommits = () => {
      return Utils.withTimeout<{ hash: string; message: string }[]>(
         new Promise(async (resolve) => {
            const handleMessage = (event: MessageEvent) => {
               if (event.data.type === "gitCommits") {
                  window.removeEventListener("message", handleMessage)
                  resolve(event.data.value)
               }
            }
            window.addEventListener("message", handleMessage)
            tsvscode.postMessage({ type: "get_git_commits" })
         }),
         5000,
         () => []
      )
   }
   // Pull Requests
   export const getPrList = () => {
      return Utils.withTimeout<{ id: string; title: string }[]>(
         new Promise((resolve) => {
            const handleMessage = (event: MessageEvent) => {
               if (event.data.type === "prList") {
                  window.removeEventListener("message", handleMessage)
                  resolve(event.data.value)
               }
            }
            window.addEventListener("message", handleMessage)
            tsvscode.postMessage({ type: "get_pr_list" })
         }),
         5000,
         () => []
      )
   }

   // Terminals
   export const getTerminalList = () => {
      return Utils.withTimeout<{ name: string }[]>(
         new Promise((resolve) => {
            const handleMessage = (event: MessageEvent) => {
               if (event.data.type === "terminals_list") {
                  window.removeEventListener("message", handleMessage)
                  resolve(event.data.value)
               }
            }
            window.addEventListener("message", handleMessage)
            tsvscode.postMessage({ type: "get_terminals_list" })
         }),
         5000,
         () => []
      )
   }
}

const ChatEditor = forwardRef<ChatEditorRef, any>((props, ref) => {
   const dispatch = useDispatch()
   const editorRef = useRef<PromptEditorRef>(null)
   const isInternalUpdate = useRef(false)

   const chatID = useSelector(selectCurrentChatID)
   const settings = useSelector(selectSettings)
   const currentWorkspacePath = useSelector(selectWorkspacePath)
   const ecoModeDependenciesInstalled = useSelector(selectEcoModeDependenciesInstalled)
   const chatMode = useSelector(selectChatMode)
   const selectedModel = useSelector(selectChatModel)
   const isNewChat = useMemo(() => !chatID || (chatID && chatID.startsWith(NEW_CHAT_ID_PREFIX)), [chatID])
   const webSearchEnabled = useSelector(selectChatWebSearchEnabled)
   const { isAutoIndexingCodebase } = useSelector(selectKnowledgebaseState)
   const customInstructions = useSelector(selectCustomInstructions)

   const handleSend = useChatStream({
      getEditorContent: () => editorRef.current?.getContent() || "",
      setEditorContent: (content: string) => editorRef.current?.setContent(content),
      getContextItems: () => editorRef.current?.getContextItems() || [],
      setContextItems: (items: MenuNode_t[]) => editorRef.current?.setContextItems(items),
   })

   const handleItemAdd = useCallback(async (item: MenuNode_t) => {
      // If the item has a contentFetcher, fetch the content and update the meta
      if (item.type === "item" && "contentFetcher" in item.meta) {
         try {
            const content = await item.meta.contentFetcher()
            // Update the item's meta with the fetched content
            ;(item.meta as any).content = content
            // Remove the contentFetcher to avoid serialization issues
            delete item.meta.contentFetcher
         } catch (error) {
            console.error("Error fetching content for item:", item.id, error)
            ;(item.meta as any).content = "Error fetching content"
         }
      }
   }, [])

   // Expose the send function through the ref
   useImperativeHandle(ref, () => ({
      send: handleSend,
      hasContent: () => editorRef.current?.hasContent() || false,
      addItem: (item: MenuNode_t) => editorRef.current?.addContextItem(item),
      updateItem: (item: MenuNode_t) => editorRef.current?.updateContextItem(item),
      getContextItems: editorRef.current?.getContextItems,
   }))

   const handleChange = (content: string) => {
      isInternalUpdate.current = true

      // Detect presence of web-search mention to toggle state
      const hasWebSearchMention = content.includes(`data-id="web-search"`)

      if (hasWebSearchMention && !webSearchEnabled) {
         dispatch(setChatWebSearchEnabled({ enabled: true }))
      }
   }

   // Track & execute followups
   const nextFollowup = useSelector(selectNextFollowup)
   useEffect(() => {
      if (!nextFollowup || !editorRef.current) return

      // Set the followup in the editor and cleanup the state
      editorRef.current.setContent(nextFollowup)
      dispatch(setNextFollowup({ content: "" }))

      // Send the message
      const sendButton = document.getElementById("chat-send-button")
      setTimeout(() => sendButton?.click(), 100)
   }, [dispatch, nextFollowup, editorRef.current])

   const menuBuilder = useCallback(
      async (query?: string): Promise<MenuNode_t[]> => {
         const plan = store.getState().globalState.plan
         const workspacePath = selectWorkspacePath(store.getState())
         const currentKBID = selectCurrentKnowledgebaseID(store.getState())

         return (
            [
               {
                  id: "files",
                  name: "Files",
                  icon: <File className="w-4 h-4" />,
                  type: "menu",
                  children: async () => {
                     const fileList = await Algorithms.getFilesList()
                     return fileList.map((file) => ({
                        id: file.path,
                        name: file.name,
                        icon: <File className="w-4 h-4 min-w-4 min-h-4" />,
                        type: "item",
                        meta: {
                           type: "file",
                           path: file.path,
                           name: file.name,
                        },
                     }))
                  },
                  disabled: !workspacePath,
               },
               {
                  id: "folders",
                  name: "Folders",
                  icon: <Folder className="w-4 h-4" />,
                  type: "menu",
                  children: async () => {
                     if (!workspacePath) return []

                     const folderList = await Algorithms.getFolderList(workspacePath)
                     return folderList.map((folder) => ({
                        id: folder.path,
                        name: folder.name,
                        icon: <Folder className="w-4 h-4 min-w-4 min-h-4" />,
                        type: "item",
                        meta: {
                           type: "folder",
                           path: folder.path,
                           name: folder.name,
                           kbid: currentKBID,
                        },
                     }))
                  },
                  disabled: !workspacePath || !currentKBID,
               },
               {
                  id: "git",
                  name: "Git",
                  icon: <GitBranch className="w-4 h-4 min-w-4 min-h-4" />,
                  type: "menu",
                  disabled: !workspacePath || (plan && !plan.base.limits.access.context.git),
                  children: async () => {
                     return [
                        {
                           id: "current-diff",
                           name: "Current Diff",
                           icon: <GitBranch className="w-4 h-4 min-w-4 min-h-4" />,
                           type: "item",
                           meta: {
                              type: "commit",
                              name: "Current changes",
                              contentFetcher: async () => {
                                 return new Promise<string>((resolve) => {
                                    const handleMessage = (event: MessageEvent) => {
                                       if (event.data.type === "currentDiff") {
                                          window.removeEventListener("message", handleMessage)
                                          resolve(event.data.value)
                                       }
                                    }
                                    window.addEventListener("message", handleMessage)
                                    tsvscode.postMessage({ type: "get_current_diff" })
                                 })
                              },
                           },
                        },
                        {
                           id: "commits",
                           name: "Commits",
                           icon: <GitBranch className="w-4 h-4 min-w-4 min-h-4" />,
                           type: "menu",
                           children: async () => {
                              const gitCommits = await Algorithms.getGitCommits()
                              return gitCommits.map((commit) => ({
                                 id: commit.hash,
                                 name: `${commit.hash.slice(0, 7)} ${commit.message}`,
                                 icon: <GitBranch className="w-4 h-4" />,
                                 type: "item",
                                 meta: {
                                    type: "commit",
                                    hash: commit.hash,
                                    name: `Commit ${commit.hash.slice(0, 7)} - ${commit.message}`,
                                    kbid: currentKBID,
                                    contentFetcher: async () => {
                                       return new Promise<string>((resolve) => {
                                          const handleMessage = (event: MessageEvent) => {
                                             if (
                                                event.data.type === "commitDiff" &&
                                                event.data.hash === commit.hash
                                             ) {
                                                window.removeEventListener("message", handleMessage)
                                                resolve(event.data.value.diff)
                                             }
                                          }
                                          window.addEventListener("message", handleMessage)
                                          tsvscode.postMessage({
                                             type: "get_commit_diff",
                                             value: commit.hash,
                                          })
                                       })
                                    },
                                 },
                              }))
                           },
                        },
                        {
                           id: "prs",
                           name: "Pull Requests",
                           icon: <GitBranch className="w-4 h-4 min-w-4 min-h-4" />,
                           type: "menu",
                           children: async () => {
                              const prList = await Algorithms.getPrList()
                              return prList.map((pr) => ({
                                 id: pr.id,
                                 name: `#${pr.id} ${pr.title}`,
                                 icon: <GitBranch className="w-4 h-4 min-w-4 min-h-4" />,
                                 type: "item",
                                 meta: {
                                    type: "commit",
                                    prId: pr.id,
                                    name: `Pull Request #${pr.id}`,
                                    kbid: currentKBID,
                                    contentFetcher: async () => {
                                       return new Promise<string>((resolve) => {
                                          const handleMessage = (event: MessageEvent) => {
                                             if (event.data.type === "prDiff" && event.data.prID === pr.id) {
                                                window.removeEventListener("message", handleMessage)
                                                resolve(event.data.value)
                                             }
                                          }
                                          window.addEventListener("message", handleMessage)
                                          tsvscode.postMessage({ type: "get_pr_diff", value: pr.id })
                                       })
                                    },
                                 },
                              }))
                           },
                        },
                     ]
                  },
               },
               {
                  id: "terminal",
                  name: "Terminal",
                  icon: <Terminal className="w-4 h-4" />,
                  type: "menu",
                  children: async () => {
                     const terminalList = await Algorithms.getTerminalList()
                     return terminalList.map((terminal) => ({
                        id: `terminal-${terminal.name}`,
                        name: terminal.name,
                        icon: <Terminal className="w-4 h-4" />,
                        type: "item",
                        meta: {
                           type: "terminal",
                           name: `Terminal: ${terminal.name}`,
                           contentFetcher: async () => {
                              return new Promise<string>((resolve) => {
                                 const handleMessage = (event: MessageEvent) => {
                                    if (event.data.type === "terminal_data") {
                                       window.removeEventListener("message", handleMessage)
                                       resolve(event.data.value)
                                    }
                                 }
                                 window.addEventListener("message", handleMessage)
                                 tsvscode.postMessage({
                                    type: "get_terminal_data",
                                    value: { terminalName: terminal.name },
                                 })
                              })
                           },
                        },
                     }))
                  },
               },
               {
                  id: "instructions",
                  name: "Custom Instructions",
                  icon: <TextCursorInput className="w-4 h-4" />,
                  type: "menu",
                  children: async () => {
                     return customInstructions.customInstructions.map((ins) => {
                        return {
                           id: ins.id,
                           name: ins.title,
                           icon: <TextCursorInput className="w-4 h-4" />,
                           type: "item",
                           meta: {
                              type: "instruction",
                              content: ins.content,
                           },
                        }
                     })
                  },
               },
               {
                  id: "knowledgebases",
                  name: "Knowledgebases",
                  icon: <Book className="w-4 h-4" />,
                  type: "menu",
                  children: async () => {
                     const knowledgebases = selectAllKnowledgebases(store.getState())
                     return knowledgebases
                        .filter((kb) => kb.status === KnowledgebaseStatus.READY)
                        .map((kb) => ({
                           id: kb.id,
                           name: kb.name,
                           icon: <Book className="w-4 h-4" />,
                           type: "item",
                           meta: {
                              type: kb.type,
                              kbid: kb.id,
                              name: kb.name,
                           },
                        }))
                  },
               },
               {
                  id: "codebase",
                  name: "Codebase",
                  icon: <Code2 className="w-4 h-4 min-w-4 min-h-4" />,
                  type: "item",
                  meta: {
                     type: "codebase",
                     kbid: currentKBID,
                     content: "",
                  },
                  disabled: (plan && !plan.base.limits.access.context.codebase.current) || !currentKBID,
               },
               {
                  id: "errors",
                  name: "File errors",
                  icon: <AlertCircle className="w-4 h-4 min-w-4 min-h-4 text-red-500" />,
                  type: "item",
                  meta: {
                     type: "errors",
                     contentFetcher: async () => {
                        return new Promise<string>((resolve) => {
                           const handleMessage = (event: MessageEvent) => {
                              if (event.data.type === "editorErrors") {
                                 window.removeEventListener("message", handleMessage)
                                 const errors = event.data.value
                                 const formattedErrors = errors
                                    .map((error: any) => `${error.file}:${error.line} - ${error.message}`)
                                    .join("\n")
                                 resolve(formattedErrors || "No errors found in the workspace")
                              }
                           }
                           window.addEventListener("message", handleMessage)
                           tsvscode.postMessage({ type: "get_editor_errors" })
                        })
                     },
                  },
               },
               {
                  id: "warnings",
                  name: "File warnings",
                  icon: <AlertTriangle className="w-4 h-4 min-w-4 min-h-4 text-yellow-500" />,
                  type: "item",
                  meta: {
                     type: "warnings",
                     contentFetcher: async () => {
                        return new Promise<string>((resolve) => {
                           const handleMessage = (event: MessageEvent) => {
                              if (event.data.type === "editorWarnings") {
                                 window.removeEventListener("message", handleMessage)
                                 const warnings = event.data.value
                                 const formattedWarnings = warnings
                                    .map(
                                       (warning: any) =>
                                          `${warning.file}:${warning.line} - ${warning.message}`
                                    )
                                    .join("\n")
                                 resolve(formattedWarnings || "No warnings found in the workspace")
                              }
                           }
                           window.addEventListener("message", handleMessage)
                           tsvscode.postMessage({ type: "get_editor_warnings" })
                        })
                     },
                  },
               },
            ] satisfies MenuNode_t[]
         ).filter((item) => {
            if (!query) return true
            return item.name.toLowerCase().includes(query.toLowerCase())
         })
      },
      [currentWorkspacePath]
   )

   // Set the selected model to the first model if no model is selected
   useEffect(() => {
      if (selectedModel) return
      const model = settings.defaultModel || DEFAULT_CHAT_MODEL
      dispatch(setChatModel({ model }))
   }, [selectedModel, settings.defaultModel, dispatch])

   // Autofocus the editor when the chat is created and clear the editor content and context when the a new chat is created
   useEffect(() => {
      if (!isNewChat) return
      editorRef.current?.focus?.()
      editorRef.current?.clearContent?.()
   }, [isNewChat, dispatch])

   if (chatMode === ChatMode.ECO && !ecoModeDependenciesInstalled) {
      return <Components.EcoModeDependenciesWarning />
   }

   return (
      <PromptEditor
         ref={editorRef}
         onSend={handleSend}
         onChange={handleChange}
         onItemAdd={handleItemAdd}
         menuBuilder={menuBuilder}
         initialContent={""}
         initialContext={[]}
         contextItemsRenderer={(items, onItemRemove) => {
            return (
               <div className="flex flex-wrap px-3 py-2 gap-2 border-b border-[var(--vscode-input-border)]">
                  {items.map((item) => {
                     const uploading =
                        item.type === "item" && item.meta.type === "image" && item.meta.uploading
                     const error = item.error

                     return (
                        <div
                           key={item.id}
                           className={`${item.clickable && !uploading && !error && "cursor-pointer"} flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-[var(--vscode-input-border)] text-[var(--vscode-foreground)] w-min`}
                           onClick={() => {
                              if (uploading) return
                              item.onClick?.()
                           }}
                        >
                           {item.icon}
                           <div className={`truncate max-w-[200px] w-max ${uploading && "text-white/30"}`}>
                              {item.name}
                           </div>
                           {item.id === "codebase" && isAutoIndexingCodebase && (
                              <Loader2 className="w-2 h-2 animate-spin text-blue-300/80" />
                           )}
                           {uploading && <Loader2 className="w-2 h-2 animate-spin text-blue-300/80" />}
                           {!uploading && error && <CircleAlert className="w-2 h-2  text-red-300/80" />}
                           <button
                              onClick={(e) => {
                                 e.stopPropagation()
                                 onItemRemove(item.id)
                              }}
                              className="p-0.5 hover:bg-[var(--vscode-input-background)] rounded w-min"
                           >
                              <X className="w-3 h-3" />
                           </button>
                        </div>
                     )
                  })}
               </div>
            )
         }}
      />
   )
})

export default ChatEditor

import { Node } from "@tiptap/core"

export const ContextMention = Node.create({
   name: "contextMention",
   group: "inline",
   inline: true,
   selectable: false,
   atom: true,

   addOptions() {
      return {
         onItemRemove: (id: string) => {},
      }
   },

   addAttributes() {
      return {
         id: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-id"),
            renderHTML: (attributes) => ({ "data-id": attributes.id }),
         },
         name: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-name"),
            renderHTML: (attributes) => ({ "data-name": attributes.name }),
         },
         type: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-type-val"),
            renderHTML: (attributes) => ({ "data-type-val": attributes.type }),
         },
         content: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-content"),
            renderHTML: (attributes) => ({ "data-content": attributes.content }),
         },
      }
   },

   parseHTML() {
      return [{ tag: `span[data-type="${this.name}"]` }]
   },

   renderHTML({ node, HTMLAttributes }) {
      return [
         "span",
         {
            // Preserve existing attributes (data-* for id, name, etc.)
            ...HTMLAttributes,
            // Identify this span for parser and styling
            "data-type": this.name,
            // CSS class for additional styling (optional if you prefer CSS file)
            class: "context-mention",
            // Inline style leveraging VSCode theme color variables
            style: "background-color: #0b1e32; color: var(--vscode-button-foreground); padding: 3px 4px; border-radius: 3px;",
         },
         `@${node.attrs.name}`,
      ]
   },

   renderText({ node }) {
      return `@${node.attrs.name}`
   },

   addKeyboardShortcuts() {
      return {
         Backspace: () =>
            this.editor.commands.command(({ tr, state }) => {
               let isMention = false
               const { selection } = state
               const { empty, anchor } = selection
               if (!empty) {
                  return false
               }

               state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
                  if (node.type.name === this.name) {
                     isMention = true
                     this.options.onItemRemove(node.attrs.id)
                     tr.delete(pos, pos + node.nodeSize)
                     return false
                  }
               })
               return isMention
            }),
      }
   },
})

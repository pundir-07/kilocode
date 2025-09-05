import { ChatContextItem } from "@/common/types/chat"
import { ReactNode } from "react"

export type MenuNode_t = {
   id: string
   name: string
   icon: ReactNode
   disabled?: boolean
   onClick?: () => any
   clickable?: boolean
   error?: boolean
} & (
   | {
        type: "menu"
        children?: (searchQuery?: string) => Promise<MenuNode_t[] | Promise<MenuNode_t[]>>
     }
   | {
        type: "item"
        meta: {
           type: ChatContextItem["type"]
           uploading?: boolean
        } & (
           | { content: string }
           | { contentFetcher: () => Promise<string> }
           | { kbid: string }
           | { type: "file"; path: string }
        )
     }
)

export type ImageContext = {
   id: string
   name: string
   icon: ReactNode
   disabled?: boolean
   onClick?: () => any
   clickable?: boolean
   type: "item"
   meta: {
      type: "image"
      content: string
      uploading: boolean
   }
}
export type IPromptEditorProps = {
   menuBuilder: (searchQuery?: string) => MenuNode_t[] | Promise<MenuNode_t[]>
   onItemAdd?: (item: MenuNode_t) => void
   onItemRemove?: (id: string) => void
   onSend?: () => void
   onChange?: (content: string) => void
   initialContent?: string
   initialContext?: MenuNode_t[]
   readonly?: boolean
   contextItemsRenderer?: (items: MenuNode_t[], onItemRemove: (id: string) => void) => ReactNode
}

export interface PromptEditorRef {
   getContent: () => string
   getContextItems: () => MenuNode_t[]
   setContextItems: (items: MenuNode_t[]) => void
   addContextItem: (item: MenuNode_t) => void
   updateContextItem: (item: MenuNode_t) => void
   setContent: (content: string) => void
   clearContent: () => void
   focus: () => void
   blur: () => void
   hasContent: () => boolean
}

// -----------------------------------------------
// Type guards to safely narrow MenuNode_t variants
// -----------------------------------------------

export type MenuItemNode = Extract<MenuNode_t, { type: "item" }>

export function isMenuItem(node: MenuNode_t): node is MenuItemNode {
   return node.type === "item"
}

export function isImageItem(node: MenuNode_t): node is ImageContext {
   return node.type === "item" && (node as any).meta?.type === "image"
}

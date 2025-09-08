import { ChatModel_t } from "./model"

export enum ChatMode {
   NORMAL = "NORMAL",
   ECO = "ECO", // TODO
   PRO = "PRO",
}

export enum ChatFuncionalState {
   IDLE = "IDLE",
   WAITING = "WAITING",
   WORKING = "WORKING",
   ERROR = "ERROR",
   SUCCESS = "SUCCESS",
}

export type ChatContextItem = {
   id: string
   type: //
   // plain text
   | "file"
      | "terminal"
      | "errors"
      | "warnings"
      | "commit"
      //kb
      | "folder"
      | "codebase"
      | "docs"
      | "git"
      | "swagger"
      | "instruction"
      | "image"
   name: string
   content: string

   path: string
   kbid: string
}

export type OpenAITextMessageContent_t = {
   type: "text"
   text: string
}
export type OpenAIImageMessageContent_t = {
   type: "image_url"
   image_url: { url: string }
}

export type UserChatMessage_t = {
   role: "user"
   content:
      | string
      // OpenAI message content
      | (OpenAIImageMessageContent_t | OpenAITextMessageContent_t)[]

   web_search: boolean
   context: ChatContextItem[]
}

export type AssistantChatMessageToolCall_t = {
   id: string
   type: "function"
   function: {
      name: string
      arguments: string
   }
}
export type AssistantChatMessage_t = {
   role: "assistant"
   content: string
   reasoning_content: string
   tool_calls?: AssistantChatMessageToolCall_t[]
}

export type ToolChatMessage_t = {
   role: "tool"
   name: string
   tool_call_id: string
   /**
    * {
         status: "error"
         content: string
      }
    */
   /**
    * {
         status: "success"
         content: T
      }
    */
   /**
    * {
         status: "pending"
      }
    */
   content: string
}

export type ChatMessage_t = UserChatMessage_t | AssistantChatMessage_t | ToolChatMessage_t

export type Chat_t = {
   id: string
   title: string
   updatedAt: number

   // Chat meta
   mode: ChatMode
   model: ChatModel_t | null
   state: ChatFuncionalState
   abortController?: AbortController

   // Messages
   messages: ChatMessage_t[]

   // Feature flags
   isWebSearchEnabled: boolean

   // Additional content
   followups: string[]
   isContinueRequired: boolean
   usage: { used: number; limit: number }
}

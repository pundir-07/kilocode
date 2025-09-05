import { Chat_t } from "@/common/types/chat"
import { HttpStreamer } from "."
import { API } from ".."
import {
   StreamChatBodyToolCallComplete_t,
   StreamChatBodyToolCalls_t,
   StreamChatBodyToolCallStart_t,
} from "./chat.types"

// ----------------------------------------------------------------------------------------------------------
// HTTP Streaming Chat API
// ----------------------------------------------------------------------------------------------------------

export type ChatStreamPayload_t = {
   // Chat ID
   conversation_id: string

   // Metadata
   mode: "NORMAL" | "ECO" | "PRO"
   model: string

   // Chat content
   messages: Chat_t["messages"]

   // Feature flags
   web_search: boolean
   provide_followups: boolean
   image: boolean // TODO

   continue_required: boolean
}

export async function chatStreamFascade(
   payload: ChatStreamPayload_t,
   callbacks: {
      onChatError: (error: Error) => any
      onChatStart: () => any
      onConversationID: (id: string) => any
      onToolCalls: (data: StreamChatBodyToolCalls_t["tool_calls"]) => any
      onToolCallStart: (data: StreamChatBodyToolCallStart_t["tool_call"]) => any
      onToolCallComplete: (data: StreamChatBodyToolCallComplete_t["tool_call"]) => any
      onAssistantChunk: (data: { messageChunk: string; reasoningChunk: string }) => any
      onUsage: (data: { used: number; limit: number }) => any
      onContinueRequired: () => any
      onFollowups: (data: string[]) => any
      onChatEnd: () => any
   },
   opts?: { abortController?: AbortController }
) {
   console.clear()

   const streamer = new HttpStreamer(API.BACKEND_LOCAL.getUri())
   await streamer.initiateWithRetry(
      "/chat/stream",
      payload,
      {
         onEnd: async () => {
            // eat 5 star do nothing :)
         },
         onError: async (error) => {
            // throw error to reject the overall promise
            await callbacks.onChatError(error)
         },
         onEvent: async (event) => {
            switch (event.event) {
               case "start":
                  await callbacks.onChatStart()
                  break
               case "error":
                  await callbacks.onChatError(new Error("Internal Server Error"))
               case "conversation_id":
                  await callbacks.onConversationID(event.data.message)
                  break
               case "tool_calls":
                  await callbacks.onToolCalls(event.data.tool_calls)
                  break
               case "tool_call_start":
                  await callbacks.onToolCallStart(event.data.tool_call)
                  break
               case "tool_call_complete":
                  await callbacks.onToolCallComplete(event.data.tool_call)
                  break
               case "message":
               case "reasoning":
                  await callbacks.onAssistantChunk({
                     messageChunk: event.data.message || "",
                     reasoningChunk: event.data.reasoning_content || "",
                  })
                  break
               case "usage":
                  await callbacks.onUsage(event.data.usage)
                  break
               case "continue_required":
                  await callbacks.onContinueRequired()
                  break
               case "follow_ups":
                  await callbacks.onFollowups(event.data.message)
                  break
               case "end":
                  await callbacks.onChatEnd()
                  break
               default:
                  console.log("Unknown event from chat", event)
                  break
            }
         },
      },
      { maxRetries: 3, retryDelay: 1000, abortController: opts?.abortController }
   )
}

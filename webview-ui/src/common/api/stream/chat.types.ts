// ----------------------------------------------------------------------------------------------------------
// Lifecycle events
// ----------------------------------------------------------------------------------------------------------

// Start of the chat
export type StreamChatBodyStart_t = {
   type: "start"
}

// End of the chat
export type StreamChatBodyEnd_t = {
   type: "end"
}

// ----------------------------------------------------------------------------------------------------------
// State events
// ----------------------------------------------------------------------------------------------------------

// Conversation ID of the current chat (initially recieved on new chats)
export type StreamChatBodyConversationID_t = {
   type: "conversation_id"
   message: string
}

// ----------------------------------------------------------------------------------------------------------
// Content providing events
// ----------------------------------------------------------------------------------------------------------

// Assistant response's chunk
export type StreamChatBodyAssistantChunk_t = {
   index: number
   type: "message"
   message: string
}

// Assistant response's reasoning chunk
export type StreamChatBodyAssistantReasoningChunk_t = {
   index: number
   type: "reasoning"
   reasoning_content: string
}

// ----------------------------------------------------------------------------------------------------------
// Utility events
// ----------------------------------------------------------------------------------------------------------

// Followup questions
export type StreamChatBodyFollowups_t = {
   type: "follow_ups"
   message: string[]
}

// ----------------------------------------------------------------------------------------------------------
// Tool call events
// ----------------------------------------------------------------------------------------------------------

export type StreamChatBodyToolCalls_t = {
   type: "tool_calls"
   tool_calls: {
      id: string
      type: "function"
      function: {
         name: string
         arguments: string
      }
   }[]
}

export type StreamChatBodyToolCallStart_t = {
   type: "tool_call_start"
   index: number
   tool_call: {
      id: string
      name: string
      arguments: string
   }
}

export type StreamChatBodyToolCallResultError_t = {
   status: "error"
   content: string
}
export type StreamChatBodyToolCallResultSuccess_t<T> = {
   status: "success"
   content: T
}

// `web_search`
export type StreamChatBodyToolCallWebSearchResult_t = StreamChatBodyToolCallResultSuccess_t<{
   content: string
   sources: {
      url: string
      title: string
      resolved: boolean
   }[]
}>

// `folder_search`
export type StreamChatBodyToolCallFolderSearchResult_t = StreamChatBodyToolCallResultSuccess_t<{
   file: string
   content: { text: string }
   additional_metadata: {
      line_start?: number
      line_end?: number
   }
}>

// `context_search`
export type StreamChatBodyToolCallContextSearchResult_t = StreamChatBodyToolCallResultSuccess_t<
   {
      file: string
      content: { text: string }
      additional_metadata: {
         line_start?: number
         line_end?: number
      }
   }[]
>

// `swagger_search`
export type StreamChatBodyToolCallSwaggerSearchResult_t = StreamChatBodyToolCallResultSuccess_t<
   {
      endpoint: string
      content: object
      additional_metadata: {
         method: string // "GET" | "PUT" | ... (CAPS ONLY)
      }
   }[]
>

// `agentic_search`
export type StreamChatBodyToolCallAgenticSearchResult_t = StreamChatBodyToolCallResultSuccess_t<{
   content: {
      text: string
   }
   additional_metadata: {
      file: string
      line_start: number | null
      line_end: number | null
   }[]
}>

// Tool call completes
export type StreamChatBodyToolCallComplete_t = {
   type: "tool_call_complete"
   index: number
   tool_call: {
      id: string
      name: string
      result:
         | StreamChatBodyToolCallWebSearchResult_t
         | StreamChatBodyToolCallFolderSearchResult_t
         | StreamChatBodyToolCallContextSearchResult_t
         | StreamChatBodyToolCallAgenticSearchResult_t
   }
}

// ----------------------------------------------------------------------------------------------------------

export type StreamChatBody_t =
   //
   // Start of chat
   //
   | StreamChatBodyStart_t
   //
   // Conversation ID of the current chat (initially recieved on new chats)
   //
   | StreamChatBodyConversationID_t
   //
   // Listing of tool calls
   //
   | StreamChatBodyToolCalls_t
   //
   // Tool calls
   //
   | StreamChatBodyToolCallStart_t
   | StreamChatBodyToolCallComplete_t
   //
   // Assistant response's chunk
   //
   | StreamChatBodyAssistantChunk_t
   //
   // Followup questions
   //
   | StreamChatBodyFollowups_t
   //
   // End of chat
   //
   | StreamChatBodyEnd_t

// ----------------------------------------------------------------------------------------------------------

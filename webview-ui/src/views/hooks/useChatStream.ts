import { useDispatch, useSelector } from "react-redux"

import { chatStreamFascade, ChatStreamPayload_t } from "@/common/api/stream/chat"
import { NEW_CHAT_ID_PREFIX } from "@/common/core/constants"
import { Chat_t, ChatFuncionalState, UserChatMessage_t } from "@/common/types/chat"
import { ImageContext, MenuNode_t } from "@/views/components/common/PromptEditor/types"
import { convertToPreview } from "@/views/components/common/PromptEditor/utils/transform"
import { store } from "@/views/lib/store"
import {
   addChat,
   pushMessage,
   removeChat,
   selectChat,
   selectChatExists,
   selectCurrentChatID,
   selectIsChatWorking,
   setChatAbortController,
   setChatState,
   setChatUsage,
   setCurrentChatID,
   setFollowups,
   setIsChatContinueRequired,
   updateMessage,
   updateToolCallContentByID,
} from "@/views/lib/store/chatSlice"
import { selectSettings } from "@/views/lib/store/globalSlice"
import { useCallback } from "react"

export function useChatStream(props: {
   getEditorContent: () => string
   setEditorContent: (content: string) => void
   getContextItems: () => MenuNode_t[]
   setContextItems: (items: MenuNode_t[]) => void
}) {
   const dispatch = useDispatch()
   const settings = useSelector(selectSettings)
   const beginChatStream = useCallback(async () => {
      console.clear()
      const chatID = selectCurrentChatID(store.getState())
      let chat: Chat_t | undefined = selectChat(store.getState(), chatID)
      if (!chat) {
         console.error("Chat not found", chatID)
         return
      }

      const editorContent = props.getEditorContent()
      const contextItems = props.getContextItems()

      const isSendable = (() => {
         if (!chat.mode) return false
         if (!chat.model) return false
         if (!editorContent.trim()) return false
         if (selectIsChatWorking(store.getState())) return false

         return true
      })()
      if (!isSendable) return

      let currentChatID = chatID
      const isNewChat = !currentChatID || (currentChatID && currentChatID.startsWith(NEW_CHAT_ID_PREFIX))

      // ------------------------------------------------------------------------------------------
      // Preparation
      // ------------------------------------------------------------------------------------------

      // Create chat if not already
      const alreadyExists = selectChatExists(store.getState(), currentChatID)
      if (isNewChat || !alreadyExists) {
         dispatch(
            addChat({
               id: currentChatID,
               title: convertToPreview(editorContent),
               messages: [],
               updatedAt: Date.now(),
               mode: chat.mode,
               model: chat.model,
               isWebSearchEnabled: chat.isWebSearchEnabled,
               state: ChatFuncionalState.WAITING,
               followups: [],
               usage: { used: 0, limit: 0 },
               isContinueRequired: false,
            })
         )
      }

      // ------------------------------------------------------------------------------------------
      // Send message & process responses
      // ------------------------------------------------------------------------------------------

      const imageContext: ImageContext =
         (contextItems.filter(
            (node) => node.type === "item" && node.meta.type === "image"
         )[0] as ImageContext) || null

      const userMessage: UserChatMessage_t = {
         role: "user",
         content: imageContext
            ? [
                 { type: "text", text: editorContent },
                 { type: "image_url", image_url: { url: imageContext.meta.content } },
              ]
            : editorContent,
         context: contextItems
            .filter((x) => x.type === "item")
            .map((item) => {
               if (item.type !== "item") throw new Error("Expected item type")
               return {
                  ...item.meta,
                  name: item.name,
                  id: item.id,
               }
            }) as any,

         web_search: chat.isWebSearchEnabled,
      }

      dispatch(pushMessage({ chatID: currentChatID, message: userMessage }))
      chat = selectChat(store.getState(), currentChatID)

      // ------------------------------------------------------------------------------------------
      // Prepare payload
      // ------------------------------------------------------------------------------------------

      const hasImageContextAnywhere = chat.messages
         .filter((message) => message.role === "user")
         .some((message) => message.context.some((x) => x.type === "image"))

      const messagePayload: ChatStreamPayload_t = {
         // Chat ID
         conversation_id: isNewChat ? "" : currentChatID,

         // Metadata
         mode: chat.mode,
         model: chat.model.id,

         // Chat content
         messages: chat.messages,

         // Feature flags
         image: hasImageContextAnywhere,
         web_search: chat.isWebSearchEnabled,
         provide_followups: !settings.disableFollowups,
         continue_required: chat.isContinueRequired,
      }

      // ------------------------------------------------------------------------------------------
      // Clear context and editor content after sending
      // ------------------------------------------------------------------------------------------

      // Clear context after sending
      props.setEditorContent("")
      props.setContextItems([])
      dispatch(setIsChatContinueRequired({ chatID: currentChatID, isContinueRequired: false }))

      console.log(messagePayload)

      // ------------------------------------------------------------------------------------------
      // Send the message to backend
      // ------------------------------------------------------------------------------------------

      try {
         const abortController = new AbortController()
         dispatch(setChatAbortController({ chatID: currentChatID, abortController }))
         dispatch(setChatState({ chatID: currentChatID, newState: ChatFuncionalState.WORKING }))

         await chatStreamFascade(
            // Send the message and handle chunks
            messagePayload,
            {
               onChatError: (error) => {
                  console.error("Error sending message:", error)

                  if (error.name === "AbortError") {
                     dispatch(setChatState({ chatID: currentChatID, newState: ChatFuncionalState.IDLE }))
                  } else {
                     dispatch(setChatState({ chatID: currentChatID, newState: ChatFuncionalState.ERROR }))
                  }
                  dispatch(setChatAbortController({ chatID: currentChatID, abortController: null }))
               },
               onChatStart: () => {
                  dispatch(setIsChatContinueRequired({ chatID: currentChatID, isContinueRequired: false }))
                  dispatch(setFollowups({ followups: [], chatID: currentChatID }))
               },
               onChatEnd: () => {
                  dispatch(setChatState({ chatID: currentChatID, newState: ChatFuncionalState.IDLE }))
               },
               onUsage: (data) => {
                  dispatch(setChatUsage({ chatID: currentChatID, usage: data }))
               },
               onContinueRequired: () => {
                  dispatch(setIsChatContinueRequired({ chatID: currentChatID, isContinueRequired: true }))
               },
               onConversationID: (id) => {
                  if (currentChatID === id) return

                  const existingChat = selectChat(store.getState(), currentChatID)
                  if (!existingChat) {
                     console.error("[CONVERSATION ID] EXISTING CHAT IS NOT FOUND. IT'S UNEXPECTED...")
                     return
                  }

                  // Replace existing chat
                  dispatch(addChat({ ...existingChat, id: id }))
                  dispatch(setCurrentChatID(id))
                  dispatch(removeChat({ id: currentChatID }))

                  currentChatID = id
               },
               onFollowups: (data) => {
                  dispatch(setFollowups({ followups: data, chatID: currentChatID }))
               },
               onToolCalls: (data) => {
                  const chat = selectChat(store.getState(), currentChatID)
                  if (!chat) {
                     console.error("[TOOL CALLS] CHAT IS NOT FOUND. IT'S UNEXPECTED...")
                     return
                  }

                  dispatch(
                     pushMessage({
                        chatID: currentChatID,
                        message: { role: "assistant", content: "", reasoning_content: "", tool_calls: data },
                     })
                  )
               },
               onToolCallStart: (data) => {
                  dispatch(
                     pushMessage({
                        chatID: currentChatID,
                        message: {
                           role: "tool",
                           name: data.name,
                           tool_call_id: data.id,
                           content: JSON.stringify({ status: "pending" }),
                        },
                     })
                  )
               },
               onToolCallComplete: (data) => {
                  dispatch(
                     updateToolCallContentByID({
                        chatID: currentChatID,
                        toolCallID: data.id,
                        content: JSON.stringify(data.result),
                     })
                  )
               },
               onAssistantChunk: (chunk) => {
                  const chat = selectChat(store.getState(), currentChatID)
                  if (!chat) {
                     console.error("[ASSISTANT CHUNK] CHAT IS NOT FOUND. IT'S UNEXPECTED...")
                     return
                  }

                  const lastMessage = chat.messages[chat.messages.length - 1]
                  if (!lastMessage) {
                     console.error("[ASSISTANT CHUNK] LAST MESSAGE IS NOT FOUND. IT'S UNEXPECTED...")
                     return
                  }

                  if (lastMessage.role !== "assistant") {
                     dispatch(
                        pushMessage({
                           chatID: currentChatID,
                           message: {
                              role: "assistant",
                              content: chunk.messageChunk,
                              reasoning_content: chunk.reasoningChunk,
                           },
                        })
                     )
                  } else {
                     dispatch(
                        updateMessage({
                           chatID: currentChatID,
                           messageIndex: chat.messages.length - 1,
                           message: {
                              ...lastMessage,
                              content: lastMessage.content + chunk.messageChunk,
                              reasoning_content: lastMessage.reasoning_content + chunk.reasoningChunk,
                           },
                        })
                     )
                  }
               },
            },
            { abortController: abortController }
         )
      } catch (error) {
      } finally {
      }
   }, [])
   return beginChatStream
}

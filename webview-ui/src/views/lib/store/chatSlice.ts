import { Chat_t, ChatFuncionalState, ChatMessage_t, ChatMode, ToolChatMessage_t } from "@/common/types/chat"
import { ChatModel_t } from "@/common/types/model"
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."

export interface ChatState {
   currentChatID: string | null
   hasLoadedInitialCache: boolean
   hasLoadedChats: boolean

   chats: Record<string, Chat_t>
   allChats: { id: string; title: string; updatedAt: number }[]
   // UI communication state
   nextFollowup: string | null
   isUploadingImage: boolean
}

const initialState: ChatState = {
   currentChatID: null,
   hasLoadedInitialCache: false,
   hasLoadedChats: false,

   chats: {},
   allChats: [],

   // UI communication state
   nextFollowup: "",
   isUploadingImage: false,
}

const chatSlice = createSlice({
   name: "chat",
   initialState,
   reducers: {
      // ----------------------------------------------------------------------------------------------------
      // Utility reducers
      // ----------------------------------------------------------------------------------------------------

      upsertChatsFromCloud: (state, action: PayloadAction<{ chats: Chat_t[] }>) => {
         // Add chats to global map
         for (const chat of action.payload.chats) {
            state.chats[chat.id] = chat
         }
      },

      setAllChats: (
         state,
         action: PayloadAction<{ chats: { id: string; title: string; updatedAt: number }[] }>
      ) => {
         state.allChats = action.payload.chats
      },

      setHasLoadedChats: (state, action: PayloadAction<boolean>) => {
         state.hasLoadedChats = action.payload
      },

      setCurrentChatID: (state, action: PayloadAction<string | null>) => {
         state.currentChatID = action.payload
      },

      setNextFollowup: (state, action: PayloadAction<{ content: string }>) => {
         state.nextFollowup = action.payload.content
      },
      setIsUploadingImage: (state, action: PayloadAction<boolean>) => {
         state.isUploadingImage = action.payload
      },
      // ----------------------------------------------------------------------------------------------------
      // Chat related reducers
      // ----------------------------------------------------------------------------------------------------

      addChat: (state, action: PayloadAction<Chat_t>) => {
         state.chats[action.payload.id] = action.payload
      },

      setChatState: (state, action: PayloadAction<{ chatID: string; newState: ChatFuncionalState }>) => {
         const { chatID, newState } = action.payload
         const chat: Chat_t | undefined = state.chats[chatID]
         if (!chat) return

         chat.state = newState
      },

      setChatAbortController: (
         state,
         action: PayloadAction<{ chatID: string; abortController: AbortController | null }>
      ) => {
         const { chatID, abortController } = action.payload
         const chat: Chat_t | undefined = state.chats[chatID]
         
         if (!chat) return

         if (abortController) {
            chat.abortController = abortController
         } else {
            delete chat.abortController
         }
      },

      removeChat: (state, action: PayloadAction<{ id: string }>) => {
         const { id } = action.payload
         const chat = state.chats[id]
         if (!chat) return

         delete state.chats[id]
      },
      removeAllChats: (state) => {
         state.chats = {}
      },

      // ----------------------------------------------------------------------------------------------------
      // Message related reducers
      // ----------------------------------------------------------------------------------------------------

      pushMessage: (state, action: PayloadAction<{ chatID: string; message: ChatMessage_t }>) => {
         const { chatID, message } = action.payload
         const chat: Chat_t | undefined = state.chats[chatID]
         if (!chat) return

         chat.messages.push(message)
      },

      updateMessage: (
         state,
         action: PayloadAction<{ chatID: string; messageIndex: number; message: ChatMessage_t }>
      ) => {
         const { chatID, messageIndex, message } = action.payload
         const chat: Chat_t | undefined = state.chats[chatID]
         if (!chat) return

         chat.messages[messageIndex] = message
      },

      updateToolCallContentByID: (
         state,
         action: PayloadAction<{ chatID: string; toolCallID: string; content: ToolChatMessage_t["content"] }>
      ) => {
         const { chatID, toolCallID, content } = action.payload
         const chat: Chat_t | undefined = state.chats[chatID]
         if (!chat) return

         // Search from the end as tool call ids can be equal to any of the previous tool calls from other messagesƒ
         let messageIndex = -1
         for (let i = chat.messages.length - 1; i >= 0; i--) {
            const x = chat.messages[i]
            if (x.role === "tool" && x.tool_call_id === toolCallID) {
               messageIndex = i
               break
            }
         }
         if (messageIndex === -1) return

         chat.messages[messageIndex].content = content
      },

      setFollowups: (state, action: PayloadAction<{ chatID: string; followups: string[] }>) => {
         const { chatID, followups } = action.payload
         const chat = state.chats[chatID]
         if (!chat) return

         chat.followups = followups
      },

      // ----------------------------------------------------------------------------------------------------
      // Chat metadata reducers
      // ----------------------------------------------------------------------------------------------------

      setChatMode: (state, action: PayloadAction<{ mode: ChatMode }>) => {
         const { mode } = action.payload
         console.log({ ...state })
         const chatID = state.currentChatID
         if (!chatID) return

         const chat = state.chats[chatID]
         if (!chat) return

         chat.mode = mode
      },
      setChatModel: (state, action: PayloadAction<{ model: ChatModel_t }>) => {
         const { model } = action.payload
         const chatID = state.currentChatID
         if (!chatID) return

         const chat = state.chats[chatID]
         if (!chat) return

         chat.model = model
      },
      setChatWebSearchEnabled: (state, action: PayloadAction<{ enabled: boolean }>) => {
         const { enabled } = action.payload
         const chatID = state.currentChatID
         if (!chatID) return

         const chat = state.chats[chatID]
         if (!chat) return

         chat.isWebSearchEnabled = enabled
      },
      setIsChatContinueRequired: (
         state,
         action: PayloadAction<{ chatID: string; isContinueRequired: boolean }>
      ) => {
         const { chatID, isContinueRequired } = action.payload
         const chat = state.chats[chatID]
         if (!chat) return

         chat.isContinueRequired = isContinueRequired
      },
      setChatUsage: (state, action: PayloadAction<{ chatID: string; usage: Chat_t["usage"] }>) => {
         const { chatID, usage } = action.payload
         const chat = state.chats[chatID]
         if (!chat) return

         chat.usage = usage
      },

      // ----------------------------------------------------------------------------------------------------
   },
})

export const {
   setChatState,
   setCurrentChatID,
   setHasLoadedChats,
   upsertChatsFromCloud,
   setChatAbortController,
   addChat,
   removeChat,
   removeAllChats,
   pushMessage,
   updateMessage,
   setFollowups,
   updateToolCallContentByID,
   setAllChats,
   setChatMode,
   setChatModel,
   setChatWebSearchEnabled,
   setNextFollowup,
   setIsChatContinueRequired,
   setChatUsage,
   setIsUploadingImage,
} = chatSlice.actions
export default chatSlice.reducer

// Selectors
export const selectChatState = (state: RootState) => state.chat

export const selectChats = createSelector([selectChatState], (chatState) => chatState.chats)

export const selectCurrentChatID = createSelector([selectChatState], (chatState) => chatState.currentChatID)

export const selectCurrentChat = createSelector([selectChats, selectCurrentChatID], (chats, currentChatID) =>
   currentChatID ? chats[currentChatID] : null
)

export const selectChat = createSelector(
   [selectChats, (_state: RootState, chatID: string) => chatID],
   (chats, chatID) => chats[chatID]
)

export const selectChatFunctionalState = createSelector([selectChat], (chat) => chat?.state ?? null)

export const selectChatExists = createSelector(
   [selectChats, (_state: RootState, chatID: string) => chatID],
   (chats, chatID) => chatID in chats
)
export const selectChatMessages = createSelector([selectChat], (chat) => chat?.messages ?? [])

export const selectChatHasMessages = createSelector(
   [selectCurrentChat],
   (currentChat) => (currentChat?.messages?.length ?? 0) > 0
)

export const selectChatMode = createSelector([selectCurrentChat], (currentChat) =>
   currentChat ? currentChat.mode : null
)

export const selectChatUsage = createSelector([selectCurrentChat], (currentChat) =>
   currentChat ? currentChat.usage : { used: 0, limit: 0 }
)

export const selectChatModel = createSelector([selectCurrentChat], (currentChat) =>
   currentChat ? currentChat.model : null
)

export const selectChatWebSearchEnabled = createSelector(
   [selectCurrentChat],
   (currentChat) => currentChat?.isWebSearchEnabled ?? false
)

export const selectChatMessage = createSelector(
   [selectChatMessages, (_state: RootState, _chatID: string, messageIndex: number) => messageIndex],
   (messages, messageIndex) => messages?.[messageIndex] ?? null
)

export const selectIsChatWorking = createSelector(
   [selectCurrentChat],
   (currentChat) => currentChat?.state === ChatFuncionalState.WORKING
)

export const selectIsChatContinueRequired = createSelector(
   [selectCurrentChat],
   (currentChat) => currentChat?.isContinueRequired ?? false
)

export const selectCurrentChatTitle = createSelector([selectCurrentChat], (currentChat) =>
   currentChat ? currentChat.title : "New Chat"
)

export const selectNextFollowup = createSelector([selectChatState], (chatState) => chatState.nextFollowup)

export const selectAllHistoryChats = createSelector([selectChatState], (chatState) => chatState.allChats)

export const selectFollowups = createSelector([selectChat], (chat) => chat?.followups ?? [])

export const selectAllChats = createSelector([selectChats], (chats) => Object.values(chats))

export const selectRecentChats = createSelector([selectChatState], (chatState) => {
   const reversedChats = [...chatState.allChats].reverse()
   return reversedChats.slice(0, 3)
})

export const selectHasLoadedCloudChats = createSelector(
   [selectChatState],
   (chatState) => chatState.hasLoadedChats
)

export const selectIsUploadingImaage = createSelector(
   [selectChatState],
   (chatState) => chatState.isUploadingImage
)

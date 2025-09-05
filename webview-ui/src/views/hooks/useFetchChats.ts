import { useCallback, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

import { API } from "@/common/api"
import { Chat_t, ChatFuncionalState, ChatMode } from "@/common/types/chat"
import { convertToPreview } from "@/views/components/common/PromptEditor/utils/transform"
import { setAllChats, setHasLoadedChats } from "@/views/lib/store/chatSlice"
import useSocketBackendReachability from "./useSocketBackendReachability"
import { selectSessionID, selectUser } from "@/views/lib/store/globalSlice"

namespace Helpers {
   export async function fetchAllChats() {
      const conversationListRes = await API.BACKEND_LOCAL.post<{
         status: string
         data: {
            conversation_id: string
            title: string
            updated_at: number
            messages: any[]
         }[]
      }>("/chat/history/all")

      if (conversationListRes.data.status !== "success") {
         throw new Error("Failed to fetch conversations list")
      }

      return conversationListRes.data.data ?? []
   }
}

let isLoading = false

/**
 * Fetches the list of conversations that belong to the current user from the cloud backend
 * and converts them into the internal `Chat_t` & `ChatMessage_t` shapes used by the web-view.
 */
export default function useFetchChats() {
   const dispatch = useDispatch()
   const sessionID = useSelector(selectSessionID)
   const isSocketConnected = useSocketBackendReachability()

   useEffect(() => {
      if (isLoading) return

      isLoading = true
      fetchAllChats().finally(() => {
         isLoading = false
      })
   }, [isSocketConnected, sessionID])
   const fetchAllChats = useCallback(async () => {
      dispatch(setHasLoadedChats(false))

      const allChats = await Helpers.fetchAllChats()

      const chats: Chat_t[] = allChats.map((chat) => ({
         id: chat.conversation_id,
         messages: chat.messages || [],
         updatedAt: chat.updated_at,
         title: convertToPreview(chat.title),
         mode: ChatMode.NORMAL,
         model: {
            id: "gpt-4",
            display_name: "GPT-4",
            icon: "",
            disabled: false,
            description: "GPT-4 model",
            type: "cloud" as const,
         },
         isWebSearchEnabled: false,
         state: ChatFuncionalState.IDLE,
         followups: [],
         usage: { used: 0, limit: 0 },
         isContinueRequired: false,
      }))

      dispatch(setAllChats({ chats }))
      dispatch(setHasLoadedChats(true))
   }, [dispatch])
   return {fetchAllChats}
}

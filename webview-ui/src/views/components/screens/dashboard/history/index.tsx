import { API } from "@/common/api"
import { DEFAULT_CHAT_MODEL } from "@/common/core/constants"
import { Chat_t, ChatFuncionalState, ChatMode } from "@/common/types/chat"
import { convertToPreview } from "@/views/components/common/PromptEditor/utils/transform"
import { store } from "@/views/lib/store"
import {
   addChat,
   ChatState,
   removeChat,
   selectAllHistoryChats,
   selectChat,
   selectCurrentChat,
   selectCurrentChatID,
   selectHasLoadedCloudChats,
   setAllChats,
   setCurrentChatID,
} from "@/views/lib/store/chatSlice"
import { ArrowRightCircle, Download, History, Loader2, MessagesSquareIcon, Trash } from "lucide-react"
import { useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

interface ChatCardProps {
   chat: ChatState["allChats"][number]
   isActive: boolean
   onSelect: () => void
}

interface GroupedChats {
   [key: string]: ChatState["allChats"]
}

// Algorithms namespace for fetching individual chats from cloud
namespace Algorithms {
   export function formatDate(date: Date): string {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (date.toDateString() === today.toDateString()) {
         return "Today"
      } else if (date.toDateString() === yesterday.toDateString()) {
         return "Yesterday"
      } else {
         return date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
         })
      }
   }

   export async function fetchAndTransformChat(conversationID: string) {
      const { data, status } = await API.BACKEND_LOCAL.get<{
         status: string
         data: {
            conversation_id: string
            messages: any[]
            title: string
            updated_at: number
            usage: { used: number; limit: number }
         }
      }>(`/chat/history/${conversationID}`)

      if (status !== 200 || data.status !== "success") {
         throw new Error("Failed to fetch conversation")
      }

      // Get current chat
      const currentChat = selectChat(store.getState(), store.getState().chat.currentChatID)

      // Transform the API response to match Chat_t structure
      const chatData = data.data
      let transformedTitle = ""
      if (Array.isArray(chatData.title)) {
         for (const content of chatData.title) {
            if (content.type === "text") {
               transformedTitle = content.text
            }
         }
      } else if (typeof chatData.title === "string") {
         transformedTitle = chatData.title
      }
      return {
         id: chatData.conversation_id,
         messages: chatData.messages || [],
         updatedAt: chatData.updated_at,
         title: transformedTitle,
         // Fill in default values for missing fields
         mode: ChatMode.NORMAL,
         model: currentChat?.model || DEFAULT_CHAT_MODEL,
         isWebSearchEnabled: false,
         state: ChatFuncionalState.IDLE,
         followups: [],
         isContinueRequired: false,
         usage: chatData.usage || { used: 0, limit: 0 },
      } satisfies Chat_t
   }
}

namespace Components {
   export function ChatCard(props: ChatCardProps) {
      const navigate = useNavigate()
      const dispatch = useDispatch()
      const currentChatID = useSelector(selectCurrentChatID)
      const allChats = useSelector(selectAllHistoryChats)

      const [isLoading, setIsLoading] = useState(false)
      const [isDeleting, setIsDeleting] = useState(false)
      const [isExporting, setIsExporting] = useState(false)

      const handleOpen = async () => {
         setIsLoading(true)
         if (props.chat.id === currentChatID) {
            setIsLoading(false)
            navigate("/chat")
            return
         }
         try {
            const chatData = await Algorithms.fetchAndTransformChat(props.chat.id)

            dispatch(addChat(chatData))
            dispatch(setCurrentChatID(props.chat.id))
            navigate("/chat")
         } catch (error) {
            console.error("Failed to fetch chat:", error)
         } finally {
            setIsLoading(false)
         }
      }

      const handleDelete = async (e: React.MouseEvent) => {
         e.stopPropagation()

         setIsDeleting(true)
         try {
            const { status } = await API.BACKEND_LOCAL.delete(`/chat/history/${props.chat.id}`)
            if (status !== 200) throw new Error("Failed to delete conversation")

            dispatch(removeChat({ id: props.chat.id }))
            // Also remove from the lightweight allChats list so UI updates immediately
            try {
               dispatch(setAllChats({ chats: allChats.filter((c) => c.id !== props.chat.id) }))
            } catch (err) {
               // no-op if allChats is malformed
            }
            // If the deleted chat was the currently active chat, clear selection and navigate away
            if (props.chat.id === currentChatID) {
               dispatch(setCurrentChatID(null))
               navigate("/")
            }
         } catch (error) {
            console.error("Failed to delete chat:", error)
         } finally {
            setIsDeleting(false)
         }
      }

      const handleExport = async (e: React.MouseEvent) => {
         e.stopPropagation()
         setIsExporting(true)
         try {
            tsvscode.postMessage({ type: "export_chat_history", value: props.chat.id })
         } finally {
            setTimeout(() => setIsExporting(false), 500)
         }
      }

      return (
         <div
            key={props.chat.id}
            className="group bg-[var(--vscode-sideBar-background)] hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-activeSelectionBackground)] focus:outline-none transition-colors p-2 rounded-md mb-1 cursor-pointer grid grid-cols-[min-content,1fr,auto] gap-4 items-center h-12"
            onClick={handleOpen}
            tabIndex={0}
            role="button"
         >
            <MessagesSquareIcon className="w-6 h-6" />
            <h3 className="text-md font-semibold truncate">{convertToPreview(props.chat.title)}</h3>
            <div className="flex items-center gap-2">
               {!isDeleting && !isLoading && (
                  <div className="text-[11px] opacity-50 group-hover:opacity-80 whitespace-nowrap mr-2">
                     {currentChatID === props.chat.id ? "Current" : ""}
                  </div>
               )}
               {isLoading && (
                  <div className="flex items-center gap-2 mr-2">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-[11px] opacity-50">Loading...</span>
                  </div>
               )}
               <div
                  className={`${isDeleting || isLoading ? "flex" : "hidden group-hover:flex group-focus:flex"} items-center gap-2`}
               >
                  <button
                     className="p-1.5 rounded-full hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     onClick={handleDelete}
                     title="Delete chat"
                     disabled={isDeleting || isExporting || isLoading}
                  >
                     {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                        <Trash className="w-4 h-4" />
                     )}
                  </button>
                  <button
                     className="p-1.5 rounded-full hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     onClick={handleExport}
                     title="Export chat"
                     disabled={isDeleting || isExporting || isLoading}
                  >
                     {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                        <Download className="w-4 h-4" />
                     )}
                  </button>
                  {!isDeleting && !isLoading && (
                     <button
                        className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors flex items-center gap-2"
                        onClick={(e) => {
                           e.stopPropagation()
                           handleOpen()
                        }}
                     >
                        <ArrowRightCircle className="w-4 h-4" />
                        <span className="text-sm whitespace-nowrap">Open</span>
                     </button>
                  )}
               </div>
            </div>
         </div>
      )
   }
}

export default function HistorySidebar() {
   const navigate = useNavigate()

   const chatID = useSelector(selectCurrentChatID)
   const hasLoadedCloudChats = useSelector(selectHasLoadedCloudChats)
   const chats = useSelector(selectAllHistoryChats)
   const currentChat = useSelector(selectCurrentChat)

   // Local search state
   const [searchQuery, setSearchQuery] = useState("")
   const normalizedQuery = searchQuery.trim().toLowerCase()

   const { groupedChats, sortedDateGroups } = useMemo(() => {
      const groups: GroupedChats = {}

      // Apply filtering (excluding current chat; it will be handled separately)
      const sourceChats = normalizedQuery
         ? chats.filter((c) => convertToPreview(c.title).toLowerCase().includes(normalizedQuery))
         : chats

      // Helper to push a chat into its date bucket
      const pushToGroup = (chat: (typeof chats)[number]) => {
         const dateKey = Algorithms.formatDate(new Date(chat.updatedAt))
         if (!groups[dateKey]) groups[dateKey] = []

         groups[dateKey].push({
            id: chat.id,
            title: chat.title,
            updatedAt: chat.updatedAt,
         })
      }

      // Sort chats by update time
      const sortedChats = [...sourceChats].sort((a, b) => b.updatedAt - a.updatedAt)
      for (const chat of sortedChats) {
         if (chat.id !== chatID) pushToGroup(chat)
      }

      // Sort the date buckets themselves
      const sortedDateGroups = Object.keys(groups).sort((a, b) => {
         if (a === "Today") return -1
         if (b === "Today") return 1
         if (a === "Yesterday") return -1
         if (b === "Yesterday") return 1
         return new Date(b).getTime() - new Date(a).getTime()
      })

      return { groupedChats: groups, sortedDateGroups }
   }, [chats, chatID, normalizedQuery])

   return (
      <div className="h-full grid grid-rows-[min-content_1fr] overflow-hidden">
         <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center gap-2">
               <History className="w-6 h-6" />
               <h2 className="text-2xl font-bold">History</h2>
            </div>
            {!hasLoadedCloudChats && (
               <Loader2 className="w-5 h-5 animate-spin text-[var(--vscode-descriptionForeground)]" />
            )}
         </div>
         <div className="min-h-0 grid grid-rows-[min-content_1fr] gap-4">
            {/* Search Bar (sticky via separate non-scrolling grid row) */}
            <div className="px-4">
               <label className="sr-only" htmlFor="history-search">
                  Search chats
               </label>
               <div className="relative group">
                  <input
                     id="history-search"
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Search chats..."
                     className="w-full px-3 py-2 pr-16 rounded-md bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] placeholder-[var(--vscode-input-placeholderForeground)] border border-[var(--vscode-input-border)] !focus:outline-none"
                  />
                  {searchQuery && (
                     <button
                        onClick={() => setSearchQuery("")}
                        className="absolute top-1/2 -translate-y-1/2 right-2 text-xs px-2 py-1 rounded bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-hoverBackground)]"
                        aria-label="Clear search"
                     >
                        Clear
                     </button>
                  )}
               </div>
            </div>
            {/* Scrollable chats list */}
            <div className="min-h-0 overflow-y-auto px-4">
               {currentChat &&
                  !currentChat.id.startsWith("<NEW") &&
                  (!normalizedQuery ||
                     (normalizedQuery &&
                        convertToPreview(currentChat.title).toLowerCase().includes(normalizedQuery))) && (
                     <div className="mt-0 mb-6">
                        <h3 className="text-sm font-medium text-[var(--vscode-descriptionForeground)] mb-2">
                           Current Chat
                        </h3>
                        <div className="bg-[var(--vscode-list-hoverBackground)]">
                           <Components.ChatCard
                              chat={currentChat}
                              isActive={true}
                              onSelect={() => {
                                 navigate("/chat")
                              }}
                           />
                        </div>
                     </div>
                  )}
               {sortedDateGroups.length > 0
                  ? sortedDateGroups.map((dateGroup) => (
                       <div key={dateGroup} className="mb-6 last:mb-0">
                          <h3 className="text-sm font-medium text-[var(--vscode-descriptionForeground)] mb-2">
                             {dateGroup}
                          </h3>
                          {groupedChats[dateGroup].map((chat) => (
                             <Components.ChatCard
                                key={chat.id}
                                chat={chat}
                                isActive={false}
                                onSelect={() => {
                                   navigate("/chat")
                                }}
                             />
                          ))}
                       </div>
                    ))
                  : !currentChat &&
                    !normalizedQuery && (
                       <div className="text-[var(--vscode-descriptionForeground)]">No chats yet</div>
                    )}
               {/* Empty state when search has no results */}
               {normalizedQuery &&
                  sortedDateGroups.length === 0 &&
                  !(
                     currentChat &&
                     convertToPreview(currentChat.title).toLowerCase().includes(normalizedQuery)
                  ) && (
                     <div className="text-[var(--vscode-descriptionForeground)] italic">
                        No chats match your search.
                     </div>
                  )}
            </div>
         </div>
      </div>
   )
}

import { API } from "@/common/api"
import { DEFAULT_CHAT_MODEL } from "@/common/core/constants"
import { Chat_t, ChatFuncionalState, ChatMode } from "@/common/types/chat"
import { KnowledgebaseType } from "@/common/types/knowledgebase"
import { RootState, store } from "@/views/lib/store"
import {
   addChat,
   selectChat,
   selectChatMessages,
   selectCurrentChatID,
   selectHasLoadedCloudChats,
   selectRecentChats,
   setCurrentChatID,
} from "@/views/lib/store/chatSlice"
import { selectFrequentlyUsedKnowledgebases, selectKnowledgebaseById } from "@/views/lib/store/knowledgebasesSlice"
import {
   Book,
   Bug,
   CheckSquare,
   Code2,
   ExternalLink,
   GitBranch,
   Loader2,
   LucideAppWindowMac,
   LucideArrowRight,
   MessageSquare,
   Play,
   Sparkles,
} from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import ChatInput from "./input"

// Algorithms namespace for fetching individual chats from cloud
namespace Algorithms {
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
      return {
         id: chatData.conversation_id,
         messages: chatData.messages || [],
         updatedAt: chatData.updated_at,
         title: chatData.title,
         // Fill in default values for missing fields
         mode: ChatMode.NORMAL,
         model: currentChat?.model || DEFAULT_CHAT_MODEL,
         isWebSearchEnabled: false,
         state: ChatFuncionalState.IDLE,
         followups: [],
         usage: chatData.usage || { used: 0, limit: 0 },
         isContinueRequired: false,
      } satisfies Chat_t
   }
}

namespace Components {
   export function QuickActionButton(props: {
      icon: React.ReactNode
      label: string
      onClick: () => void
      className?: string
   }) {
      return (
         <button
            onClick={props.onClick}
            className={`flex flex-row items-center justify-center gap-2 py-2 px-3 text-xs rounded-md text-[var(--vscode-foreground)] transition-bg w-full hover:bg-[var(--vscode-list-hoverBackground)] hover:opacity-70 ${props.className}`}
         >
            {props.icon}
            <span className="truncate">{props.label}</span>
         </button>
      )
   }

   export function KnowledgeBaseItem({ id }: { id: string }) {
      const kb = useSelector((state: RootState) => selectKnowledgebaseById(state, id))
      const dispatch = useDispatch()

      if (!kb) return null

      const getIcon = () => {
         const ICONS: Record<KnowledgebaseType, React.ReactNode> = {
            codebase: <Code2 className="w-5 h-5 text-[var(--vscode-foreground)]" />,
            docs: <Book className="w-5 h-5 text-[var(--vscode-foreground)]" />,
            git: <GitBranch className="w-5 h-5 text-[var(--vscode-foreground)]" />,
            swagger: <LucideAppWindowMac className="w-5 h-5 text-[var(--vscode-foreground)]" />,
         }
         return ICONS[kb.type]
      }

      return (
         <div className="flex items-center justify-between py-2 px-2 hover:bg-[var(--vscode-list-hoverBackground)] rounded-md">
            <div className="flex items-center gap-2">
               <div className="transition-all duration-200 hover:text-[var(--vscode-focusBorder)]">
                  {getIcon()}
               </div>
               <div>
                  <div className="font-medium">{kb.name}</div>
               </div>
            </div>
         </div>
      )
   }

   export function RecentChatItem({
      id,
      preview,
      updatedAt,
   }: {
      id: string
      preview: string
      updatedAt: number
   }) {
      const dispatch = useDispatch()
      const currentChatID = useSelector(selectCurrentChatID)
      const isActive = id === currentChatID
      const [isLoading, setIsLoading] = useState(false)

      const handleClick = async () => {
         setIsLoading(true)

         try {
            const chatData = await Algorithms.fetchAndTransformChat(id)

            // Load the chat from cloud using addChat
            dispatch(addChat(chatData))

            // Set as current chat
            dispatch(setCurrentChatID(id))
         } catch (error) {
            console.error("Failed to fetch chat:", error)
         } finally {
            setIsLoading(false)
         }
      }

      // Semantic time formatter
      const getSemanticTime = (timestamp: number) => {
         const date = new Date(timestamp)
         const now = new Date()

         const diffMs = now.getTime() - date.getTime()
         const diffMinutes = diffMs / (1000 * 60)

         if (diffMinutes < 1) return "just now"
         if (diffMinutes < 60) return "this hour"
         if (diffMinutes < 120) return "last hour"

         const isToday = date.toDateString() === now.toDateString()
         const yesterday = new Date()
         yesterday.setDate(now.getDate() - 1)
         const isYesterday = date.toDateString() === yesterday.toDateString()

         if (isToday) return "today"
         if (isYesterday) return "yesterday"

         return date.toLocaleDateString()
      }

      const lastUsedLabel = getSemanticTime(updatedAt)

      return (
         <div
            onClick={handleClick}
            className={`flex items-center justify-between py-2 px-2 ${isActive ? "bg-[var(--vscode-list-activeSelectionBackground)]" : "hover:bg-[var(--vscode-list-hoverBackground)]"} rounded-md cursor-pointer ${isLoading ? "opacity-50 cursor-wait" : ""}`}
         >
            <div className="flex items-center gap-2">
               <div className="transition-all duration-200 hover:text-[var(--vscode-focusBorder)]">
                  {isLoading ? (
                     <Loader2 className="w-5 h-5 animate-spin text-[var(--vscode-foreground)]" />
                  ) : (
                     <MessageSquare className="w-5 h-5 text-[var(--vscode-foreground)]" />
                  )}
               </div>
               <div>
                  <div className="font-medium truncate max-w-[180px]">{preview}</div>
               </div>
            </div>
            <div className="text-xs text-[var(--vscode-descriptionForeground)]">{lastUsedLabel}</div>
         </div>
      )
   }
}

export default function ChatHome() {
   const navigate = useNavigate()
   const currentChatID = useSelector(selectCurrentChatID)
   const recentChats = useSelector(selectRecentChats)
   const hasLoadedCloudChats = useSelector(selectHasLoadedCloudChats)
   const messages = useSelector((state: RootState) => selectChatMessages(state, currentChatID))
   const frequentlyUsedKBs = useSelector(selectFrequentlyUsedKnowledgebases)

   if (!currentChatID || !messages) return null

   return (
      <div className="pr-4 pl-4 flex flex-col h-full overflow-x-auto">
         {/* Chat Input */}
         <div className="mb-3 mt-2">
            <ChatInput />
         </div>
         {/* Quick Actions */}
         <div className="flex justify-between gap-2 mb-6 overflow-x-auto">
            <Components.QuickActionButton
               icon={<Bug className="w-4 h-4" />}
               label="Debug"
               onClick={() => navigate("/agents/debug")}
               className="border-2 border-[var(--vscode-button-background)] bg-[var(--vscode-input-background)] hover:bg-[#e0e7ef] focus:bg-transparent active:bg-transparent"
            />
            <Components.QuickActionButton
               icon={<Sparkles className="w-4 h-4" />}
               label="Optimize"
               onClick={() => navigate("/agents/optimize")}
               className="border-2 border-[var(--vscode-button-background)] bg-[var(--vscode-input-background)] hover:bg-[#e0e7ef] focus:bg-transparent active:bg-transparent "
            />
            <Components.QuickActionButton
               icon={<Book className="w-4 h-4" />}
               label="Reviews"
               onClick={() => navigate("/agents/review")}
               className="border-2 border-[var(--vscode-button-background)] bg-[var(--vscode-input-background)] hover:bg-[#e0e7ef] focus:bg-transparent active:bg-transparent "
            />
            <Components.QuickActionButton
               icon={<CheckSquare className="w-4 h-4" />}
               label="Test Cases"
               onClick={() => navigate("/agents/testcases")}
               className="border-2 border-[var(--vscode-button-background)] bg-[var(--vscode-input-background)] hover:bg-[#e0e7ef] focus:bg-transparent active:bg-transparent "
            />
         </div>

         {/* Recent Chats Section */}
         <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
               <h2 className="text-sm font-semibold text-[var(--vscode-foreground)] opacity-40">
                  Recent Chats
               </h2>
               <div className="flex items-center gap-2">
                  {!hasLoadedCloudChats && (
                     <Loader2 className="text-[var(--vscode-descriptionForeground)] animate-spin" size={12} />
                  )}
                  <button
                     onClick={() => navigate("/history")}
                     className="flex items-center gap-1 text-sm text-[var(--vscode-descriptionForeground)] transition-colors hover:bg-white/10 rounded-md p-1"
                  >
                     <LucideArrowRight size={14} />
                  </button>
               </div>
            </div>
            <div className="space-y-1">
               {recentChats.length > 0 ? (
                  recentChats.map((chat) => (
                     <Components.RecentChatItem
                        key={chat.id}
                        id={chat.id}
                        preview={chat.title}
                        updatedAt={chat.updatedAt}
                     />
                  ))
               ) : (
                  <div className="text-sm text-[var(--vscode-descriptionForeground)] py-2">
                     No recent chats found. Start a new conversation!
                  </div>
               )}
            </div>
         </div>

         {/* Frequently Used Knowledge Base Section */}
         <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
               <h2 className="text-sm font-semibold text-[var(--vscode-foreground)] opacity-40">
                  Knowledge Base
               </h2>
               <button
                  onClick={() => navigate("/knowledgebases")}
                  className="flex items-center gap-1 text-sm text-[var(--vscode-descriptionForeground)] transition-colors hover:bg-white/10 rounded-md p-1"
               >
                  <LucideArrowRight size={14} />
               </button>
            </div>
            <div className="space-y-1">
               {frequentlyUsedKBs.map((kb) => (
                  <Components.KnowledgeBaseItem key={kb.id} id={kb.id} />
               ))}
            </div>
         </div>

         {/* Tips Section - Sticky at bottom */}
         <div className="mt-auto pt-6 bottom-0 pb-4">
            <h2 className="text-sm font-semibold text-[var(--vscode-foreground)] opacity-40 mb-4">
               Resources
            </h2>
            <div className="space-y-3">
               <a
                  href="http://www.codemate.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--vscode-textLink-foreground)] hover:text-[var(--vscode-textLink-activeForeground)] hover:underline transition-colors"
               >
                  <ExternalLink className="w-4 h-4" />
                  <span>What is Codemate.ai?</span>
               </a>
               <a
                  href="https://www.youtube.com/watch?v=LjO88KyFE-4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--vscode-textLink-foreground)] hover:text-[var(--vscode-textLink-activeForeground)] hover:underline transition-colors"
               >
                  <Play className="w-4 h-4" />
                  <span>How to use CodeMate.ai?</span>
               </a>
               <a
                  href="https://www.youtube.com/watch?v=D3HVb1E8cSU"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--vscode-textLink-foreground)] hover:text-[var(--vscode-textLink-activeForeground)] hover:underline transition-colors"
               >
                  <Play className="w-4 h-4" />
                  <span>CodeMate.ai Build Tutorial</span>
               </a>
            </div>
         </div>
      </div>
   )
}

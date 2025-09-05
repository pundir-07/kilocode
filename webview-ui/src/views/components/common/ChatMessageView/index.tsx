import { memo, useCallback, useMemo, useRef } from "react"
import { shallowEqual, useDispatch, useSelector } from "react-redux"

import { PRODUCT_NAME } from "@/common/core/constants"
import { ChatFuncionalState } from "@/common/types/chat"
import { RootState } from "@/views/lib/store"
import {
   selectChatFunctionalState,
   selectChatMessages,
   selectCurrentChat,
   selectCurrentChatID,
   selectFollowups,
   setNextFollowup,
} from "@/views/lib/store/chatSlice"
import { AlertCircle, ArrowUpRight, BugIcon, Grid, Loader2, Notebook, SparklesIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { ChatMessage } from "../ChatMessage"

namespace Components {
   export function NoChat() {
      const navigate = useNavigate()

      const actions = useMemo(
         () => [
            {
               icon: <BugIcon className="w-5 h-5" />,
               title: "Debug Code Agent",
               description: "Debug your code with the help of our debug agent.",
               link: "/agents/debug",
            },
            {
               icon: <SparklesIcon className="w-5 h-5" />,
               title: "Optimize Code Agent",
               description: "Optimize your code with the help of our optimize agent.",
               link: "/agents/optimize",
            },
            {
               icon: <Notebook className="w-5 h-5" />,
               title: "Code Review Agent",
               description: "Review your code with the help of our review agent.",
               link: "/agents/review",
            },
            {
               icon: <Grid className="w-5 h-5" />,
               title: "Test Cases",
               description: "Generate high quality test cases efficiently for your codebase",
               link: "/agents/testcases",
            },
         ],
         []
      )

      return (
         <div className="flex flex-col items-center justify-end h-full">
            <img
               src="https://drive.codemate.ai/cmdark.png"
               alt={PRODUCT_NAME}
               className="h-11 min-h-11 max-h-11 mb-2"
            />

            {/* Responsive grid layout for additional information cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 w-full px-6">
               {actions.map((action) => (
                  <div
                     key={action.title}
                     className="grid grid-cols-[1rem,1fr] gap-4 items-start p-3 rounded-xl bg-[var(--vscode-input-background)] cursor-pointer"
                     onClick={() => navigate(action.link)}
                  >
                     <div className="mt-1">{action.icon}</div>
                     <div>
                        <h3 className="text-lg mb-1 font-bold">{action.title}</h3>
                        <p className="text-sm opacity-60">{action.description}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )
   }

   export function ChatStateIndicator({ state }: { state: ChatFuncionalState }) {
      const lastMessage = useSelector(
         (state: RootState) => selectChatMessages(state, selectCurrentChat(state).id)?.slice(-1)?.[0]
      )

      if (
         state === ChatFuncionalState.WAITING ||
         (state === ChatFuncionalState.WORKING &&
            (lastMessage.role !== "assistant" ||
               (lastMessage.role === "assistant" && !lastMessage.content.trim()))) // last assistant message's main content is empty
      ) {
         return (
            <div className="flex items-center gap-2 pr-4 mt-2 text-sm opacity-50">
               <Loader2 className="w-4 h-4 animate-spin" />
               <span>Working...</span>
            </div>
         )
      }

      if (
         state === ChatFuncionalState.IDLE ||
         state === ChatFuncionalState.SUCCESS ||
         state === ChatFuncionalState.WORKING
      ) {
         return null
      }

      if (state === ChatFuncionalState.ERROR) {
         return (
            <div className="flex items-center gap-3 p-3 ml-5 mt-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
               <AlertCircle className="w-4 h-4 flex-shrink-0" />
               <span>Sorry, an error occurred. Please try sending your message again.</span>
            </div>
         )
      }

      return null
   }
}

export const ChatMessageView = memo(function ChatMessageView() {
   const dispatch = useDispatch()
   const chatID = useSelector(selectCurrentChatID)
   const messagesViewRef = useRef<HTMLDivElement>(null)
   const messagesLength = useSelector((state: RootState) => selectChatMessages(state, chatID).length)
   const chatState = useSelector((state: RootState) => selectChatFunctionalState(state, chatID))

   const followups: string[] = useSelector((state: RootState) => {
      const chatState = selectChatFunctionalState(state, chatID)
      if (chatState !== ChatFuncionalState.IDLE) return []

      const followups = selectFollowups(state, chatID)
      return followups
   }, shallowEqual)

   const handleFollowupClick = useCallback(
      (followup: string) => dispatch(setNextFollowup({ content: followup })),
      [dispatch]
   )

   console.log("RE-RENDER CHAT VIEW")

   if (!messagesLength) return <Components.NoChat />

   return (
      <div id="chat-view" key={chatID} ref={messagesViewRef} className="overflow-y-auto p-4 flex flex-col">
         {Array.from({ length: messagesLength }, (_, i) => (
            <ChatMessage key={i} index={i} chatID={chatID} />
         ))}

         {/* Chat functional state indicator */}
         {chatState && <Components.ChatStateIndicator state={chatState} />}

         {followups.length > 0 && (
            <div className="flex flex-col gap-2 overflow-x-auto mt-2">
               {followups.map((followup, index) => (
                  <button
                     key={index}
                     onClick={() => handleFollowupClick(followup)}
                     className="group w-fit flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-[var(--vscode-panel-border)] bg-[var(--vscode-input-background)] hover:bg-[var(--vscode-editor-background)] text-[var(--vscode-button-foreground)] transition-colors text-left"
                  >
                     <span className="text-ellipsis opacity-50">{followup}</span>
                     <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
               ))}
            </div>
         )}
      </div>
   )
})

// ------------------------------------------------------------------------------------------------
// Plain JS auto-scroll logic (no React hooks/effects)
// Requirements:
//  - Auto-scroll to bottom as new messages arrive while user is at (or near) bottom.
//  - If user manually scrolls up, stop auto-scrolling.
//  - If user scrolls back to the bottom, re-enable auto-scroll.
// Implementation details:
//  - Uses a MutationObserver to detect new/changed DOM under #chat-view.
//  - Tracks a boolean autoScrollEnabled that is true only when the user is at the bottom area.
//  - 'Bottom area' defined by a threshold (few pixels) from the true bottom.
//  - Completely avoids any React lifecycle APIs; runs once when this module is evaluated.
//  - Re-detects container if it gets replaced (e.g., chat switched) by polling via rAF.
// ------------------------------------------------------------------------------------------------

declare global {
   interface Window {
      __CODEMATE_CHAT_AUTOSCROLL_INIT__?: boolean
   }
}

if (typeof window !== "undefined" && !window.__CODEMATE_CHAT_AUTOSCROLL_INIT__) {
   window.__CODEMATE_CHAT_AUTOSCROLL_INIT__ = true
   ;(function setupChatAutoScroll() {
      const SCROLL_THRESHOLD_PX = 8
      let autoScrollEnabled = true
      let container: HTMLElement | null = null
      let observer: MutationObserver | null = null
      let lastContainer: HTMLElement | null = null

      const isAtBottom = (el: HTMLElement) =>
         el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD_PX

      const scrollToBottom = (el: HTMLElement) => {
         // Use requestAnimationFrame to ensure layout after mutations
         requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight
         })
      }

      const handleScroll = () => {
         if (!container) return
         if (isAtBottom(container)) {
            autoScrollEnabled = true
         } else {
            autoScrollEnabled = false
         }
      }

      const attachObserver = () => {
         if (!container) return
         if (observer) observer.disconnect()
         observer = new MutationObserver(() => {
            if (!container) return
            if (autoScrollEnabled) scrollToBottom(container)
         })
         observer.observe(container, { childList: true, subtree: true })
      }

      const initOrUpdate = () => {
         const current = document.getElementById("chat-view") as HTMLElement | null
         if (!current) {
            // Try again next frame until the chat view exists
            requestAnimationFrame(initOrUpdate)
            return
         }

         // If container changed (e.g., different chat ID resulted in a new node)
         if (current !== lastContainer) {
            // Detach old listeners
            if (lastContainer) lastContainer.removeEventListener("scroll", handleScroll)

            container = current
            lastContainer = current
            autoScrollEnabled = true // reset on new container
            container.addEventListener("scroll", handleScroll, { passive: true })
            attachObserver()
            // Initial scroll to bottom after a new container appears
            scrollToBottom(container)
         }

         // Continue polling for container replacement (cheap - single rAF)
         requestAnimationFrame(initOrUpdate)
      }

      initOrUpdate()
   })()
}

// ------------------------------------------------------------------------------------------------

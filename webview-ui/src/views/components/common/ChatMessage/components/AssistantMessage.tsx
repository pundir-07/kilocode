import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"

import { API } from "@/common/api"
import { DEFAULT_CHAT_MODEL } from "@/common/core/constants"
import { AssistantChatMessage_t, ChatFuncionalState, ChatMode } from "@/common/types/chat"
import { ask_for_input } from "@/views/lib/events/misc"
import { RootState } from "@/views/lib/store"
import {
   addChat,
   selectChat,
   selectChatFunctionalState,
   selectChatMessage,
   selectChatUsage,
   setCurrentChatID,
} from "@/views/lib/store/chatSlice"
import { selectSessionID } from "@/views/lib/store/globalSlice"
import { ChevronDown, ChevronRight, CopyIcon, GitBranch, Loader2, ThumbsDown, ThumbsUp } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import RichMessage from "../../RichMessage"

type ThinkingHandle = {
   setExpanded: (expanded: boolean) => void
   setIsRunning: (isRunning: boolean) => void
}

namespace Components {
   export const CircularProgress = memo((props: { percent: number; size?: number; showLabel?: boolean }) => {
      const size = props.size ?? 20
      const strokeWidth = 2
      const radius = (size - strokeWidth) / 2
      const circumference = 2 * Math.PI * radius
      const clamped = Math.min(100, Math.max(0, props.percent))
      const offset = circumference - (clamped / 100) * circumference
      return (
         <div style={{ width: size, height: size }} className="relative">
            <svg width={size} height={size} className="rotate-[-90deg]">
               <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="var(--vscode-editorWidget-border)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="opacity-20"
               />
               <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="var(--vscode-foreground)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-[stroke-dashoffset] duration-300 ease-linear opacity-70"
               />
            </svg>
            {props.showLabel && (
               <div className="absolute inset-0 flex items-center justify-center text-[9px] font-medium select-none opacity-60">
                  {Math.round(clamped)}%
               </div>
            )}
         </div>
      )
   })
   export const Thinking = forwardRef<ThinkingHandle, { reasoning: string; chatID: string }>(
      ({ reasoning, chatID }, ref) => {
         const contentRef = useRef<HTMLDivElement>(null)
         const [isExpanded, setIsExpanded] = useState(true)
         const [isRunning, setIsRunning] = useState(false)
         const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
         const chatFunctionalState = useSelector((state: RootState) =>
            selectChatFunctionalState(state, chatID)
         )

         useImperativeHandle(ref, () => ({
            setExpanded: (expanded: boolean) => {
               setIsExpanded(expanded)
            },
            setIsRunning: (isRunning: boolean) => {
               setIsRunning(isRunning)
            },
         }))

         const isScrollable = contentRef.current ? contentRef.current.scrollHeight > 200 : false

         const handleScroll = useCallback(() => {
            const container = contentRef.current
            if (container) {
               const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 5
               if (atBottom) {
                  setUserHasScrolledUp(false)
               } else {
                  setUserHasScrolledUp(true)
               }
            }
         }, [])

         useEffect(() => {
            const container = contentRef.current
            if (container && isExpanded) {
               if (!userHasScrolledUp) {
                  setTimeout(() => {
                     if (contentRef.current) {
                        contentRef.current.scrollTop = contentRef.current.scrollHeight
                     }
                  }, 0)
               }
            }
         }, [reasoning, isExpanded, userHasScrolledUp])

         if (!reasoning?.length) return null

         return (
            <div className="">
               <div className="flex items-center justify-between py-2">
                  <div
                     className="inline-flex items-center cursor-pointer opacity-50"
                     onClick={() => setIsExpanded((x) => !x)}
                  >
                     <button className="focus:outline-none mr-1">
                        {isRunning && chatFunctionalState === ChatFuncionalState.WORKING ? (
                           <Loader2 size={14} className="animate-spin" />
                        ) : isExpanded ? (
                           <ChevronDown size={16} />
                        ) : (
                           <ChevronRight size={16} />
                        )}
                     </button>
                     <span className="text-sm font-medium">
                        {isRunning && chatFunctionalState === ChatFuncionalState.WORKING
                           ? "Thinking..."
                           : "Thought"}
                     </span>
                  </div>
               </div>
               {isExpanded && (
                  <div className="relative pl-4 mb-4">
                     <div
                        ref={contentRef}
                        onScroll={handleScroll}
                        className="whitespace-pre-wrap text-sm h-full overflow-y-auto p-1 opacity-70"
                        style={{ maxHeight: "200px" }}
                     >
                        {reasoning}
                     </div>
                     {isScrollable && (
                        <>
                           <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-[var(--vscode-sideBar-background)] to-transparent pointer-events-none" />
                           <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-[var(--vscode-sideBar-background)] to-transparent pointer-events-none" />
                        </>
                     )}
                  </div>
               )}
            </div>
         )
      }
   )

   export const Actions = memo(function AssistantMessageActions(props: {
      chatID: string
      messageIndex: number
   }) {
      const dispatch = useDispatch()
      const navigate = useNavigate()

      const session = useSelector(selectSessionID)
      const [isForking, setIsForking] = useState(false)
      const [hasCopied, setHasCopied] = useState(false)
      const [feedback, setFeedback] = useState<"up" | "down" | null>(null)

      const chatUsage = useSelector(selectChatUsage)
      const currentChat = useSelector((state: RootState) => selectChat(state, props.chatID))
      const isLastMessage = props.messageIndex === currentChat.messages.length - 1
      const isForkable = currentChat.mode !== ChatMode.ECO && chatUsage.used / chatUsage.limit > 0.9

      const handleFeedback = useCallback(
         async (type: "up" | "down") => {
            setFeedback(type)

            let comments = ""
            // if downvote, ask for additional comments
            if (type === "down") {
               const input = await ask_for_input(
                  "Feedback",
                  "Please provide additional comments for your feedback",
                  "Comments",
                  "",
                  true
               )
               // if user cancels, do not submit
               if (input === null) return
               comments = input
            }

            try {
               await API.BACKEND.post(
                  "/feedback",
                  {
                     conversation_id: props.chatID,
                     message_index: props.messageIndex,
                     feedback: type,
                     comments: comments,
                  },
                  { headers: { "x-session": session } }
               )
            } catch (e) {
               console.error("Failed to submit feedback", e)
            }
         },
         [props.chatID, props.messageIndex]
      )

      if (!isLastMessage || currentChat.state === ChatFuncionalState.WORKING) return null

      return (
         <div className="flex items-center justify-between mt-2 opacity-70 p-1">
            <div className="flex items-center gap-2">
               <button
                  className="flex items-center justify-center text-xs w-7 h-7 rounded-md hover:bg-[var(--vscode-list-hoverBackground)] transition-colors"
                  title={hasCopied ? "Copied" : "Copy message"}
                  onClick={async () => {
                     try {
                        const message = currentChat?.messages[props.messageIndex]

                        let messageContent: string = ""
                        if (Array.isArray(message.content)) {
                           for (const content of message.content) {
                              if (content.type !== "text") continue
                              messageContent += content.text
                           }
                        } else {
                           messageContent = message.content
                        }

                        await navigator.clipboard.writeText(messageContent.trim())
                        setHasCopied(true)
                        setTimeout(() => setHasCopied(false), 1500)
                     } catch (e) {
                        console.error("Failed to copy message", e)
                     }
                  }}
               >
                  <CopyIcon className="w-4 h-4" />
               </button>
               {/* Upvote */}
               <button
                  className="flex items-center justify-center text-xs w-7 h-7 rounded-md hover:bg-[var(--vscode-list-hoverBackground)] transition-colors"
                  title="Upvote"
                  onClick={() => handleFeedback("up")}
               >
                  <ThumbsUp className={`w-4 h-4 ${feedback === "up" ? "text-green-500" : ""}`} />
               </button>
               {/* Downvote */}
               <button
                  className="flex items-center justify-center text-xs w-7 h-7 rounded-md hover:bg-[var(--vscode-list-hoverBackground)] transition-colors"
                  title="Downvote"
                  onClick={() => handleFeedback("down")}
               >
                  <ThumbsDown className={`w-4 h-4 ${feedback === "down" ? "text-red-500" : ""}`} />
               </button>
               {isForkable && (
                  <button
                     className="flex items-center justify-center text-xs w-7 h-7 rounded-md hover:bg-[var(--vscode-list-hoverBackground)] transition-colors disabled:opacity-50"
                     title="Fork conversation from this message"
                     disabled={isForking}
                     onClick={async () => {
                        if (isForking) return
                        setIsForking(true)
                        try {
                           const { data, status } = await API.BACKEND_LOCAL.post<{ chat_id: string }>(
                              "/chat/fork",
                              { chat_id: props.chatID, message_index: props.messageIndex }
                           )
                           if (status !== 200 || !data.chat_id) throw new Error("Fork failed")

                           // Fetch newly forked chat contents
                           const forkID = data.chat_id
                           const historyRes = await API.BACKEND_LOCAL.get<{
                              status: string
                              data: {
                                 conversation_id: string
                                 messages: any[]
                                 title: string
                                 updated_at: number
                                 usage: { used: number; limit: number }
                              }
                           }>(`/chat/history/${forkID}`)
                           if (historyRes.status !== 200 || historyRes.data.status !== "success") {
                              throw new Error("Failed to load forked chat")
                           }
                           const chatData = historyRes.data.data
                           dispatch(
                              addChat({
                                 id: chatData.conversation_id,
                                 messages: chatData.messages || [],
                                 updatedAt: chatData.updated_at,
                                 title: chatData.title || "Forked Chat",
                                 mode: currentChat?.mode || ChatMode.NORMAL,
                                 model: currentChat?.model || DEFAULT_CHAT_MODEL,
                                 isWebSearchEnabled: currentChat?.isWebSearchEnabled || false,
                                 state: ChatFuncionalState.IDLE,
                                 followups: [],
                                 usage: chatData.usage || { used: 0, limit: 0 },
                                 isContinueRequired: false,
                              })
                           )
                           dispatch(setCurrentChatID(chatData.conversation_id))
                           navigate("/chat")
                        } catch (error) {
                           console.error(error)
                        } finally {
                           setIsForking(false)
                        }
                     }}
                  >
                     {isForking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                        <GitBranch className="w-4 h-4" />
                     )}
                  </button>
               )}
            </div>
            <div
               title={`${Math.round(chatUsage.used / 1000)}k tokens used out of ${Math.round(chatUsage.limit / 1000)}k context window`}
               className="font-mono text-sm opacity-70 whitespace-nowrap"
            >
               {Math.round(chatUsage.used / 1000)}k/{Math.round(chatUsage.limit / 1000)}k
            </div>
         </div>
      )
   })
}

export default memo(function AssistantMessage(props: { chatID: string; messageIndex: number }) {
   const thinkingRef = useRef<ThinkingHandle>(null)
   const message: AssistantChatMessage_t | undefined = useSelector(
      (state: RootState) =>
         selectChatMessage(state, props.chatID, props.messageIndex) as AssistantChatMessage_t
   )
   const [hasClosedThinking, setHasClosedThinking] = useState(false)

   useEffect(() => {
      if (message?.content) {
         if (!hasClosedThinking) {
            thinkingRef.current?.setExpanded(false)
            thinkingRef.current?.setIsRunning(false)
            setHasClosedThinking(true)
         }
      } else {
         thinkingRef.current?.setIsRunning(true)
      }
   }, [message?.content, hasClosedThinking])

   const doRenderLogo = useSelector((state: RootState) => {
      const previousMessage = selectChatMessage(state, props.chatID, props.messageIndex - 1)
      if (!previousMessage) return false

      return previousMessage.role === "user"
   })

   if (!message || message.tool_calls) return null

   return (
      <div className="flex flex-col relative" style={{ zoom: 0.95, opacity: 0.92 }}>
         <Components.Thinking ref={thinkingRef} reasoning={message.reasoning_content} chatID={props.chatID} />
         <div className="bg-transparent border-none rounded-md whitespace-nowrap text-[var(--vscode-foreground)] overflow-x-auto">
            <div className="text-[14px] leading-relaxed text-[var(--vscode-foreground)] whitespace-pre-wrap">
               <RichMessage content={message.content} />
            </div>
            {/* Action buttons */}
            <Components.Actions chatID={props.chatID} messageIndex={props.messageIndex} />
         </div>
      </div>
   )
})

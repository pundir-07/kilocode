import { ChatFuncionalState, ChatMode } from "@/common/types/chat"
import ChatModeSelector from "@/views/components/common/ChatModeSelector"
import ImageAttachmentButton from "@/views/components/common/ImageAttachmentSelector"
import ModelSelector from "@/views/components/common/ModelSelector"
import { MenuNode_t } from "@/views/components/common/PromptEditor/types"
import { UpgradePopup } from "@/views/components/common/UpgradePopup"
import { RootState } from "@/views/lib/store"
import {
   selectChatFunctionalState,
   selectChatHasMessages,
   selectChatMode,
   selectChatModel,
   selectChatWebSearchEnabled,
   selectCurrentChat,
   selectIsChatContinueRequired,
   selectIsChatWorking,
   selectIsUploadingImaage,
   setChatMode,
   setChatModel,
   setChatWebSearchEnabled,
} from "@/views/lib/store/chatSlice"
import { selectPlan } from "@/views/lib/store/globalSlice"
import { selectKnowledgebaseState } from "@/views/lib/store/knowledgebasesSlice"
import { Globe2, SendHorizonal, StopCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import ChatEditor, { ChatEditorRef } from "./editor"

export default function ChatInput(props: { className?: string }) {
   const upgradeButtonRef = useRef<HTMLButtonElement>(null)
   const chatEditorRef = useRef<ChatEditorRef>(null)
   const [showUpgradePopup, setShowUpgradePopup] = useState(false)
   const [hasContent, setHasContent] = useState(false)
   const [isStopping, setIsStopping] = useState(false)
   const dispatch = useDispatch()
   const plan = useSelector(selectPlan)
   const isWorking = useSelector(selectIsChatWorking)
   const chatMode = useSelector(selectChatMode)
   const selectedModel = useSelector(selectChatModel)
   const webSearchEnabled = useSelector(selectChatWebSearchEnabled)
   const isChatContinueRequired = useSelector(selectIsChatContinueRequired)
   const hasMessages = useSelector(selectChatHasMessages)
   const currentChat = useSelector(selectCurrentChat)
   const chatFunctionalState = useSelector((store: RootState) =>
      selectChatFunctionalState(store, currentChat?.id)
   )
   const isUploadingImage = useSelector(selectIsUploadingImaage)

   const handleSend = async () => {
      await chatEditorRef.current?.send()

      // Scroll to bottom after sending message
      setTimeout(() => {
         const chatContainer = document.querySelector(".overflow-auto")
         if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight
         }
      }, 100)
   }
   const handleAddImageItem = (item: MenuNode_t) => {
      chatEditorRef.current?.addItem(item)
   }
   const handleUpdateImageITem = (item: MenuNode_t) => {
      chatEditorRef.current?.updateItem(item)
   }
   const handleContinue = () => {}

   // Check content periodically to update button state
   const checkContent = () => {
      const contentExists = chatEditorRef.current?.hasContent() || false
      setHasContent(contentExists)
   }

   // Use useEffect to check content on mount and set up interval
   useEffect(() => {
      const interval = setInterval(checkContent, 100) // Check every 100ms
      return () => clearInterval(interval)
   }, [])

   // As soon as the chat is stopped, set isStopping to false
   useEffect(() => {
      if (!isWorking) {
         setIsStopping(false)
      }
   }, [isWorking])

   // Listen for programmatic send trigger
   useEffect(() => {
      const handler = () => {
         if (chatEditorRef.current?.hasContent()) {
            handleSend()
         }
      }

      window.addEventListener("codemate_send_current_chat", handler)
      return () => window.removeEventListener("codemate_send_current_chat", handler)
   }, [])

   useEffect(() => {
      if (chatFunctionalState !== ChatFuncionalState.IDLE) return
      setIsStopping(false)
   }, [chatFunctionalState])

   return (
      <div className={props.className}>
         <div className="border border-[var(--vscode-panel-border)] rounded-md bg-[var(--vscode-input-background)]">
            <ChatEditor ref={chatEditorRef} />
            <div className="flex justify-between items-center gap-2 p-2 border-t border-[var(--vscode-panel-border)]">
               {/* Secondary Actions */}
               <div className="flex gap-2 items-center justify-center w-min">
                  {/* Chat Mode Selector */}
                  <ChatModeSelector
                     disabled={hasMessages}
                     currentMode={chatMode}
                     onModeChange={(mode) => dispatch(setChatMode({ mode }))}
                  />
                  {/* Model Selector */}
                  {chatMode === ChatMode.NORMAL && (
                     <div className="flex-none">
                        <ModelSelector
                           currentSelection={selectedModel}
                           onSelectionChange={(model) => dispatch(setChatModel({ model }))}
                        />
                     </div>
                  )}
               </div>
               {/* Primary Actions */}
               <div className="flex gap-2 items-center justify-center w-min">
                  {/* Send Button */}
                  {isWorking ? (
                     <div className="flex items-center justify-center">
                        <button
                           onClick={() => {
                              setIsStopping(true)

                              currentChat?.abortController?.abort()
                           }}
                           disabled={isStopping}
                           className={`flex items-center gap-1 p-1.5 w-min rounded-lg bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] whitespace-nowrap ${
                              isStopping ? "opacity-50 !cursor-progress" : ""
                           }`}
                        >
                           <StopCircle className="w-5 h-5" />
                           {!isStopping && <span className="text-sm whitespace-nowrap">Stop</span>}
                        </button>
                     </div>
                  ) : (
                     <>
                        <ImageAttachmentButton
                           onAddImageItem={handleAddImageItem}
                           onUpdateImageItem={handleUpdateImageITem}
                           getContextItems={chatEditorRef.current?.getContextItems}
                        />
                        {chatMode !== ChatMode.ECO && false && 
                           (plan?.base.limits.access.internet_search ? (
                              <div className="flex items-center gap-2">
                                 <button
                                    title="Enable/disable web search"
                                    onClick={() =>
                                       dispatch(setChatWebSearchEnabled({ enabled: !webSearchEnabled }))
                                    }
                                    className={`flex-none flex items-center gap-1 p-1.5 w-min rounded-md ${
                                       webSearchEnabled
                                          ? "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]"
                                          : "bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
                                    } whitespace-nowrap`}
                                 >
                                    <Globe2 className="w-5 h-5" />
                                    {webSearchEnabled && (
                                       <span className="text-sm whitespace-nowrap">Search</span>
                                    )}
                                 </button>
                              </div>
                           ) : (
                              <div className="relative">
                                 <UpgradePopup
                                    isOpen={showUpgradePopup}
                                    onClose={() => setShowUpgradePopup(false)}
                                    title="✨ Upgrade to Enable Web Search"
                                    description="Get access to real-time web search capabilities to enhance your AI assistant's knowledge."
                                    triggerRef={upgradeButtonRef}
                                    width={300}
                                 />
                                 <button
                                    ref={upgradeButtonRef}
                                    title="Web search (Pro feature)"
                                    onClick={() => setShowUpgradePopup(!showUpgradePopup)}
                                    className="flex-none flex items-center gap-1 p-1.5 w-min rounded-md bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] whitespace-nowrap opacity-50"
                                 >
                                    <Globe2 className="w-5 h-5" />
                                 </button>
                              </div>
                           ))}
                        {isChatContinueRequired && (
                           <button
                              title="Continue"
                              onClick={handleContinue}
                              className="flex-none flex items-center gap-1 p-1.5 w-min rounded-md bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] whitespace-nowrap"
                           >
                              <span className="text-sm whitespace-nowrap">Continue?</span>
                           </button>
                        )}
                        <button
                           id="chat-send-button"
                           onClick={handleSend}
                           disabled={!hasContent || isWorking || isUploadingImage}
                           className="flex-none p-1.5 w-min rounded-md bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] whitespace-nowrap disabled:opacity-50"
                        >
                           <SendHorizonal className="w-5 h-5" />
                        </button>
                     </>
                  )}
               </div>
            </div>
         </div>
      </div>
   )
}

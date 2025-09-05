import { parseContext } from "@/views/components/common/PromptEditor/utils/transform"
import { RootState } from "@/views/lib/store"
import { selectChatMessage } from "@/views/lib/store/chatSlice"
import { selectUser } from "@/views/lib/store/globalSlice"
import * as React from "react"
import { memo } from "react"
import { shallowEqual, useSelector } from "react-redux"

const contextPillStyle: React.CSSProperties = {
   // backgroundColor: "#0b1e32",
   color: "var(--vscode-button-foreground)",
   padding: "2px 6px",
   borderRadius: "3px",
   display: "inline-block",
   margin: "2px 2px 2px 0",
   fontSize: "0.75rem",
   border: "1px solid var(--vscode-button-border)",
}

const mentionStyle: React.CSSProperties = {
   backgroundColor: "#0b1e32",
   color: "var(--vscode-button-foreground)",
   padding: "2px 4px",
   borderRadius: "3px",
   display: "inline-block",
   marginRight: "2px",
   fontSize: "0.98rem",
}

export default memo(function UserMessage(props: { chatID: string; messageIndex: number }) {
   const currentUser = useSelector((state: RootState) => {
      const user = selectUser(state)
      if (!user) return null
      return {
         dp: user.personal.avatar || (window as any).genericUserDP,
         name: user.personal.name,
      }
   }, shallowEqual)

   const { renderedContent, contextItems, isSummary } = useSelector((state: RootState) => {
      const message = selectChatMessage(state, props.chatID, props.messageIndex)
      if (!message) return { renderedContent: "", contextItems: [], isSummary: false }

      const contextItems: Array<{ name: string; content: string; type: string }> = []
      // console.log("User Message = ",message)
      let messageContent: string = ""
      if (Array.isArray(message.content)) {
         for (const content of message.content) {
            if (content.type === "text") {
               messageContent += content.text
               continue
            }
         }
      } else {
         messageContent = message.content
      }
      if (message.role === "user" && message.context) {
         for (const context of message.context) {
            if (context.type === "image") {
               contextItems.push({
                  name: context.name,
                  content: context.content,
                  type: "image",
               })
            }
         }
      }
      // Detect <summary>...</summary> wrapper
      let isSummary = false
      const trimmed = messageContent.trim()
      if (trimmed.startsWith("<summary>") && trimmed.endsWith("</summary>")) {
         isSummary = true
         // Remove the outer summary tags but keep inner spacing (trim only the tags)
         messageContent = trimmed
            .replace(/^<summary>/, "")
            .replace(/<\/summary>$/, "")
            .trimStart()
      }

      const parts = messageContent.split(/(<cm:context>[\s\S]*?<\/cm:context>)/g).filter(Boolean)

      const renderedContent: React.ReactNode[] = []
      for (const part of parts) {
         if (part.startsWith("<cm:context>")) {
            const contextData = parseContext(part)
            contextItems.push(contextData)

            renderedContent.push(
               <span style={mentionStyle} title={contextData.content}>
                  @{contextData.name}
               </span>
            )
         } else {
            renderedContent.push(part)
         }
      }

      // console.log(renderedContent, contextItems)

      return { renderedContent, contextItems, isSummary }
   }, shallowEqual)

   if (!currentUser) return null

   return (
      <div className={`flex flex-col mb-2 ${props.messageIndex === 0 ? "mt-0" : "mt-8"}`}>
         {/* Unified Message Box */}
         <div
            className={`overflow-auto border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] rounded-md text-[var(--vscode-foreground)] overflow-x-auto p-3 whitespace-pre-wrap break-words relative ${
               isSummary ? "pl-[0.75rem] shadow-[inset_0_0_0_1px_var(--vscode-panel-border)]" : ""
            }`}
         >
            {isSummary && (
               <div className="mb-1 -mt-1 flex items-center gap-1 py-1">
                  <span
                     className="text-[10px] leading-none tracking-wide font-medium px-1.5 py-[2px] rounded-sm border border-[var(--vscode-panel-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-foreground)] opacity-80"
                     aria-label="Summary message"
                  >
                     SUMMARY
                  </span>
               </div>
            )}
            {contextItems.length > 0 && (
               <div className="flex flex-wrap gap-0.5 mb-1 -mt-1">
                  {contextItems.map((context, index) => (
                     <span
                        key={index}
                        style={contextPillStyle}
                        title={context.content}
                        className={`${context.type === "image" ? "cursor-pointer" : "cursor-help"} text-xs`}
                        onClick={() => {
                           if (context.type !== "image") return
                           tsvscode.postMessage({
                              type: "open_image_file",
                              value: { url: context.content },
                           })
                        }}
                     >
                        @{context.name}
                     </span>
                  ))}
               </div>
            )}

            {/* Render message content only if it exists */}
            <div
               className={`${contextItems.length > 0 ? "mt-2" : ""} ${isSummary ? "max-h-[100px] overflow-y-auto pr-1 custom-scroll-thin" : ""}`}
            >
               {renderedContent}
            </div>
         </div>
      </div>
   )
})

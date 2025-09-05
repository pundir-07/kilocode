import { memo } from "react"
import { useSelector } from "react-redux"

import { ChatMessageView } from "@/views/components/common/ChatMessageView"
import { selectChatHasMessages } from "@/views/lib/store/chatSlice"
import ChatHome from "./components/home"
import ChatInput from "./components/input"

export const ChatSidebar = memo(function ChatSidebar() {
   const hasMessages = useSelector(selectChatHasMessages)
   if (!hasMessages) return <ChatHome />

   return (
      <div className="grid grid-rows-[1fr,min-content] h-full overflow-auto bg-[var(--vscode-sideBar-background)]">
         <ChatMessageView />
         <ChatInput className="p-4" />
      </div>
   )
})

export default ChatSidebar

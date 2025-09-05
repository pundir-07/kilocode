import { memo } from "react"
import { useSelector } from "react-redux"

import { RootState } from "@/views/lib/store"
import { selectChatMessage } from "@/views/lib/store/chatSlice"
import AssistantMessage from "./components/AssistantMessage"
import ToolMessage from "./components/ToolMessage"
import UserMessage from "./components/UserMessage"

export const ChatMessage = memo(function ChatMessage(props: {
   index: number
   chatID: string
   onFollowupClick?: (followup: string) => void
}) {
   const role = useSelector((state: RootState) => {
      const message = selectChatMessage(state, props.chatID, props.index)
      return message?.role || null
   })

   switch (role) {
      case "user":
         return <UserMessage key={props.index} chatID={props.chatID} messageIndex={props.index} />
      case "assistant":
         return <AssistantMessage key={props.index} chatID={props.chatID} messageIndex={props.index} />
      case "tool":
         return <ToolMessage key={props.index} chatID={props.chatID} messageIndex={props.index} />
   }
})

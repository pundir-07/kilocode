import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function useKeyboardShortcuts() {
   const navigate = useNavigate()

   useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
         // Check for Ctrl (Windows/Linux) or Cmd (Mac)
         const isCtrlOrCmd = event.ctrlKey || event.metaKey
         // Check for Alt (Windows/Linux) or Option (Mac)
         const isAltOrOpt = event.altKey

         const isCtrlOrCmdAndAltOrOpt = isCtrlOrCmd && isAltOrOpt
         const key = event.key.toLowerCase()

         // Ctrl/Cmd + Alt/Opt + N -> Click new chat button
         if (isCtrlOrCmdAndAltOrOpt && (key === "n" || key === "dead")) {
            event.preventDefault()
            const newChatButton = document.getElementById("new-chat-button")
            if (newChatButton) {
               newChatButton.click()
            }
            return
         }

         // Ctrl/Cmd + Alt/Opt + , -> Navigate to settings
         if (isCtrlOrCmdAndAltOrOpt && key === ",") {
            event.preventDefault()
            navigate("/settings")
            return
         }

         // Ctrl/Cmd + Alt/Opt + H -> Navigate to history
         if (isCtrlOrCmdAndAltOrOpt && (key === "h" || key === "˙")) {
            event.preventDefault()
            navigate("/history")
            return
         }

         // Ctrl/Cmd + Alt/Opt + A -> Navigate to agents
         if (isCtrlOrCmdAndAltOrOpt && (key === "a" || key === "å")) {
            event.preventDefault()
            navigate("/agents")
            return
         }
      }

      // Add event listener
      window.addEventListener("keydown", handleKeyDown)

      // Cleanup event listener on unmount
      return () => {
         window.removeEventListener("keydown", handleKeyDown)
      }
   }, [navigate])
}

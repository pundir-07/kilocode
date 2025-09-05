import { useState, useEffect } from "react"

export default function useVSCodeBackendReachability() {
   const [isReachable, setIsReachable] = useState(false)

   useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
         const message = event.data
         switch (message.type) {
            case "pong":
               setTimeout(() => setIsReachable(true), 1000)
               break
         }
      }

      // Listen for messages from the backend
      window.addEventListener("message", handleMessage)

      // Request backend reachability
      tsvscode.postMessage({ type: "ping", value: "ping" })

      return () => window.removeEventListener("message", handleMessage)
   }, [])

   return isReachable
}

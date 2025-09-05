import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { setSubsystemVersion } from "@/views/lib/store/globalSlice"

export default function useGetSubsystemVersion() {
   const dispatch = useDispatch()

   useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
         switch (event.data.type) {
            case "get_subsystem_version_response":
               dispatch(setSubsystemVersion(event.data.value.version))
               break
         }
      }

      // Listen for messages from the client
      window.addEventListener("message", handleMessage)

      // Send a message to the client
      tsvscode.postMessage({ type: "get_subsystem_version" })

      return () => window.removeEventListener("message", handleMessage)
   }, [])
}

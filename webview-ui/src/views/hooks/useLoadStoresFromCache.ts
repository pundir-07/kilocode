import { useEffect } from "react"
import { useDispatch } from "react-redux"

import { User_t } from "@/common/types/user"
import { setDebugStateFromCache } from "@/views/lib/store/agents/debugSlice"
import { setOptimizeStateFromCache } from "@/views/lib/store/agents/optimizeSlice"
import { setReviewStateFromCache } from "@/views/lib/store/agents/reviewSlice"
import { setSwaggerStateFromCache } from "@/views/lib/store/agents/swaggerSlice"
import { setTestcaseStateFromCache } from "@/views/lib/store/agents/testcasesSlice"
import { setCodeEvaluationsStateFromCache } from "@/views/lib/store/codeEvaluationsSlice"
import { setSessionID, setSettings, setUser, setWorkspacePath } from "@/views/lib/store/globalSlice"
import useSocketBackendReachability from "./useSocketBackendReachability"

export default function useLoadStoresFromCache() {
   const dispatch = useDispatch()
   const socketBackendReachability = useSocketBackendReachability()

   useEffect(() => {
      if (!socketBackendReachability) return

      const handleMessage = (event: MessageEvent) => {
         const message = event.data
         switch (message.type) {
            case "session":
               dispatch(setSessionID(message.value || null))
               break
            case "user":
               dispatch(setUser(message.value as User_t | null))
               break
            case "workspacePath":
               dispatch(setWorkspacePath(message.value))
               break
            case "settings":
               if (!message.value) return
               dispatch(setSettings(message.value))
               break
            case "debug_state":
               if (!message.value) return
               dispatch(setDebugStateFromCache(message.value))
               break
            case "testcase_state":
               if (!message.value) return
               dispatch(setTestcaseStateFromCache(message.value))
               break
            case "swagger_state":
               if (!message.value) return
               dispatch(setSwaggerStateFromCache(message.value))
               break
            case "review_state":
               if (!message.value) return
               dispatch(setReviewStateFromCache(message.value))
               break
            case "optimize_state":
               if (!message.value) return
               dispatch(setOptimizeStateFromCache(message.value))
               break
            case "code_evaluations_state":
               if (!message.value) return
               dispatch(setCodeEvaluationsStateFromCache(message.value))
               break
         }
      }

      // Listen for messages from the backend
      window.addEventListener("message", handleMessage)

      // Request session, user data, and workspace path
      // tsvscode.postMessage({ type: "get_session" })
      tsvscode.postMessage({ type: "get_user" })
      tsvscode.postMessage({ type: "get_workspace_path" })
      tsvscode.postMessage({ type: "get_settings" })
      tsvscode.postMessage({ type: "get_debug_state" })
      tsvscode.postMessage({ type: "get_testcase_state" })
      tsvscode.postMessage({ type: "get_swagger_state" })
      tsvscode.postMessage({ type: "get_review_state" })
      tsvscode.postMessage({ type: "get_optimize_state" })
      tsvscode.postMessage({ type: "get_code_evaluations_state" })

      return () => window.removeEventListener("message", handleMessage)
   }, [socketBackendReachability])
}

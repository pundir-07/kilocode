import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

import { API } from "@/common/api"
import { setCustomInstructions, setCustomInstructionsLoading } from "@/views/lib/store/customInstructionsSlice"
import { selectSessionID, selectUser } from "@/views/lib/store/globalSlice"
import useSocketBackendReachability from "./useSocketBackendReachability"

export default function useFetchCustomInstructions() {
   const dispatch = useDispatch()
   const isSocketConnected = useSocketBackendReachability()
   const sessionID = useSelector(selectSessionID)
   useEffect(() => {
      const attemptSync = async () => {
         try {
            dispatch(setCustomInstructionsLoading(true))
            const res = await API.BACKEND_LOCAL.post<{
               status: string
               data: { prompt_id: string; name: string; prompt: string }[]
            }>("/prompts/get/all", {}, { headers: { "x-session": sessionID } })
            if (res.data) {
               dispatch(
                  setCustomInstructions(
                     res.data.data.map((ins) => {
                        return { id: ins.prompt_id, content: ins.prompt, title: ins.name }
                     })
                  )
               )
            }
         } catch (error) {
            console.error("[Consensus] Failed to sync custom Instructions:", error)
         } finally {
            dispatch(setCustomInstructionsLoading(false))
         }
      }

      attemptSync()
   }, [dispatch, isSocketConnected,sessionID])
}

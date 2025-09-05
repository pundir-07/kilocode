import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

import { API } from "@/common/api"
import {
   selectCustomInstructions,
   setCustomInstructions,
   setCustomInstructionsLoading,
   setPersonalityInstructions,
   togglePersonality,
} from "@/views/lib/store/customInstructionsSlice"
import { selectSessionID, selectUser } from "@/views/lib/store/globalSlice"
import useSocketBackendReachability from "./useSocketBackendReachability"

export default function useFetchPersonality() {
   const dispatch = useDispatch()
   const isSocketConnected = useSocketBackendReachability()
   const sessionID = useSelector(selectSessionID)
   const { personality } = useSelector(selectCustomInstructions)
   useEffect(() => {
      const attemptSync = async () => {
         try {
            dispatch(setCustomInstructionsLoading(true))
            const personalityInstructionResponse = await API.BACKEND_LOCAL.post<{ personality: string }>(
               "/personality/get"
            )
            const personalityStatusResponse = await API.BACKEND_LOCAL.get<{ status: boolean }>(
               "/personality/status"
            )
            if (personalityInstructionResponse.data?.personality) {
               dispatch(setPersonalityInstructions(personalityInstructionResponse.data.personality))
            }
            if (personalityStatusResponse.data?.status) {
               console.log("Personality Status data :", personalityStatusResponse)
               dispatch(togglePersonality(personalityStatusResponse.data.status))
            }
         } catch (error) {
            console.error("[Consensus] Failed to sync assistant personality:", error)
         } finally {
            dispatch(setCustomInstructionsLoading(false))
         }
      }

      attemptSync()
   }, [dispatch, isSocketConnected])
   
}

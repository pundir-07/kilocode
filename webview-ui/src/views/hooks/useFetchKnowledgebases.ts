import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

import { API } from "@/common/api"
import { Knowledgebase_t } from "@/common/types/knowledgebase"
import {
   addKnowledgebase,
   setHasFetchedInitialConsensus,
   setKnowledgebasesState,
} from "@/views/lib/store/knowledgebasesSlice"
import useSocketBackendReachability from "./useSocketBackendReachability"
import { selectSessionID, selectUser } from "@/views/lib/store/globalSlice"

export default function useFetchKnowledgebases() {
   const dispatch = useDispatch()
   const isSocketConnected = useSocketBackendReachability()

   const sessionID = useSelector(selectSessionID)
   useEffect(() => {
      const attemptSync = async () => {
         try {
            const res = await API.BACKEND_LOCAL.get<Knowledgebase_t[]>("/list_kbs", {
               params: { include_cloud: true },
            })
            dispatch(setKnowledgebasesState(res.data))
            dispatch(setHasFetchedInitialConsensus(true))
         } catch (error) {
            console.error("[Consensus] Failed to sync knowledgebases:", error)
         }
      }

      attemptSync()
   }, [dispatch, isSocketConnected, sessionID])
}

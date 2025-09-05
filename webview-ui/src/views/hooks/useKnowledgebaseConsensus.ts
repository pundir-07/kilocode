import { API } from "@/common/api"
import { Knowledgebase_t, KnowledgebaseScope, KnowledgebaseStatus } from "@/common/types/knowledgebase"
import { store } from "@/views/lib/store"
import {
   addKnowledgebase,
   removeKnowledgebase,
   setHasFetchedInitialConsensus,
} from "@/views/lib/store/knowledgebasesSlice"
import { useCallback } from "react"
import { useDispatch } from "react-redux"

const IGNORE_KB_STATUSES = [
   KnowledgebaseStatus.PROGRESS,
   KnowledgebaseStatus.ERROR,
   KnowledgebaseStatus.DRAFT,
]

export default function useKnowledgebaseConsensus() {
   const dispatch = useDispatch()
   const syncKnowledgebases = useCallback(() => {
      // Helper to sync the fetched knowledgebases with the store
      const sync = (kbs: Knowledgebase_t[], isFinalSync: boolean) => {
         if (!kbs) return

         const localKnowledgebases = Object.values(store.getState().knowledgebases.knowledgebases)
         const networkKBIDs = new Set(kbs.map((kb) => kb.id))
         const localKBIDs = new Set(localKnowledgebases.map((kb) => kb.id))

         for (const kb of localKnowledgebases) {
            if (IGNORE_KB_STATUSES.includes(kb.status)) continue
            if (networkKBIDs.has(kb.id)) continue

            // If it's the first sync (local only), don't remove organization KBs
            if (!isFinalSync && kb.scope === KnowledgebaseScope.Organization) continue

            localKBIDs.delete(kb.id)
            dispatch(removeKnowledgebase(kb.id))
         }

         for (const kb of kbs) {
            if (localKBIDs.has(kb.id)) continue
            localKBIDs.add(kb.id)
            dispatch(addKnowledgebase(kb))
         }
      }

      // Attempt to fetch until the first successful response
      let intervalId: ReturnType<typeof setInterval> | null = null

      const attemptSync = async () => {
         try {
            // 1. Fetch local knowledgebases (faster, does not include cloud)
            const localResponse = await API.BACKEND_LOCAL.get<Knowledgebase_t[]>("/list_kbs", {
               params: { include_cloud: true },
            })
            // console.log("KNOWLEDGE BASES RECIEVED cloud/false= ",localResponse.data)
            for (const kb of localResponse.data) {
               dispatch(addKnowledgebase(kb))
            }
            // sync(localResponse.data, true)

            // 2. Fetch cloud knowledgebases (may be empty if not applicable)
            // dispatch(setSyncingCloudKBS(true))
            // try {
            //    const cloudResponse = await API.BACKEND_LOCAL.get<Knowledgebase_t[]>("/list_kbs", {
            //       params: { include_cloud: true },
            //    })
            //    console.log("KNOWLEDGE BASES RECIEVED cloud/true= ",localResponse.data)
            //    sync(cloudResponse.data, true)
            // } catch (cloudErr) {
            //    // Cloud fetch failed – log but don't block initial consensus
            //    console.error("[Consensus] Failed to fetch cloud knowledgebases:", cloudErr)
            // } finally {
            //    dispatch(setSyncingCloudKBS(false))
            // }

            // Mark consensus fetched & stop polling
            dispatch(setHasFetchedInitialConsensus(true))

            if (intervalId) {
               clearInterval(intervalId)
               intervalId = null
            }
         } catch (error) {
            // Log the error and keep polling until a successful response is received
            console.error("[Consensus] Failed to sync knowledgebases:", error)
         }
      }

      // Perform the first attempt immediately
      attemptSync()

      // Continue attempting every 2 seconds until we succeed
      intervalId = setInterval(attemptSync, 2000)
   }, [dispatch])

   return syncKnowledgebases
}

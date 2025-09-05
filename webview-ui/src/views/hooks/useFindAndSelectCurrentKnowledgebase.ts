import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

import { KnowledgebaseStatus, KnowledgebaseType } from "@/common/types/knowledgebase"
import { selectWorkspacePath } from "@/views/lib/store/globalSlice"
import { selectAllKnowledgebases, setCurrentKnowledgebase } from "@/views/lib/store/knowledgebasesSlice"

export default function useFindAndSelectCurrentKnowledgebase() {
   const dispatch = useDispatch()
   const knowledgebases = useSelector(selectAllKnowledgebases)
   const workspacePath = useSelector(selectWorkspacePath)

   useEffect(() => {
      if (!workspacePath) {
         dispatch(setCurrentKnowledgebase(null))
         return
      }

      // Remove any trailing slashes for consistent comparison
      const cleanWorkspacePath = workspacePath.replace(/\/$/, "")

      // Find all knowledgebases that match the current workspace path
      const matchingKBs = knowledgebases.filter((kb) => {
         if (kb.status !== KnowledgebaseStatus.READY) return false
         if (kb.type !== KnowledgebaseType.Codebase) return false
         if (!kb.metadata?.path) return false
         const cleanKBPath = kb.metadata.path.replace(/\/$/, "")
         return cleanKBPath === cleanWorkspacePath
      })

      // If no matches found, set current to null
      if (matchingKBs.length === 0) {
         dispatch(setCurrentKnowledgebase(null))
         return
      }

      // If multiple matches found, prefer non-auto-indexed ones
      const nonAutoIndexedKB = matchingKBs.find((kb) => !kb.isAutoIndexed)
      if (nonAutoIndexedKB) {
         dispatch(setCurrentKnowledgebase(nonAutoIndexedKB.id))
         return
      }

      // If all are auto-indexed or don't have the property, just use the first match
      dispatch(setCurrentKnowledgebase(matchingKBs[0].id))
   }, [dispatch, workspacePath, knowledgebases])
}

import { nanoid } from "@reduxjs/toolkit"
import { useCallback, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { createKnowledgebaseWS, getFileTree } from "@/common/api/ws/socket"
import { MAKE_EMBEDDINGS_ON_START } from "@/common/core/constants"
import {
   Knowledgebase_t,
   KnowledgebaseScope,
   KnowledgebaseSource,
   KnowledgebaseStatus,
   KnowledgebaseType,
} from "@/common/types/knowledgebase"
import { RootState } from "@/views/lib/store"
import {
   selectIsAuthenticated,
   selectSettings,
   selectSocketConnected,
   selectWorkspacePath,
} from "@/views/lib/store/globalSlice"
import {
   addKnowledgebase,
   selectHasFetchedInitialConsensus,
   selectKnowledgebaseByName,
   setAutoIndexingCodebase,
   updateKnowledgebaseProgress,
   updateKnowledgebaseStatusAsError,
   updateKnowledgebaseStatusAsSuccess,
} from "@/views/lib/store/knowledgebasesSlice"

// Used to prevent multiple auto-indexing requests
let isAutoIndexing = false

let attemptedKB = false

export default function useAutoCreateKnowledgebase() {
   const dispatch = useDispatch()
   const isSocketConnected = useSelector(selectSocketConnected)
   const isAuthenticated = useSelector(selectIsAuthenticated)
   const workspacePath = useSelector(selectWorkspacePath)
   const hasFetchedInitialConsensus = useSelector(selectHasFetchedInitialConsensus)
   const { autoIndexCodebase } = useSelector(selectSettings)

   const [isCreatingKB, setIsCreatingKB] = useState(false)
   const [kbProgress, setKbProgress] = useState({ status: "", progress: 0 })

   // Generate the knowledgebase name and check if it already exists
   const kbName = workspacePath ? workspacePath.split(/[\\/]/).pop() : ""
   const existingKB = useSelector((state: RootState) => selectKnowledgebaseByName(state, kbName))

   const indexCodebase = useCallback(async () => {
      if (attemptedKB) {
         console.log("Already attempted to create an auto-indexed knowledgebase, skipping.")
         return
      }

      const fileTree = await getFileTree(workspacePath)
      if (!fileTree) return

      const finalFiles = new Set<string>(fileTree.allFiles)
      for (const file of fileTree.ignoredFiles) finalFiles.delete(file)
      if (!finalFiles.size) return

      const kb: Knowledgebase_t = {
         isAutoIndexed: true,
         id: nanoid(),
         name: kbName,
         description: "Auto indexed from your workspace",
         source: KnowledgebaseSource.Local,
         scope: KnowledgebaseScope.Personal,
         syncConfig: { enabled: false, lastSynced: Date.now() },
         status: KnowledgebaseStatus.DRAFT,
         progress: { status: "", message: "", progress: 0 },
         type: KnowledgebaseType.Codebase,
         metadata: { path: workspacePath, files: Array.from(finalFiles) },
         dateCreated: Date.now(),
         dateUpdated: Date.now(),
         dateSynced: null,
         can_sync: false,
         can_upload: true,
         cloud_id: "",
      }

      dispatch(addKnowledgebase(kb))
      dispatch(setAutoIndexingCodebase(true))
      // Create the knowledgebase on the server
      createKnowledgebaseWS(kb, {
         onProgress: (progress) => {
            setIsCreatingKB(true)
            setKbProgress(progress)
            dispatch(updateKnowledgebaseProgress({ kb: kb, progress: progress }))
         },
         onSuccess: ({ data }) => {
            setIsCreatingKB(false)
            dispatch(updateKnowledgebaseStatusAsSuccess({ newID: data.id, kb }))
            dispatch(setAutoIndexingCodebase(false))
            isAutoIndexing = false
            attemptedKB = true
         },
         onError: (error) => {
            console.error(error)
            setIsCreatingKB(false)
            dispatch(setAutoIndexingCodebase(false))
            dispatch(updateKnowledgebaseStatusAsError({ kb, error }))
            isAutoIndexing = false
            attemptedKB = true
         },
      })
   }, [workspacePath, kbName, dispatch])

   useEffect(() => {
      if (!MAKE_EMBEDDINGS_ON_START) return
      if (!isSocketConnected || !isAuthenticated || !workspacePath || isCreatingKB || isAutoIndexing) return

      // Wait for initial consensus to be fetched before checking for existing KBs
      if (!hasFetchedInitialConsensus) return

      // Check if a knowledgebase with this name already exists & don't create if one already exists with the same name
      if (existingKB) return
      if (!autoIndexCodebase) return
      indexCodebase()
   }, [workspacePath, isSocketConnected, existingKB, hasFetchedInitialConsensus, autoIndexCodebase])

   return { isCreatingKB, kbProgress, indexCodebase }
}

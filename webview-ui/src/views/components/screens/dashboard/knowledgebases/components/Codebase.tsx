import { getFileTree } from "@/common/api/ws/socket"
import {
   KnowledgebaseStatus,
   KnowledgebaseType,
   KnowledgebaseTypeCodebase_t,
} from "@/common/types/knowledgebase"
import SelectableFileTree, { SelectableTreeNode } from "@/views/components/common/SelectableFileTree"
import { RootState } from "@/views/lib/store"
import { selectKnowledgebaseById, updateKnowledgebase } from "@/views/lib/store/knowledgebasesSlice"
import { AlertCircle, Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

// Server returns tree nodes; we only need subset
interface WSNodeLike {
   name: string
   children: WSNodeLike[]
   metadata?: { absolutePath?: string; [k: string]: any }
}

export default function Codebase(props: { kbID: string; readonly?: boolean }) {
   // Track selected node IDs for the tree view
   const dispatch = useDispatch()
   const updateInProgress = useRef(false)
   const initialLoadComplete = useRef(false)

   const kb = useSelector(
      (state: RootState) => selectKnowledgebaseById(state, props.kbID) as KnowledgebaseTypeCodebase_t
   )

   const isWorking = kb.status === KnowledgebaseStatus.PROGRESS

   const [fileTree, setFileTree] = useState<SelectableTreeNode[]>([])
   const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

   // Whenever a new folder is selected, fetch the file tree and update the knowledgebase
   useEffect(() => {
      if (!kb.metadata.path) return

      // Clear all state when path changes to prevent stale data
      setFileTree([])
      setSelectedFiles(new Set())
      // no need for ids now

      // Reset initialLoadComplete when path changes to allow default selection for new folders
      initialLoadComplete.current = false

      getFileTree(kb.metadata.path)
         .then((data) => {
            // data.value is hierarchical already
            setFileTree(data.value as unknown as SelectableTreeNode[])

            const existingFiles = new Set(kb.metadata.files)
            const allValidFiles = new Set(data.allFiles)
            const validExistingFiles = Array.from(existingFiles).filter((file) => allValidFiles.has(file))

            if (validExistingFiles.length === 0 || kb.metadata.files.length === 0) {
               const finalFiles = new Set<string>(data.allFiles)
               for (const file of data.ignoredFiles) finalFiles.delete(file)
               dispatch(
                  updateKnowledgebase({
                     id: kb.id,
                     updates: {
                        type: KnowledgebaseType.Codebase,
                        metadata: { path: kb.metadata.path, files: Array.from(finalFiles) },
                     },
                  })
               )
               setSelectedFiles(finalFiles)
            } else {
               dispatch(
                  updateKnowledgebase({
                     id: kb.id,
                     updates: {
                        type: KnowledgebaseType.Codebase,
                        metadata: { path: kb.metadata.path, files: validExistingFiles },
                     },
                  })
               )
               setSelectedFiles(new Set(validExistingFiles))
            }
            initialLoadComplete.current = true
         })
         .catch((error) => {
            console.error("Error fetching file tree:", error)
            setFileTree([])
         })
   }, [kb.metadata.path, kb.id, dispatch])

   const handleTreeChange = useCallback(
      (files: Set<string>) => {
         if (props.readonly) return
         setSelectedFiles(new Set(files))
         dispatch(
            updateKnowledgebase({
               id: kb.id,
               updates: {
                  type: KnowledgebaseType.Codebase,
                  metadata: { path: kb.metadata.path, files: Array.from(files) },
               },
            })
         )
      },
      [dispatch, kb.id, kb.metadata.path, props.readonly]
   )

   return (
      <div
         className={`flex-1 border border-[var(--vscode-panel-border)] rounded bg-[var(--vscode-input-background)] p-2 h-full overflow-y-auto ${
            isWorking
               ? "opacity-50 cursor-not-allowed pointer-events-none"
               : props.readonly
                 ? "cursor-not-allowed pointer-events-none"
                 : ""
         }`}
      >
         {!kb.metadata.path ? (
            <p className="text-center text-[var(--vscode-errorForeground)] h-full w-full flex flex-col justify-center items-center gap-2">
               <AlertCircle className="w-8 h-8" />
               <span>No workspace folder selected. Please choose a folder to continue.</span>
            </p>
         ) : fileTree.length === 0 ? (
            <p className="text-center text-[var(--vscode-descriptionForeground)] h-full w-full flex justify-center items-center">
               <Loader2 className="w-8 h-8 animate-spin" />
            </p>
         ) : (
            <SelectableFileTree
               nodes={fileTree}
               selectedFiles={selectedFiles}
               onChange={handleTreeChange}
               readonly={props.readonly}
               isWorking={isWorking}
               autoExpandLevels={1}
            />
         )}
      </div>
   )
}

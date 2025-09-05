import { getFileContent } from "@/views/lib/events/fs"
import { AlertCircle, ArrowLeft, File, Folder, FolderOpen, Loader2, Play } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import TreeView, { flattenTree } from "react-accessible-treeview"
import { FaCheckSquare, FaChevronRight, FaMinusSquare, FaSquare } from "react-icons/fa"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { API } from "@/common/api"
import { getFileTree } from "@/common/api/ws/socket"
import { ReviewEvaluationType, ReviewRun_t, ReviewRunState } from "@/common/types/review"
import { addRun, updateRun } from "@/views/lib/store/agents/reviewSlice"
import { selectWorkspacePath } from "@/views/lib/store/globalSlice"
import { storeFileEvaluations } from "@/views/lib/utils/review"

interface TreeNode {
   id: number
   name: string
   path: string
   parent?: number
   children: TreeNode[]
   metadata?: {
      absolutePath?: string
      [key: string]: any
   }
}

// Create namespace for different components
namespace Components {
   export function Codebase({
      isWorking,
      selectedFolderPath,
      selectedFiles,
      setSelectedFiles,
   }: {
      isWorking: boolean
      selectedFolderPath: string
      selectedFiles: Set<string>
      setSelectedFiles: (files: Set<string>) => void
   }) {
      const [fileTree, setFileTree] = useState<TreeNode[]>([])
      const [expandedIds, setExpandedIds] = useState<number[]>([])
      const [selectedIds, setSelectedIds] = useState<number[]>([])
      const [halfSelectedIds, setHalfSelectedIds] = useState<number[]>([])

      // Fetch file tree when folder path changes
      useEffect(() => {
         if (!selectedFolderPath) return

         getFileTree(selectedFolderPath)
            .then((data) => {
               const flattenedData = flattenTree({
                  name: "root",
                  children: data.value,
               })
               setFileTree(flattenedData as any)

               // Get all node IDs for expansion
               const allIds = flattenedData.map((node: any) => node.id)
               // Get first level IDs (usually 0 and 1)
               const firstLevelIds = allIds.slice(0, 2)
               setExpandedIds(firstLevelIds)
            })
            .catch((error) => {
               console.error("Error fetching file tree:", error)
               setFileTree([])
            })
      }, [selectedFolderPath])

      const getNodeChildren = useCallback(
         (nodeId: number): number[] => {
            const node = fileTree.find((n) => n.id === nodeId)
            if (!node) return []

            const children: number[] = []
            const stack = [node]

            while (stack.length > 0) {
               const current = stack.pop()!
               const currentChildren = fileTree.filter((n) => n.parent === current.id)
               children.push(...currentChildren.map((n) => n.id))
               stack.push(...currentChildren)
            }

            return children
         },
         [fileTree]
      )

      const handleSelect = useCallback(
         (el: { treeState: { selectedIds: number[]; halfSelectedIds: number[] } }) => {
            let newSelectedIds = new Set(el.treeState.selectedIds)

            // Find newly selected IDs (ones that weren't in the previous selection)
            const previousSelectedIds = new Set(selectedIds)
            const newlySelectedIds = Array.from(newSelectedIds).filter((id) => !previousSelectedIds.has(id))

            // Find newly unselected IDs
            const newlyUnselectedIds = Array.from(previousSelectedIds).filter((id) => !newSelectedIds.has(id))

            // For each newly selected ID, add all its children
            newlySelectedIds.forEach((id) => {
               const children = getNodeChildren(id)
               children.forEach((childId) => newSelectedIds.add(childId))
            })

            // For each newly unselected ID, remove all its children
            newlyUnselectedIds.forEach((id) => {
               const children = getNodeChildren(id)
               children.forEach((childId) => newSelectedIds.delete(childId))
            })

            setSelectedIds(Array.from(newSelectedIds))

            // Create a new set for selected files
            const newSelectedFiles = new Set<string>()

            // Add files for all selected nodes
            newSelectedIds.forEach((id) => {
               const node = fileTree.find((n) => n.id === id)
               if (node?.metadata?.absolutePath) {
                  newSelectedFiles.add(node.metadata.absolutePath)
               }
            })

            // Update the selected files
            setSelectedFiles(newSelectedFiles)
         },
         [fileTree, selectedIds, getNodeChildren, setSelectedFiles]
      )

      return (
         <div
            className={`flex-1 border border-[var(--vscode-panel-border)] rounded bg-[var(--vscode-input-background)] p-2 h-full overflow-y-auto ${
               isWorking ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
            }`}
         >
            {fileTree.length === 0 ? (
               <p className="text-center text-[var(--vscode-descriptionForeground)] h-full w-full flex justify-center items-center">
                  <Loader2 className="w-8 h-8 animate-spin" />
               </p>
            ) : (
               <TreeView
                  data={fileTree}
                  aria-label="File tree"
                  multiSelect
                  propagateSelect={false}
                  propagateSelectUpwards={false}
                  togglableSelect
                  defaultExpandedIds={expandedIds}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  nodeRenderer={({
                     element,
                     isBranch,
                     isExpanded,
                     isSelected,
                     isHalfSelected,
                     getNodeProps,
                     handleSelect,
                     handleExpand,
                     level,
                  }) => (
                     <div
                        {...getNodeProps({ onClick: handleSelect })}
                        className="flex gap-3 items-center py-1 hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer"
                        style={{ paddingLeft: `${(level - 1) * 20}px` }}
                     >
                        <div className="flex items-center gap-2 w-min">
                           {isBranch ? (
                              <span
                                 onClick={(e) => {
                                    handleExpand(e)
                                    e.stopPropagation()
                                 }}
                                 className="w-4 flex justify-center"
                              >
                                 <FaChevronRight
                                    className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                 />
                              </span>
                           ) : (
                              <span className="w-4" />
                           )}

                           <span className="w-4 flex justify-center">
                              {isHalfSelected ? (
                                 <FaMinusSquare className="text-[var(--vscode-checkbox-foreground)]" />
                              ) : isSelected ? (
                                 <FaCheckSquare className="text-[var(--vscode-checkbox-foreground)]" />
                              ) : (
                                 <FaSquare className="text-[var(--vscode-checkbox-background)]" />
                              )}
                           </span>
                        </div>
                        <div className="flex items-center w-max gap-2">
                           <span className="w-5 flex justify-center">
                              {isBranch ? (
                                 isExpanded ? (
                                    <FolderOpen className="text-[var(--vscode-symbolIcon-folderForeground)]" />
                                 ) : (
                                    <Folder className="text-[var(--vscode-symbolIcon-folderForeground)]" />
                                 )
                              ) : (
                                 <File className="text-[var(--vscode-symbolIcon-fileForeground)]" />
                              )}
                           </span>
                           <span className="text-[var(--vscode-foreground)] ml-1">{element.name}</span>
                        </div>
                     </div>
                  )}
               />
            )}
         </div>
      )
   }
}

export default function ReviewCreate() {
   const workspacePathSelector = useSelector(selectWorkspacePath)
   const navigate = useNavigate()
   const dispatch = useDispatch()

   const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
   const [name, setName] = useState("")
   const [nameError, setNameError] = useState<string | null>(null)
   const [isWorking, setIsWorking] = useState(false)
   const [selectedFolderPath, setSelectedFolderPath] = useState<string>("")

   useEffect(() => {
      if (workspacePathSelector) {
         setSelectedFolderPath(workspacePathSelector)
      }
   }, [workspacePathSelector])

   useEffect(() => {
      if (!selectedFolderPath) return
      const basePath = selectedFolderPath.split(/[\\/]/).pop()
      setName(basePath || "My Review")
   }, [selectedFolderPath])

   const handleRun = useCallback(async () => {
      if (!name.trim()) {
         setNameError("Please enter a name")
         return
      }
      if (selectedFiles.size === 0) return

      // Log selected files to console
      const run: ReviewRun_t = {
         id: crypto.randomUUID(),
         title: name,
         files: Array.from(selectedFiles).map((file) => ({
            file,
            content: "",
            status: ReviewRunState.INPROGRESS,
            evaluations: [],
         })),
         dateCreated: new Date().getTime(),
         dateUpdated: new Date().getTime(),
         state: ReviewRunState.INPROGRESS,
      }
      dispatch(addRun(run))

      // Switch to dashboard view before initializing the network call
      navigate("/agents/review")

      setIsWorking(true)
      try {
         const jobs = run.files.map(async (file) => {
            try {
               const fileContent = await getFileContent(file.file)

               const res = await API.BACKEND_LOCAL.post<{
                  understanding: string
                  code_eval: string
                  security_eval: string
               }>("/review/code", { code: fileContent, provider: "default" })
               if (res.status !== 200) {
                  throw new Error("Failed to run review")
               }

               // Store evaluations in markdown files
               try {
                  const storeSuccess = await storeFileEvaluations(file.file, res.data)
                  if (!storeSuccess) {
                     console.warn(`Failed to store evaluations for ${file.file}`)
                  }
               } catch (storageError) {
                  console.error(`Error storing evaluations for ${file.file}:`, storageError)
               }

               dispatch(
                  updateRun({
                     id: run.id,
                     update: {
                        state: ReviewRunState.COMPLETED,
                        files: run.files.map((f) => ({
                           ...f,
                           content: fileContent,
                           status: ReviewRunState.COMPLETED,
                           evaluations: [
                              { type: ReviewEvaluationType.UNDERSTANDING, content: res.data.understanding },
                              { type: ReviewEvaluationType.CODE_EVAL, content: res.data.code_eval },
                              { type: ReviewEvaluationType.SECURITY_EVAL, content: res.data.security_eval },
                           ],
                        })),
                     },
                  })
               )

               return true
            } catch (error) {
               dispatch(
                  updateRun({
                     id: run.id,
                     update: { files: run.files.map((f) => ({ ...f, status: ReviewRunState.FAILED })) },
                  })
               )
               console.error("Error running review:", error)

               return false
            }
         })
         const results = await Promise.all(jobs)

         if (results.every(Boolean)) {
            dispatch(updateRun({ id: run.id, update: { state: ReviewRunState.COMPLETED } }))
         } else {
            dispatch(updateRun({ id: run.id, update: { state: ReviewRunState.FAILED } }))
         }
      } catch (error) {
         console.error("Error running review:", error)
      } finally {
         setIsWorking(false)
      }
   }, [name, selectedFiles])

   const isRunDisabled = useCallback(() => {
      if (!name.trim() || isWorking) return true
      return selectedFiles.size === 0
   }, [name, isWorking, selectedFiles])

   return (
      <div className="grid grid-rows-[min-content,1fr] overflow-auto">
         <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center gap-2">
               <button
                  className="p-2 rounded-xl w-min bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors"
                  onClick={() => navigate("/agents/review")}
                  title="Go back"
               >
                  <ArrowLeft className="w-4 h-4" />
               </button>
               <h2 className="text-2xl font-bold">Start Review</h2>
            </div>
            <div className="flex items-center gap-2 w-min">
               <button
                  onClick={handleRun}
                  disabled={isRunDisabled()}
                  className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  <Play className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">Run</span>
               </button>
            </div>
         </div>

         <div className="gap-4 min-h-0 grid grid-rows-[min-content,1fr] overflow-y-auto h-full px-4">
            <div className="flex gap-2 items-center">
               <div className="flex flex-col gap-2 flex-1">
                  <label className="text-sm text-[var(--vscode-foreground)]">Name</label>
                  <input
                     type="text"
                     disabled={isWorking}
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="Enter review name"
                     className={`w-full rounded border ${
                        nameError
                           ? "border-[var(--vscode-inputValidation-errorBorder)]"
                           : "border-[var(--vscode-input-border)]"
                     } bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] ${
                        isWorking ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
                     }`}
                  />
                  {nameError && (
                     <div className="flex items-center gap-2 mt-1 text-[var(--vscode-inputValidation-errorForeground)] text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{nameError}</span>
                     </div>
                  )}
               </div>
            </div>

            <Components.Codebase
               isWorking={isWorking}
               selectedFolderPath={selectedFolderPath}
               selectedFiles={selectedFiles}
               setSelectedFiles={setSelectedFiles}
            />
         </div>
      </div>
   )
}

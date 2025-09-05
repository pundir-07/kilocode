import { ReviewEvaluationType, ReviewRun_t, ReviewRunState } from "@/common/types/review"
import { openFilesInTwoPanes } from "@/views/lib/events/misc"
import { RootState } from "@/views/lib/store"
import { storeFileEvaluations } from "@/views/lib/utils/review"
import { ArrowLeft, CheckCircle, Download, FileIcon, Loader2, Save, XCircle } from "lucide-react"
import { useState } from "react"
import { useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

export default function ReviewRun() {
   const { id } = useParams()
   const navigate = useNavigate()
   const currentRun = useSelector((state: RootState) =>
      (state as any).review.runs.find((run: ReviewRun_t) => run.id === id)
   )
   const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({})
   const [savingAll, setSavingAll] = useState(false)

   if (!currentRun) return null

   // Helper function to render status indicator
   const renderStatusIndicator = (status: ReviewRunState) => {
      switch (status) {
         case ReviewRunState.INPROGRESS:
            return (
               <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-[var(--vscode-notificationsInfoIcon-foreground)] animate-pulse shadow-sm"></div>
               </div>
            )
         case ReviewRunState.COMPLETED:
            return (
               <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-[var(--vscode-gitDecoration-addedResourceForeground)] shadow-sm"></div>
               </div>
            )
         case ReviewRunState.FAILED:
            return (
               <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-[var(--vscode-gitDecoration-deletedResourceForeground)] shadow-sm"></div>
               </div>
            )
         default:
            return null
      }
   }

   // Function to save evaluations for a single file
   const handleSaveFile = async (fileData: (typeof currentRun.files)[0]) => {
      if (fileData.status !== ReviewRunState.COMPLETED) return

      setSavingStatus((prev) => ({ ...prev, [fileData.file]: true }))

      try {
         // Create evaluation data object
         const evaluations = {
            understanding:
               fileData.evaluations?.find((e) => e.type === ReviewEvaluationType.UNDERSTANDING)?.content ||
               "",
            code_eval:
               fileData.evaluations?.find((e) => e.type === ReviewEvaluationType.CODE_EVAL)?.content || "",
            security_eval:
               fileData.evaluations?.find((e) => e.type === ReviewEvaluationType.SECURITY_EVAL)?.content ||
               "",
         }

         // Store evaluations
         await storeFileEvaluations(fileData.file, evaluations)
      } catch (error) {
         console.error(`Error saving evaluations for ${fileData.file}:`, error)
      } finally {
         setSavingStatus((prev) => ({ ...prev, [fileData.file]: false }))
      }
   }

   // Function to save evaluations for all files
   const handleSaveAll = async () => {
      if (currentRun.state !== ReviewRunState.COMPLETED) return

      setSavingAll(true)

      try {
         const completedFiles = currentRun.files.filter((file) => file.status === ReviewRunState.COMPLETED)

         for (const fileData of completedFiles) {
            // Create evaluation data object
            const evaluations = {
               understanding:
                  fileData.evaluations?.find((e) => e.type === ReviewEvaluationType.UNDERSTANDING)?.content ||
                  "",
               code_eval:
                  fileData.evaluations?.find((e) => e.type === ReviewEvaluationType.CODE_EVAL)?.content || "",
               security_eval:
                  fileData.evaluations?.find((e) => e.type === ReviewEvaluationType.SECURITY_EVAL)?.content ||
                  "",
            }

            // Store evaluations
            await storeFileEvaluations(fileData.file, evaluations)
         }
      } catch (error) {
         console.error(`Error saving evaluations for all files:`, error)
      } finally {
         setSavingAll(false)
      }
   }

   // Function to open evaluation markdown files of a given source file in the editor
   const handleOpenEvaluations = (filePath: string) => {
      // Only attempt when the run is completed – evaluations are guaranteed to exist
      if (currentRun.state !== ReviewRunState.COMPLETED) return

      try {
         // Normalize the path to use forward slashes (same logic as storeFileEvaluations)
         const normalizedPath = filePath.replace(/\\/g, "/")

         // Split directory and file name
         const lastSlashIndex = normalizedPath.lastIndexOf("/")
         const dirPath = lastSlashIndex > -1 ? normalizedPath.substring(0, lastSlashIndex) : ""
         const fileName = lastSlashIndex > -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath

         // Build evaluation file paths (see storeFileEvaluations for structure)
         const codemateDirPath = dirPath ? `${dirPath}/.codemate` : ".codemate"

         const understandingPath = `${codemateDirPath}/${ReviewEvaluationType.UNDERSTANDING}/${fileName}.md`
         const codeEvalPath = `${codemateDirPath}/${ReviewEvaluationType.CODE_EVAL}/${fileName}.md`
         const securityEvalPath = `${codemateDirPath}/${ReviewEvaluationType.SECURITY_EVAL}/${fileName}.md`
         // We will open the "understanding" and "code_eval" files side-by-side
         openFilesInTwoPanes([understandingPath, codeEvalPath, securityEvalPath])
      } catch (error) {
         console.error("Failed to open evaluation files:", error)
      }
   }

   return (
      <div className="min-h-0 overflow-y-auto">
         {/* Header with back button */}
         <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
               <button
                  onClick={() => navigate("/agents/review")}
                  className="p-2 w-min rounded-lg hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
                  title="Go back"
               >
                  <ArrowLeft className="w-6 h-6" />
               </button>
               <h3 className="text-lg font-medium">Run Details</h3>
            </div>

            {/* Save All Button */}
            {currentRun.state === ReviewRunState.COMPLETED && (
               <button
                  onClick={handleSaveAll}
                  disabled={savingAll}
                  className="w-min px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save all evaluations to markdown files"
               >
                  {savingAll ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                     <Download className="w-4 h-4" />
                  )}
                  <span className="text-sm whitespace-nowrap">Save All Evaluations</span>
               </button>
            )}
         </div>

         {/* Run Information */}
         <div className="space-y-6">
            {/* Overall Status - Moved to top */}
            <div className="space-y-2">
               <label className="text-sm font-medium">Overall Status</label>
               <div className="flex items-center gap-2 bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg px-4 py-3 shadow-sm">
                  {currentRun.state === ReviewRunState.INPROGRESS && (
                     <>
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--vscode-notificationsInfoIcon-foreground)]" />
                        <span className="text-[var(--vscode-notificationsInfoIcon-foreground)] font-medium">
                           In Progress
                        </span>
                     </>
                  )}
                  {currentRun.state === ReviewRunState.FAILED && (
                     <>
                        <XCircle className="w-5 h-5 text-[var(--vscode-gitDecoration-deletedResourceForeground)]" />
                        <span className="text-[var(--vscode-gitDecoration-deletedResourceForeground)] font-medium">
                           Failed
                        </span>
                     </>
                  )}
                  {currentRun.state === ReviewRunState.COMPLETED && (
                     <>
                        <CheckCircle className="w-5 h-5 text-[var(--vscode-gitDecoration-addedResourceForeground)]" />
                        <span className="text-[var(--vscode-gitDecoration-addedResourceForeground)] font-medium">
                           Completed
                        </span>
                     </>
                  )}
               </div>
            </div>

            {/* Files as Cards */}
            <div className="space-y-2">
               <label className="text-sm font-medium">Files</label>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentRun.files.map((fileData, index) => {
                     const fileName = fileData.file.split("/").pop() || fileData.file
                     const isSaving = savingStatus[fileData.file] || false
                     // If overall run is failed, treat all files as failed
                     const fileStatus =
                        currentRun.state === ReviewRunState.FAILED ? ReviewRunState.FAILED : fileData.status

                     return (
                        <div
                           key={index}
                           onClick={() => handleOpenEvaluations(fileData.file)}
                           className="group rounded-md overflow-hidden shadow-sm border border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBar-background)] cursor-pointer"
                        >
                           <div className="px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3 overflow-hidden">
                                 <FileIcon className="w-5 h-5 flex-shrink-0 text-[var(--vscode-symbolIcon-fileForeground)]" />
                                 <div className="flex flex-col min-w-0">
                                    <span className="font-medium truncate">{fileName}</span>
                                    <span className="text-xs truncate text-[var(--vscode-descriptionForeground)]">
                                       {fileData.file}
                                    </span>
                                 </div>
                              </div>

                              <div className="flex items-center gap-2">
                                 {/* Save Button - Only show for completed files */}
                                 {fileStatus === ReviewRunState.COMPLETED && (
                                    <button
                                       onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                          e.stopPropagation()
                                          handleSaveFile(fileData)
                                       }}
                                       disabled={isSaving}
                                       className="p-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
                                       title="Save evaluations to markdown files"
                                    >
                                       {isSaving ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                       ) : (
                                          <Save className="w-4 h-4" />
                                       )}
                                    </button>
                                 )}

                                 <div className="flex-shrink-0">{renderStatusIndicator(fileStatus)}</div>
                              </div>
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>

            {/* Code Review Results */}
            {currentRun.code && (
               <>
                  <div className="space-y-2">
                     <label className="text-sm font-medium">Original Code</label>
                     <pre className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg px-4 py-3 overflow-x-auto">
                        <code className="text-[var(--vscode-editor-foreground)]">
                           {currentRun.code.original}
                        </code>
                     </pre>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium">Suggestions</label>
                     <pre className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg px-4 py-3 overflow-x-auto">
                        <code className="text-[var(--vscode-editor-foreground)]">
                           {currentRun.code.suggestions}
                        </code>
                     </pre>
                  </div>
               </>
            )}

            {/* Custom Instructions */}
            {currentRun.custom_instructions && (
               <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Instructions</label>
                  <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg px-4 py-3">
                     {currentRun.custom_instructions}
                  </div>
               </div>
            )}
         </div>
      </div>
   )
}

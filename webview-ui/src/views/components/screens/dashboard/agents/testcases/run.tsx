import { TestcaseRun_t, TestcaseRunState } from "@/common/types/testcases"
import RichMessage from "@/views/components/common/RichMessage"
import { RootState } from "@/views/lib/store"
import { ArrowLeft, CheckCircle2, Loader2, SparklesIcon, XCircle } from "lucide-react"
import { useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"
import { focusOrOpenFileInEditor } from "@/views/lib/events/misc"
import { Algorithms } from "./index"

export default function TestcaseRun() {
   const navigate = useNavigate()
   const { id } = useParams()
   const workspacePath = useSelector((state: RootState) => state.globalState.workspacePath)
   const currentRun = useSelector((state: RootState) =>
      state.testcases.runs.find((run: TestcaseRun_t) => run.id === id)
   )

   if (!currentRun) {
      navigate("/agents/testcases")
      return null
   }

   const fileName = currentRun.file_path.split("/").pop() || currentRun.file_path

   return (
      <div className="grid grid-rows-[min-content,1fr] overflow-y-auto">
         <div className="grid grid-cols-[min-content,1fr,min-content] items-center gap-3 p-4 pb-2">
            <button
               className="p-3 rounded-xl w-min bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors"
               onClick={() => navigate("/agents/testcases")}
               title="Go back"
            >
               <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
               <h3 className="text-lg font-medium">{fileName}</h3>
               <span className="text-xs text-[var(--vscode-descriptionForeground)]">
                  {currentRun.file_path}
               </span>
            </div>
            {currentRun.state === TestcaseRunState.INPROGRESS && (
               <div className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
               </div>
            )}
            {currentRun.state === TestcaseRunState.FAILED && (
               <div className="flex items-center gap-2">
                  <XCircle className="w-6 h-6 text-red-500" />
               </div>
            )}
         </div>
         <div className="overflow-y-auto pt-0 p-4">
            {currentRun.custom_instructions.trim() && (
               <div className="p-4 mt-2 rounded-lg bg-[var(--vscode-panel-background)] border border-[var(--vscode-panel-border)]">
                  <div className="text-xs font-bold mb-2 opacity-50">Custom Instructions</div>
                  <div className="text-base">{currentRun.custom_instructions}</div>
               </div>
            )}
            <div className="grid grid-cols-[min-content,1fr,min-content] items-center gap-2 p-4 mt-2 rounded-lg bg-[var(--vscode-panel-background)] border border-[var(--vscode-panel-border)]">
               {currentRun.state === TestcaseRunState.INPROGRESS && (
                  <>
                     <SparklesIcon className="w-6 h-6" />
                     <span className="text-sm">Analyzing and generating testcases...</span>
                  </>
               )}
               {currentRun.state === TestcaseRunState.COMPLETED && (
                  <>
                     <CheckCircle2 className="w-6 h-6 text-green-500" />
                     <span className="text-sm">Testcases generated</span>
                     <button
                        className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
                        title="Open testcase run"
                        onClick={async () => {
                           try {
                              if (!workspacePath) return

                              // Apply to file will create the file if it doesn't exist
                              const baseFilePath = workspacePath + "/" + currentRun.file_path
                              const testcaseFilePath = await Algorithms.applyToFile(
                                 baseFilePath,
                                 currentRun.code,
                                 currentRun.language
                              )

                              // Now open the file
                              focusOrOpenFileInEditor(testcaseFilePath)
                           } catch (error) {
                              tsvscode.postMessage({
                                 type: "show_error_notification",
                                 value: { message: error.message },
                              })
                           }
                        }}
                     >
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-sm whitespace-nowrap">Apply</span>
                     </button>
                  </>
               )}
               {currentRun.state === TestcaseRunState.FAILED && (
                  <>
                     <XCircle className="w-6 h-6 text-red-500" />
                     <span className="text-sm">Failed to generate testcases</span>
                  </>
               )}
            </div>
            {[TestcaseRunState.INPROGRESS, TestcaseRunState.COMPLETED].includes(currentRun.state) && (
               <div className="mt-4">
                  <RichMessage content={currentRun.understanding} />
                  <RichMessage content={currentRun.code} disabledActions={["apply", "run"]} />
               </div>
            )}
         </div>
      </div>
   )
}

import { API } from "@/common/api"
import { TestcaseRun_t, TestcaseRunState } from "@/common/types/testcases"
import { getCurrentFilePath, getFileContent, getFileLanguage } from "@/views/lib/events/fs"
import { ask_for_input } from "@/views/lib/events/misc"
import { addRun, updateRun } from "@/views/lib/store/agents/testcasesSlice"
import { ArrowLeft, PlayIcon, SparklesIcon } from "lucide-react"
import { useDispatch } from "react-redux"
import { Outlet, useNavigate, useParams } from "react-router-dom"

export default function TestcaseLayout() {
   const { id } = useParams()
   const navigate = useNavigate()
   const dispatch = useDispatch()

   const handleRun = async () => {
      const filePath = await getCurrentFilePath()
      if (!filePath) {
         tsvscode.postMessage({
            type: "show_error_notification",
            value: { message: "No file selected" },
         })
         return
      }

      const language = await getFileLanguage(filePath.absolute)
      const content = await getFileContent(filePath.absolute)

      const customInstructions =
         (await ask_for_input(
            "Custom Instructions",
            "Enter custom instructions for the testcase generation",
            "Enter custom instructions",
            "",
            false
         )) || ""

      const run: TestcaseRun_t = {
         id: Math.random().toString(36).substring(2, 15),
         code: "",
         understanding: "",
         language: language,
         custom_instructions: customInstructions,
         state: TestcaseRunState.INPROGRESS,
         dateCreated: Date.now(),
         dateUpdated: Date.now(),
         file_path: filePath.relative,
      }
      dispatch(addRun(run))

      try {
         const res = await API.BACKEND_LOCAL.post<{ understanding: string; code: string }>("/test/code", {
            code: content,
            language: language,
            provider: "default",
            custom_instructions: customInstructions,
            file_name: filePath.relative,
         })

         if (res.status !== 200) {
            throw new Error("Some network error occurred")
         }

         dispatch(
            updateRun({
               id: run.id,
               update: {
                  code: res.data.code,
                  understanding: res.data.understanding,
                  state: TestcaseRunState.COMPLETED,
               },
            })
         )
      } catch (error) {
         tsvscode.postMessage({
            type: "show_error_notification",
            value: { message: error.message },
         })

         dispatch(
            updateRun({
               id: run.id,
               update: { state: TestcaseRunState.FAILED },
            })
         )
      }
   }

   return (
      <div className="grid grid-rows-[min-content,1fr] overflow-auto">
         <div className="flex justify-between items-center pb-4">
            <div className="flex items-center gap-2">
               <button
                  onClick={() => navigate("/agents")}
                  className="p-2 w-min rounded-lg hover:bg-[var(--vscode-button-secondaryBackground)]"
                  title="Go back"
               >
                  <ArrowLeft className="w-6 h-6" />
               </button>
               <SparklesIcon className="w-6 h-6" />
               <h2 className="text-2xl font-bold">Testcase Assistant</h2>
            </div>
            {!id && (
               <button
                  className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
                  onClick={handleRun}
               >
                  <PlayIcon className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">Run</span>
               </button>
            )}
         </div>
         <Outlet />
      </div>
   )
}

import { API } from "@/common/api"
import { DebugRunState } from "@/common/types/debug"
import { getCurrentFilePath, getFileContent } from "@/views/lib/events/fs"
import { addRun, updateRun } from "@/views/lib/store/agents/debugSlice"
import { ArrowLeft, BugIcon, PlayIcon } from "lucide-react"
import { useDispatch } from "react-redux"
import { Outlet, useNavigate, useParams } from "react-router-dom"

export default function DebugLayout() {
   const navigate = useNavigate()
   const dispatch = useDispatch()
   const { id } = useParams()

   const handleRun = async () => {
      const filePath = await getCurrentFilePath()
      if (!filePath) {
         tsvscode.postMessage({
            type: "show_error_notification",
            value: { message: "No file selected" },
         })
         return
      }

      const run = {
         id: Math.random().toString(36).substring(2, 15),
         code: "",
         state: DebugRunState.INPROGRESS,
         dateCreated: Date.now(),
         dateUpdated: Date.now(),
         file_path: filePath.relative,
      }
      dispatch(addRun(run))

      try {
         const content = await getFileContent(filePath.absolute)

         const res = await API.BACKEND_LOCAL.post<{ analysis: string; debugged_code: string }>(
            "/debug/code",
            {
               code: content,
               provider: "default",
            }
         )
         if (res.status !== 200) {
            throw new Error("Some network error occurred")
         }

         dispatch(
            updateRun({
               id: run.id,
               update: { code: res.data.analysis, state: DebugRunState.COMPLETED },
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
               update: { state: DebugRunState.FAILED },
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
               <BugIcon className="w-6 h-6" />
               <h2 className="text-2xl font-bold">Debug Assistant</h2>
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

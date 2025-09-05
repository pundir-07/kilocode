import { OptimizeRun_t, OptimizeRunState } from "@/common/types/optimize"
import RichMessage from "@/views/components/common/RichMessage"
import { RootState } from "@/views/lib/store"
import { ArrowLeft, Loader2, XCircle } from "lucide-react"
import { useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

export default function OptimizeRun() {
   const navigate = useNavigate()
   const { id } = useParams()
   const currentRun = useSelector((state: RootState) =>
      state.optimize.runs.find((run: OptimizeRun_t) => run.id === id)
   )

   if (!currentRun) {
      navigate("/agents/optimize")
      return null
   }

   const fileName = currentRun.file_path.split("/").pop() || currentRun.file_path

   return (
      <div className="grid grid-rows-[min-content,1fr] overflow-y-auto">
         <div className="grid grid-cols-[min-content,1fr,min-content] items-center gap-3 p-4 pb-2">
            <button
               className="p-3 rounded-xl w-min bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors"
               onClick={() => navigate("/agents/optimize")}
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
            {currentRun.state === OptimizeRunState.INPROGRESS && (
               <div className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
               </div>
            )}
            {currentRun.state === OptimizeRunState.FAILED && (
               <div className="flex items-center gap-2">
                  <XCircle className="w-6 h-6 text-red-500" />
               </div>
            )}
         </div>
         <div className="overflow-y-auto pt-0 p-4">
            <RichMessage content={currentRun.code} disabledActions={["apply", "run"]} />
            {currentRun.state === OptimizeRunState.INPROGRESS && (
               <div className="flex items-center gap-2 pt-2">
                  <span className="text-sm opacity-50 from-transparent via-white/20 to-transparent bg-[length:200%_100%]">
                     Running...
                  </span>
               </div>
            )}
         </div>
      </div>
   )
}

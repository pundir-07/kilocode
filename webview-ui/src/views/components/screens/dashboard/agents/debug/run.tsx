import { DebugRun_t, DebugRunState } from "@/common/types/debug"
import RichMessage from "@/views/components/common/RichMessage"
import { RootState } from "@/views/lib/store"
import { ArrowLeft, Loader2, XCircle } from "lucide-react"
import { useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"
import { focusOrOpenFileInEditor } from "@/views/lib/events/misc"

export default function DebugRun() {
   const navigate = useNavigate()
   const { id } = useParams()
   const currentRun = useSelector((state: RootState) =>
      state.debug.runs.find((run: DebugRun_t) => run.id === id)
   )
   const workspacePath = useSelector((state: RootState) => state.globalState.workspacePath)

   if (!currentRun) {
      navigate("/agents/debug")
      return null
   }

   const fileName = currentRun.file_path.split("/").pop() || currentRun.file_path

   const handleOpenFile = () => {
      if (!currentRun) return

      // Determine if the stored path is already absolute (works for both *nix and Windows paths)
      const isAbsolutePath = (p: string) => p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p)

      let absolutePath = currentRun.file_path

      if (!isAbsolutePath(currentRun.file_path)) {
         if (!workspacePath) {
            // Cannot resolve absolute path without workspacePath
            tsvscode.postMessage({
               type: "show_error_notification",
               value: { message: "Workspace path is not set, unable to open file" },
            })
            return
         }

         // Ensure no duplicate slashes when concatenating
         absolutePath = `${workspacePath.replace(/[/\\]+$/, "")}/${currentRun.file_path.replace(/^[/\\]+/, "")}`
      }

      focusOrOpenFileInEditor(absolutePath)
   }

   return (
      <div className="grid grid-rows-[min-content,1fr] overflow-y-auto">
         <div className="grid grid-cols-[min-content,1fr,min-content] items-center gap-3 p-4 pb-2">
            <button
               className="p-3 rounded-xl w-min bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors"
               onClick={() => navigate("/agents/debug")}
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
            <div className="flex items-center gap-2">
               {currentRun.state === DebugRunState.INPROGRESS && <Loader2 className="w-6 h-6 animate-spin" />}
               {currentRun.state === DebugRunState.FAILED && <XCircle className="w-6 h-6 text-red-500" />}
               <button
                  className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
                  title="Open file"
                  onClick={handleOpenFile}
               >
                  <span className="text-sm whitespace-nowrap">Open</span>
               </button>
            </div>
         </div>
         <div className="overflow-y-auto pt-0 p-4">
            <RichMessage content={currentRun.code} disabledActions={["apply", "run"]} />
            {currentRun.state === DebugRunState.INPROGRESS && (
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

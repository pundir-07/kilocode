import { useEffect } from "react"
import { useSelector } from "react-redux"

import { useFetchEcoModeDependencies } from "@/views/hooks/useFetchEcoModeDependencies"
import { selectDependencies } from "@/views/lib/store/dependenciesSlice"
import { AlertCircle, CheckCircle2, Copy, PackageIcon, TerminalIcon } from "lucide-react"

export default function DependenciesSidebar() {
   const dependencies = useSelector(selectDependencies)
   const { fetchDependencies } = useFetchEcoModeDependencies()

   useEffect(() => {
      const interval = setInterval(() => {
         fetchDependencies()
      }, 1000)
      return () => clearInterval(interval)
   }, [fetchDependencies])

   return (
      <div className="grid grid-rows-[min-content,1fr] overflow-auto h-full">
         <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center gap-2">
               <PackageIcon className="w-6 h-6" />
               <h2 className="text-2xl font-bold">Dependency Manager</h2>
            </div>
         </div>
         <div className="flex flex-col gap-4 min-h-0 overflow-auto p-6 pt-2">
            <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4">
               <div className="grid grid-cols-[1fr_min-content] gap-4">
                  <div className="flex-1 space-y-2">
                     <h4 className="text-base font-bold">Ollama</h4>
                     <p className="text-sm text-[var(--vscode-descriptionForeground)]">
                        Run large language models locally on your machine. Ollama allows for powerful,
                        private, and customizable AI experiences.
                     </p>
                  </div>
                  {!dependencies?.ollama && (
                     <div className="flex flex-col items-end gap-2">
                        <button
                           className="px-4 py-2 rounded-lg bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors text-sm font-medium"
                           onClick={() => {
                              tsvscode.postMessage({
                                 type: "open_url",
                                 value: "https://ollama.com/download",
                              })
                           }}
                        >
                           Install
                        </button>
                        <button
                           className="w-full px-4 py-2 rounded-lg bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] transition-colors text-sm font-medium"
                           onClick={() => {
                              tsvscode.postMessage({
                                 type: "run_command",
                                 value: { command: "ollama serve" },
                              })
                           }}
                        >
                           Run
                        </button>
                     </div>
                  )}
               </div>
               <div className="pt-4">
                  {dependencies?.ollama ? (
                     <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">Ready</span>
                     </div>
                  ) : (
                     <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-500">
                           Ollama is either not installed or not running
                        </span>
                     </div>
                  )}
               </div>
            </div>

            <div
               className={`bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4 ${
                  !dependencies?.ollama ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
               }`}
            >
               <div className="grid grid-cols-[1fr_min-content] gap-4">
                  <div className="flex-1 space-y-2">
                     <h4 className="text-base font-bold">LLM</h4>
                     <p className="text-sm text-[var(--vscode-descriptionForeground)]">
                        A large language model is required to power CodeMate's AI features. Install a model to
                        get started.
                     </p>
                  </div>
               </div>
               <div className="pt-4">
                  {dependencies?.model ? (
                     <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">Ready</span>
                     </div>
                  ) : (
                     <>
                        <div className="flex items-center gap-2">
                           <AlertCircle className="w-4 h-4 text-orange-500" />
                           <span className="text-sm font-medium text-orange-500">Missing</span>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                           <div className="bg-[var(--vscode-input-background)] p-3 rounded-md w-full text-left font-mono text-sm border border-[var(--vscode-panel-border)]">
                              ollama pull {dependencies.suggestedModel}
                           </div>
                           <button
                              className="p-3 rounded-lg bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] transition-colors text-sm font-medium flex items-center justify-center"
                              onClick={() => {
                                 tsvscode.postMessage({
                                    type: "show_success_notification",
                                    value: { message: "Copied the ollama pull command to clipboard" },
                                 })
                                 navigator.clipboard.writeText(`ollama pull ${dependencies.suggestedModel}`)
                              }}
                           >
                              <Copy className="w-4 h-4" />
                           </button>
                           <button
                              className="p-3 rounded-lg bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors text-sm font-medium flex items-center justify-center"
                              onClick={() => {
                                 tsvscode.postMessage({
                                    type: "run_command",
                                    value: { command: `ollama pull ${dependencies.suggestedModel}` },
                                 })
                                 navigator.clipboard.writeText(`ollama pull ${dependencies.suggestedModel}`)
                              }}
                           >
                              <TerminalIcon className="w-4 h-4" />
                           </button>
                        </div>
                     </>
                  )}
               </div>
            </div>
         </div>
      </div>
   )
}

import { ArrowLeft, Notebook, PlayIcon } from "lucide-react"
import { Outlet, useNavigate, useParams } from "react-router-dom"

export default function ReviewLayout() {
   const navigate = useNavigate()
   const { id } = useParams()

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
               <Notebook className="w-6 h-6" />
               <h2 className="text-2xl font-bold">Code Review</h2>
            </div>
            {!id && (
               <button
                  className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
                  onClick={() => navigate("create")}
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

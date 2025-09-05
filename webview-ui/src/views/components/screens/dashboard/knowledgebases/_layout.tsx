import { Book, PlusIcon } from "lucide-react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

export default function KnowledgebasesLayout() {
   const navigate = useNavigate()
   const pathname = useLocation().pathname

   const isAdd = pathname.includes("add")
   const isEdit = pathname.includes("edit")

   return (
      <div className="h-full grid grid-rows-[min-content_1fr] overflow-auto">
         <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center gap-2">
               <Book className="w-6 h-6" />
               <h2 className="text-2xl font-bold">Knowledge Bases</h2>
            </div>
            {!isAdd && !isEdit && (
               <button
                  className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
                  onClick={() => navigate("/knowledgebases/add")}
               >
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">Create New</span>
               </button>
            )}
         </div>
         <div className="min-h-0 overflow-y-auto">
            <Outlet />
         </div>
      </div>
   )
}

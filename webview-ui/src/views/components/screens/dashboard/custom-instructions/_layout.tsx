import { PlusIcon, TextCursorInput } from "lucide-react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

export default function CustomInstructionsLayout() {
   const navigate = useNavigate()
   const location = useLocation()

   // Only show add button on the home screen (index route)
   const isHomeScreen =
      location.pathname === "/custom-instructions" || location.pathname === "/custom-instructions/"

   return (
      <div className="grid grid-rows-[min-content,1fr] overflow-auto">
         <div className="flex justify-between items-center p-4">
            <div className="flex items-center gap-2">
               <TextCursorInput className="w-6 h-6" />
               <h2 className="text-2xl font-bold">Custom Instructions</h2>
            </div>
            {isHomeScreen && (
               <button
                  onClick={() => navigate("/custom-instructions/add")}
                  className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
               >
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">New</span>
               </button>
            )}
         </div>
         <Outlet />
      </div>
   )
}

import { ChartBar } from "lucide-react"
import { Outlet } from "react-router-dom"

export default function CodeEvaluationsLayout() {
   return (
      <div className="h-full grid grid-rows-[min-content_1fr] overflow-auto">
         <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center gap-2">
               <ChartBar className="w-6 h-6" />
               <h2 className="text-2xl font-bold">Code evaluations</h2>
            </div>
         </div>
         <div className="min-h-0 overflow-y-auto p-4 pt-0">
            <Outlet />
         </div>
      </div>
   )
}

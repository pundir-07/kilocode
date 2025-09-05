import { ReviewRun_t, ReviewRunState } from "@/common/types/review"
import { RootState } from "@/views/lib/store"
import { deleteRun } from "@/views/lib/store/agents/reviewSlice"
import { CheckCircle2, Loader2, PlayIcon, Trash, XCircle } from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

namespace Algorithms {
   function formatDate(date: Date): string {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (date.toDateString() === today.toDateString()) {
         return "Today"
      } else if (date.toDateString() === yesterday.toDateString()) {
         return "Yesterday"
      } else {
         return date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
         })
      }
   }

   export function groupRunsByDate(runs: ReviewRun_t[]) {
      return runs.reduce((groups: Record<string, ReviewRun_t[]>, run) => {
         const date = new Date(run.dateCreated)
         const dateKey = formatDate(date)

         if (!groups[dateKey]) {
            groups[dateKey] = []
         }
         groups[dateKey].push(run)
         return groups
      }, {})
   }

   export function sortRunsByDate(runs: ReviewRun_t[]) {
      return runs.sort((a, b) => b.dateCreated - a.dateCreated)
   }
}

namespace Components {
   export function ReviewRunCard({ run, onDelete }: { run: ReviewRun_t; onDelete: (id: string) => void }) {
      const [isDeleting, setIsDeleting] = useState(false)
      const navigate = useNavigate()

      const handleOpen = async (e: React.MouseEvent) => {
         e.stopPropagation()
         navigate(`run/${run.id}`)
      }

      const handleDelete = async (e: React.MouseEvent) => {
         e.stopPropagation()
         setIsDeleting(true)
         try {
            // Simulate network request
            await new Promise((resolve) => setTimeout(resolve, 100))
            onDelete(run.id)
         } finally {
            setIsDeleting(false)
         }
      }

      const getStateColor = (state: ReviewRunState) => {
         switch (state) {
            case ReviewRunState.INPROGRESS:
               return "bg-blue-500/10"
            case ReviewRunState.COMPLETED:
               return "bg-green-500/10"
            case ReviewRunState.FAILED:
               return "bg-red-500/10"
         }
      }

      const getStateIcon = (state: ReviewRunState) => {
         switch (state) {
            case ReviewRunState.INPROGRESS:
               return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            case ReviewRunState.COMPLETED:
               return <CheckCircle2 className="w-5 h-5 text-green-500" />
            case ReviewRunState.FAILED:
               return <XCircle className="w-5 h-5 text-red-500" />
         }
      }

      const fileName = run.files[0].file.split("/").pop() || run.files[0].file

      return (
         <div
            key={run.id}
            className="group bg-[var(--vscode-sideBar-background)] hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-activeSelectionBackground)] focus:outline-none transition-all duration-200 p-3 rounded-lg mb-2 cursor-pointer border border-[var(--vscode-panel-border)] hover:border-[var(--vscode-focusBorder)] hover:shadow-md"
            title={fileName}
            onClick={handleOpen}
         >
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${getStateColor(run.state)}`}>
                     {getStateIcon(run.state)}
                  </div>
                  <div className="flex flex-col">
                     <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-medium truncate max-w-[200px]">{fileName}</h3>
                     </div>
                     <span className="text-xs text-[var(--vscode-descriptionForeground)] truncate">
                        {run.title}
                     </span>
                  </div>
               </div>
               <div
                  className={`${run.state === ReviewRunState.INPROGRESS ? "flex" : "hidden group-hover:flex"} items-center gap-2`}
               >
                  {run.state !== ReviewRunState.INPROGRESS && (
                     <button
                        className="p-2 rounded-md hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleDelete}
                        title="Delete run"
                        disabled={isDeleting}
                     >
                        {isDeleting ? (
                           <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                           <Trash className="w-4 h-4" />
                        )}
                     </button>
                  )}
                  <button
                     className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
                     title="Open review run"
                     onClick={handleOpen}
                  >
                     <span className="text-sm whitespace-nowrap">Open</span>
                  </button>
               </div>
            </div>
         </div>
      )
   }
}

export default function ReviewDashboard() {
   const dispatch = useDispatch()
   const navigate = useNavigate()
   const runs = useSelector((state: RootState) => (state as any).review.runs)

   const groupedRuns = Algorithms.groupRunsByDate(runs)

   Object.keys(groupedRuns).forEach((key) => {
      groupedRuns[key].sort((a, b) => b.dateCreated - a.dateCreated)
   })

   const sortedDateGroups = Object.keys(groupedRuns).sort((a, b) => {
      if (a === "Today") return -1
      if (b === "Today") return 1
      if (a === "Yesterday") return -1
      if (b === "Yesterday") return 1
      return new Date(b).getTime() - new Date(a).getTime()
   })

   return (
      <div className="min-h-0 overflow-y-auto">
         {sortedDateGroups.length > 0 ? (
            sortedDateGroups.map((dateGroup) => (
               <div key={dateGroup} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-medium text-[var(--vscode-descriptionForeground)] mb-2">
                     {dateGroup}
                  </h3>
                  {groupedRuns[dateGroup].map((run) => (
                     <Components.ReviewRunCard
                        key={run.id}
                        run={run}
                        onDelete={(id) => dispatch(deleteRun(id))}
                     />
                  ))}
               </div>
            ))
         ) : (
            <div className="text-center text-[var(--vscode-descriptionForeground)] mt-8">
               No review runs yet
            </div>
         )}
      </div>
   )
}

import { TESTCASE_FILE_EXTENSIONS } from "@/common/core/constants"
import { TestcaseRun_t, TestcaseRunState } from "@/common/types/testcases"
import { writeContentToFile } from "@/views/lib/events/fs"
import { RootState } from "@/views/lib/store"
import { deleteRun } from "@/views/lib/store/agents/testcasesSlice"
import { CheckCircle2, Loader2, Trash, XCircle } from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

export namespace Algorithms {
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

   export function groupRunsByDate(runs: TestcaseRun_t[]) {
      return runs.reduce((groups: Record<string, TestcaseRun_t[]>, run) => {
         const date = new Date(run.dateCreated)
         const dateKey = formatDate(date)

         if (!groups[dateKey]) {
            groups[dateKey] = []
         }
         groups[dateKey].push(run)
         return groups
      }, {})
   }

   export function sortRunsByDate(runs: TestcaseRun_t[]) {
      return runs.sort((a, b) => b.dateCreated - a.dateCreated)
   }

   export async function applyToFile(basefilePath: string, testcaseFileContent: string, language: string) {
      // remove ```* and ``` from start and end of the testcaseFileContent
      testcaseFileContent = testcaseFileContent.replace(/^```(.*)\n/, "").replace(/\n```$/, "")

      // replace only the last occurence of the file extension with the testcase file extension
      const testcaseFilePath = basefilePath.replace(/\.[^.]+$/, TESTCASE_FILE_EXTENSIONS[`.${language}`])
      await writeContentToFile(testcaseFilePath, testcaseFileContent)

      return testcaseFilePath
   }
}

function TestcaseRunCard({
   run,
   onDelete,
}: {
   run: {
      id: string
      code: string
      state: TestcaseRunState
      dateCreated: number
      dateUpdated: number
      file_path: string
   }
   onDelete: (id: string) => void
}) {
   const [isDeleting, setIsDeleting] = useState(false)
   const navigate = useNavigate()

   const handleOpen = async (e: React.MouseEvent) => {
      e.stopPropagation()
      navigate(`/agents/testcases/run/${run.id}`)
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

   const getStateColor = (state: TestcaseRunState) => {
      switch (state) {
         case TestcaseRunState.INPROGRESS:
            return "bg-blue-500/10"
         case TestcaseRunState.COMPLETED:
            return "bg-green-500/10"
         case TestcaseRunState.FAILED:
            return "bg-red-500/10"
      }
   }

   const getStateIcon = (state: TestcaseRunState) => {
      switch (state) {
         case TestcaseRunState.INPROGRESS:
            return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
         case TestcaseRunState.COMPLETED:
            return <CheckCircle2 className="w-5 h-5 text-green-500" />
         case TestcaseRunState.FAILED:
            return <XCircle className="w-5 h-5 text-red-500" />
      }
   }

   const fileName = run.file_path.split("/").pop() || run.file_path

   return (
      <div
         key={run.id}
         className="group bg-[var(--vscode-sideBar-background)] hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-activeSelectionBackground)] focus:outline-none transition-all duration-200 p-3 rounded-lg mb-2 cursor-pointer border border-[var(--vscode-panel-border)] hover:border-[var(--vscode-focusBorder)] hover:shadow-md"
         title={run.file_path}
         onClick={handleOpen}
      >
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className={`p-2 rounded-lg ${getStateColor(run.state)}`}>{getStateIcon(run.state)}</div>
               <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                     <h3 className="text-base font-medium truncate max-w-[200px]">{fileName}</h3>
                  </div>
                  <span className="text-xs text-[var(--vscode-descriptionForeground)] truncate">
                     {run.file_path}
                  </span>
               </div>
            </div>
            <div
               className={`${run.state === TestcaseRunState.INPROGRESS ? "flex" : "hidden group-hover:flex"} items-center gap-2`}
            >
               {run.state !== TestcaseRunState.INPROGRESS && (
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
                  title="Open testcase run"
                  onClick={handleOpen}
               >
                  <span className="text-sm whitespace-nowrap">Open</span>
               </button>
            </div>
         </div>
      </div>
   )
}

export default function TestcaseDashboard() {
   const dispatch = useDispatch()
   const runs = useSelector((state: RootState) => (state as any).testcases.runs)

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
                     <TestcaseRunCard key={run.id} run={run} onDelete={(id) => dispatch(deleteRun(id))} />
                  ))}
               </div>
            ))
         ) : (
            <div className="text-center text-[var(--vscode-descriptionForeground)] mt-8">
               No testcase runs yet
            </div>
         )}
      </div>
   )
}

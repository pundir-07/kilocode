import { SecurityReviewProblemStatus } from "@/common/types/code-evaluation"
import RichMessage from "@/views/components/common/RichMessage"
import { focusOrOpenFileInEditor } from "@/views/lib/events/misc"
import { RootState } from "@/views/lib/store"
import { selectCodeEvaluationsRunByPath } from "@/views/lib/store/codeEvaluationsSlice"
import { selectWorkspacePath } from "@/views/lib/store/globalSlice"
import { ArrowLeft, ChevronDown, ChevronUp, Combine } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { Link, useParams } from "react-router-dom"

export default function CodeEvaluationFile() {
   const filePath = useParams().file
   const workspacePath = useSelector(selectWorkspacePath)
   const codeEvaluation = useSelector((state: RootState) =>
      selectCodeEvaluationsRunByPath(state, workspacePath, filePath)
   )

   // Tab state management
   const [activeTab, setActiveTab] = useState<"documentation" | "security">("security")

   // Always show both tabs regardless of content availability
   const availableTabs = useMemo(
      () => [
         {
            id: "security",
            label: "Security Evaluation",
         },
         {
            id: "documentation",
            label: "Documentation",
         },
      ],
      []
   )

   // Set default active tab when tabs change
   useEffect(() => {
      if (availableTabs.length > 0 && !availableTabs.some((tab) => tab.id === activeTab)) {
         setActiveTab(availableTabs[0].id as any)
      }
   }, [availableTabs, activeTab])

   const handleOpenFile = () => {
      if (!filePath) return

      if (!workspacePath) {
         // This is unlikely if we have a code evaluation, but good to check.
         tsvscode.postMessage({
            type: "show_error_notification",
            value: { message: "Workspace path is not set, unable to open file" },
         })
         return
      }

      // Determine if the stored path is already absolute (works for both *nix and Windows paths)
      const isAbsolutePath = (p: string) => p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p)

      let absolutePath = filePath
      if (!isAbsolutePath(filePath)) {
         // Ensure no duplicate slashes when concatenating
         absolutePath = `${workspacePath.replace(/[/\\]+$/, "")}/${filePath.replace(/^[/\\]+/, "")}`
      }

      focusOrOpenFileInEditor(absolutePath)
   }

   if (!codeEvaluation) {
      return (
         <div>
            <div className="p-2 text-sm text-white/60 flex gap-4 items-center mb-4">
               <Link to="/code-evaluations" className="hover:text-white">
                  <ArrowLeft className="text-xs cursor-pointer" size={15} />
               </Link>
               {filePath}
            </div>
            <div className="p-4 text-white/40">No code evaluation found for this file.</div>
         </div>
      )
   }

   const getSeverityBadge = (severity: number) => {
      if (severity >= 1 && severity <= 4) {
         return (
            <span className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-xs">Low ({severity})</span>
         )
      } else if (severity >= 5 && severity <= 7) {
         return (
            <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">
               Medium ({severity})
            </span>
         )
      } else if (severity >= 8 && severity <= 10) {
         return (
            <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs">High ({severity})</span>
         )
      }
      return (
         <span className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-xs">Unknown ({severity})</span>
      )
   }

   const getSeverityPill = (severity: number) => {
      if (severity >= 1 && severity <= 4) {
         return (
            <span className="bg-gray-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">Low</span>
         )
      } else if (severity >= 5 && severity <= 7) {
         return (
            <span className="bg-yellow-500 text-black px-2 py-0.5 rounded-full text-xs font-medium">Med</span>
         )
      } else if (severity >= 8 && severity <= 10) {
         return (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">High</span>
         )
      }
      return <span className="bg-gray-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">?</span>
   }

   const renderStatusButton = (problem: {
      id: string
      status: SecurityReviewProblemStatus
      targetCodeBlock: string
   }) => {
      switch (problem.status) {
         case SecurityReviewProblemStatus.UNTOUCHED:
            return (
               <button
                  className="flex gap-2 items-center px-4 py-2 rounded text-xs text-white bg-blue-600 hover:bg-blue-700 border border-blue-500"
                  onClick={() => {
                     tsvscode.postMessage({
                        type: "highlight_code_snippet_in_file",
                        value: {
                           filePath: filePath,
                           codeSnippet: problem.targetCodeBlock,
                        },
                     })
                  }}
               >
                  <Combine size={14} />
                  <span>Open</span>
               </button>
            )
         case SecurityReviewProblemStatus.PENDING:
            return (
               <span className="px-4 py-1 rounded text-xs text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 flex items-center gap-2">
                  <div className="animate-spin h-3 w-3 border border-yellow-300 border-t-transparent rounded-full"></div>
                  In Progress
               </span>
            )
         case SecurityReviewProblemStatus.FIXED:
            return (
               <span className="px-4 py-1 rounded text-xs text-green-300 bg-green-500/20 border border-green-500/30">
                  Fixed
               </span>
            )
         default:
            return null
      }
   }

   const renderTabContent = () => {
      if (activeTab === "documentation") {
         if (codeEvaluation.content.docs.content) {
            return (
               <div className="p-2">
                  <RichMessage
                     content={codeEvaluation.content.docs.content || "No documentation content available."}
                  />
               </div>
            )
         } else {
            return (
               <div className="p-4 text-center text-white/60">
                  <div className="text-lg mb-2">📝</div>
                  <div>It's not ready yet</div>
                  <div className="text-xs text-white/40 mt-1">
                     Documentation will appear here once generated
                  </div>
               </div>
            )
         }
      }

      if (activeTab === "security") {
         if (codeEvaluation.content.security.content) {
            const securityContent = codeEvaluation.content.security

            // Group problems by status and sort by severity (high to low)
            const attendedProblems = securityContent.content.problems
               .filter((p) => p.status !== SecurityReviewProblemStatus.UNTOUCHED)
               .sort((a, b) => b.severity - a.severity)
            const unattendedProblems = securityContent.content.problems
               .filter((p) => p.status === SecurityReviewProblemStatus.UNTOUCHED)
               .sort((a, b) => b.severity - a.severity)

            return (
               <div className="p-2 space-y-6">
                  {/* Overall Summary */}
                  <div>
                     <h2 className="text-white text-base font-semibold mb-3">Overall Summary</h2>
                     <CollapsibleBox title="Summary" open={false}>
                        <RichMessage content={securityContent.content.summary} />
                     </CollapsibleBox>
                  </div>

                  {/* Unattended Problems */}
                  {unattendedProblems.length > 0 && (
                     <div>
                        <h3 className="text-white text-sm font-semibold mb-3">
                           Unattended problems ({unattendedProblems.length})
                        </h3>
                        <div className="space-y-2">
                           {unattendedProblems.map((problem, index) => (
                              <div className="my-2" key={`unattended-${index}`}>
                                 <ProblemCard
                                    problem={problem}
                                    index={index}
                                    getSeverityBadge={getSeverityBadge}
                                    getSeverityPill={getSeverityPill}
                                    getStatusButton={(status, _index, problemObj) =>
                                       renderStatusButton(problemObj)
                                    }
                                 />
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Attended Problems */}
                  {attendedProblems.length > 0 && (
                     <div>
                        <h3 className="text-white text-sm font-semibold mb-3">
                           Attended problems ({attendedProblems.length})
                        </h3>
                        <div className="space-y-2">
                           {attendedProblems.map((problem, index) => (
                              <div className="my-2" key={`attended-${index}`}>
                                 <ProblemCard
                                    problem={problem}
                                    index={index}
                                    getSeverityBadge={getSeverityBadge}
                                    getSeverityPill={getSeverityPill}
                                    getStatusButton={(status, _index, problemObj) =>
                                       renderStatusButton(problemObj)
                                    }
                                 />
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* No problems case */}
                  {securityContent.content.problems.length === 0 && (
                     <div className="p-4 text-center text-white/60">
                        <div className="text-lg mb-2">✅</div>
                        <div>No security issues found</div>
                        <div className="text-xs text-white/40 mt-1">This file appears to be secure</div>
                     </div>
                  )}
               </div>
            )
         } else {
            return (
               <div className="p-4 text-center text-white/60">
                  <div className="text-lg mb-2">🔒</div>
                  <div>It's not ready yet</div>
                  <div className="text-xs text-white/40 mt-1">
                     Security evaluation will appear here once completed
                  </div>
               </div>
            )
         }
      }

      return null
   }

   return (
      <div className="h-full flex flex-col overflow-auto">
         {/* Header */}
         <div className="p-2 text-sm text-white/60 flex gap-4 items-center">
            <Link to="/code-evaluations" className="hover:text-white">
               <ArrowLeft className="text-xs cursor-pointer" size={15} />
            </Link>
            <div className="flex items-center justify-between flex-1">
               <span>{filePath}</span>
               <button
                  className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
                  title="Open file"
                  onClick={handleOpenFile}
               >
                  <span className="text-sm whitespace-nowrap">Open</span>
               </button>
            </div>
         </div>

         <div className="px-2 pb-2 text-xs text-white/40">
            Updated: {new Date(codeEvaluation.dateUpdated).toLocaleString()}
         </div>

         {/* Tabs */}
         <div className="flex gap-2 border-b border-white/20 mx-2 mb-0">
            {availableTabs.map((tab) => (
               <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={
                     `cursor-pointer px-4 py-2 font-medium text-sm ` +
                     (activeTab === tab.id
                        ? "text-white border-b-2 border-white"
                        : "text-white/60 hover:text-white/80")
                  }
               >
                  {tab.label}
               </div>
            ))}
         </div>

         {/* Content */}
         <div className="flex-1 overflow-y-auto">{renderTabContent()}</div>
      </div>
   )
}

const ProblemCard = ({
   problem,
   index,
   getSeverityBadge,
   getSeverityPill,
   getStatusButton,
}: {
   problem: any
   index: number
   getSeverityBadge: (severity: number) => JSX.Element
   getSeverityPill: (severity: number) => JSX.Element
   getStatusButton: (
      status: SecurityReviewProblemStatus,
      index: number,
      problem: { id: string; status: SecurityReviewProblemStatus; targetCodeBlock: string } | any
   ) => JSX.Element | null
}) => {
   const [isOpen, setIsOpen] = useState(false)

   return (
      <div className="border border-white/20 rounded-md px-4 py-2">
         <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setIsOpen(!isOpen)}
         >
            <div className="flex items-center gap-3 flex-1 min-w-0">
               {getSeverityPill(problem.severity)}
               <div className="flex-1 min-w-0">
                  <h3 className="text-white text-sm font-medium">{problem.title}</h3>
               </div>
            </div>
            <div className="flex items-center gap-2">
               {problem.status === SecurityReviewProblemStatus.PENDING && (
                  <div className="animate-spin h-3 w-3 border border-yellow-300 border-t-transparent rounded-full"></div>
               )}
               <span className="text-white/70 text-xs">
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
               </span>
            </div>
         </div>

         <div className={`overflow-hidden ${isOpen ? "max-h-[1000px] mt-2" : "max-h-0"}`}>
            {isOpen && (
               <div className="pt-2 text-white/80 text-sm">
                  <div className="mb-3">
                     <RichMessage content={problem.description} />
                     {problem.targetCodeBlock && (
                        <div className="bg-gray-800 p-3 rounded text-xs font-mono overflow-x-auto mt-3">
                           <pre>{problem.targetCodeBlock}</pre>
                        </div>
                     )}
                  </div>
                  <div className="flex w-full justify-between items-center p-2 pt-0">
                     <div className="flex gap-2 items-center">{getSeverityBadge(problem.severity)}</div>
                     {getStatusButton(problem.status, index, problem)}
                  </div>
               </div>
            )}
         </div>
      </div>
   )
}

const CollapsibleBox = ({
   title,
   children,
   open = false,
}: {
   title: string
   children: React.ReactNode
   open?: boolean
}) => {
   const [isOpen, setIsOpen] = useState(open)

   return (
      <div className="border border-white/20 rounded-md px-4 py-2">
         <div
            className="flex justify-between items-center cursor-pointer select-none"
            onClick={() => setIsOpen(!isOpen)}
         >
            <h3 className="text-white text-sm">{title}</h3>
            <span className="text-white/70 text-xs">
               {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
         </div>

         <div className={`overflow-hidden ${isOpen ? "max-h-[1000px] mt-2" : "max-h-0"}`}>
            {isOpen && <div className="pt-2 text-white/80 text-sm">{children}</div>}
         </div>
      </div>
   )
}

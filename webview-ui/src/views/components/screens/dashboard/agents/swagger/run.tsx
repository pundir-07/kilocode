import { LANGUAGE_EXTENSIONS } from "@/common/core/constants"
import { SwaggerEndpointStatus, SwaggerRun_t, SwaggerRunState } from "@/common/types/swagger"
import CMDropdown from "@/views/components/common/CMDropdown"
import RichMessage from "@/views/components/common/RichMessage"
import RichMessageCode from "@/views/components/common/RichMessage/components/Code"
import { writeContentToFile } from "@/views/lib/events/fs"
import { focusOrOpenFileInEditor } from "@/views/lib/events/misc"
import { RootState } from "@/views/lib/store"
import { selectWorkspacePath } from "@/views/lib/store/globalSlice"
import {
   ArrowLeft,
   CheckCircle2,
   ChevronDown,
   ChevronRight,
   ChevronUp,
   Clock,
   FileIcon,
   Loader2,
   LucideUnlink2,
   XCircle,
   Code2,
   Globe,
   MessageSquare,
   BookOpen,
   TerminalSquare,
} from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

function Reference(props: { reference: { type: "docs"; name: string; path: string; content: string } }) {
   const [isExpanded, setIsExpanded] = useState(false)

   const handleClick = () => {
      setIsExpanded(!isExpanded)
      tsvscode.postMessage({ type: "open_docs", value: props.reference.path })
   }

   return (
      <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] overflow-hidden transition-all duration-200 hover:border-[var(--vscode-focusBorder)]">
         <div
            onClick={handleClick}
            className="p-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-[var(--vscode-list-hoverBackground)]"
         >
            <BookOpen className="w-4 h-4 text-[var(--vscode-textLink-foreground)]" />
            <span className="flex-1 text-sm font-medium">{props.reference.name}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
         </div>
         {isExpanded && (
            <div className="p-4 border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-input-background)]">
               <RichMessage content={props.reference.content || "No content available"} />
            </div>
         )}
      </div>
   )
}

function References(props: { references: { type: "docs"; name: string; path: string; content: string }[] }) {
   const [isReferencesExpanded, setIsReferencesExpanded] = useState(true)

   if (!props.references || props.references.length === 0) return null

   return (
      <div className="space-y-3">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <BookOpen className="w-5 h-5 text-[var(--vscode-textLink-foreground)]" />
               <h3 className="text-base font-medium">References</h3>
            </div>
            <button
               onClick={() => setIsReferencesExpanded(!isReferencesExpanded)}
               className="p-1 rounded hover:bg-[var(--vscode-button-secondaryBackground)]"
            >
               {isReferencesExpanded ? (
                  <ChevronUp className="w-4 h-4" />
               ) : (
                  <ChevronDown className="w-4 h-4" />
               )}
            </button>
         </div>

         {isReferencesExpanded && (
            <div className="space-y-2">
               {props.references.map((ref, index) => (
                  <Reference key={index} reference={ref} />
               ))}
            </div>
         )}
      </div>
   )
}

export default function SwaggerRun() {
   const navigate = useNavigate()
   const currentRunID = useParams().id || null
   const currentRun: SwaggerRun_t | undefined = useSelector((state: RootState) =>
      state.swagger.runs.find((run: SwaggerRun_t) => run.id === currentRunID)
   )
   const [expandedEndpoints, setExpandedEndpoints] = useState<string[]>([])
   const [selectedFilter, setSelectedFilter] = useState<"all" | "success" | "failed" | "inProgress">("all")
   const [searchQuery, setSearchQuery] = useState("")
   const [isSourceExpanded, setIsSourceExpanded] = useState(false)
   const workspacePath = useSelector(selectWorkspacePath)

   if (!currentRun) return null

   const toggleEndpoint = (endpointPath: string) => {
      setExpandedEndpoints((prev) =>
         prev.includes(endpointPath) ? prev.filter((path) => path !== endpointPath) : [...prev, endpointPath]
      )
   }

   const groupEndpoints = () => {
      if (!currentRun.result?.endpoints) return { success: [], failed: [], inProgress: [] }

      return currentRun.result.endpoints.reduce(
         (acc, endpoint) => {
            if (endpoint.status === SwaggerEndpointStatus.SUCCESS) {
               acc.success.push(endpoint)
            } else if (endpoint.status === SwaggerEndpointStatus.ERROR) {
               acc.failed.push(endpoint)
            } else {
               acc.inProgress.push(endpoint)
            }
            return acc
         },
         { success: [], failed: [], inProgress: [] }
      )
   }

   const groupedEndpoints = groupEndpoints()

   const getFilteredEndpoints = () => {
      const { success, failed, inProgress } = groupEndpoints()
      let endpoints = []

      switch (selectedFilter) {
         case "success":
            endpoints = success
            break
         case "failed":
            endpoints = failed
            break
         case "inProgress":
            endpoints = inProgress
            break
         default:
            endpoints = [...success, ...failed, ...inProgress]
      }

      if (searchQuery) {
         return endpoints.filter(
            (endpoint) =>
               endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
               endpoint.method.toLowerCase().includes(searchQuery.toLowerCase())
         )
      }

      return endpoints
   }

   const renderEndpoints = () => {
      const endpoints = getFilteredEndpoints()
      if (endpoints.length === 0)
         return (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--vscode-descriptionForeground)]">
               <Code2 className="w-12 h-12 mb-2 opacity-50" />
               <p className="text-sm">No endpoints found</p>
            </div>
         )

      return (
         <div className="space-y-3">
            {endpoints.map((endpoint, index) => {
               const isExpanded = expandedEndpoints.includes(endpoint.path + endpoint.method)
               return (
                  <div
                     key={index}
                     className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] overflow-hidden transition-all duration-200 hover:border-[var(--vscode-focusBorder)]"
                  >
                     <div
                        className="p-3 cursor-pointer transition-colors hover:bg-[var(--vscode-list-hoverBackground)]"
                        onClick={() => toggleEndpoint(endpoint.path + endpoint.method)}
                     >
                        <div className="flex items-center gap-3">
                           <div
                              className={`
                                 px-2 py-1 rounded text-xs font-medium uppercase tracking-wide
                                 ${endpoint.method === "get" ? "bg-blue-100 text-blue-800" : ""}
                                 ${endpoint.method === "post" ? "bg-green-100 text-green-800" : ""}
                                 ${endpoint.method === "put" ? "bg-yellow-100 text-yellow-800" : ""}
                                 ${endpoint.method === "delete" ? "bg-red-100 text-red-800" : ""}
                                 ${endpoint.method === "patch" ? "bg-purple-100 text-purple-800" : ""}
                              `}
                           >
                              {endpoint.method}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{endpoint.path}</div>
                              <div className="text-xs text-[var(--vscode-descriptionForeground)] mt-1">
                                 Status:{" "}
                                 <span
                                    className={`
                                       ${endpoint.status === SwaggerEndpointStatus.SUCCESS ? "text-green-500" : ""}
                                       ${endpoint.status === SwaggerEndpointStatus.ERROR ? "text-red-500" : ""}
                                       ${
                                          endpoint.status === SwaggerEndpointStatus.INPROGRESS
                                             ? "text-blue-500"
                                             : ""
                                       }
                                    `}
                                 >
                                    {currentRun.state === SwaggerRunState.FAILED
                                       ? "Failed"
                                       : endpoint.status || "Unknown"}
                                 </span>
                              </div>
                           </div>
                           {currentRun.state !== SwaggerRunState.FAILED && (
                              <>
                                 {endpoint.status === SwaggerEndpointStatus.INPROGRESS ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                 ) : (
                                    <ChevronDown
                                       className={`w-5 h-5 transition-transform duration-200 ${
                                          isExpanded ? "rotate-180" : ""
                                       }`}
                                    />
                                 )}
                              </>
                           )}
                        </div>
                     </div>
                     {isExpanded && (
                        <div className="border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-input-background)]">
                           {endpoint.code ? (
                              <RichMessageCode
                                 className={`language-${currentRun.language}`}
                                 onlySyntaxHighlight
                              >
                                 {endpoint.code}
                              </RichMessageCode>
                           ) : (
                              <div className="p-4 text-sm text-[var(--vscode-descriptionForeground)]">
                                 No code generated
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               )
            })}
         </div>
      )
   }

   const handleApply = async () => {
      if (!currentRun || !currentRun.result || currentRun.state !== SwaggerRunState.COMPLETED) return

      const compiledImports = currentRun.result.final_imports || []
      const compiledCode = currentRun.result.endpoints
         .filter((e) => e.status === SwaggerEndpointStatus.SUCCESS)
         .map((e) => e.code)
         .join("\n")
      const finalCode = `${compiledImports.join("\n")}\n\n${compiledCode}\n`.trim()

      const targetFilePath = `${workspacePath}/swagger_codemate_client${LANGUAGE_EXTENSIONS[currentRun.language]}`
      await writeContentToFile(targetFilePath, finalCode)
      focusOrOpenFileInEditor(targetFilePath)
   }

   return (
      <div className="min-h-0 overflow-y-auto">
         <div className="p-4 pb-2">
            <div className="flex items-center gap-4 mb-6">
               <button
                  onClick={() => navigate("/agents/swagger")}
                  className="p-2 w-min rounded-lg hover:bg-[var(--vscode-button-secondaryBackground)]"
                  title="Go back"
               >
                  <ArrowLeft className="w-6 h-6" />
               </button>
               <h3 className="text-lg font-medium">Run Details</h3>
            </div>

            <div className="space-y-8">
               {/* Status Cards */}
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] p-4">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-[var(--vscode-button-secondaryBackground)]">
                           <Code2 className="w-5 h-5 text-[var(--vscode-textLink-foreground)]" />
                        </div>
                        <span className="text-sm font-medium">Language</span>
                     </div>
                     <div className="text-2xl font-semibold first-letter:uppercase">{currentRun.language || "Not specified"}</div>
                  </div>

                  <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] p-4">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-[var(--vscode-button-secondaryBackground)]">
                           <Globe className="w-5 h-5 text-[var(--vscode-textLink-foreground)]" />
                        </div>
                        <span className="text-sm font-medium">Base URL</span>
                     </div>
                     <div className="text-sm truncate">{currentRun.base_url || "Not specified"}</div>
                  </div>

                  <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] p-4">
                     <div className="flex items-center gap-3 mb-4">
                        <div
                           className={`p-2 rounded-lg ${
                              currentRun.state === SwaggerRunState.COMPLETED
                                 ? "bg-green-100"
                                 : currentRun.state === SwaggerRunState.FAILED
                                   ? "bg-red-100"
                                   : "bg-blue-100"
                           }`}
                        >
                           {currentRun.state === SwaggerRunState.COMPLETED ? (
                              <CheckCircle2
                                 className="w-5 h-5"
                                 style={{ color: "var(--vscode-testing-iconPassed)" }}
                              />
                           ) : currentRun.state === SwaggerRunState.FAILED ? (
                              <XCircle
                                 className="w-5 h-5"
                                 style={{ color: "var(--vscode-testing-iconFailed)" }}
                              />
                           ) : (
                              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                           )}
                        </div>
                        <span className="text-sm font-medium">Status</span>
                     </div>
                     <div className="text-2xl font-semibold">
                        {currentRun.state === SwaggerRunState.COMPLETED
                           ? "Completed"
                           : currentRun.state === SwaggerRunState.FAILED
                             ? "Failed"
                             : "In Progress"}
                     </div>
                  </div>
               </div>

               {/* Source */}
               {currentRun.source && (
                  <div className="space-y-3">
                     <div className="flex items-center gap-2">
                        <FileIcon className="w-5 h-5 text-[var(--vscode-textLink-foreground)]" />
                        <h3 className="text-base font-medium">Source</h3>
                     </div>
                     <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] p-4">
                        {currentRun.source.type === "content" ? (
                           <div className="space-y-2">
                              <pre
                                 className={`font-mono text-xs whitespace-pre-wrap break-words ${
                                    isSourceExpanded
                                       ? "max-h-[40vh] overflow-y-auto"
                                       : "max-h-[8rem] overflow-hidden"
                                 }`}
                              >
                                 {isSourceExpanded
                                    ? currentRun.source.value
                                    : `${currentRun.source.value.slice(0, 1000)}${
                                         currentRun.source.value.length > 1000 ? "..." : ""
                                      }`}
                              </pre>
                              {currentRun.source.value.length > 1000 && (
                                 <button
                                    onClick={() => setIsSourceExpanded(!isSourceExpanded)}
                                    className="flex items-center gap-1 text-xs hover:text-[var(--vscode-textLink-foreground)]"
                                 >
                                    {isSourceExpanded ? (
                                       <>
                                          Show Less <ChevronUp className="w-3 h-3" />
                                       </>
                                    ) : (
                                       <>
                                          Show More <ChevronDown className="w-3 h-3" />
                                       </>
                                    )}
                                 </button>
                              )}
                           </div>
                        ) : (
                           <div className="text-sm whitespace-pre-wrap break-words">{currentRun.source.value}</div>
                        )}
                     </div>
                  </div>
               )}

               {/* Custom Instructions */}
               {currentRun.custom_instructions && (
                  <div className="space-y-3">
                     <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[var(--vscode-textLink-foreground)]" />
                        <h3 className="text-base font-medium">Custom Instructions</h3>
                     </div>
                     <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] p-4">
                        <div className="text-sm whitespace-pre-wrap">{currentRun.custom_instructions}</div>
                     </div>
                  </div>
               )}

               {/* Endpoints */}
               {currentRun.result?.endpoints && currentRun.result.endpoints.length > 0 && (
                  <div className="space-y-3">
                     <div className="flex items-center gap-2">
                        <TerminalSquare className="w-5 h-5 text-[var(--vscode-textLink-foreground)]" />
                        <h3 className="text-base font-medium">Endpoints</h3>
                     </div>

                     {/* Stats */}
                     <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] p-4">
                           <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className="text-sm">Success</span>
                           </div>
                           <div className="text-2xl font-bold text-green-500">
                              {groupedEndpoints.success.length}
                           </div>
                        </div>
                        <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] p-4">
                           <div className="flex items-center gap-2 mb-2">
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm">Failed</span>
                           </div>
                           <div className="text-2xl font-bold text-red-500">
                              {groupedEndpoints.failed.length}
                           </div>
                        </div>
                        <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-panel-border)] p-4">
                           <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-blue-500" />
                              <span className="text-sm">In Progress</span>
                           </div>
                           <div className="text-2xl font-bold text-blue-500">
                              {groupedEndpoints.inProgress.length}
                           </div>
                        </div>
                     </div>

                     {/* Search and Filter */}
                     <div className="flex items-center gap-4 sticky top-0 bg-[var(--vscode-editor-background)] py-2 z-10">
                        <div className="flex-1">
                           <div className="relative">
                              <input
                                 type="text"
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 placeholder="Search endpoints..."
                                 className="w-full pl-10 pr-4 py-2 bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded-lg text-sm placeholder-[var(--vscode-input-placeholderForeground)]"
                              />
                              <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--vscode-input-placeholderForeground)]" />
                           </div>
                        </div>
                        <CMDropdown
                           currentSelection={selectedFilter}
                           categories={[
                              {
                                 name: "Filter",
                                 items: [
                                    {
                                       value: "all",
                                       title: "All",
                                       description: `${currentRun.result.endpoints.length} endpoints`,
                                       onClick: (close) => {
                                          setSelectedFilter("all")
                                          close()
                                       },
                                    },
                                    {
                                       value: "success",
                                       title: "Success",
                                       leading: <CheckCircle2 className="w-6 h-6 text-green-500" />,
                                       description: `${groupedEndpoints.success.length} endpoints`,
                                       onClick: (close) => {
                                          setSelectedFilter("success")
                                          close()
                                       },
                                    },
                                    {
                                       value: "failed",
                                       title: "Failed",
                                       leading: <XCircle className="w-6 h-6 text-red-500" />,
                                       description: `${groupedEndpoints.failed.length} endpoints`,
                                       onClick: (close) => {
                                          setSelectedFilter("failed")
                                          close()
                                       },
                                    },
                                    {
                                       value: "inProgress",
                                       title: "In Progress",
                                       leading: <Clock className="w-6 h-6 text-blue-500" />,
                                       description: `${groupedEndpoints.inProgress.length} endpoints`,
                                       onClick: (close) => {
                                          setSelectedFilter("inProgress")
                                          close()
                                       },
                                    },
                                 ],
                              },
                           ]}
                        />
                     </div>

                     {/* Endpoint List */}
                     {renderEndpoints()}
                  </div>
               )}

               {/* References */}
               {currentRun.result?.references && currentRun.result.references.length > 0 && (
                  <References references={currentRun.result.references} />
               )}

               {/* Apply Button */}
               {currentRun.state === SwaggerRunState.COMPLETED && (
                  <div className="flex justify-end pt-4">
                     <button
                        onClick={handleApply}
                        className="px-4 py-2 bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] rounded-lg hover:bg-[var(--vscode-button-hoverBackground)] transition-colors"
                     >
                        Apply Changes
                     </button>
                  </div>
               )}
            </div>
         </div>
      </div>
   )
}

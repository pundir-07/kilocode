import { AlertCircle, ChevronDown, Code, FileUp, Globe, Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { API } from "@/common/api"
import { KnowledgebaseStatus, KnowledgebaseTypeSwagger_t } from "@/common/types/knowledgebase"
import { RootState } from "@/views/lib/store"
import { selectKnowledgebaseById, updateKnowledgebase } from "@/views/lib/store/knowledgebasesSlice"

export default function Swagger(props: { kbID: string; readonly?: boolean }) {
   const dispatch = useDispatch()
   const kb = useSelector(
      (state: RootState) => selectKnowledgebaseById(state, props.kbID) as KnowledgebaseTypeSwagger_t
   )
   const isWorking = kb?.status === KnowledgebaseStatus.PROGRESS
   const readonly = props.readonly

   const [isLoading, setIsLoading] = useState(false)
   const [error, setError] = useState<string | null>(null)
   const [searchQuery, setSearchQuery] = useState("")
   const [methodFilter, setMethodFilter] = useState<string>("all")

   const setEndpoints = (endpoints: Array<{ path: string; method: string; spec: any }>) => {
      dispatch(
         updateKnowledgebase({
            id: props.kbID,
            updates: { metadata: { ...kb.metadata, endpoints } },
         })
      )
   }
   const setSourceType = (type: KnowledgebaseTypeSwagger_t["metadata"]["source_type"]) => {
      dispatch(
         updateKnowledgebase({
            id: props.kbID,
            updates: {
               metadata: {
                  ...kb.metadata,
                  source_type: type,
               },
            },
         })
      )
   }

   const setSourceValue = (value: string) => {
      dispatch(
         updateKnowledgebase({
            id: props.kbID,
            updates: {
               metadata: {
                  ...kb.metadata,
                  source_value: value,
               },
            },
         })
      )
   }

   const setName = (name: string) => {
      dispatch(
         updateKnowledgebase({
            id: props.kbID,
            updates: { name },
         })
      )
   }

   // Fetch endpoints when source value changes
   useEffect(() => {
      const fetchEndpoints = async () => {
         if (!kb.metadata.source_value?.trim()) {
            setEndpoints([])
            return
         }

         setIsLoading(true)
         setError(null)

         try {
            const response = await API.BACKEND_LOCAL.post("/swagger_list", {
               type: kb.metadata.source_type,
               value: kb.metadata.source_value,
            })

            if (response.data && Array.isArray(response.data)) {
               setEndpoints(response.data)

               // Update endpoints in the knowledgebase
               dispatch(
                  updateKnowledgebase({
                     id: props.kbID,
                     updates: {
                        metadata: {
                           ...kb.metadata,
                           endpoints: response.data,
                        },
                     },
                  })
               )

               // Set a default name based on the source
               if (kb.metadata.source_type === "file") {
                  const fileName = kb.metadata.source_value.split(/[\\/]/).pop() || ""
                  setName(fileName.replace(/\.[^/.]+$/, "") || "Swagger API")
               } else if (kb.metadata.source_type === "url") {
                  try {
                     const url = new URL(kb.metadata.source_value)
                     setName(url.hostname || "Swagger API")
                  } catch {
                     setName("Swagger API")
                  }
               } else {
                  setName("Swagger API")
               }
            } else {
               setEndpoints([])
               setError("Invalid response from server. Expected an array of endpoints.")
            }
         } catch (err: any) {
            console.error("Error fetching Swagger endpoints:", err)
            setEndpoints([])
            setError(
               err?.response?.data?.message ||
                  "Failed to fetch endpoints. Please check your input and try again."
            )
         } finally {
            setIsLoading(false)
         }
      }

      // Debounce the API call
      const timeoutId = setTimeout(() => {
         fetchEndpoints()
      }, 500)

      return () => clearTimeout(timeoutId)
   }, [dispatch, props.kbID, kb.metadata.source_type, kb.metadata.source_value])

   // Filter endpoints based on search query and method filter
   const filteredEndpoints = kb.metadata.endpoints.filter((endpoint) => {
      const matchesSearch = endpoint.path.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesMethod =
         methodFilter === "all" || endpoint.method.toLowerCase() === methodFilter.toLowerCase()
      return matchesSearch && matchesMethod
   })

   // Get unique methods for filter dropdown
   const uniqueMethods = [
      "all",
      ...new Set(kb.metadata.endpoints.map((endpoint) => endpoint.method.toLowerCase())),
   ]

   // Handle file selection
   const handleFileSelect = useCallback(() => {
      tsvscode.postMessage({ type: "select_file_for_swagger" })
   }, [])

   // Listen for file selection message
   useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
         const message = event.data
         if (message.type === "selected_file_path") {
            setSourceType("file")
            setSourceValue(message.value)
         }
      }
      window.addEventListener("message", handleMessage)
      return () => window.removeEventListener("message", handleMessage)
   }, [])

   // Get method color class
   const getMethodColorClass = (method: string) => {
      switch (method.toLowerCase()) {
         case "get":
            return "bg-blue-100 text-blue-800"
         case "post":
            return "bg-green-100 text-green-800"
         case "put":
            return "bg-yellow-100 text-yellow-800"
         case "delete":
            return "bg-red-100 text-red-800"
         case "patch":
            return "bg-purple-100 text-purple-800"
         default:
            return "bg-gray-100 text-gray-800"
      }
   }

   return (
      <div className="flex flex-col gap-4 h-full overflow-auto">
         {/* Source Type Selection */}
         <div className="flex gap-2">
            <button
               onClick={() => setSourceType("file")}
               className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md ${
                  kb.metadata.source_type === "file"
                     ? "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]"
                     : "bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)]"
               } ${isWorking ? "opacity-50 cursor-not-allowed" : readonly ? "cursor-not-allowed pointer-events-none" : "hover:bg-[var(--vscode-button-hoverBackground)]"}`}
               disabled={isWorking || readonly}
            >
               <FileUp className="w-4 h-4" />
               <span>File</span>
            </button>
            <button
               onClick={() => setSourceType("content")}
               className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md ${
                  kb.metadata.source_type === "content"
                     ? "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]"
                     : "bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)]"
               } ${isWorking ? "opacity-50 cursor-not-allowed" : readonly ? "cursor-not-allowed pointer-events-none" : "hover:bg-[var(--vscode-button-hoverBackground)]"}`}
               disabled={isWorking || readonly}
            >
               <Code className="w-4 h-4" />
               <span>Text</span>
            </button>
            <button
               onClick={() => setSourceType("url")}
               className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md ${
                  kb.metadata.source_type === "url"
                     ? "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]"
                     : "bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)]"
               } ${isWorking ? "opacity-50 cursor-not-allowed" : readonly ? "cursor-not-allowed pointer-events-none" : "hover:bg-[var(--vscode-button-hoverBackground)]"}`}
               disabled={isWorking || readonly}
            >
               <Globe className="w-4 h-4" />
               <span>URL</span>
            </button>
         </div>

         {/* Source Input */}
         <div className="relative">
            {kb.metadata.source_type === "file" ? (
               <div className="flex gap-2">
                  <input
                     type="text"
                     value={kb.metadata.source_value}
                     onChange={(e) => setSourceValue(e.target.value)}
                     placeholder="Select a Swagger/OpenAPI file"
                     className={`flex-1 rounded border ${
                        error
                           ? "border-[var(--vscode-inputValidation-errorBorder)]"
                           : "border-[var(--vscode-input-border)]"
                     } bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] ${
                        isWorking
                           ? "opacity-50 cursor-not-allowed pointer-events-none"
                           : readonly
                             ? "cursor-not-allowed pointer-events-none"
                             : ""
                     }`}
                     disabled={isWorking || readonly}
                  />
                  <button
                     onClick={handleFileSelect}
                     className={`rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] p-2 ${
                        isWorking
                           ? "opacity-50 cursor-not-allowed"
                           : readonly
                             ? "cursor-not-allowed pointer-events-none"
                             : "hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
                     }`}
                     disabled={isWorking || readonly}
                  >
                     <FileUp className="w-4 h-4" />
                  </button>
               </div>
            ) : kb.metadata.source_type === "url" ? (
               <input
                  type="text"
                  value={kb.metadata.source_value}
                  onChange={(e) => setSourceValue(e.target.value)}
                  placeholder="Enter Swagger/OpenAPI URL"
                  className={`w-full rounded border ${
                     error
                        ? "border-[var(--vscode-inputValidation-errorBorder)]"
                        : "border-[var(--vscode-input-border)]"
                  } bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] ${
                     isWorking
                        ? "opacity-50 cursor-not-allowed pointer-events-none"
                        : readonly
                          ? "cursor-not-allowed pointer-events-none"
                          : ""
                  }`}
                  disabled={isWorking || readonly}
               />
            ) : (
               <textarea
                  value={kb.metadata.source_value}
                  onChange={(e) => setSourceValue(e.target.value)}
                  placeholder="Paste Swagger/OpenAPI JSON or YAML content"
                  className={`w-full rounded border ${
                     error
                        ? "border-[var(--vscode-inputValidation-errorBorder)]"
                        : "border-[var(--vscode-input-border)]"
                  } bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] min-h-[120px] resize-y ${
                     isWorking
                        ? "opacity-50 cursor-not-allowed pointer-events-none"
                        : readonly
                          ? "cursor-not-allowed pointer-events-none"
                          : ""
                  }`}
                  disabled={isWorking || readonly}
               />
            )}
            {error && (
               <div className="flex items-center gap-2 mt-1 text-[var(--vscode-inputValidation-errorForeground)] text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
               </div>
            )}
         </div>

         {/* Endpoints List */}
         <div className="flex-1 min-h-0 border border-[var(--vscode-panel-border)] rounded bg-[var(--vscode-input-background)] overflow-hidden flex flex-col">
            {/* Search and Filter */}
            <div className="sticky top-0 z-10 bg-[var(--vscode-editor-background)] border-b border-[var(--vscode-input-border)] p-2 flex gap-2">
               <div className="relative flex-1">
                  {/* <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--vscode-input-placeholderForeground)]" /> */}
                  <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Search endpoints..."
                     className="w-full pl-9 pr-3 py-1.5 bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded text-sm"
                     disabled={isWorking || isLoading}
                  />
               </div>
               <div className="relative">
                  <select
                     value={methodFilter}
                     onChange={(e) => setMethodFilter(e.target.value)}
                     disabled={isWorking || isLoading}
                     className="appearance-none bg-[var(--vscode-dropdown-background)] text-[var(--vscode-dropdown-foreground)] border border-[var(--vscode-dropdown-border)] rounded px-2 py-1 pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {uniqueMethods.map((method) => (
                        <option key={method as string} value={method as string}>
                           {method === "all" ? "All Methods" : (method as string).toUpperCase()}
                        </option>
                     ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--vscode-dropdown-foreground)]" />
               </div>
            </div>

            {/* Endpoints */}
            <div className="flex-1 overflow-y-auto p-2">
               {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                     <Loader2 className="w-8 h-8 animate-spin text-[var(--vscode-descriptionForeground)]" />
                  </div>
               ) : kb.metadata.endpoints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--vscode-descriptionForeground)]">
                     <div className="text-center">
                        {kb.metadata.source_value?.trim() ? (
                           <>No endpoints found. Please check your input.</>
                        ) : (
                           <>Enter a Swagger/OpenAPI specification to see endpoints.</>
                        )}
                     </div>
                  </div>
               ) : filteredEndpoints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--vscode-descriptionForeground)]">
                     <div className="text-center">No endpoints match your search criteria.</div>
                  </div>
               ) : (
                  <div className="space-y-2">
                     {filteredEndpoints.map((endpoint, index) => (
                        <div
                           key={index}
                           className="flex items-center gap-2 p-2 bg-[var(--vscode-editor-background)] border border-[var(--vscode-input-border)] rounded hover:bg-[var(--vscode-list-hoverBackground)]"
                        >
                           <div
                              className={`px-2 py-1 rounded text-xs font-medium uppercase ${getMethodColorClass(
                                 endpoint.method
                              )}`}
                           >
                              {endpoint.method}
                           </div>
                           <div className="flex-1 truncate">{endpoint.path}</div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>
   )
}

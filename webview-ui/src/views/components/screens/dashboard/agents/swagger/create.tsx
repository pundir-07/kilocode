import { swaggerAgentStreamFascade } from "@/common/api/stream/swagger-agent"
import { LANGUAGE_EXTENSIONS } from "@/common/core/constants"
import {
   SwaggerEndpoint_t,
   SwaggerEndpointStatus,
   SwaggerRun_t,
   SwaggerRunResult_t,
   SwaggerRunState,
} from "@/common/types/swagger"
import CMDropdown from "@/views/components/common/CMDropdown"
import { getCurrentFilePath, writeContentToFile } from "@/views/lib/events/fs"
import { focusOrOpenFileInEditor } from "@/views/lib/events/misc"
import { store } from "@/views/lib/store"
import {
   addRun,
   selectSwaggerRunByID,
   updateInProgressEndpointByPath,
   updateResultEndpoint,
   updateRun,
   updateRunResult,
} from "@/views/lib/store/agents/swaggerSlice"
import { selectWorkspacePath } from "@/views/lib/store/globalSlice"
import { selectAllSwaggerKnowledgebases } from "@/views/lib/store/knowledgebasesSlice"
import { AlertCircle, ArrowLeft, ChevronDown, FileIcon, Loader2, PlayIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"

type SwaggerSource = {
   type: "file" | "url" | "content" | "knowledgebase"
   value: string
}

export default function SwaggerCreate() {
   const dispatch = useDispatch()
   const navigate = useNavigate()
   const [error, setError] = useState<string | null>(null)
   const [baseUrlError, setBaseUrlError] = useState<string | null>(null)
   const [source, setSource] = useState<SwaggerSource>({ type: "file", value: "" })
   const [clientLanguage, setClientLanguage] = useState("python")
   const [customInstructions, setCustomInstructions] = useState("")
   const [baseUrl, setBaseUrl] = useState("")
   const [isSubmitting, setIsSubmitting] = useState(false)
   const [selectedProvider, setSelectedProvider] = useState<string | null>("default")
   const workspacePath = useSelector(selectWorkspacePath)
   const swaggerKnowledgebases = useSelector(selectAllSwaggerKnowledgebases)

   const handleBack = (event: React.MouseEvent) => {
      // Reset all local state
      setError(null)
      setSource({ type: "file", value: "" })
      setClientLanguage("python")
      setCustomInstructions("")
      setBaseUrl("")
      setIsSubmitting(false)
      setSelectedProvider("default")

      // Navigate back
      navigate("/agents/swagger")
   }
   useEffect(()=>{
      setError(null)
   },[source])
   const validateBaseUrl = (url: string): boolean => {
      if (!url) return true // Empty URL is valid (optional field)
      try {
         const urlObj = new URL(url)
         return urlObj.protocol === "http:" || urlObj.protocol === "https:"
      } catch {
         return false
      }
   }

   const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value
      setBaseUrl(url)

      if (!validateBaseUrl(url)) {
         setBaseUrlError("Please enter a valid HTTP/HTTPS URL or leave it empty")
      } else {
         setBaseUrlError(null)
      }
   }

   const handleCreate = async () => {
      if (!validateBaseUrl(baseUrl)) {
         setBaseUrlError("Please enter a valid HTTP/HTTPS URL or leave it empty")
         return
      }

      setIsSubmitting(true)
      setError(null)
      setBaseUrlError(null)

      const runID = uuidv4()

      try {
         const initialResult: SwaggerRunResult_t = {
            endpoints: [],
            final_imports: [],
            final_code: "",
            kb_code: {},
            references: [],
         }

         const run: SwaggerRun_t = {
            id: runID,
            state: SwaggerRunState.INPROGRESS,
            dateCreated: Date.now(),
            dateUpdated: Date.now(),
            source: {
               type: source.type,
               value: source.value,
            },
            language: clientLanguage,
            base_url: baseUrl,
            custom_instructions: customInstructions,
            result: initialResult,
            provider: selectedProvider,
         }

         let filePath = null
         if (source.type === "file") {
            filePath = await getCurrentFilePath()
            if (!filePath) {
               console.log("Current File not found")
               setError("Current File not found")
               return
            }
            if (!filePath.absolute.endsWith(".json")) {
               console.log("Current File is not a json file")
               setError("Current File is not a json file")
               return
            }
            run.source.value = filePath.absolute
            setSource((prev) => ({ ...prev, value: filePath.absolute }))
         }

         dispatch(addRun({ ...run }))

         // Navigate to dashboard immediately after creating the run
         navigate("/agents/swagger")

         const payload = {
            swagger_file_path: "",
            swagger_content: "",
            swagger_url: "",
            swagger_knowledgebase_id: "",
            client_side_language: clientLanguage,
            custom_instructions: customInstructions,
            base_url: baseUrl,
            provider: selectedProvider || "default",
         }

         if (run.source.type === "file") {
            payload.swagger_file_path = run.source.value
         } else if (run.source.type === "url") {
            payload.swagger_url = run.source.value
         } else if (run.source.type === "content") {
            payload.swagger_content = run.source.value
         } else if (run.source.type === "knowledgebase") {
            payload.swagger_knowledgebase_id = run.source.value
         }

         await swaggerAgentStreamFascade(payload, {
            onStreamStart: () => {
               // The run is already in progress, nothing to do here
            },
            onEndpointStart: (data) => {
               const currentRun = selectSwaggerRunByID(store.getState(), run.id)
               if (!currentRun || !currentRun.result) return

               const newEndpoint: SwaggerEndpoint_t = {
                  id: `${data.method}_${data.endpoint}`,
                  path: data.endpoint,
                  method: data.method,
                  status: SwaggerEndpointStatus.INPROGRESS,
                  code: "",
                  imports: [],
               }
               
               const updatedEndpoints = [...currentRun.result.endpoints, newEndpoint]
               dispatch(updateRunResult({ id: run.id, update: { endpoints: updatedEndpoints } }))
            },
            onEndpointSuccess: (data) => {
               dispatch(
                  updateResultEndpoint({
                     runId: run.id,
                     endpointId: `${data.method}_${data.endpoint}`,
                     data: {
                        status: SwaggerEndpointStatus.SUCCESS,
                        code: data.result.code || "",
                        imports: data.result.required_imports || [],
                     },
                  })
               )
            },
            onEndpointError: (data) => {
               dispatch(
                  updateInProgressEndpointByPath({
                     runId: run.id,
                     path: data.endpoint,
                     data: {
                        status: SwaggerEndpointStatus.ERROR,
                        code: "",
                        imports: [],
                     },
                  })
               )
            },
            onImports: (data) => {
               dispatch(updateRunResult({ id: run.id, update: { final_imports: data.imports } }))
            },
            onSuccess: () => {
               const r = selectSwaggerRunByID(store.getState(), run.id)
               if (!r || !r.result) {
                  console.error("No result found")
                  return
               }
               const compiledImports = r.result.final_imports
               const compiledCode = r.result.endpoints
                  .filter((e) => e.status === SwaggerEndpointStatus.SUCCESS)
                  .map((e) => e.code)
                  .join("\n")
               const finalCode = `${compiledImports.join("\n")}\n\n${compiledCode}\n`.trim()
               dispatch(updateRunResult({ id: run.id, update: { final_code: finalCode } }))
               const targetFilePath = `${workspacePath}/swagger_codemate_client${LANGUAGE_EXTENSIONS[r.language]}`
               writeContentToFile(targetFilePath, finalCode)
               focusOrOpenFileInEditor(targetFilePath)
            },
            onError: (data) => {
               dispatch(updateRun({ id: run.id, update: { state: SwaggerRunState.FAILED } }))
            },
            onStreamEnd: () => {
               const r = selectSwaggerRunByID(store.getState(), run.id)
               if(r.state!==SwaggerRunState.FAILED){
                  dispatch(
                     updateRun({
                        id: run.id,
                        update: { state: SwaggerRunState.COMPLETED },
                     })
                  )
               }
            },
         })
      } catch (error) {
         setError(error.message || "Failed to create swagger run")
         dispatch(
            updateRun({
               id: runID,
               update: { state: SwaggerRunState.FAILED },
            })
         )

         // Reset all local state
         setError(null)
         setSource({ type: "file", value: "" })
         setClientLanguage("python")
         setCustomInstructions("")
         setBaseUrl("")
         setSelectedProvider("default")
      } finally {
         setIsSubmitting(false)
      }
   }

   return (
      <div className="min-h-0 overflow-y-auto">
         <div className="flex items-center gap-4 mb-6">
            <button
               onClick={handleBack}
               disabled={false}
               className="p-2 w-min rounded-lg hover:bg-[var(--vscode-button-secondaryBackground)] disabled:opacity-50 disabled:cursor-not-allowed"
               title="Go back"
            >
               <ArrowLeft className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-medium">Create Swagger Run</h3>
         </div>

         <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-sm font-medium">Source Type</label>
                  <div className="relative">
                     <select
                        value={source.type}
                        onChange={(e) => setSource({ type: e.target.value as any, value: "" })}
                        className="w-full appearance-none bg-[var(--vscode-dropdown-background)] text-[var(--vscode-dropdown-foreground)] border border-[var(--vscode-dropdown-border)] rounded px-3 py-2 pr-8"
                     >
                        <option value="file">File</option>
                        <option value="url">URL</option>
                        <option value="content">Raw Text</option>
                        <option value="knowledgebase">Knowledgebase</option>
                     </select>
                     <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-medium">Client Language</label>
                  <div className="relative">
                     <select
                        value={clientLanguage}
                        onChange={(e) => setClientLanguage(e.target.value)}
                        className="w-full appearance-none bg-[var(--vscode-dropdown-background)] text-[var(--vscode-dropdown-foreground)] border border-[var(--vscode-dropdown-border)] rounded px-3 py-2 pr-8"
                     >
                        <option value="typescript">TypeScript</option>
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                     </select>
                     <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium">Base URL</label>
               <input
                  type="text"
                  value={baseUrl}
                  onChange={handleBaseUrlChange}
                  placeholder="Enter base URL (e.g. https://api.example.com)"
                  className={`w-full bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border ${
                     baseUrlError
                        ? "border-[var(--vscode-inputValidation-errorBorder)]"
                        : "border-[var(--vscode-input-border)]"
                  } rounded px-3 py-2`}
               />
               {baseUrlError && (
                  <div className="flex items-center gap-2 text-[var(--vscode-inputValidation-errorForeground)] mt-1">
                     <AlertCircle className="w-4 h-4" />
                     <span className="text-sm">{baseUrlError}</span>
                  </div>
               )}
            </div>

            {source.type === "file" && (
               <div className="flex items-center gap-2">
                  <FileIcon className="w-5 h-5 opacity-60" />
                  <span className="text-sm opacity-60">Current file will be used as source</span>
               </div>
            )}

            {source.type === "knowledgebase" && (
               <div className="space-y-2">
                  <label className="text-sm font-medium">Select Knowledgebase</label>
                  <div className="w-full">
                     <CMDropdown
                        currentSelection={source.value}
                        categories={[
                           {
                              name: "Knowledgebases",
                              items: swaggerKnowledgebases.map((kb) => ({
                                 value: kb.id,
                                 title: kb.name,
                                 description: kb.description,
                                 onClick: (closeDropdown: () => void) => {
                                    setSource({ type: "knowledgebase", value: kb.id })
                                    closeDropdown()
                                 },
                              })),
                           },
                        ]}
                        width={300}
                     />
                  </div>
               </div>
            )}

            {(source.type === "url" || source.type === "content") && (
               <div className="space-y-2">
                  <label className="text-sm font-medium">
                     {source.type === "url" ? "Swagger URL" : "Swagger Definition"}
                  </label>
                  {source.type === "content" && (
                     <textarea
                        value={source.value}
                        onChange={(e) => setSource((prev) => ({ ...prev, value: e.target.value }))}
                        placeholder="Enter swagger definition"
                        className="w-full min-h-[200px] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded px-3 py-2"
                     />
                  )}
                  {source.type === "url" && (
                     <input
                        type="content"
                        value={source.value}
                        onChange={(e) => setSource((prev) => ({ ...prev, value: e.target.value }))}
                        placeholder="Enter swagger URL"
                        className="w-full bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded px-3 py-2"
                     />
                  )}
               </div>
            )}

            <div className="space-y-2">
               <label className="text-sm font-medium">Custom Instructions (Optional)</label>
               <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Enter any custom instructions for the code generation"
                  className="w-full min-h-[100px] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded px-3 py-2"
               />
            </div>

            {error && (
               <div className="flex items-center gap-2 text-[var(--vscode-inputValidation-errorForeground)] bg-[var(--vscode-inputValidation-errorBackground)] p-2 rounded-md border border-[var(--vscode-inputValidation-errorBorder)]">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
               </div>
            )}

            <div className="flex justify-end">
               <button
                  onClick={handleCreate}
                  disabled={isSubmitting || (source.type !== "file" && !source.value)}
                  className="px-4 py-2 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                  {isSubmitting ? (
                     <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                     </>
                  ) : (
                     <>
                        <PlayIcon className="w-4 h-4" />
                        <span>Create</span>
                     </>
                  )}
               </button>
            </div>
         </div>
      </div>
   )
}

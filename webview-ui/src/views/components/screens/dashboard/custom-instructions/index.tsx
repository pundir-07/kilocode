import { API } from "@/common/api"
import type { CustomInstruction_t } from "@/common/types/custom-instructions"
import {
   deleteInstruction,
   selectCustomInstructions,
   togglePersonality,
} from "@/views/lib/store/customInstructionsSlice"
import { selectSessionID } from "@/views/lib/store/globalSlice"
import { Loader2, PencilIcon, TextCursorInput, TrashIcon } from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

// No need for date grouping algorithms since we're using hard-coded sections

function InstructionCard({
   instruction,
   onDelete,
}: {
   instruction: CustomInstruction_t
   onDelete: (id: string) => void
}) {
   const navigate = useNavigate()
   const sessionID = useSelector(selectSessionID)
   const [isDeleting, setIsDeleting] = useState(false)

   const handleOpen = async (e: React.MouseEvent) => {
      e.stopPropagation()
      navigate(`/custom-instructions/edit/${instruction.id}`)
   }

   const handleDelete = async (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsDeleting(true)
      try {
         const res = await API.BACKEND_LOCAL.post<{ status: string; data: string }>(
            "/prompts/delete",
            { prompt_id: instruction.id },
            { headers: { "x-session": sessionID } }
         )
         if (res.data.status === "success") {
            onDelete(instruction.id)
         }
      } catch (error) {
         console.error("Error deleting instruction:", error)
      } finally {
         setIsDeleting(false)
      }
   }

   const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation()
      navigate(`/custom-instructions/edit/${instruction.id}`)
   }

   // Truncate content for preview
   const previewContent =
      instruction.content.length > 100 ? instruction.content.substring(0, 100) + "..." : instruction.content

   return (
      <div
         className="group bg-[var(--vscode-sideBar-background)] hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-activeSelectionBackground)] focus:outline-none transition-all duration-200 p-3 rounded-lg mb-2 cursor-pointer border border-[var(--vscode-panel-border)] hover:border-[var(--vscode-focusBorder)] hover:shadow-md"
         onClick={handleOpen}
      >
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="p-2 rounded-lg bg-blue-500/10">
                  <TextCursorInput className="w-5 h-5 text-blue-500" />
               </div>
               <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                     <h3 className="text-base font-medium truncate max-w-[200px]">{instruction.title}</h3>
                  </div>
                  <span className="text-xs text-[var(--vscode-descriptionForeground)] truncate max-w-[300px]">
                     {previewContent}
                  </span>
               </div>
            </div>
            <div className="hidden group-hover:flex items-center gap-2">
               <button
                  className="p-2 rounded-md hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleEdit}
                  title="Edit instruction"
               >
                  <PencilIcon className="w-4 h-4" />
               </button>
               <button
                  className="p-2 rounded-md hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDelete}
                  title="Delete instruction"
                  disabled={isDeleting}
               >
                  {isDeleting ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                     <TrashIcon className="w-4 h-4" />
                  )}
               </button>
               <button
                  className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
                  title="Open instruction"
                  onClick={handleOpen}
               >
                  <span className="text-sm whitespace-nowrap">Open</span>
               </button>
            </div>
         </div>
      </div>
   )
}

export default function CustomInstructionsIndex() {
   const dispatch = useDispatch()
   const navigate = useNavigate()
   const customInstructions = useSelector(selectCustomInstructions)
   const instructions = customInstructions.customInstructions
   const personalityEnabled = customInstructions.personality

   return (
      <div className="min-h-0 overflow-y-auto px-4">
         {customInstructions.loading ? (
            <div className="flex items-center justify-center w-full h-80">
               <Loader2 className="inline-block w-6 h-6 animate-spin" />
            </div>
         ) : (
            <>
               {/* Personality Card - Always shown first */}
               <div className="mb-6">
                  <h3 className="text-sm font-medium text-[var(--vscode-descriptionForeground)] mb-2">
                     Personality
                  </h3>
                  <div className="group bg-[var(--vscode-sideBar-background)] hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-activeSelectionBackground)] focus:outline-none transition-all duration-200 p-3 rounded-lg mb-2 cursor-pointer border border-[var(--vscode-panel-border)] hover:border-[var(--vscode-focusBorder)] hover:shadow-md">
                     <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                           <div className="p-2 rounded-lg bg-purple-500/10">
                              <svg
                                 className="w-5 h-5 text-purple-500"
                                 fill="none"
                                 stroke="currentColor"
                                 viewBox="0 0 24 24"
                              >
                                 <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                 />
                              </svg>
                           </div>
                           <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                 <h3 className="text-base font-medium">Assistant Personality</h3>
                              </div>
                              <span className="text-xs text-[var(--vscode-descriptionForeground)] truncate max-w-[300px]">
                                 Configure the AI assistant's personality and behavior
                              </span>
                              {/* Toggle Switch - moved below description */}
                              <div className="flex items-center gap-2 mt-4">
                                 <button
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                       personalityEnabled
                                          ? "bg-[var(--vscode-button-background)]"
                                          : "bg-[var(--vscode-input-border)]"
                                    }`}
                                    onClick={async (e) => {
                                       e.stopPropagation()
                                       dispatch(togglePersonality(!personalityEnabled))
                                       await API.BACKEND_LOCAL.post("/personality/toggle")
                                    }}
                                 >
                                    <span
                                       className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                          personalityEnabled ? "translate-x-5" : "translate-x-1"
                                       }`}
                                    />
                                 </button>
                                 <span className="text-xs text-[var(--vscode-descriptionForeground)]">
                                    Enabled
                                 </span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button
                              className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2"
                              title="Configure personality"
                              onClick={() => navigate("/custom-instructions/personality")}
                           >
                              <span className="text-sm whitespace-nowrap">Configure</span>
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Your Instructions */}
               <div className="mb-6 last:mb-0">
                  <h3 className="text-sm font-medium text-[var(--vscode-descriptionForeground)] mb-2">
                     Your Instructions
                  </h3>
                  {instructions.length > 0 ? (
                     instructions.map((instruction) => (
                        <InstructionCard
                           key={instruction.id}
                           instruction={instruction}
                           onDelete={(id) => dispatch(deleteInstruction(id))}
                        />
                     ))
                  ) : (
                     <div className="text-center text-[var(--vscode-descriptionForeground)] mt-8">
                        <TextCursorInput className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No custom instructions yet</p>
                        <p className="text-sm opacity-70">
                           Create your first custom instruction to get started
                        </p>
                     </div>
                  )}
               </div>
            </>
         )}
      </div>
   )
}

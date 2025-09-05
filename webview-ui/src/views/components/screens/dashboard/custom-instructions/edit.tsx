import { ArrowLeft, Loader2, SaveIcon, TextCursorInput, XCircle } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"
import { API } from "@/common/api"
import { selectSessionID } from "@/views/lib/store/globalSlice"
import { upsertInstruction, selectCustomInstructions } from "@/views/lib/store/customInstructionsSlice"
import type { CustomInstruction_t } from "@/common/types/custom-instructions"

export default function CustomInstructionsEdit() {
   const navigate = useNavigate()
   const dispatch = useDispatch()
   const { id } = useParams()
   const sessionID = useSelector(selectSessionID)
   const customInstructions = useSelector(selectCustomInstructions)

   const [instruction, setInstruction] = useState<CustomInstruction_t | null>(null)
   const [isWorking, setIsWorking] = useState(false)
   const [error, setError] = useState("")
   const [hasChanges, setHasChanges] = useState(false)

   // Validation state
   const [titleError, setTitleError] = useState("")
   const [contentError, setContentError] = useState("")

   // Find the instruction by ID
   useEffect(() => {
      if (!id) {
         navigate("/custom-instructions/")
         return
      }

      const foundInstruction = customInstructions.customInstructions.find((inst) => inst.id === id)
      if (!foundInstruction) {
         navigate("/custom-instructions/")
         return
      }

      setInstruction(foundInstruction)
   }, [id, customInstructions.customInstructions, navigate])

   const handleSave = useCallback(async () => {
      if (!instruction) return

      if (!instruction.title.trim() || !instruction.content.trim()) {
         if (!instruction.title.trim()) setTitleError("Title is required")
         if (!instruction.content.trim()) setContentError("Content is required")
         return
      }

      setIsWorking(true)
      setError("")

      try {
         const res = await API.BACKEND_LOCAL.post<{ status: string; data: string }>(
            "/prompts/edit",
            {
               prompt_id: instruction.id,
               name: instruction.title,
               prompt: instruction.content,
            },
            { headers: { "x-session": sessionID } }
         )

         if (res.data.status === "error") {
            setError(res.data.data)
            setIsWorking(false)
            return
         }

         // Update the instruction in the store
         dispatch(upsertInstruction(instruction))

         // Navigate back to the list
         navigate("/custom-instructions/")
      } catch (error) {
         console.error("Error updating instruction:", error)
         setError("Failed to update instruction. Please try again.")
      } finally {
         setIsWorking(false)
      }
   }, [instruction, sessionID, dispatch, navigate])

   const handleTitleChange = (value: string) => {
      if (!instruction) return
      setInstruction((prev) => (prev ? { ...prev, title: value } : null))
      setHasChanges(true)
      if (titleError) setTitleError("")
   }

   const handleContentChange = (value: string) => {
      if (!instruction) return
      setInstruction((prev) => (prev ? { ...prev, content: value } : null))
      setHasChanges(true)
      if (contentError) setContentError("")
   }

   const isFormValid = instruction?.title.trim() && instruction?.content.trim() && !isWorking
   const canSave = isFormValid && hasChanges

   if (!instruction) {
      return (
         <div className="flex items-center justify-center w-full h-80">
            <Loader2 className="inline-block w-6 h-6 animate-spin" />
         </div>
      )
   }

   return (
      <div className="grid grid-rows-[min-content,1fr,min-content] overflow-y-auto">
         <div className="grid grid-cols-[min-content,1fr,min-content] items-center gap-3 p-4 pb-2">
            <button
               className="p-3 rounded-xl w-min bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors"
               onClick={() => navigate("/custom-instructions/")}
               title="Go back"
            >
               <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
               <h3 className="text-lg font-medium">{instruction.title}</h3>
               <span className="text-xs text-[var(--vscode-descriptionForeground)]">
                  Edit Custom Instruction
               </span>
            </div>
            <div className="flex items-center gap-2">
               {isWorking && <Loader2 className="w-6 h-6 animate-spin" />}
               {error && <XCircle className="w-6 h-6 text-red-500" />}
               <button
                  className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save changes"
                  onClick={handleSave}
                  disabled={!canSave}
               >
                  <SaveIcon className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">Save</span>
               </button>
            </div>
         </div>

         <div className="overflow-y-auto pt-0 p-4">
            <div
               className={`gap-4 min-h-0 grid grid-rows-[min-content,min-content,1fr] overflow-y-auto h-full ${
                  isWorking ? "opacity-50 pointer-events-none" : ""
               }`}
            >
               <div className="flex flex-col gap-2">
                  <label className="text-sm text-[var(--vscode-foreground)]">Title</label>
                  <input
                     type="text"
                     value={instruction.title}
                     onChange={(e) => handleTitleChange(e.target.value)}
                     placeholder="Enter instruction title"
                     className="w-full rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)]"
                  />
                  {titleError && <p className="text-sm text-red-500">{titleError}</p>}
               </div>

               <div className="flex flex-col gap-2">
                  <label className="text-sm text-[var(--vscode-foreground)]">Instructions</label>
                  <textarea
                     value={instruction.content}
                     onChange={(e) => handleContentChange(e.target.value)}
                     placeholder="Enter your custom instructions..."
                     className="w-full rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] min-h-[300px] resize-y"
                  />
                  {contentError && <p className="text-sm text-red-500">{contentError}</p>}
               </div>

               <div className="flex flex-col gap-4">
                  {error && (
                     <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-500">{error}</p>
                     </div>
                  )}

                  {hasChanges && (
                     <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-500">You have unsaved changes</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   )
}

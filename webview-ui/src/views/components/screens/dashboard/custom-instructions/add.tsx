import { API } from "@/common/api"
import type { CustomInstruction_t } from "@/common/types/custom-instructions"
import { upsertInstruction } from "@/views/lib/store/customInstructionsSlice"
import { selectSessionID } from "@/views/lib/store/globalSlice"
import { ArrowLeft, Loader2, PlusIcon } from "lucide-react"
import { useCallback, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

const randomID = () => Math.random().toString(36).substring(2, 15)

export default function CustomInstructionsAdd() {
   const navigate = useNavigate()
   const dispatch = useDispatch()
   const sessionID = useSelector(selectSessionID)

   const [instruction, setInstruction] = useState<CustomInstruction_t>({
      id: randomID(),
      title: "",
      content: "",
   })
   const [isWorking, setIsWorking] = useState(false)
   const [error, setError] = useState("")

   // Validation state
   const [titleError, setTitleError] = useState("")
   const [contentError, setContentError] = useState("")

   const handleCreate = useCallback(async () => {
      if (!instruction.title.trim() || !instruction.content.trim()) {
         if (!instruction.title.trim()) setTitleError("Title is required")
         if (!instruction.content.trim()) setContentError("Content is required")
         return
      }

      setIsWorking(true)
      setError("")

      try {
         const res = await API.BACKEND_LOCAL.post<{ prompt_id: string; status: string; data: string }>(
            "/prompts/create",
            {
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

         // Add the instruction to the store
         dispatch(upsertInstruction({ ...instruction, id: res.data.prompt_id }))

         // Navigate back to the list
         navigate("/custom-instructions/")
      } catch (error) {
         console.error("Error creating instruction:", error)
         setError("Failed to create instruction. Please try again.")
      } finally {
         setIsWorking(false)
      }
   }, [instruction, sessionID, dispatch, navigate])

   const handleTitleChange = (value: string) => {
      setInstruction((prev) => ({ ...prev, title: value }))
      if (titleError) setTitleError("")
   }

   const handleContentChange = (value: string) => {
      setInstruction((prev) => ({ ...prev, content: value }))
      if (contentError) setContentError("")
   }

   const isFormValid = instruction.title.trim() && instruction.content.trim() && !isWorking

   return (
      <div className="grid grid-rows-[min-content,1fr,min-content] p-4 pt-2 h-full overflow-y-auto">
         <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
               <button
                  onClick={() => navigate("/custom-instructions/")}
                  className="p-2 w-min rounded-lg hover:bg-[var(--vscode-button-secondaryBackground)]"
                  title="Go back"
               >
                  <ArrowLeft className="w-6 h-6" />
               </button>
               <h2 className="text-lg font-bold text-[var(--vscode-foreground)] whitespace-nowrap">
                  Create Custom Instruction
               </h2>
            </div>
         </div>

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
                  className="w-full rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] min-h-[200px] resize-y"
               />
               {contentError && <p className="text-sm text-red-500">{contentError}</p>}
            </div>

            <div className="flex flex-col gap-4">
               {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                     <p className="text-sm text-red-500">{error}</p>
                  </div>
               )}
            </div>
         </div>

         <div className="mt-4">
            <button
               onClick={handleCreate}
               disabled={!isFormValid}
               className={`px-3 py-2 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full ${
                  isWorking ? "hidden" : ""
               }`}
            >
               {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
               <span>{isWorking ? "Creating..." : "Create Instruction"}</span>
            </button>
         </div>
      </div>
   )
}

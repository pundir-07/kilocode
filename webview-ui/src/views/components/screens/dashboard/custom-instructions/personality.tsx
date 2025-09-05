import { API } from "@/common/api"
import { selectCustomInstructions, setPersonalityInstructions } from "@/views/lib/store/customInstructionsSlice"
import { ArrowLeft, SaveIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useSearchParams } from "react-router-dom"

export default function AssistantPersonality() {
   const { personality, personalityInstructions } = useSelector(selectCustomInstructions)
   const [instructions, setInstructions] = useState(personalityInstructions)
   const [hasChanges, setHasChanges] = useState(false)
   const [error, setError] = useState("")
   const navigate = useNavigate()
   const dispatch = useDispatch()

   useEffect(() => {
      if (personalityInstructions !== instructions) {
         setHasChanges(true)
      }
   }, [instructions])

   async function handleSave() {
      if (!instructions) {
         return
      }
      setError("")
      try {
         const res = await API.BACKEND_LOCAL.post<{ status: string; message: string }>("/personality/set", {
            personality: instructions,
         })
         if (res.data.status === "success") {
            dispatch(setPersonalityInstructions(instructions))
            setHasChanges(false)
         } else {
            setError("Failed to Save asssitant personality. Please try again")
            console.log("Failed to Save asssitant personality:", res.data?.message)
         }
      } catch (error) {
         setError("Failed to Save asssitant personality. Please try again")
         console.log("Failed to Save asssitant personality:", error)
      }
   }
   return (
      <div className="p-4">
         <div className="mb-6">
            <div className="w-full flex items-center gap-4">
               <div
                  className="p-2 rounded-lg bg-white/10 cursor-pointer"
                  onClick={() => {
                     navigate("/custom-instructions")
                  }}
               >
                  <ArrowLeft className="w-6 h-6" />
               </div>
               <div className="w-full flex items-center justify-between mb-1">
                  <h3 className="text-base font-medium">Assistant Personality</h3>
                  <button
                     className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors w-min flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     title="Save changes"
                     onClick={handleSave}
                     disabled={!hasChanges}
                  >
                     <SaveIcon className="w-4 h-4" />
                     <span className="text-sm whitespace-nowrap">Save</span>
                  </button>
               </div>
            </div>
            <div className="mt-4 border border-white/20 rounded-md p-2">
               <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={`Define your assistant's personality...\n\nEg: You are an expert coding partner who is:\nFriendly & Patient: Cheerfully guides users through problems without jargon.\nConcise & Practical: Offers minimal, ready-to-use code and clear next steps.\nCurious: Asks clarifying questions when requirements aren’t fully clear.\nProfessional: Maintains clean formatting, consistent style, and cites docs when needed.`}
                  className="w-full rounded  p-2 text-white/70 placeholder:text-white/20 text-sm placeholder:text-sm min-h-[300px] resize-y"
                  autoFocus
                  style={{ outline: "none", border: "none", backgroundColor: "transparent" }}
               />
            </div>
            {error && <div className="text-xs text-red-600/70 p-2">{error}</div>}
         </div>
      </div>
   )
}

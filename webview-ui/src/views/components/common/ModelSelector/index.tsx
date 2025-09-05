import { ChatModel_t } from "@/common/types/model"
import CMDropdown, { CMDropdownRef } from "@/views/components/common/CMDropdown"
import { useSelector } from "react-redux"
import { selectBYOKAsModels } from "@/views/lib/store/globalSlice"
import { DEFAULT_CHAT_MODEL } from "@/common/core/constants"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

type ModelSelectorProps = {
   currentSelection?: ChatModel_t
   onSelectionChange: (selection: ChatModel_t) => void
   height?: number
   width?: number
}

export default function ModelSelector({
   currentSelection,
   onSelectionChange,
   height,
   width,
}: ModelSelectorProps) {
   const byokModels = useSelector(selectBYOKAsModels)
   const dropdownRef = useRef<CMDropdownRef>(null)
   const [isDropdownOpen, setIsDropdownOpen] = useState(false)
   const navigate = useNavigate()

   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.ctrlKey || e.metaKey) {
            if (e.key === ".") {
               e.preventDefault()
               if (e.shiftKey) {
                  dropdownRef.current?.cycle("prev")
               } else {
                  dropdownRef.current?.cycle("next")
               }
               return
            }
         }

         if (!isDropdownOpen) return

         if (e.key === "Escape") {
            dropdownRef.current?.close()
         }

         if (e.key === "Enter") {
            e.preventDefault()
            dropdownRef.current?.select()
         }
      }

      document.addEventListener("keydown", handleKeyDown)
      return () => {
         document.removeEventListener("keydown", handleKeyDown)
      }
   }, [isDropdownOpen])

   const categories = [
      {
         name: "Bring Your Own Models",
         items:
            byokModels.length > 0
               ? byokModels.map((model) => ({
                    value: model.id,
                    title: model.display_name,
                    description: model.description,
                    onClick: (close: () => void) => {
                       onSelectionChange(model)
                       close()
                    },
                 }))
               : [
                    {
                       value: "add-model",
                       title: "Add Custom Model",
                       description: "Configure your own AI model credentials",
                       icon: <Plus className="w-4 h-4" />,
                       onClick: (close: () => void) => {
                          navigate("/credentials/byok")
                          close()
                       },
                    },
                 ],
      },
      {
         name: "Cloud Models",
         items: [DEFAULT_CHAT_MODEL].map((model) => ({
            value: model.id,
            title: model.display_name,
            description: model.description,
            onClick: (close: () => void) => {
               onSelectionChange(model)
               close()
            },
         })),
      },
   ]

   return (
      <CMDropdown
         ref={dropdownRef}
         height={height}
         width={width}
         currentSelection={currentSelection?.id}
         categories={categories}
         onOpenChange={setIsDropdownOpen}
      />
   )
}

import { LINKS } from "@/common/core/constants"
import { ChatMode } from "@/common/types/chat"
import CMDropdown, { CMDropdownRef } from "@/views/components/common/CMDropdown"
import { RootState } from "@/views/lib/store"
import { Circle } from "lucide-react"
import { useSelector } from "react-redux"
import { useEffect, useRef, useState } from "react"

interface ChatModeSelectorProps {
   currentMode: ChatMode
   onModeChange: (mode: ChatMode) => void
   disabled?: boolean
}

export default function ChatModeSelector({ currentMode, onModeChange, disabled }: ChatModeSelectorProps) {
   const plan = useSelector((state: RootState) => state.globalState.plan)
   const dropdownRef = useRef<CMDropdownRef>(null)
   const [isDropdownOpen, setIsDropdownOpen] = useState(false)

   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.ctrlKey || e.metaKey) {
            if (e.key === "/") {
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
   }, [isDropdownOpen, disabled])

   const onUpgradeClick = () => {
      tsvscode.postMessage({ type: "open_url", value: LINKS.UPGRADE })
   }

   const modes = [
      {
         value: ChatMode.NORMAL,
         title: "Normal Mode",
         description: "Standard chat mode with full features",
         leading: <Circle size={14} className="mt-1 text-green-500" />,
         disabled: plan && !plan?.base.limits.access.modes.normal,
      },
      {
         value: ChatMode.ECO,
         title: "Eco Mode",
         description: "Optimized for efficiency and reduced resource usage",
         leading: <Circle size={14} className="mt-1 text-yellow-500" />,
         disabled: plan && !plan?.base.limits.access.modes.eco,
      },
      // {
      //    value: ChatMode.PRO,
      //    title: "Pro Mode",
      //    description: "Advanced chat mode with premium features",
      //    leading: <Circle size={14} className="mt-1 text-blue-500" />,
      //    disabled: plan && !plan?.base.limits.access.modes.pro,
      // },
   ]

   return (
      <div
         className={`${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
         title={disabled ? "You can't change the mode in between messages" : ""}
      >
         <CMDropdown
            ref={dropdownRef}
            disabled={disabled}
            currentSelection={currentMode}
            width={15 * 16}
            categories={[
               {
                  name: "Chat Modes",
                  items: modes.map((mode) => ({
                     value: mode.value,
                     leading: mode.leading,
                     title: mode.title,
                     description: mode.description,
                     disabled: mode.disabled,
                     onDisabledClick: onUpgradeClick,
                     onClick: (close) => {
                        onModeChange(mode.value as ChatMode)
                        close()
                     },
                  })),
               },
            ]}
            onOpenChange={setIsDropdownOpen}
         />
      </div>
   )
}

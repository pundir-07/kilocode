import { ChevronDown, ChevronUp } from "lucide-react"
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { createPortal } from "react-dom"

export interface DropdownItem {
   value: string
   leading?: React.ReactNode
   title: string
   description?: string
   disabled?: boolean
   trailing?: React.ReactNode
   onClick: (closeDropdown: () => void) => Promise<void> | void
   onDisabledClick?: () => void
}

export interface DropdownCategory {
   name: string
   items: DropdownItem[]
}

export interface DropdownProps {
   currentSelection: string | null
   categories: DropdownCategory[]
   renderTrigger?: (isOpen: boolean, currentTitle: string) => React.ReactNode
   width?: number | string
   height?: number | string
   onOpenChange?: (isOpen: boolean) => void
   disabled?: boolean
}

export interface CMDropdownRef {
   toggle: () => void
   cycle: (direction: "next" | "prev") => void
   select: () => void
   close: () => void
   open: () => void
}

const CMDropdown = forwardRef<CMDropdownRef, DropdownProps>(
   ({ currentSelection, categories, renderTrigger, width, height, onOpenChange, disabled }, ref) => {
      const [isOpen, setIsOpen] = useState(false)
      const containerRef = useRef<HTMLDivElement>(null)
      const dropdownRef = useRef<HTMLDivElement>(null)
      const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom")
      const flatItems = categories.flatMap((category) => category.items)
      const [highlightedIndex, setHighlightedIndex] = useState(
         currentSelection ? flatItems.findIndex((item) => item.value === currentSelection) : 0
      )

      const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

      useEffect(() => {
         onOpenChange?.(isOpen)
      }, [isOpen, onOpenChange])

      useImperativeHandle(ref, () => ({
         open: () => setIsOpen(true),
         close: () => setIsOpen(false),
         toggle: () => setIsOpen((prev) => !prev),
         cycle: (direction: "next" | "prev") => {
            if (!isOpen) {
               setIsOpen(true)
               return
            }
            setHighlightedIndex((prev) => {
               const total = flatItems.length
               if (direction === "next") {
                  return (prev + 1) % total
               } else {
                  return (prev - 1 + total) % total
               }
            })
         },
         select: () => {
            if (isOpen) {
               const item = flatItems[highlightedIndex]
               if (item && !item.disabled) {
                  item.onClick(() => setIsOpen(false))
               }
            }
         },
      }))

      useEffect(() => {
         itemRefs.current = itemRefs.current.slice(0, flatItems.length)
      }, [flatItems])

      useEffect(() => {
         if (isOpen) {
            setHighlightedIndex(
               currentSelection ? flatItems.findIndex((item) => item.value === currentSelection) : 0
            )
         }
      }, [isOpen])

      useEffect(() => {
         if (isOpen && highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
            itemRefs.current[highlightedIndex]?.scrollIntoView({
               block: "nearest",
            })
         }
      }, [isOpen, highlightedIndex])

      useEffect(() => {
         if (!isOpen) return

         const updatePosition = () => {
            if (!containerRef.current || !dropdownRef.current) return

            const containerRect = containerRef.current.getBoundingClientRect()
            const dropdownRect = dropdownRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const viewportWidth = window.innerWidth

            const spaceBelow = viewportHeight - containerRect.bottom
            const spaceAbove = containerRect.top
            const calculatedDropdownHeight = dropdownRect.height

            let dropdownWidth: number
            if (typeof width === "number") {
               dropdownWidth = width
            } else if (typeof width === "string") {
               // If it's a valid CSS width value, use the container's width as reference
               dropdownWidth = containerRect.width
            } else {
               dropdownWidth = Math.min(viewportWidth * 0.6, 800)
            }

            const containerCenter = containerRect.left + containerRect.width / 2
            const dropdownLeft = Math.max(
               16,
               Math.min(containerCenter - dropdownWidth / 2, viewportWidth - dropdownWidth - 16)
            )

            if (dropdownRef.current) {
               dropdownRef.current.style.left = `${dropdownLeft}px`
               dropdownRef.current.style.width = `${dropdownWidth}px`
            }

            setDropdownPosition(spaceBelow >= spaceAbove ? "bottom" : "top")
         }

         updatePosition()
         window.addEventListener("scroll", updatePosition)
         window.addEventListener("resize", updatePosition)

         return () => {
            window.removeEventListener("scroll", updatePosition)
            window.removeEventListener("resize", updatePosition)
         }
      }, [isOpen, width])

      useEffect(() => {
         const handleClickOutside = (event: MouseEvent) => {
            if (
               isOpen &&
               containerRef.current &&
               dropdownRef.current &&
               !containerRef.current.contains(event.target as Node) &&
               !dropdownRef.current.contains(event.target as Node)
            ) {
               setIsOpen(false)
            }
         }

         document.addEventListener("mousedown", handleClickOutside)
         return () => {
            document.removeEventListener("mousedown", handleClickOutside)
         }
      }, [isOpen])

      const getCurrentTitle = () => {
         for (const category of categories) {
            const item = category.items.find((item) => item.value === currentSelection)
            if (item) return item.title
         }
         return "Select Item"
      }

      const defaultTrigger = (isOpen: boolean, currentTitle: string) => (
         <button
            tabIndex={disabled ? -1 : 0}
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="w-full whitespace-nowrap px-3 py-2 text-sm flex items-center justify-between gap-2 rounded-md border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] transition-colors"
         >
            <span className="whitespace-nowrap">{currentTitle}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
         </button>
      )

      return (
         <div className="relative" ref={containerRef}>
            {renderTrigger
               ? renderTrigger(isOpen, getCurrentTitle())
               : defaultTrigger(isOpen, getCurrentTitle())}

            {isOpen &&
               createPortal(
                  <div
                     ref={dropdownRef}
                     style={{
                        position: "fixed",
                        [dropdownPosition === "top" ? "bottom" : "top"]:
                           dropdownPosition === "top"
                              ? `${window.innerHeight - containerRef.current?.getBoundingClientRect().top}px`
                              : `${containerRef.current?.getBoundingClientRect().bottom}px`,
                        marginTop: dropdownPosition === "bottom" ? "0.25rem" : "auto",
                        marginBottom: dropdownPosition === "top" ? "0.25rem" : "auto",
                     }}
                     className={`rounded-md border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] shadow-lg max-h-[80vh] overflow-y-auto fixed z-[99999] ${
                        height ? `!max-h-[${height}px]` : ""
                     }`}
                  >
                     {categories.map(
                        (category, idx) =>
                           category.items.length > 0 && (
                              <div key={idx}>
                                 <div className="p-1">
                                    <div className="px-2 py-1 text-xs text-[var(--vscode-foreground)] opacity-50">
                                       {category.name}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                                       {category.items.map((item) => {
                                          const itemIndex = flatItems.findIndex((i) => i.value === item.value)
                                          const isHighlighted = itemIndex === highlightedIndex

                                          return (
                                             <button
                                                key={item.value}
                                                ref={(el) => (itemRefs.current[itemIndex] = el)}
                                                onClick={() => {
                                                   if (item.disabled) {
                                                      item.onDisabledClick?.()
                                                      return
                                                   }
                                                   item.onClick(() => setIsOpen(false))
                                                }}
                                                className={`w-full px-3 py-2 text-sm text-left rounded-md ${
                                                   !item.disabled
                                                      ? "hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
                                                      : ""
                                                } transition-colors ${
                                                   isHighlighted
                                                      ? "bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]"
                                                      : currentSelection === item.value
                                                        ? "bg-[var(--vscode-button-secondaryBackground)]"
                                                        : ""
                                                }`}
                                             >
                                                <div
                                                   className={`flex items-start gap-3 ${
                                                      item.disabled ? "opacity-40" : ""
                                                   }`}
                                                >
                                                   {item.leading}
                                                   <div className="flex-1 min-w-0">
                                                      <div className="font-bold truncate">{item.title}</div>
                                                      {item.description && (
                                                         <div className="text-xs opacity-50">
                                                            {item.description}
                                                         </div>
                                                      )}
                                                   </div>
                                                   {item.trailing && (
                                                      <div className="flex-shrink-0">{item.trailing}</div>
                                                   )}
                                                </div>
                                             </button>
                                          )
                                       })}
                                    </div>
                                 </div>
                                 {idx < categories.length - 1 && (
                                    <div className="h-[1px] bg-[var(--vscode-panel-border)] mx-1" />
                                 )}
                              </div>
                           )
                     )}
                  </div>,
                  document.body
               )}
         </div>
      )
   }
)

export default CMDropdown

import { RocketIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface UpgradePopupProps {
   title: string
   description: string
   image?: string
   onClose?: () => void
   isOpen?: boolean
   triggerRef?: React.RefObject<HTMLElement>
   width?: number | string
   className?: string
}

export const UpgradePopup: React.FC<UpgradePopupProps> = ({
   title,
   description,
   image,
   onClose,
   isOpen = false,
   triggerRef,
   width,
   className,
}) => {
   const containerRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
      if (!isOpen || !triggerRef?.current || !containerRef.current) return

      const updatePosition = () => {
         if (!triggerRef.current || !containerRef.current) return

         const triggerRect = triggerRef.current.getBoundingClientRect()
         const containerRect = containerRef.current.getBoundingClientRect()
         const viewportHeight = window.innerHeight
         const viewportWidth = window.innerWidth

         const spaceBelow = viewportHeight - triggerRect.bottom
         const spaceAbove = triggerRect.top
         const containerHeight = containerRect.height

         let containerWidth: number
         if (typeof width === "number") {
            containerWidth = width
         } else if (typeof width === "string") {
            containerWidth = triggerRect.width
         } else {
            containerWidth = Math.min(viewportWidth * 0.5, 480)
         }

         const triggerCenter = triggerRect.left + triggerRect.width / 2
         const containerLeft = Math.max(
            16,
            Math.min(triggerCenter - containerWidth / 2, viewportWidth - containerWidth - 16)
         )

         if (containerRef.current) {
            containerRef.current.style.left = `${containerLeft}px`
            containerRef.current.style.width = `${containerWidth}px`
            containerRef.current.style.position = "fixed"

            const newPosition = spaceBelow >= containerHeight || spaceBelow >= spaceAbove ? "bottom" : "top"
            if (newPosition === "bottom") {
               containerRef.current.style.top = `${triggerRect.bottom + 8}px`
               containerRef.current.style.bottom = "auto"
            } else {
               containerRef.current.style.bottom = `${window.innerHeight - triggerRect.top + 8}px`
               containerRef.current.style.top = "auto"
            }
         }
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
            !containerRef.current.contains(event.target as Node) &&
            triggerRef?.current &&
            !triggerRef.current.contains(event.target as Node)
         ) {
            onClose?.()
         }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => {
         document.removeEventListener("mousedown", handleClickOutside)
      }
   }, [isOpen, onClose])

   if (!isOpen) return null

   return createPortal(
      <div
         ref={containerRef}
         className={`rounded-md border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] shadow-lg overflow-hidden z-[99999] ${className}`}
      >
         {image && (
            <div className="w-full h-[150px] overflow-hidden">
               <img src={image} alt={title} className="w-full h-full object-cover" />
            </div>
         )}

         <div className="p-4">
            <h2 className="text-xl font-semibold mb-3 text-[var(--vscode-foreground)]">{title}</h2>
            <p className="text-sm text-[var(--vscode-foreground)] opacity-80">{description}</p>
         </div>

         <div className="p-4 pt-0 flex justify-end items-center gap-2 mt-2">
            <button className="w-min bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] py-2 rounded-md px-2 flex items-center gap-2">
               <RocketIcon className="w-6 h-6" />
               <span className="font-bold">Upgrade</span>
            </button>
         </div>
      </div>,
      document.body
   )
}

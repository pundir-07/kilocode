import { ChevronRight } from "lucide-react"
import {
   forwardRef,
   KeyboardEvent,
   useCallback,
   useEffect,
   useImperativeHandle,
   useMemo,
   useRef,
   useState,
} from "react"
import { MenuNode_t } from "../types"

type MenuState = {
   items: MenuNode_t[]
   type: string
   searchQuery?: string
}

type MentionListProps = {
   items: MenuNode_t[]
   command: (item: MenuNode_t) => void
   query?: string
   editor?: any // passed from TipTap Suggestion renderer
}

export default forwardRef((props: MentionListProps, ref) => {
   const [selectedIndex, setSelectedIndex] = useState(0)
   const [menuHistory, setMenuHistory] = useState<MenuState[]>([
      { items: props.items, type: "root", searchQuery: "" },
   ])
   const currentMenu = menuHistory[menuHistory.length - 1]

   const filteredItems = useMemo(() => {
      const isRootMenu = menuHistory.length === 1
      const searchQuery = isRootMenu
         ? props.query?.toLowerCase() || ""
         : currentMenu.searchQuery?.toLowerCase() || ""

      return currentMenu.items.filter((item) => {
         if (!searchQuery) return true
         return item.name.toLowerCase().includes(searchQuery)
      })
   }, [currentMenu.items, currentMenu.searchQuery, props.query, menuHistory.length])

   useEffect(() => {
      setSelectedIndex(0)
   }, [menuHistory, props.query])

   const selectItem = useCallback(
      async (index: number) => {
         const item = filteredItems[index]
         if (!item) return

         if (item.disabled) return

         if ("children" in item && item.children) {
            const children = await item.children()
            setMenuHistory((prev) => [...prev, { type: item.name, items: children, searchQuery: "" }])
         } else {
            props.command(item)
         }
      },
      [filteredItems, props.command]
   )

   const scrollContainerRef = useRef<HTMLDivElement>(null)

   const upHandler = useCallback(() => {
      setSelectedIndex((prevIndex) => {
         const newIndex = prevIndex - 1 < 0 ? filteredItems.length - 1 : prevIndex - 1
         const element = scrollContainerRef.current?.children[newIndex] as HTMLElement
         if (element) element.scrollIntoView({ block: "nearest" })
         return newIndex
      })
   }, [filteredItems.length])

   const downHandler = useCallback(() => {
      setSelectedIndex((prevIndex) => {
         const newIndex = (prevIndex + 1) % filteredItems.length
         const element = scrollContainerRef.current?.children[newIndex] as HTMLElement
         if (element) element.scrollIntoView({ block: "nearest" })
         return newIndex
      })
   }, [filteredItems.length])

   const enterHandler = useCallback(() => {
      selectItem(selectedIndex)
   }, [selectItem, selectedIndex])

   const handleBackButton = useCallback(() => {
      if (menuHistory.length > 1) {
         setMenuHistory((prev) => prev.slice(0, -1))
         setSelectedIndex(0)
         if (menuHistory.length === 2) {
            setTimeout(() => props?.editor?.commands?.focus?.(), 0)
         }
      }
   }, [menuHistory, props.editor])

   // Handle keyboard events coming from the submenu search input. Without this, the
   // `ArrowUp` / `ArrowDown` / `Enter` / `Escape` keys are captured by the input
   // element itself and never reach the onKeyDown listener that TipTap provides
   // to the suggestion popup. This results in broken navigation/selection inside
   // nested menus.
   const handleInputKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
         switch (e.key) {
            case "ArrowUp":
               e.preventDefault()
               upHandler()
               break
            case "ArrowDown":
               e.preventDefault()
               downHandler()
               break
            case "Enter":
               e.preventDefault()
               enterHandler()
               break
            case "Escape":
               if (menuHistory.length > 1) {
                  e.preventDefault()
                  handleBackButton()
               }
               break
            default:
               break
         }
      },
      [upHandler, downHandler, enterHandler, handleBackButton, menuHistory.length]
   )

   useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
         if (event.key === "ArrowUp") {
            upHandler()
            return true
         }
         if (event.key === "ArrowDown") {
            downHandler()
            return true
         }
         if (event.key === "Enter") {
            enterHandler()
            return true
         }
         if (event.key === "Escape" || event.key === "Backspace") {
            if (menuHistory.length > 1) {
               handleBackButton()
               return true
            }
         }
         return false
      },
   }))

   const updateCurrentMenuSearch = useCallback((query: string) => {
      setMenuHistory((prev) => {
         const newHistory = [...prev]
         newHistory[newHistory.length - 1] = { ...newHistory[newHistory.length - 1], searchQuery: query }
         return newHistory
      })
   }, [])

   return (
      <div className="flex gap-2 max-h-[40vh]">
         <div className="items-list bg-[var(--vscode-dropdown-background)] border border-[var(--vscode-panel-border)] rounded-md shadow-lg max-h-[40vh] min-w-[20rem] max-w-[25rem] flex flex-col">
            <div className="sticky top-0 z-10 bg-[var(--vscode-dropdown-background)]">
               {menuHistory.length > 1 && (
                  <>
                     <div className="px-1.5 py-0.5 text-xs text-[var(--vscode-descriptionForeground)] border-b border-[var(--vscode-dropdown-border)] flex items-center gap-1">
                        <div
                           className="cursor-pointer hover:text-[var(--vscode-textLink-foreground)] w-min"
                           onClick={handleBackButton}
                        >
                           <i className="codicon codicon-arrow-left text-xs" />
                        </div>
                        <div className="flex items-center gap-1 justify-left">
                           {menuHistory.slice(1).map((menu, i) => (
                              <span key={i}>
                                 {i > 0 && <span className="mx-1">/</span>}
                                 {menu.type}
                              </span>
                           ))}
                        </div>
                     </div>
                     <div className="px-1.5 py-1 border-b border-[var(--vscode-dropdown-border)]">
                        <input
                           type="text"
                           placeholder={`Search in ${currentMenu.type}...`}
                           value={currentMenu.searchQuery || ""}
                           onChange={(e) => updateCurrentMenuSearch(e.target.value)}
                           className="w-full px-2 py-1 text-xs bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded text-[var(--vscode-input-foreground)] placeholder-[var(--vscode-input-placeholderForeground)]"
                           onKeyDown={handleInputKeyDown}
                           autoFocus
                        />
                     </div>
                  </>
               )}
            </div>
            <div
               className="overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--vscode-scrollbarSlider-background)] scrollbar-track-transparent hover:scrollbar-thumb-[var(--vscode-scrollbarSlider-hoverBackground)]"
               ref={scrollContainerRef}
            >
               {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                     <div
                        key={item.id}
                        className={`px-1.5 py-0.5 flex items-center gap-1.5 cursor-pointer ${
                           index === selectedIndex
                              ? "bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]"
                              : "hover:bg-[var(--vscode-list-hoverBackground)]"
                        } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => selectItem(index)}
                     >
                        {item.icon}
                        <div className="flex-1">
                           <div className="text-sm">{item.name}</div>
                        </div>
                        {"children" in item && item.children && (
                           <ChevronRight size={12} className="text-[var(--vscode-descriptionForeground)]" />
                        )}
                     </div>
                  ))
               ) : (
                  <div className="px-1.5 py-0.5 text-sm text-[var(--vscode-descriptionForeground)]">
                     No results found
                  </div>
               )}
            </div>
         </div>
      </div>
   )
})

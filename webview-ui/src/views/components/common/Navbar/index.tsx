import {
   Book,
   BotIcon,
   ChartBar,
   CrownIcon,
   ExternalLinkIcon,
   FileBoxIcon,
   HistoryIcon,
   KeyIcon,
   Loader2,
   LogOutIcon,
   MessageCircleMoreIcon,
   PlusIcon,
   SettingsIcon,
   TextCursorInput,
   UserCogIcon,
} from "lucide-react"
import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { DEFAULT_CHAT_MODEL, LINKS, NEW_CHAT_ID_PREFIX } from "@/common/core/constants"
import { ChatFuncionalState, ChatMode } from "@/common/types/chat"
import useFetchChats from "@/views/hooks/useFetchChats"
import useKeyboardShortcuts from "@/views/hooks/useKeyboardShortcuts"
import useReportRouteNavigation from "@/views/hooks/useReportRouteNavigation"
import { store } from "@/views/lib/store"
import { addChat, selectChat, setCurrentChatID } from "@/views/lib/store/chatSlice"
import { selectPlan, selectUser } from "@/views/lib/store/globalSlice"

namespace Components {
   // TabButton component
   export function TabButton(props: {
      to: string
      title: string
      icon: ReactNode
      isActive: boolean
      onClick?: () => void
   }) {
      return (
         <Link
            to={props.to}
            title={props.title}
            className={`!outline-none flex justify-center items-center gap-2 font-bold whitespace-nowrap !text-[var(--vscode-foreground)] cursor-pointer pb-2 px-3 ${
               props.isActive
                  ? "opacity-100 !text-[var(--vscode-sideBar-foreground)] border-b-2 border-b-[var(--vscode-)]"
                  : "opacity-50"
            }`}
            onClick={props.onClick}
         >
            {props.icon}
         </Link>
      )
   }

   // UserMenu component
   export function UserMenu() {
      const plan = useSelector(selectPlan)
      const user = useSelector(selectUser)
      const [isOpen, setIsOpen] = useState(false)
      const [isImageLoading, setIsImageLoading] = useState(true)
      const [imageError, setImageError] = useState(false)
      const menuRef = useRef<HTMLDivElement>(null)
      const navigate = useNavigate()

      useEffect(() => {
         const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
               setIsOpen(false)
            }
         }
         document.addEventListener("mousedown", handleClickOutside)
         return () => document.removeEventListener("mousedown", handleClickOutside)
      }, [])

      const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
         setImageError(true)
         setIsImageLoading(false)
         e.currentTarget.src = (window as any).genericUserDP
      }

      const handleImageLoad = () => {
         setIsImageLoading(false)
      }

      const menuItems = useMemo(
         () => [
            [
               {
                  label: "Manage account",
                  icon: <UserCogIcon className="w-5 h-5" />,
                  rightIcon: <ExternalLinkIcon className="w-4 h-4" />,
                  action: () => tsvscode.postMessage({ type: "open_url", value: LINKS.MANAGE_ACCOUNT }),
               },
               {
                  label: "Upgrade",
                  icon: <CrownIcon className="w-5 h-5" />,
                  rightIcon: <ExternalLinkIcon className="w-4 h-4" />,
                  hidden: plan?.base?.display_name !== "HOBBY",
                  action: () => tsvscode.postMessage({ type: "open_url", value: LINKS.UPGRADE }),
               },
            ],
            [
               {
                  label: "Custom Instructions",
                  icon: <TextCursorInput className="w-5 h-5" />,
                  rightIcon: null,
                  action: () => navigate("/custom-instructions"),
               },
               {
                  label: "Credentials",
                  icon: <KeyIcon className="w-5 h-5" />,
                  rightIcon: null,
                  action: () => navigate("/credentials"),
               },
               {
                  label: "Dependencies",
                  icon: <FileBoxIcon className="w-5 h-5" />,
                  rightIcon: null,
                  action: () => navigate("/dependencies"),
               },
            ],
            [
               {
                  label: "Settings",
                  icon: <SettingsIcon className="w-5 h-5" />,
                  rightIcon: null,
                  action: () => navigate("/settings"),
               },
               {
                  label: "Logout",
                  icon: <LogOutIcon className="w-6 h-6" />,
                  rightIcon: null,
                  action: () => tsvscode.postMessage({ type: "auth_logout" }),
               },
            ],
         ],
         [plan, navigate]
      )
      if (!user) return null
      const userDP = user.personal.avatar || (window as any).genericUserDP
      return (
         <div className="relative mb-2" ref={menuRef}>
            <div className="relative">
               {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Loader2 className="w-4 h-4 animate-spin text-[var(--vscode-text-foreground)]" />
                  </div>
               )}
               <img
                  src={userDP}
                  alt="user"
                  className={`min-w-8 min-h-8 w-8 h-8 rounded-full cursor-pointer hover:opacity-80 ${isImageLoading ? "opacity-0" : ""}`}
                  onClick={() => setIsOpen(!isOpen)}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
               />
            </div>
            {isOpen && (
               <div className="absolute right-0 mt-2 min-w-[22rem] rounded-md shadow-lg bg-[var(--vscode-sideBar-background)] border border-[var(--vscode-panel-border)] z-50">
                  <div className="p-3 grid grid-cols-[auto,1fr,max-content] items-center gap-3">
                     <div className="relative">
                        {isImageLoading && (
                           <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-[var(--vscode-text-foreground)]" />
                           </div>
                        )}
                        <img
                           src={userDP}
                           alt="user"
                           className={`min-w-12 min-h-12 w-12 h-12 rounded-full ${isImageLoading ? "opacity-0" : ""}`}
                           onError={handleImageError}
                           onLoad={handleImageLoad}
                        />
                     </div>
                     <div className="flex flex-col">
                        <div className="text-lg font-bold truncate">
                           {user.personal.name || user.personal.email || "User"}
                        </div>
                        <div className="text-sm opacity-80 truncate">
                           {user.personal.name ? user.personal.email : null}
                        </div>
                     </div>
                     <div className="text-sm opacity-80 truncate pl-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]">
                           {plan?.base?.display_name || "Unknown"}
                        </span>
                     </div>
                  </div>
                  <div className="h-[1px] bg-[var(--vscode-panel-border)]" />
                  <div className="py-1">
                     {menuItems.map((group, groupIndex) => (
                        <div key={groupIndex}>
                           {groupIndex > 0 && (
                              <div className="h-[1px] bg-[var(--vscode-panel-border)] my-1" />
                           )}
                           {group.map((item, itemIndex) =>
                              item.hidden ? null : (
                                 <div
                                    key={itemIndex}
                                    className="px-4 py-2 text-[14px] cursor-pointer hover:bg-[var(--vscode-list-hoverBackground)] flex items-center gap-2"
                                    onClick={() => {
                                       item.action()
                                       setIsOpen(false)
                                    }}
                                 >
                                    {item.icon}
                                    <span className="flex-1">{item.label}</span>
                                    {item.rightIcon}
                                 </div>
                              )
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      )
   }
}

export default function Navbar() {
   const dispatch = useDispatch()
   const navigate = useNavigate()
   const location = useLocation()
   const { fetchAllChats } = useFetchChats()
   useKeyboardShortcuts()
   useReportRouteNavigation()

   // Listen for messages from the VS Code extension (e.g. new chat command)
   useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
         if (!event.data) return

         if (event.data.type === "new_chat") {
            // Extract initial message (if any)
            const initialMessage: string | undefined = event.data.value
            const newChatID = `${NEW_CHAT_ID_PREFIX}${Date.now()}`
            const currentChat = selectChat(store.getState(), store.getState().chat.currentChatID)

            dispatch(
               addChat({
                  id: newChatID,
                  title: "New Chat",
                  messages: [],
                  updatedAt: Date.now(),
                  mode: currentChat?.mode || ChatMode.NORMAL,
                  model: currentChat?.model || DEFAULT_CHAT_MODEL,
                  isWebSearchEnabled: false,
                  state: ChatFuncionalState.IDLE,
                  followups: [],
                  usage: { used: 0, limit: 0 },
                  isContinueRequired: false,
               })
            )

            dispatch(setCurrentChatID(newChatID))

            // Make sure we are on the chat route
            if (location.pathname !== "/chat") {
               navigate("/chat")
            }

            // Trigger the chat to be sent automatically if there is an initial message
            if (initialMessage && initialMessage.trim()) {
               // Wait a tick so ChatSidebar mounts and picks up the event
               setTimeout(() => {
                  window.dispatchEvent(new Event("codemate_send_current_chat"))
               }, 100)
            }
         } else if (event.data.type === "open_chat" && typeof event.data.value === "string") {
            const chatIDToOpen: string = event.data.value

            dispatch(setCurrentChatID(chatIDToOpen))

            // Ensure route
            if (location.pathname !== "/chat") {
               navigate("/chat")
            }
         }
      }

      window.addEventListener("message", handleMessage)
      return () => {
         window.removeEventListener("message", handleMessage)
      }
   }, [dispatch, navigate, location.pathname])

   // Helper to check if a route is active
   const isActive = (path: string) => {
      if (path === "/chat") return location.pathname === "/chat"
      if (path === "/agents") return location.pathname.startsWith("/agents")
      if (path === "/history") return location.pathname === "/history"
      if (path === "/knowledgebase") return location.pathname === "/knowledgebase"
      return location.pathname === path
   }

   return (
      <div className="flex pt-2 px-5 pl-2 w-full" onClick={()=>{
         console.log("NAAVBAR CLICKED")
      }}>
         <div className="flex-1 flex items-center w-fit">
            <Components.TabButton
               to="/chat"
               title="Chat"
               icon={<MessageCircleMoreIcon className="w-5 h-5" />}
               isActive={isActive("/chat")}
            />
            <Components.TabButton
               to="/agents"
               title="Agents"
               icon={<BotIcon className="w-5 h-5" />}
               isActive={isActive("/agents")}
            />
            <Components.TabButton
               to="/code-evaluations"
               title="Code Evaluations"
               icon={<ChartBar className="w-5 h-5" />}
               isActive={isActive("/code-evaluations")}
            />
         </div>
         <div className="shrink-0 flex items-center gap-2 w-max">
            <Components.TabButton
               to="/history"
               title="History"
               icon={<HistoryIcon className="w-5 h-5" />}
               isActive={isActive("/history")}
            />
            <Components.TabButton
               to="/knowledgebases"
               title="Knowledgebases"
               icon={<Book className="w-5 h-5" />}
               isActive={isActive("/knowledgebases")}
            />
            <button
               id="new-chat-button"
               className="flex justify-center items-center gap-2 font-bold text-[var(--vscode-button-foreground)] bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)] px-2.5 py-1.5 rounded-full mb-2"
               onClick={() => {
                  const newChatID = `${NEW_CHAT_ID_PREFIX}${Date.now()}`
                  const currentChat = selectChat(store.getState(), store.getState().chat.currentChatID)
                  if (currentChat.id.startsWith("<NEW") && location.pathname === "/chat") return

                  dispatch(
                     addChat({
                        id: newChatID,
                        title: "New Chat",
                        messages: [],
                        updatedAt: Date.now(),
                        mode: currentChat?.mode || ChatMode.NORMAL,
                        model: currentChat?.model || DEFAULT_CHAT_MODEL,
                        isWebSearchEnabled: false,
                        state: ChatFuncionalState.IDLE,
                        followups: [],
                        usage: { used: 0, limit: 0 },
                        isContinueRequired: false,
                     })
                  )
                  dispatch(setCurrentChatID(newChatID))
                  fetchAllChats()
                  navigate("/chat")
               }}
            >
               <PlusIcon className="w-4 h-4" />
               <span className="text-sm whitespace-nowrap">New Chat</span>
            </button>
            <Components.UserMenu />
         </div>
      </div>
   )
}

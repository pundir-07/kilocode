import { ChevronDown, ChevronRight, ExternalLink, Loader2, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"

import { ChatFuncionalState, ChatMessage_t } from "@/common/types/chat"
import { RootState } from "@/views/lib/store"
import { selectChatMessage } from "@/views/lib/store/chatSlice"
import { selectWorkspacePath } from "@/views/lib/store/globalSlice"

export default function ToolMessage(props: { chatID?: string; messageIndex?: number }) {
   const message: ChatMessage_t = useSelector((state: RootState) =>
      selectChatMessage(state, props.chatID, props.messageIndex)
   )

   console.assert(message.role === "tool", "ToolMessage component should only be used for tool messages")

   const parsedContent = useMemo(() => {
      try {
         if (message.role !== "tool") return
         return JSON.parse(message.content)
      } catch (error) {
         console.error("Failed to parse tool message content:", error)
         return null
      }
   }, [message])

   if (message.role !== "tool") return null

   return (
      <div className="flex flex-col gap-2 my-1">
         {message.name === "context_search" && parsedContent && (
            <ContextSearchToolCallMessage content={parsedContent} />
         )}
         {message.name === "web_search" && parsedContent && (
            <WebSearchToolCallMessage content={parsedContent} />
         )}
         {message.name === "folder_search" && parsedContent && (
            <FolderSearchToolCallMessage content={parsedContent} />
         )}
         {message.name === "swagger_search" && parsedContent && (
            <SwaggerSearchToolCallMessage content={parsedContent} />
         )}
      </div>
   )
}

interface SwaggerSearchToolCallMessageProps {
   status: string
   content: {
      endpoint: string
      content: object
      additional_metadata: {
         method: string // "GET" | "PUT" | ... (CAPS ONLY)
      }
   }[]
}

function SwaggerSearchToolCallMessage({ content }: { content: SwaggerSearchToolCallMessageProps }) {
   const workspacePathSelector = useSelector(selectWorkspacePath)
   const [collapsed, setcollapsed] = useState(true)
   const [hover, sethover] = useState(false)
   // Get chat functional state
   const chatID = useSelector((state: RootState) => state.chat.currentChatID)
   const chatFunctionalState = useSelector((state: RootState) => {
      if (!chatID) return null
      const chat = state.chat.chats[chatID]
      return chat?.state ?? null
   })

   // Determine status: working, failed, or use content.status
   let effectiveStatus = content.status
   if (content.status === "pending" && chatFunctionalState !== ChatFuncionalState.WORKING) {
      effectiveStatus = "error"
   }

   useEffect(() => {
      console.log("content in component = ", content)
   }, [content])
   return (
      <div className="w-full">
         {effectiveStatus === "pending" ? (
            <div className="flex gap-1 items-center">
               <div className="flex gap-0.5">
                  {/* <Eye className="w-2.5 h-2.5 text-amber-500/90 animate-pulse" size={20} /> */}
                  <Loader2 className="text-amber-500 animate-spin" size={15} />
               </div>
               <div className="text-sm text-white/60">Parsing swagger endpoints</div>
            </div>
         ) : (
            <div className="flex flex-col gap-1 w-full">
               <div
                  className="flex gap-1 items-center cursor-pointer"
                  onMouseEnter={() => {
                     sethover(true)
                  }}
                  onMouseLeave={() => {
                     sethover(false)
                  }}
                  onClick={() => {
                     setcollapsed((prev) => !prev)
                     {
                        ;<div className="w-2 h-2 rounded-full bg-green-600/70"></div>
                     }

                     ;<div className={`text-xs ${hover ? "text-white/90" : "text-white/60"}`}>
                        Read Knowledge Base
                     </div>
                     {
                        !collapsed && <ChevronDown className="w-3 h-3 text-white/60" />
                     }
                  }}
               >
                  <div className="w-4 h-4 flex items-center justify-center">
                     {hover && collapsed ? (
                        <ChevronRight className="w-4 h-4 text-white/60" />
                     ) : !collapsed ? (
                        <ChevronDown className="w-4 h-4 text-white/60" />
                     ) : (
                        <div
                           className={`w-2 h-2 rounded-full ${
                              effectiveStatus === "success" ? "bg-green-600/70" : "bg-red-600/70"
                           }`}
                        />
                     )}
                  </div>
                  <div className={`text-sm ${hover ? "text-white/90" : "text-white/60"}`}>
                     Parsed Swagger endpoints
                  </div>
               </div>
               {!collapsed && (
                  <div className="ml-1 w-full">
                     <div className="max-h-96 overflow-y-auto overflow-x-hidden p-2 space-y-1 w-full border rounded-md border-white/5">
                        {effectiveStatus === "success" &&
                           content?.content?.map((endpointItem, index) => (
                              <SwaggerEndpointItem
                                 endpoint={endpointItem.endpoint}
                                 content={endpointItem.content}
                                 additional_metadata={endpointItem.additional_metadata}
                              />
                           ))}
                        {effectiveStatus === "error" &&
                           typeof content.content === "string" &&
                           content.content}
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>
   )
}
const SwaggerEndpointItem = ({ endpoint, content, additional_metadata }) => {
   const [expanded, setExpanded] = useState(false)
   const { method } = additional_metadata

   const getMethodStyles = (method) => {
      const styles = {
         GET: "bg-blue-600/90 text-white border-blue-500/50",
         POST: "bg-green-600/90 text-white border-green-500/50",
         PUT: "bg-orange-600/90 text-white border-orange-500/50",
         DELETE: "bg-red-600/90 text-white border-red-500/50",
         PATCH: "bg-purple-600/90 text-white border-purple-500/50",
         HEAD: "bg-gray-600/90 text-white border-gray-500/50",
         OPTIONS: "bg-indigo-600/90 text-white border-indigo-500/50",
      }
      return styles[method] || "bg-gray-600/90 text-white border-gray-500/50"
   }

   const handleToggle = () => {
      setExpanded(!expanded)
   }

   return (
      <div className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md overflow-hidden">
         {/* Header */}
         <div
            className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-700/30 transition-colors"
            onClick={handleToggle}
         >
            {/* Expand/Collapse Icon */}
            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
               {expanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
               ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
               )}
            </div>

            {/* Method Badge */}
            <div className={`px-2 py-1 rounded text-xs font-medium border ${getMethodStyles(method)}`}>
               {method}
            </div>

            {/* Endpoint Path */}
            <div className="text-sm text-gray-200 font-mono flex-1 truncate">{endpoint}</div>
         </div>

         {/* Expandable Content */}
         {expanded && (
            <div className="border-t border-gray-700/50 bg-gray-900/30">
               <div className="p-3">
                  <div className="text-xs text-gray-400 mb-2 font-medium">Content:</div>
                  <div className="bg-gray-900/50 rounded border border-gray-700/30 p-3 max-h-64 overflow-auto">
                     <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                        {typeof content === "string" ? content : JSON.stringify(content, null, 2)}
                     </pre>
                  </div>
               </div>
            </div>
         )}
      </div>
   )
}
interface WebSearchToolCallMessageProps {
   status: string
   content: string
   // {
   //    content: string
   //    sources: {
   //       url: string
   //       title: string
   //       resolved: boolean
   //    }[]
   // }
}
function WebSearchToolCallMessage({ content }: { content: WebSearchToolCallMessageProps }) {
   const [collapsed, setcollapsed] = useState(true)
   const [hover, sethover] = useState(false)
   const chatID = useSelector((state: RootState) => state.chat.currentChatID)
   const chatFunctionalState = useSelector((state: RootState) => {
      if (!chatID) return null
      const chat = state.chat.chats[chatID]
      return chat?.state ?? null
   })
   let effectiveStatus = content.status
   if (content.status === "pending" && chatFunctionalState !== ChatFuncionalState.WORKING) {
      effectiveStatus = "error"
   }
   return (
      <div className="w-full">
         {effectiveStatus === "pending" ? (
            <div className="flex gap-1 items-center">
               <Loader2 className="text-amber-500 animate-spin" size={15} />
               <div className="text-sm text-white/60 animate-pulse">Searching web</div>
            </div>
         ) : (
            <div className="flex flex-col gap-1">
               <div
                  className="flex gap-1 items-center cursor-pointer"
                  onMouseEnter={() => {
                     sethover(true)
                  }}
                  onMouseLeave={() => {
                     sethover(false)
                  }}
                  onClick={() => {
                     setcollapsed((prev) => !prev)
                  }}
               >
                  <div className="w-4 h-4 flex items-center justify-center">
                     {hover && collapsed ? (
                        <ChevronRight className="w-4 h-4 text-white/60" />
                     ) : !collapsed ? (
                        <ChevronDown className="w-4 h-4 text-white/60" />
                     ) : (
                        <Search
                           className={`w-3 h-3 ${effectiveStatus === "success" ? "text-green-600/70" : "text-red-600/70"}`}
                        />
                     )}
                  </div>
                  <div className={`text-sm ${hover ? "text-white/90" : "text-white/60"}`}>Searched web</div>
               </div>
               {!collapsed && (
                  <div className="pl-4">
                     <div className="max-h-40 overflow-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                        {content.content || ""}
                        {content.content || ""}
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>
   )
}
function FolderSearchToolCallMessage({ content }: { content: ContextSearchToolCallMessageProps }) {
   const workspacePathSelector = useSelector(selectWorkspacePath)
   const [collapsed, setcollapsed] = useState(true)
   const [hover, sethover] = useState(false)
   const chatID = useSelector((state: RootState) => state.chat.currentChatID)
   const chatFunctionalState = useSelector((state: RootState) => {
      if (!chatID) return null
      const chat = state.chat.chats[chatID]
      return chat?.state ?? null
   })
   let effectiveStatus = content.status
   if (content.status === "pending" && chatFunctionalState !== ChatFuncionalState.WORKING) {
      effectiveStatus = "error"
   }
   useEffect(() => {
      console.log("content in component = ", content)
   }, [content])
   return (
      <div className="w-full">
         {effectiveStatus === "pending" ? (
            <div className="flex gap-1 items-center">
               <div className="flex gap-0.5">
                  <Loader2 className="text-amber-500 animate-spin" size={15} />
               </div>
               <div className="text-sm text-white/60">Reading Folder</div>
            </div>
         ) : (
            <div className="flex flex-col gap-1 w-full">
               <div
                  className="flex gap-1 items-center cursor-pointer"
                  onMouseEnter={() => {
                     sethover(true)
                  }}
                  onMouseLeave={() => {
                     sethover(false)
                  }}
                  onClick={() => {
                     setcollapsed((prev) => !prev)
                  }}
               >
                  <div className="w-4 h-4 flex items-center justify-center">
                     <div
                        className={`w-3 h-3 rounded-full ${
                           effectiveStatus === "success" ? "bg-green-600/70" : "bg-red-600/70"
                        }`}
                     />
                  </div>
                  <div className={`text-sm ${hover ? "text-white/90" : "text-white/60"}`}>Read Folder</div>
                  {collapsed ? (
                     <ChevronRight className="w-4 h-4 text-white/60" />
                  ) : (
                     <ChevronDown className="w-4 h-4 text-white/60" />
                  )}
               </div>
               {!collapsed && (
                  <div className="ml-4 w-full">
                     <div className="max-h-96 overflow-y-auto overflow-x-hidden p-2 space-y-1 w-full border rounded-md border-white/5">
                        {effectiveStatus === "success" &&
                           typeof content.content !== "string" &&
                           content?.content?.map((file, index) => (
                              <WebSearchResultFile
                                 key={index}
                                 file={file}
                                 onFileClick={() => {
                                    if (file.file.includes(workspacePathSelector.replaceAll("\\", "/"))) {
                                       tsvscode.postMessage({
                                          type: "highlight_code_snippet_in_file",
                                          value: {
                                             filePath: file.file,
                                             codeSnippet: null,
                                          },
                                       })
                                    }
                                 }}
                              />
                           ))}
                        {effectiveStatus === "error" &&
                           typeof content.content === "string" &&
                           content.content}
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>
   )
}
interface FileContent {
   file: string
   content: { text: string }
   additional_metadata: {
      line_start?: number
      line_end?: number
   }
}

interface ContextSearchToolCallMessageProps {
   status: string
   content: FileContent[] | string
}

function ContextSearchToolCallMessage({ content }: { content: ContextSearchToolCallMessageProps }) {
   const workspacePathSelector = useSelector(selectWorkspacePath)
   const [collapsed, setCollapsed] = useState(true)
   const [hover, setHover] = useState(false)
   const chatID = useSelector((state: RootState) => state.chat.currentChatID)
   const chatFunctionalState = useSelector((state: RootState) => {
      if (!chatID) return null
      const chat = state.chat.chats[chatID]
      return chat?.state ?? null
   })
   let effectiveStatus = content.status
   if (content.status === "pending" && chatFunctionalState !== ChatFuncionalState.WORKING) {
      effectiveStatus = "error"
   }

   useEffect(() => {
      console.log("content in component = ", content)
   }, [content])

   useEffect(() => {
      console.log("WORKSPACE PATH- ", workspacePathSelector)
   }, [workspacePathSelector])

   const handleToggleCollapse = () => {
      setCollapsed((prev) => !prev)
   }

   if (effectiveStatus === "pending") {
      return (
         <div className="flex gap-1 items-center">
            <div className="flex gap-0.5">
               <Loader2 className="text-amber-500 animate-spin" size={15} />
            </div>
            <div className="text-sm text-white/60">Reading knowledge base</div>
         </div>
      )
   }

   return (
      <div className="flex flex-col gap-1 w-full ">
         <div
            className="flex gap-1 items-center cursor-pointer"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={handleToggleCollapse}
         >
            <div className="w-4 h-4 flex items-center justify-center">
               <div
                  className={`w-3 h-3 rounded-full ${
                     effectiveStatus === "success" ? "bg-green-600/70" : "bg-red-600/70"
                  }`}
               />
            </div>
            <div className={`text-sm ${hover ? "text-white/90" : "text-white/60"}`}>Read knowledge base</div>
            {collapsed ? (
               <ChevronRight className="w-4 h-4 text-white/60" />
            ) : (
               <ChevronDown className="w-4 h-4 text-white/60" />
            )}
         </div>

         {!collapsed && (
            <div className="ml-4 w-full">
               <div className="max-h-96 overflow-y-auto overflow-x-hidden py-2 space-y-1 w-full min-w-0 rounded-md border border-white/5">
                  {effectiveStatus === "success" &&
                     typeof content.content !== "string" &&
                     content.content?.map((file, index) => (
                        <WebSearchResultFile
                           key={index}
                           file={file}
                           onFileClick={() => {
                              if (file.file.includes(workspacePathSelector.replaceAll("\\", "/"))) {
                                 tsvscode.postMessage({
                                    type: "highlight_code_snippet_in_file",
                                    value: {
                                       filePath: file.file,
                                       codeSnippet: null,
                                    },
                                 })
                              }
                           }}
                        />
                     ))}
                  {effectiveStatus === "error" && typeof content.content === "string" && (
                     <div className="text-xs text-red-400">{content.content}</div>
                  )}
               </div>
            </div>
         )}
      </div>
   )
}

interface WebSearchResultFileProps {
   file: FileContent
   onFileClick?: () => void
   expandedContent?: React.ReactNode
}


export function WebSearchContent() {
  const [title, setTitle] = useState('');

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Main Container */}
      <div className="border-4 border-black rounded-3xl p-8 min-h-[600px]">
        
        {/* Summary Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Summary</h1>
          
          {/* Summary Content Area */}
          <div className="bg-gray-50 rounded-2xl p-6 min-h-[200px] border-2 border-gray-200">
            <h2 className="text-4xl font-bold text-black mb-4">Summary</h2>
            <div className="text-gray-600">
              <p>Your summary content will appear here...</p>
            </div>
          </div>
        </div>

        {/* Sources Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Sources</h2>
          
          {/* Source Card */}
          <div className="border-4 border-black rounded-2xl p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              {/* Favicon */}
              <div className="w-6 h-6 flex-shrink-0">
                <img 
                  src="https://www.google.com/favicon.ico" 
                  alt="Site favicon"
                  className="w-full h-full rounded"
                />
              </div>
              
              {/* Title Input */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="title"
                className="flex-1 text-lg font-medium text-black placeholder-gray-500 bg-transparent border-none outline-none"
              />
              
              {/* Hyperlink Icon */}
              <ExternalLink className="w-5 h-5 text-gray-600 flex-shrink-0" />
            </div>
          </div>
        </div>
        
        {/* Additional Sources Area */}
        <div className="space-y-3">
          <div className="text-gray-500 text-sm">Add more sources...</div>
        </div>
      </div>
    </div>
  );
}
function WebSearchResultFile({ file, onFileClick }: WebSearchResultFileProps) {
   const [expanded, setExpanded] = useState(false)
   const [hover, setHover] = useState(false)

   const handleClick = () => {
      setExpanded((prev) => !prev)
      onFileClick?.()
   }
   // const fileName= file.file.split("\\")[file.file.split("\\").length-1]
   const fileName = getLastNameFromPath(file.file)
   return (
      <div className=" flex flex-col w-full min-w-0 max-w-full">
         <div
            className="flex items-center gap-1 text-xs text-white/70 hover:text-white/90 transition-colors cursor-pointer group "
            title={file.file}
            onClick={handleClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
         >
            <div className="flex-shrink-0 w-3 h-3 flex items-center justify-center">
               {expanded ? (
                  <ChevronDown className="w-3 h-3 text-white/60" />
               ) : hover ? (
                  <ChevronRight className="w-3 h-3 text-white/60" />
               ) : null}
            </div>
            <span className="truncate text-sm min-w-0 flex-1 overflow-hidden whitespace-nowrap ">
               {fileName}
            </span>
         </div>

         {expanded && file.content && (
            <div className="">
               <div className=" ml-4 mt-2 mr-2">
                  <CodeBlock code={file.content.text} fileName={file.file} />
               </div>
            </div>
         )}
      </div>
   )
}

const CodeBlock = ({ code, fileName, className = "" }) => {
   return (
      <div className={`relative w-full max-w-full min-w-0 rounded-lg border border-gray-700 ${className}`}>
         <div className="bg-white/10 p-2 text-xs text-[var(--vscode-text-foreground)]   ">{fileName}</div>
         <div className="w-full min-w-0">
            <pre className="text-xs text-[var(--vscode-text-foreground)] font-mono leading-relaxed whitespace-pre w-full overflow-x-auto overflow-y-auto p-2 max-h-96">
               {code}
            </pre>
         </div>
      </div>
   )
}

function getLastNameFromPath(path:string){
   let filename = ''
   for(let i=path.length-1;i>=0;i--){
      if(path[i]==="/" || path[i]==="\\"){
         break
      }
      filename= path[i]+filename
   }
   return filename
}

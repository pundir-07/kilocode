import { CheckIcon, ChevronDown, ChevronRight, CopyIcon, Loader2, Terminal } from "lucide-react"
import { memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { LanguageIcon } from "../../LanguageIcon"

type CommandBlockAction = "copy" | "run"

export type CommandBlockProps = {
   children: string
   className: string
   onlySyntaxHighlight?: boolean
   disabledActions?: CommandBlockAction[]
}

namespace Components {
   export const ActionButton = memo(
      (props: {
         children: ReactNode | ReactNode[]
         onClick: () => void
         className?: string
         title?: string
      }) => {
         return (
            <div
               className={`text-xs text-[var(--vscode-foreground)] cursor-pointer w-6 h-6 flex items-center justify-center ${props.className}`}
               onClick={props.onClick}
               title={props.title}
            >
               {props.children}
            </div>
         )
      }
   )

   export const Copy = memo((props: { commandText: string; className?: string }) => {
      const [hasCopied, setHasCopied] = useState(false)

      const handleCopy = useCallback(async () => {
         await navigator.clipboard.writeText(props.commandText)
         setHasCopied(true)
         setTimeout(() => {
            setHasCopied(false)
         }, 1500) // Show checkmark for 1.5 seconds
      }, [props.commandText])

      return (
         <ActionButton onClick={handleCopy} className={props.className} title="Copy to Clipboard">
            {hasCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
         </ActionButton>
      )
   })

   export const Run = memo((props: { commandText: string; className?: string }) => {
      const [isRunning, setIsRunning] = useState(false)

      const handleRun = useCallback(async () => {
         setIsRunning(true)
         try {
            await new Promise<void>((resolve) => {
               const id = Math.random().toString(36).substring(2, 15)
               const handleMessage = (event: MessageEvent) => {
                  if (event.data.type === "run_command_response" && event.data.id === id) {
                     window.removeEventListener("message", handleMessage)
                     resolve()
                  }
               }
               window.addEventListener("message", handleMessage)
               tsvscode.postMessage({
                  type: "run_command",
                  value: { id, command: props.commandText },
               })
            })
         } catch (error) {
            console.error(error)
         } finally {
            setIsRunning(false)
         }
      }, [props.commandText])

      return (
         <button
            className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors flex items-center gap-2 w-min"
            onClick={handleRun}
            disabled={isRunning}
         >
            <Terminal className="w-4 h-4" />
            <span className="text-sm whitespace-nowrap">{isRunning ? "Running..." : "Run"}</span>
         </button>
      )
   })

   export const SyntaxHighlight = memo((props: { commandText: string; language: string }) => {
      return (
         <SyntaxHighlighter
            style={vscDarkPlus}
            language={props.language}
            PreTag="div"
            CodeTag="div"
            wrapLongLines={false}
            customStyle={{
               background: "transparent",
               margin: 0,
               fontSize: "0.875rem",
            }}
         >
            {props.commandText}
         </SyntaxHighlighter>
      )
   })

   export const CommandBlockHeader = memo(
      (props: {
         canBeCollapsed: boolean
         isLoading: boolean
         commandText: string
         language: string
         filePath?: string
         disabledActions: CommandBlockAction[]
         isCollapsed: boolean
         setIsCollapsed: (isCollapsed: boolean) => void
      }) => {
         const [isHovering, setIsHovering] = useState(false)

         return (
            <div className="flex items-center justify-between px-4 py-2 border-b border-b-[var(--vscode-panel-border)]">
               <div
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => props.canBeCollapsed && props.setIsCollapsed(!props.isCollapsed)}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
               >
                  {props.isLoading && !isHovering && (
                     <div className="w-4 h-4 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--vscode-foreground)]" />
                     </div>
                  )}
                  <LanguageIcon
                     language={props.language}
                     className="w-4 h-4 text-[var(--vscode-foreground)]"
                  />
                  <span className="text-xs text-[var(--vscode-foreground)]">{props.language}</span>
               </div>
               <div className="flex items-center gap-2">
                  {!props.disabledActions?.includes("run") && (
                     <Components.Run commandText={props.commandText} />
                  )}
                  {!props.disabledActions?.includes("copy") && (
                     <Components.Copy commandText={props.commandText} />
                  )}
               </div>
            </div>
         )
      }
   )
}

const RichMessageCommand = memo(
   ({ children, className, onlySyntaxHighlight, disabledActions }: CommandBlockProps) => {
      const scrollableContainerRef = useRef<HTMLDivElement>(null)
      const [isCollapsed, setIsCollapsed] = useState(true)
      const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)

      const { commandText, language, filePath, isCmCommandBlock, isLoading, canBeCollapsed } = useMemo(() => {
         const rawCommand = String(children).trim()
         let commandText = rawCommand
         let language = "bash"
         let filePath: string | undefined

         const isCmCommandBlock = rawCommand.startsWith("<cm:command>")
         const isLoading = isCmCommandBlock && !rawCommand.endsWith("</cm:command>")

         if (isCmCommandBlock) {
            const getTagContent = (tag: string, searchString: string): string | null => {
               const startTag = `<cm:${tag}>`
               const endTag = `</cm:${tag}>`

               if (!searchString.includes(startTag)) return null

               let content = searchString.split(startTag)[1]
               if (!content) return null

               if (content.includes(endTag)) {
                  return content.split(endTag)[0].trim()
               }

               if (tag === "content" && searchString.includes("<cm:content>")) {
                  content = searchString.split("<cm:content>")[1]
                  if (content.endsWith("</cm:command>")) {
                     content = content.slice(0, -12)
                  }
                  return content
               }

               return null
            }

            filePath = getTagContent("file", rawCommand)
            language = getTagContent("language", rawCommand) ?? language
            const newCommandText = getTagContent("content", rawCommand)

            if (newCommandText !== null) {
               commandText = newCommandText.trim()
            } else if (rawCommand.includes("<cm:content>")) {
               commandText = ""
            } else {
               commandText = ""
            }
         }

         const canBeCollapsed = commandText.split("\n").length > 5

         return { commandText, language, filePath, isCmCommandBlock, isLoading, canBeCollapsed }
      }, [children, className])

      const handleScroll = useCallback(() => {
         const container = scrollableContainerRef.current
         if (container) {
            const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 5
            if (atBottom) {
               setUserHasScrolledUp(false)
            } else {
               setUserHasScrolledUp(true)
            }
         }
      }, [])

      useEffect(() => {
         const container = scrollableContainerRef.current
         if (container) {
            if (isCollapsed && canBeCollapsed) {
               if (!userHasScrolledUp) {
                  setTimeout(() => {
                     if (scrollableContainerRef.current) {
                        scrollableContainerRef.current.scrollTop = scrollableContainerRef.current.scrollHeight
                     }
                  }, 0)
               }
            } else {
               scrollableContainerRef.current.scrollTop = 0
            }
         }
      }, [isCollapsed, canBeCollapsed, commandText, userHasScrolledUp])

      if (!className && !isCmCommandBlock) {
         return (
            <code className="bg-[var(--vscode-textCodeBlock-background)] text-[var(--vscode-textCodeBlock-foreground)] px-[4px] font-mono overflow-auto">
               {children}
            </code>
         )
      }

      if (onlySyntaxHighlight) {
         return <Components.SyntaxHighlight commandText={commandText} language={language} />
      }

      return (
         <div
            className="relative group border border-[var(--vscode-panel-border)] rounded-md bg-[var(--vscode-editor-background)] my-4"
            style={{ color: "#e5e5e5", fontFamily: "JetBrains Mono" }}
         >
            <Components.CommandBlockHeader
               canBeCollapsed={canBeCollapsed}
               isLoading={isLoading}
               commandText={commandText}
               language={language}
               filePath={filePath}
               disabledActions={disabledActions}
               isCollapsed={isCollapsed}
               setIsCollapsed={setIsCollapsed}
            />
            <div
               ref={scrollableContainerRef}
               onScroll={handleScroll}
               className={`relative transition-all duration-300 ease-in-out ${
                  isCollapsed && canBeCollapsed ? "max-h-[250px] overflow-y-auto" : "max-h-full"
               }`}
            >
               <Components.SyntaxHighlight commandText={commandText} language={language} />
            </div>
            {isCollapsed && canBeCollapsed && (
               <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[var(--vscode-editor-background)] to-transparent pointer-events-none" />
            )}
         </div>
      )
   }
)

export default RichMessageCommand

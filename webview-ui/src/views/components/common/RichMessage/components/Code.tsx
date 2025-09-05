import {
   AlertCircleIcon,
   CheckIcon,
   ChevronDown,
   ChevronRight,
   CopyIcon,
   Loader2,
   PlusCircleIcon,
   Terminal,
} from "lucide-react"
import { memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { LanguageIcon } from "../../LanguageIcon"
import RichMessageCommand from "./Command"

type CodeBlockAction = "copy" | "apply" | "insert" | "run"

const RUNNABLE_LANGUAGES = ["bash", "zsh", "sh", "powershell", "cmd"]

export type CodeBlockProps = {
   children: string
   className: string
   onlySyntaxHighlight?: boolean
   disabledActions?: CodeBlockAction[]
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

   export const Copy = memo((props: { codeText: string; className?: string }) => {
      const [hasCopied, setHasCopied] = useState(false)

      const handleCopy = useCallback(async () => {
         await navigator.clipboard.writeText(props.codeText)
         setHasCopied(true)
         setTimeout(() => {
            setHasCopied(false)
         }, 1500) // Show checkmark for 1.5 seconds
      }, [props.codeText])

      return (
         <ActionButton
            onClick={handleCopy}
            className={props.className}
            title="Copy to Clipboard" // Add tooltip here
         >
            {hasCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
         </ActionButton>
      )
   })

   export const Insert = memo((props: { codeText: string; className?: string; filePath?: string }) => {
      const handleInsert = useCallback(async () => {
         tsvscode.postMessage({
            type: "insert_code",
            value: {
               code: props.codeText,
               id: Math.random().toString(36).substring(2, 15),
               filePath: props.filePath,
            },
         })
      }, [props.codeText, props.filePath])

      return (
         <ActionButton
            onClick={handleInsert}
            className={props.className}
            title="Insert Code" // Add tooltip here
         >
            <PlusCircleIcon className="w-4 h-4" />
         </ActionButton>
      )
   })

   export const Run = memo((props: { codeText: string; className?: string; language?: string }) => {
      const isRunnable = useMemo(
         () => RUNNABLE_LANGUAGES.includes(props.language ?? ""),
         [props.language, RUNNABLE_LANGUAGES]
      )

      const [isRunning, setIsRunning] = useState(false)

      const handleRun = useCallback(async () => {
         if (!isRunnable) return

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
                  value: { id, command: props.codeText },
               })
            })
         } catch (error) {
            console.error(error)
         } finally {
            setIsRunning(false)
         }
      }, [props.codeText, isRunnable])

      if (!isRunnable) return null

      return (
         <button
            className="px-3 py-1 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] transition-colors flex items-center gap-2 w-min"
            onClick={handleRun}
            disabled={isRunning}
         >
            <Terminal className="w-4 h-4" />
            <span className="text-sm whitespace-nowrap">Run</span>
         </button>
      )
   })

   export const SyntaxHighlight = memo((props: { codeText: string; language: string }) => {
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
            {props.codeText}
         </SyntaxHighlighter>
      )
   })

   export const InlineDiff = memo((props: { codeText: string; className?: string; diffId?: string }) => {
      const [diffStatus, setDiffStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
      const diffBlockRef = useRef<HTMLDivElement>(null)

      const handleGenerateDiff = useCallback(async () => {
         if (diffStatus === "loading") return

         setDiffStatus("loading")

         if (diffBlockRef.current) {
            const codeElement = diffBlockRef.current.querySelector("pre")
            if (codeElement) {
               codeElement.classList.add("opacity-50", "transition-opacity")
               const shimmerOverlay = document.createElement("div")
               shimmerOverlay.className =
                  "absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer-animation"
               shimmerOverlay.style.zIndex = "10"
               diffBlockRef.current.appendChild(shimmerOverlay)
            }
         }

         try {
            const diffId = props.diffId || Math.random().toString(36).substring(2, 15)
            tsvscode.postMessage({
               type: "generate_inline_diff",
               value: {
                  code: props.codeText,
                  diffId,
               },
            })

            await new Promise((resolve) => setTimeout(resolve, 1500))

            setDiffStatus("success")

            tsvscode.postMessage({
               type: "edit_suggestions_ready",
               value: {
                  status: "ready",
                  timestamp: Date.now(),
               },
            })
         } catch (error) {
            console.error("Error generating diff:", error)
            setDiffStatus("error")
            tsvscode.postMessage({
               type: "show_error_message",
               value: `Error generating diff: ${error instanceof Error ? error.message : String(error)}`,
            })
         } finally {
            if (diffBlockRef.current) {
               const shimmerOverlay = diffBlockRef.current.querySelector(".shimmer-animation")
               if (shimmerOverlay) {
                  diffBlockRef.current.removeChild(shimmerOverlay)
               }

               const codeElement = diffBlockRef.current.querySelector("pre")
               if (codeElement) {
                  setTimeout(() => {
                     codeElement.classList.remove("opacity-50", "transition-opacity")
                  }, 300)
               }
            }
         }
      }, [props.codeText, props.diffId, diffStatus])

      useEffect(() => {
         if (!diffBlockRef.current) return

         diffBlockRef.current.classList.remove(
            "diff-success-animation",
            "diff-error-animation",
            "diff-loading-animation"
         )

         if (diffStatus === "loading") {
            diffBlockRef.current.classList.add("diff-loading-animation")
         } else if (diffStatus === "success") {
            diffBlockRef.current.classList.add("diff-success-animation")
            setTimeout(() => diffBlockRef.current?.classList.remove("diff-success-animation"), 1500)
         } else if (diffStatus === "error") {
            diffBlockRef.current.classList.add("diff-error-animation")
            setTimeout(() => diffBlockRef.current?.classList.remove("diff-error-animation"), 1500)
         }
      }, [diffStatus])

      const renderIcon = () => {
         switch (diffStatus) {
            case "loading":
               return <Loader2 className="w-4 h-4 animate-spin" />
            case "success":
               return <CheckIcon className="w-4 h-4 text-green-500 animate-pulse" />
            case "error":
               return <AlertCircleIcon className="w-4 h-4 text-red-500 animate-pulse" />
            default:
               return <PlusCircleIcon className="w-4 h-4" />
         }
      }

      return (
         <div ref={diffBlockRef} className="relative">
            <ActionButton
               onClick={handleGenerateDiff}
               className={`${props.className} ${diffStatus === "success" ? "bg-green-500/10 rounded" : ""} ${diffStatus === "error" ? "bg-red-500/10 rounded" : ""}`}
               title={
                  diffStatus === "idle"
                     ? "Generate Inline Diff"
                     : diffStatus === "loading"
                       ? "Generating diff..."
                       : diffStatus === "success"
                         ? "Diff generated successfully"
                         : "Failed to generate diff"
               }
            >
               {renderIcon()}
            </ActionButton>
         </div>
      )
   })

   export const CodeBlockHeader = memo(
      (props: {
         canBeCollapsed: boolean
         isLoading: boolean
         language: string
         codeText: string
         filePath: string
         disabledActions: CodeBlockAction[]
         isCollapsed: boolean
         setIsCollapsed: (isCollapsed: boolean) => void
      }) => {
         const [isHovering, setIsHovering] = useState(false)

         return (
            <div className="flex items-center justify-between px-4 py-2 border-b border-b-[var(--vscode-panel-border)]">
               <div
                  className="flex items-center gap-2 select-none"
                  onClick={() => props.canBeCollapsed && props.setIsCollapsed(!props.isCollapsed)}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
               >
                  {props.isLoading && !isHovering ? (
                     <div className="w-4 h-4 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--vscode-foreground)]" />
                     </div>
                  ) : props.canBeCollapsed ? (
                     <div className="w-4 h-4 flex items-center justify-center">
                        {props.isCollapsed ? (
                           <ChevronRight className="w-4 h-4 text-[var(--vscode-foreground)]" />
                        ) : (
                           <ChevronDown className="w-4 h-4 text-[var(--vscode-foreground)]" />
                        )}
                     </div>
                  ) : null}
                  <LanguageIcon
                     language={props.language}
                     className="w-4 h-4 text-[var(--vscode-foreground)]"
                  />
                  <span className="text-xs text-[var(--vscode-foreground)]">{props.language}</span>
               </div>
               <div className="flex items-center gap-2">
                  {!props.disabledActions?.includes("run") && (
                     <Components.Run codeText={props.codeText} language={props.language} />
                  )}
                  {!props.disabledActions?.includes("insert") && (
                     <Components.Insert codeText={props.codeText} filePath={props.filePath} />
                  )}
                  {!props.disabledActions?.includes("copy") && <Components.Copy codeText={props.codeText} />}
               </div>
            </div>
         )
      }
   )
}

const RichMessageCode = memo(
   ({ children, className, onlySyntaxHighlight, disabledActions }: CodeBlockProps) => {
      const scrollableContainerRef = useRef<HTMLDivElement>(null)
      const [isCollapsed, setIsCollapsed] = useState(true)
      const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)

      const { codeText, language, filePath, isCmCodeBlock, isCmCommandBlock, isLoading, canBeCollapsed } =
         useMemo(() => {
            const rawCode = String(children).trim()
            let language = className?.split("-")[1] ?? "text"
            let filePath: string | undefined
            let codeText = rawCode

            const isCmCodeBlock = rawCode.startsWith("<cm:code>")
            const isCmCommandBlock = rawCode.startsWith("<cm:command>")
            const isLoading =
               (isCmCodeBlock && !rawCode.endsWith("</cm:code>")) ||
               (isCmCommandBlock && !rawCode.endsWith("</cm:command>"))

            if (isCmCodeBlock || isCmCommandBlock) {
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
                     if (content.endsWith("</cm:code>")) {
                        content = content.slice(0, -10)
                     } else if (content.endsWith("</cm:command>")) {
                        content = content.slice(0, -12)
                     }
                     return content
                  }

                  return null
               }

               filePath = getTagContent("file", rawCode)
               language = getTagContent("language", rawCode) ?? language
               const newCodeText = getTagContent("content", rawCode)

               if (newCodeText !== null) {
                  codeText = newCodeText.trim()
               } else if (rawCode.includes("<cm:content>")) {
                  codeText = ""
               } else {
                  codeText = ""
               }
            }

            const canBeCollapsed = codeText.split("\n").length > 10

            return {
               codeText,
               language,
               filePath,
               isCmCodeBlock,
               isCmCommandBlock,
               isLoading,
               canBeCollapsed,
            }
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
      }, [isCollapsed, canBeCollapsed, codeText, userHasScrolledUp])

      if (!className && !isCmCodeBlock && !isCmCommandBlock) {
         return (
            <code className="bg-[var(--vscode-textCodeBlock-background)] text-[var(--vscode-textCodeBlock-foreground)] px-[4px] font-mono overflow-auto">
               {children}
            </code>
         )
      }

      if (onlySyntaxHighlight) {
         return <Components.SyntaxHighlight codeText={codeText} language={language} />
      }

      const isRunnable = RUNNABLE_LANGUAGES.includes(language)
      if (isRunnable) {
         return <RichMessageCommand className={`language-shell`}>{codeText}</RichMessageCommand>
      }

      return (
         <div
            className="relative group border border-[var(--vscode-panel-border)] rounded-md bg-[var(--vscode-editor-background)] my-4"
            style={{ color: "#e5e5e5", fontFamily: "JetBrains Mono" }}
         >
            <Components.CodeBlockHeader
               canBeCollapsed={canBeCollapsed}
               isLoading={isLoading}
               language={language}
               codeText={codeText}
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
               <Components.SyntaxHighlight codeText={codeText} language={language} />
            </div>
            {isCollapsed && canBeCollapsed && (
               <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[var(--vscode-editor-background)] to-transparent pointer-events-none" />
            )}
         </div>
      )
   }
)

export default RichMessageCode

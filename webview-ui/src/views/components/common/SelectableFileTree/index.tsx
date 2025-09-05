import { ChevronRight, File as FileIcon, Folder, FolderOpen } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { FaCheckSquare, FaMinusSquare, FaSquare } from "react-icons/fa"

export interface SelectableTreeNode {
   name: string
   children: SelectableTreeNode[]
   metadata?: { absolutePath?: string; [k: string]: any }
}

export interface SelectableFileTreeProps {
   nodes: SelectableTreeNode[]
   selectedFiles: Set<string>
   readonly?: boolean
   isWorking?: boolean
   onChange: (files: Set<string>) => void
   autoExpandLevels?: number
}

interface InternalNodeProps {
   node: SelectableTreeNode
   level: number
   selectedFiles: Set<string>
   toggleNode: (node: SelectableTreeNode) => void
   readonly?: boolean
   autoExpandLevels: number
}

function getDescendantFilePaths(node: SelectableTreeNode): string[] {
   const acc: string[] = []
   const stack: SelectableTreeNode[] = [node]
   while (stack.length) {
      const current = stack.pop()!
      if (current.metadata?.absolutePath && current.children.length === 0) {
         acc.push(current.metadata.absolutePath)
      }
      for (const c of current.children) stack.push(c)
   }
   return acc
}

function computeSelectionState(
   node: SelectableTreeNode,
   selected: Set<string>
): "checked" | "unchecked" | "indeterminate" {
   const filePaths = getDescendantFilePaths(node)
   if (filePaths.length === 0) {
      // treat single file node
      if (node.metadata?.absolutePath) {
         return selected.has(node.metadata.absolutePath) ? "checked" : "unchecked"
      }
      return "unchecked"
   }
   let selectedCount = 0
   for (const fp of filePaths) if (selected.has(fp)) selectedCount++
   if (selectedCount === 0) return "unchecked"
   if (selectedCount === filePaths.length) return "checked"
   return "indeterminate"
}

const CheckboxIcon = ({ state }: { state: "checked" | "unchecked" | "indeterminate" }) => {
   switch (state) {
      case "checked":
         return <FaCheckSquare className="w-4 h-4 text-[var(--vscode-checkbox-foreground)]" />
      case "indeterminate":
         return <FaMinusSquare className="w-4 h-4 text-[var(--vscode-checkbox-foreground)]" />
      default:
         return <FaSquare className="w-4 h-4 text-[var(--vscode-checkbox-background)]" />
   }
}

function NodeRow({ node, level, selectedFiles, toggleNode, readonly, autoExpandLevels }: InternalNodeProps) {
   const [expanded, setExpanded] = useState(level < autoExpandLevels)

   const isFolder = node.children.length > 0
   const isFile = !isFolder && !!node.metadata?.absolutePath
   const selectionState = useMemo(() => computeSelectionState(node, selectedFiles), [node, selectedFiles])

   const handleToggleExpand = useCallback((e: React.MouseEvent) => {
      e.stopPropagation()
      setExpanded((p) => !p)
   }, [])

   const handleSelect = useCallback(
      (e: React.MouseEvent) => {
         e.stopPropagation()
         if (readonly) return
         toggleNode(node)
      },
      [node, toggleNode, readonly]
   )

   return (
      <div>
         <div
            className={`flex items-center gap-2 py-1 px-2 text-sm cursor-pointer hover:bg-[var(--vscode-list-hoverBackground)]`}
            style={{ paddingLeft: level * 16 }}
            onClick={handleSelect}
         >
            <span className="w-4 flex justify-center" onClick={handleToggleExpand}>
               {isFolder && (
                  <ChevronRight
                     className={`w-4 h-4 transition-transform text-[var(--vscode-list-deemphasizedForeground)] ${expanded ? "rotate-90" : ""}`}
                  />
               )}
            </span>
            <span className="w-4 flex justify-center" onClick={handleSelect}>
               <CheckboxIcon state={selectionState} />
            </span>
            <span className="w-5 flex justify-center">
               {isFolder ? (
                  expanded ? (
                     <FolderOpen className="w-4 h-4 text-[var(--vscode-symbolIcon-folderForeground)]" />
                  ) : (
                     <Folder className="w-4 h-4 text-[var(--vscode-symbolIcon-folderForeground)]" />
                  )
               ) : (
                  <FileIcon className="w-4 h-4 text-[var(--vscode-symbolIcon-fileForeground)]" />
               )}
            </span>
            <span className="text-[var(--vscode-foreground)] select-none truncate">{node.name}</span>
         </div>
         {isFolder && expanded && (
            <div>
               {node.children.map((child, idx) => (
                  <NodeRow
                     key={idx + child.name}
                     node={child}
                     level={level + 1}
                     selectedFiles={selectedFiles}
                     toggleNode={toggleNode}
                     readonly={readonly}
                     autoExpandLevels={autoExpandLevels}
                  />
               ))}
            </div>
         )}
      </div>
   )
}

// autoExpandLevels: number of initial depth levels to expand automatically (0 = none)
export default function SelectableFileTree({
   nodes,
   selectedFiles,
   readonly,
   isWorking,
   onChange,
   autoExpandLevels = 0,
}: SelectableFileTreeProps) {
   const toggleNode = useCallback(
      (node: SelectableTreeNode) => {
         const newSet = new Set(selectedFiles)
         const descendantFiles = getDescendantFilePaths(node)
         // If it's a file node with no descendants (descendantFiles includes itself)
         if (descendantFiles.length === 0 && node.metadata?.absolutePath) {
            if (newSet.has(node.metadata.absolutePath)) newSet.delete(node.metadata.absolutePath)
            else newSet.add(node.metadata.absolutePath)
            onChange(newSet)
            return
         }
         const allSelected = descendantFiles.every((f) => newSet.has(f))
         if (allSelected) {
            descendantFiles.forEach((f) => newSet.delete(f))
         } else {
            descendantFiles.forEach((f) => newSet.add(f))
         }
         onChange(newSet)
      },
      [selectedFiles, onChange]
   )

   return (
      <div
         className={`text-sm ${
            isWorking || readonly ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
         }`}
      >
         {nodes.map((n, i) => (
            <NodeRow
               key={i + n.name}
               // root wrapper may be a synthetic node; just render its children if it has no metadata and name==='root'
               node={n}
               level={0}
               selectedFiles={selectedFiles}
               toggleNode={toggleNode}
               readonly={readonly}
               autoExpandLevels={autoExpandLevels}
            />
         ))}
      </div>
   )
}

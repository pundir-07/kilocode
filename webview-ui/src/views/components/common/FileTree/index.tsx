import { CodeEvaluationStatus } from "@/common/types/code-evaluation"
import { TreeNode } from "@/views/lib/utils/treeUtils"
import { ChevronDown, ChevronRight, Folder, FolderOpen, Loader2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

interface FileTreeProps {
   nodes: TreeNode[]
   onFileClick?: (filePath: string) => void
}

interface TreeNodeProps {
   node: TreeNode
   level: number
   onFileClick?: (filePath: string) => void
}

function TreeNodeComponent({ node, level, onFileClick }: TreeNodeProps) {
   const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand first 2 levels

   const handleToggle = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsExpanded(!isExpanded)
   }

   const paddingLeft = level * 16

   if (node.isFile) {
      return (
         <Link
            to={`/code-evaluations/${encodeURIComponent(node.path)}`}
            className="block hover:bg-white/5 transition-colors"
         >
            <div
               className="flex items-center gap-2 py-1 px-2 text-sm cursor-pointer"
               style={{ paddingLeft: paddingLeft + 8 }}
            >
               <span className="text-white/90 flex-1">{node.name}</span>
               {node.isWorking && (
                  <div className="flex items-center gap-1">
                     <Loader2 size={12} className="text-yellow-400 animate-spin" />
                  </div>
               )}
            </div>
         </Link>
      )
   }

   return (
      <div>
         <div
            className="flex items-center gap-2 py-1 px-2 text-sm cursor-pointer hover:bg-white/5 transition-colors"
            style={{ paddingLeft: paddingLeft }}
            onClick={handleToggle}
         >
            <div className="w-4 h-4 flex items-center justify-center">
               {node.children.length > 0 &&
                  (isExpanded ? (
                     <ChevronDown size={12} className="text-white/60" />
                  ) : (
                     <ChevronRight size={12} className="text-white/60" />
                  ))}
            </div>
            <span className="text-sm">
               {isExpanded ? (
                  <FolderOpen size={14} className="text-white/60" />
               ) : (
                  <Folder size={14} className="text-white/60" />
               )}
            </span>
            <span className="text-white/70">{node.name}</span>
         </div>

         {isExpanded && node.children.length > 0 && (
            <div>
               {node.children.map((child, index) => (
                  <TreeNodeComponent
                     key={`${child.path}-${index}`}
                     node={child}
                     level={level + 1}
                     onFileClick={onFileClick}
                  />
               ))}
            </div>
         )}
      </div>
   )
}

export default function FileTree({ nodes, onFileClick }: FileTreeProps) {
   return (
      <div className="text-sm">
         {nodes.map((node, index) => (
            <TreeNodeComponent
               key={`${node.path}-${index}`}
               node={node}
               level={0}
               onFileClick={onFileClick}
            />
         ))}
      </div>
   )
}

import { CodeEvaluation_t, CodeEvaluationStatus } from "@/common/types/code-evaluation"
import FileTree from "@/views/components/common/FileTree"
import { RootState } from "@/views/lib/store"
import {
   selectCodeEvaluationsRunsByWorkspace,
   selectFilesWithCodeEvaluations,
} from "@/views/lib/store/codeEvaluationsSlice"
import { selectWorkspacePath } from "@/views/lib/store/globalSlice"
import { buildFileTree, TreeNode } from "@/views/lib/utils/treeUtils"
import { useMemo } from "react"
import { useSelector } from "react-redux"

export default function CodeEvalutations() {
   const workspacePath = useSelector(selectWorkspacePath)
   const filesWithActions = useSelector((state: RootState) =>
      selectFilesWithCodeEvaluations(state, workspacePath)
   )
   const actionRuns = useSelector((state: RootState) =>
      selectCodeEvaluationsRunsByWorkspace(state, workspacePath)
   )

   // Build tree structure with code evaluation data
   const fileTree = useMemo(() => {
      if (filesWithActions.length === 0) return []

      // Normalize action run keys to forward slashes so lookups work cross-platform (Windows vs POSIX)
      const normalizedActionRuns: Record<string, CodeEvaluation_t> = useMemo(() => {
         const map: Record<string, CodeEvaluation_t> = {}
         for (const key in actionRuns) {
            map[key.replace(/\\/g, "/")] = actionRuns[key]
         }
         return map
      }, [actionRuns])

      const tree = buildFileTree(filesWithActions.map((p) => p.replace(/\\/g, "/")))

      // Enhance tree nodes with code evaluation data
      const enhanceTreeNodes = (nodes: TreeNode[]): TreeNode[] => {
         return nodes
            .map((node) => {
               if (node.isFile) {
                  const action = normalizedActionRuns[node.path]
                  return {
                     ...node,
                     isWorking:
                        action?.content.docs.status === CodeEvaluationStatus.PENDING ||
                        action?.content.security.status === CodeEvaluationStatus.PENDING,
                  }
               } else {
                  const children = enhanceTreeNodes(node.children)
                  return {
                     ...node,
                     children,
                  }
               }
            })
            .filter((x) => {
               if (!x.isFile) return x.children.length > 0
               // We already built the tree only from filesWithActions, so no need to filter files out any more.
               return true
            })
      }

      return enhanceTreeNodes(tree)
   }, [filesWithActions, actionRuns])

   return (
      <div>
         {filesWithActions.length === 0 ? (
            <div className="text-white/40 text-sm">
               No code evaluations found for this workspace. Open any file to get started.
            </div>
         ) : (
            <FileTree nodes={fileTree} />
         )}
      </div>
   )
}

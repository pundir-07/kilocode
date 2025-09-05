import { CodeEvaluationStatus } from "@/common/types/code-evaluation"

export interface TreeNode {
   name: string
   path: string
   isFile: boolean
   children: TreeNode[]
   isWorking: boolean
}

export function buildFileTree(filePaths: string[]): TreeNode[] {
   const root: TreeNode[] = []

   filePaths.forEach((filePath) => {
      // const parts = filePath.split("/").filter((part) => part.length > 0)
      const parts = filePath.split(/[\\/]/);
      let currentLevel = root
      let currentPath = ""

      parts.forEach((part, index) => {
         const isFile = index === parts.length - 1
         currentPath = currentPath ? `${currentPath}/${part}` : part

         // Check if this node already exists at current level
         let existingNode = currentLevel.find((node) => node.name === part)

         if (!existingNode) {
            // Create new node
            existingNode = {
               name: part,
               path: currentPath,
               isFile,
               children: [],
               isWorking: false,
            }
            currentLevel.push(existingNode)
         }

         // Move to next level (children of current node)
         if (!isFile) {
            currentLevel = existingNode.children
         }
      })
   })

   return sortTree(root)
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
   return nodes
      .sort((a, b) => {
         // Folders first, then files
         if (!a.isFile && b.isFile) return -1
         if (a.isFile && !b.isFile) return 1

         // Alphabetical within same type
         return a.name.localeCompare(b.name)
      })
      .map((node) => ({
         ...node,
         children: sortTree(node.children),
      }))
}

export function getFileExtension(filename: string): string {
   const lastDot = filename.lastIndexOf(".")
   return lastDot === -1 ? "" : filename.substring(lastDot + 1).toLowerCase()
}

export function getFileIcon(filename: string): string {
   const extension = getFileExtension(filename)

   switch (extension) {
      case "ts":
      case "tsx":
         return "🔷"
      case "js":
      case "jsx":
         return "🟨"
      case "json":
         return "📋"
      case "md":
         return "📝"
      case "css":
         return "🎨"
      case "html":
         return "🌐"
      case "py":
         return "🐍"
      case "java":
         return "☕"
      case "cpp":
      case "c":
         return "⚙️"
      case "rs":
         return "🦀"
      case "go":
         return "🐹"
      case "php":
         return "🐘"
      case "rb":
         return "💎"
      case "swift":
         return "🦉"
      case "kt":
         return "🔺"
      default:
         return "📄"
   }
}

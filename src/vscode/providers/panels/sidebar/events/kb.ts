import { join } from "path"
import * as vscode from "vscode"

import { CachedState } from "@/vscode/core/state"

interface TreeNode {
   name: string
   path: string
   metadata: { absolutePath: string }
   children: TreeNode[]
}

export async function get_kb_files(webviewView: vscode.WebviewView, data: any) {
   const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
   if (!workspacePath) {
      webviewView.webview.postMessage({
         type: "kbFileTree",
         value: [],
      })
      return
   }

   try {
      const files = await vscode.workspace.findFiles(
         "**/*.{js,ts,jsx,tsx,py,java,cpp,c,h,hpp,cs,go,rs,php,rb,swift,kt,scala,css,scss,less,html,vue,svelte}",
         "**/node_modules/**"
      )

      const workspaceName = workspacePath.split(/[\\/]/).pop() || "workspace"
      const root: TreeNode = {
         name: workspaceName,
         path: "",
         metadata: { absolutePath: workspacePath },
         children: [],
      }

      // First collect all file paths
      const allFilePaths: string[] = []
      for (const file of files) {
         allFilePaths.push(file.fsPath)

         let currentLevel = root.children

         const relativePath = file.fsPath.substring(workspacePath.length + 1)
         const parts = relativePath.split(/[\\/]/)
         for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            let existingPath = currentLevel.find((p) => p.name === part)
            const absolutePath = join(workspacePath, parts.slice(0, i + 1).join("/"))

            if (!existingPath) {
               existingPath = {
                  name: part,
                  path: parts.slice(0, i + 1).join("/"),
                  metadata: { absolutePath: absolutePath },
                  children: [],
               }
               currentLevel.push(existingPath)
            }

            currentLevel = existingPath.children
         }
      }

      // Sort function to put folders first
      const sortNodes = (nodes: TreeNode[]) => {
         nodes.sort((a, b) => {
            const aIsFolder = a.children.length > 0
            const bIsFolder = b.children.length > 0

            if (aIsFolder && !bIsFolder) return -1
            if (!aIsFolder && bIsFolder) return 1
            return a.name.localeCompare(b.name)
         })

         // Recursively sort children
         nodes.forEach((node) => {
            if (node.children.length > 0) {
               sortNodes(node.children)
            }
         })
      }

      // Sort the tree
      sortNodes(root.children)

      webviewView.webview.postMessage({
         type: "kbFileTree",
         value: [root],
         allFiles: allFilePaths,
         workspacePath: workspacePath,
      })
   } catch (error) {
      webviewView.webview.postMessage({
         type: "kbFileTree",
         value: [],
         allFiles: [],
      })
      console.error("Error getting KB files:", error)
   }
}

export async function select_folder_for_kb(webviewView: vscode.WebviewView, data: any) {
   const options: vscode.OpenDialogOptions = {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      title: "Select Folder for Knowledge Base",
   }

   const folderUri = await vscode.window.showOpenDialog(options)
   if (folderUri && folderUri[0]) {
      webviewView.webview.postMessage({
         type: "selected_folder_path",
         value: folderUri[0].fsPath,
      })
   }
}

export async function select_file_for_swagger(webviewView: vscode.WebviewView, data: any) {
   const options: vscode.OpenDialogOptions = {
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      title: "Select Swagger/OpenAPI File",
      filters: {
         "Swagger/OpenAPI Files": ["json", "yaml", "yml"],
         "All Files": ["*"],
      },
   }

   const fileUri = await vscode.window.showOpenDialog(options)
   if (fileUri && fileUri[0]) {
      webviewView.webview.postMessage({
         type: "selected_file_path",
         value: fileUri[0].fsPath,
      })
   }
}

export async function set_knowledgebase_state(webviewView: vscode.WebviewView, data: any) {
   CachedState.setKnowledgebaseState(data)
}

export async function get_knowledgebase_state(webviewView: vscode.WebviewView, data: any) {
   const state = CachedState.getKnowledgebaseState()
   webviewView.webview.postMessage({ type: "knowledgebase_state", value: state })
}

import { SidebarProvider } from "@/vscode/providers/panels/sidebar"
import * as vscode from "vscode"
import { CommandNames } from "../index"

export function registerOpenSecurityEvaluationCommand(context: vscode.ExtensionContext, name: CommandNames) {
   return context.subscriptions.push(
      vscode.commands.registerCommand(name, async (uri?: vscode.Uri) => {
         const filePath = vscode.window.activeTextEditor?.document.uri.fsPath
         if (!filePath) {
            return vscode.window.showErrorMessage("No active editor or file context found.")
         }

         const workspaceFolders = vscode.workspace.workspaceFolders
         if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath
            const relativePath = filePath.replace(workspaceRoot, "").replace(/^[/\\]/, "")
            const urlEncodedPath = encodeURIComponent(relativePath)

            // Ensure the sidebar is visible first
            try {
               await vscode.commands.executeCommand("codemate-sidebar.focus")
            } catch {
               // Fallback – open the view container
               await vscode.commands.executeCommand("workbench.view.extension.codemate-sidebar-view")
            }

            await new Promise((resolve) => setTimeout(resolve, 1000))

            SidebarProvider.postMessage({
               type: "navigate",
               value: `/code-evaluations/${urlEncodedPath}`,
            })
         } else {
            vscode.window.showErrorMessage("No workspace folder is open.")
         }
      })
   )
}

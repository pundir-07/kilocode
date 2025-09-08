import * as vscode from "vscode"

import { SidebarProvider } from "@/vscode/providers/panels/sidebar"

export default function registerNewChatCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      // Reveal the CodeMate sidebar first
      try {
         await vscode.commands.executeCommand("codemate-sidebar.focus")
      } catch {
         // If the view cannot be focused, fallback to opening its container
         await vscode.commands.executeCommand("workbench.view.extension.codemate-sidebar-view")
      }

      // Ask the web-view to create a fresh chat session (give the view a brief moment to load)
      setTimeout(() => {
         SidebarProvider.postMessage({ type: "new_chat" })
      }, 100)
   })

   context.subscriptions.push(command)
}

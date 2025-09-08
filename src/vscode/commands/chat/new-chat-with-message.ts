import * as vscode from "vscode"

import { SidebarProvider } from "@/vscode/providers/panels/sidebar"

export default function registerNewChatWithMessageCommand(
   context: vscode.ExtensionContext,
   commandName: string
) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      // Ask for initial message
      const initialMessage = await vscode.window.showInputBox({
         prompt: "Enter the initial message to start the chat",
         placeHolder: "Ask CodeMate…",
      })

      // If the user cancelled the input box, just abort
      if (typeof initialMessage === "undefined") {
         return
      }

      // Reveal sidebar
      try {
         await vscode.commands.executeCommand("codemate-sidebar.focus")
      } catch {
         await vscode.commands.executeCommand("workbench.view.extension.codemate-sidebar-view")
      }

      // Send message to webview to create new chat with given text (after slight delay)
      setTimeout(() => {
         SidebarProvider.postMessage({ type: "new_chat", value: initialMessage })
      }, 100)
   })

   context.subscriptions.push(command)
} 
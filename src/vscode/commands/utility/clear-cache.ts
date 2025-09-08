import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export default async function registerClearCacheCommand(
   context: vscode.ExtensionContext,
   commandName: string
) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      // Clear cache
      {
         CachedState.clear()
         await vscode.window.withProgress(
            {
               location: vscode.ProgressLocation.Notification,
               title: "Clearing cache...",
            },
            async () => await new Promise((resolve) => setTimeout(resolve, 5000))
         )
      }

      // Show success message
      vscode.window.showInformationMessage("Cache cleared successfully.")

      // Reload VSCode window
      vscode.commands.executeCommand("workbench.action.reloadWindow")
   })

   context.subscriptions.push(command)
}

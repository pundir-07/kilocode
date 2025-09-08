import * as vscode from "vscode"
import { SidebarProvider } from "../../providers/panels/sidebar"

/**
 * Registers a VS Code command that (1) reveals the CodeMate sidebar and (2) tells the
 * webview to navigate to a particular internal route.
 *
 * @param context      The extension context
 * @param commandName  The VS Code command identifier to register
 * @param routePath    The internal React-router path to navigate to (e.g. "/settings")
 */
export default function registerOpenSidebarRouteCommand(
   context: vscode.ExtensionContext,
   commandName: string,
   routePath: string
) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      // Reveal (or show) the sidebar first so that the message target exists.
      await vscode.commands.executeCommand("workbench.view.extension.codemate-sidebar-view")

      // Give the webview a moment to mount if it is being shown for the first time.
      // Then send a navigation message.
      setTimeout(() => {
         SidebarProvider.postMessage({ type: "navigate", value: routePath })
      }, 50)
   })

   context.subscriptions.push(command)
}

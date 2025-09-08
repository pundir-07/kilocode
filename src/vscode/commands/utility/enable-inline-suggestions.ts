import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export default function registerEnableInlineSuggestionsCommand(
   context: vscode.ExtensionContext,
   commandName: string
) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      const settings = CachedState.getSettings()
      if (settings.disableInlineSuggestions) {
         CachedState.setSettings({ ...settings, disableInlineSuggestions: false })
         vscode.window.showInformationMessage("CodeMate inline suggestions enabled.")
      } else {
         vscode.window.showInformationMessage("CodeMate inline suggestions are already enabled.")
      }
   })

   context.subscriptions.push(command)
}

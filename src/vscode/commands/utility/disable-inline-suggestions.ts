import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export default function registerDisableInlineSuggestionsCommand(
   context: vscode.ExtensionContext,
   commandName: string
) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      const settings = CachedState.getSettings()
      if (!settings.disableInlineSuggestions) {
         CachedState.setSettings({ ...settings, disableInlineSuggestions: true })
         vscode.window.showInformationMessage("CodeMate inline suggestions disabled.")
      } else {
         vscode.window.showInformationMessage("CodeMate inline suggestions are already disabled.")
      }
   })

   context.subscriptions.push(command)
}

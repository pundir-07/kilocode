import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export default function registerDisableCodeLensCommand(
   context: vscode.ExtensionContext,
   commandName: string
) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      const settings = CachedState.getSettings()
      if (!settings.disableCodeLens) {
         CachedState.setSettings({ ...settings, disableCodeLens: true })
         vscode.window.showInformationMessage("CodeMate CodeLens disabled.")
      } else {
         vscode.window.showInformationMessage("CodeMate CodeLens is already disabled.")
      }
   })

   context.subscriptions.push(command)
}

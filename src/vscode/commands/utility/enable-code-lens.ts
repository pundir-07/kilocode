import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export default function registerEnableCodeLensCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      const settings = CachedState.getSettings()
      if (settings.disableCodeLens) {
         CachedState.setSettings({ ...settings, disableCodeLens: false })
         vscode.window.showInformationMessage("CodeMate CodeLens enabled.")
      } else {
         vscode.window.showInformationMessage("CodeMate CodeLens is already enabled.")
      }
   })

   context.subscriptions.push(command)
}

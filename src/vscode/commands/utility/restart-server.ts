import { killServerExe, runServerProcessIfNotRunning } from "@/vscode/utils/process-manager"
import * as vscode from "vscode"

export default function registerRestartServerCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      await killServerExe()
      await runServerProcessIfNotRunning()
   })

   context.subscriptions.push(command)
}

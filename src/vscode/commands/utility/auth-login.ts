import * as vscode from "vscode"

import { CodemateAuthProvider } from "@/vscode/providers/auth"
import { CommandNames } from ".."

export default function registerLoginCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      const provider = new CodemateAuthProvider(context.globalState)
      const sessions = await provider.getSessions()

      // If there is an active session, provide options to manage account or logout
      if (sessions.length) await vscode.commands.executeCommand(CommandNames.LOGOUT)

      await provider.createSession(["default"])
   })
   context.subscriptions.push(command)
}

import * as vscode from "vscode"

import { LocalServersState } from "@/vscode/core/state"
import { CodemateAuthProvider } from "@/vscode/providers/auth"

export default function registerLogoutCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      const provider = new CodemateAuthProvider(context.globalState)
      const sessions = await provider.getSessions()
      if (!sessions.length) {
         await LocalServersState.setSessionID(null) // Clear the cached session token
      }

      for (const session of sessions) {
         await provider.removeSession(session.id)
      }
   })

   context.subscriptions.push(command)
}

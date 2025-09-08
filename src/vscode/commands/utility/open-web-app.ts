import * as vscode from "vscode"

export default function registerOpenWebAppCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, () => {
      vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(`https://app.codemate.ai`))
   })

   context.subscriptions.push(command)
}

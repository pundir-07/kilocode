import * as vscode from "vscode"

export default function registerDisposeCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, () => {
      const commentController = vscode.comments.createCommentController(
         "codemate-inline",
         "CodeMate: Inline-Chat"
      )
      commentController.dispose()
   })

   context.subscriptions.push(command)
}

import * as vscode from "vscode"
import { CommandNames } from ".."
import { CodelensProvider } from "@/vscode/providers/codelens"

const codeActions = [
   {
      label: "📝 Generate Tests",
      command: CommandNames.TEST_CODE,
      description: "Generate test cases for this code",
      simulatedDuration: 0,
   },
   {
      label: "🔍 Debug",
      command: CommandNames.DEBUG_CODE,
      description: "Debug this code",
      simulatedDuration: 0,
   },
   {
      label: "👀 Review",
      command: CommandNames.REVIEW_CODE,
      description: "Review this code",
      simulatedDuration: 0,
   },
   {
      label: "⚡ Optimize",
      command: CommandNames.OPTIMIZE_CODE,
      description: "Optimize this code",
      simulatedDuration: 0,
   },
]

export function registerShowAgentMenuCommand(context: vscode.ExtensionContext, provider: CodelensProvider) {
   const command = vscode.commands.registerCommand(
      CommandNames.SHOW_AGENT_MENU,
      async (args: { text: string; documentUri: vscode.Uri; range: vscode.Range }) => {
         const selectedAction = await vscode.window.showQuickPick(codeActions, {
            title: "Select CodeMate Action",
            placeHolder: "Choose an action to perform",
            matchOnDescription: true,
         })

         if (selectedAction) {
            provider.setProcessingState(args.range, selectedAction.label)

            await vscode.commands.executeCommand(selectedAction.command, args)
            provider.setProcessingState(null, null)
         }
      }
   )

   context.subscriptions.push(command)
}

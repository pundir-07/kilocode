import { API } from "@/common/api"
import { LocalServersState } from "@/vscode/core/state"
import { getSuggestionCodeLensProvider } from "@/vscode/providers"
import * as vscode from "vscode"

interface CommandArgs {
   text: string
   documentUri: vscode.Uri
   range: vscode.Range
}

export function registerDebugCodeCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, async (...args) => {
      const commandArgs = args[0] as CommandArgs

      if (!commandArgs?.text || !commandArgs?.documentUri || !commandArgs?.range) {
         console.error("Invalid arguments received:", commandArgs)
         vscode.window.showErrorMessage("Failed to process the code: Invalid arguments")
         return
      }

      // Get the codeLensProvider from the providers registry
      const codeLensProvider = getSuggestionCodeLensProvider()

      if (!codeLensProvider) {
         vscode.window.showErrorMessage("Failed to get suggestions provider")
         return
      }

      try {
         // Set loading state
         const loadingId = codeLensProvider.setLoading(
            commandArgs.documentUri.toString(),
            new vscode.Range(
               commandArgs.range.start.line,
               commandArgs.range.start.character,
               commandArgs.range.end.line,
               commandArgs.range.end.character
            )
         )

         // Make API call to get debug suggestions
         const response = await API.BACKEND.post<{ code: string }>(
            "/inline/debug/code",
            {
               target_code: commandArgs.text,
               context_code: commandArgs.text,
               provider: "default",
               language: commandArgs.documentUri.fsPath.split(".").pop(),
            },
            { headers: { "x-session": await LocalServersState.getSessionID() } }
         )

         // Remove loading state regardless of result
         if (loadingId) {
            codeLensProvider.removeSuggestion(commandArgs.documentUri.toString(), loadingId)
         }

         if (response.status !== 200) {
            throw new Error("Failed to debug code")
         }

         // Add the suggestion to show in codelens
         codeLensProvider.addSuggestion(
            commandArgs.documentUri.toString(),
            new vscode.Range(
               commandArgs.range.start.line,
               commandArgs.range.start.character,
               commandArgs.range.end.line,
               commandArgs.range.end.character
            ),
            response.data.code,
            commandArgs.text
         )

         vscode.window.showInformationMessage("Debug suggestions ready!")
      } catch (error) {
         console.error("Error in debug code command:", error)
         vscode.window.showErrorMessage("Failed to process the code")
      }
   })

   context.subscriptions.push(command)
}

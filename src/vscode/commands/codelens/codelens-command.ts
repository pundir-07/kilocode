import * as vscode from "vscode"

import { SuggestionCodeLensProvider } from "@/vscode/providers/codelens/suggestion-codelens-provider"
import { handleCodeLensAction } from "./codelens-action"

/**
 * Registers the main CodeLens command that shows the scope/action selection UI
 */
export function registerCodeLensCommand(
   context: vscode.ExtensionContext,
   codeLensProvider: SuggestionCodeLensProvider
) {
   // Register the main command that will be called by the CodeLens
   context.subscriptions.push(
      vscode.commands.registerCommand("codemate.codelensAction", async (params: any) => {
         // Get the active editor
         const editor = vscode.window.activeTextEditor
         if (!editor) {
            vscode.window.showErrorMessage("No active editor found")
            return
         }

         // If we have a range in the params, use it, otherwise use the current position
         let position: vscode.Position
         if (params && params.range) {
            // If we have a range, use the start position
            position = params.range.start
         } else {
            // Otherwise use the current cursor position
            position = editor.selection.active
         }

         // Call the handler with the document, position, and provider
         await handleCodeLensAction(editor.document, position, codeLensProvider)
      })
   )

   // Note: enable/disable codelens commands are registered elsewhere in extension.ts
}

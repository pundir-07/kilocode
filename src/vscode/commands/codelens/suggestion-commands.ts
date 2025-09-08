import { LineByLineAnimator } from "@/vscode/utils/line-animation"
import axios from "axios"
import * as vscode from "vscode"
import { API } from "../../../common/api"
import { LocalServersState } from "../../core/state"
import { SuggestionCodeLensProvider } from "../../providers/codelens/suggestion-codelens-provider"
import { SuggestionRange } from "../../providers/codelens/types"
import { DiffEditorManager } from "../../utils/diff-helper"

// Custom content provider for diff views
class SuggestionDiffContentProvider implements vscode.TextDocumentContentProvider {
   private contentMap = new Map<string, string>()
   private languageMap = new Map<string, string>()

   provideTextDocumentContent(uri: vscode.Uri): string {
      const key = uri.path
      return this.contentMap.get(key) || ""
   }

   getLanguage(uri: vscode.Uri): string {
      const key = uri.path
      return this.languageMap.get(key) || ""
   }

   setContent(uri: vscode.Uri, content: string, language: string): void {
      const key = uri.path
      this.contentMap.set(key, content)
      this.languageMap.set(key, language)
   }

   clear(): void {
      this.contentMap.clear()
      this.languageMap.clear()
   }
}

// Helper function to close diff editors by scheme
async function closeDiffEditors(scheme: string) {
   // Find all tabs that match our diff scheme
   const diffTabs = vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .filter((tab) => {
         // Check if this is a text document tab with our scheme
         if (tab.input instanceof vscode.TabInputTextDiff) {
            return tab.input.original.scheme === scheme || tab.input.modified.scheme === scheme
         }
         return false
      })

   // Close the diff tabs if any were found
   if (diffTabs.length > 0) {
      await vscode.window.tabGroups.close(diffTabs)
      return true
   }
   return false
}

export function registerSuggestionCommands(
   context: vscode.ExtensionContext,
   provider: SuggestionCodeLensProvider
) {
   // Create a single instance of the content provider
   const diffContentProvider = new SuggestionDiffContentProvider()
   const scheme = "codemate-diff"

   // Register the content provider
   const registration = vscode.workspace.registerTextDocumentContentProvider(scheme, diffContentProvider)

   // Add the registration to the extension's subscriptions
   context.subscriptions.push(registration)

   // Accept single suggestion
   context.subscriptions.push(
      vscode.commands.registerCommand(
         "codemate.acceptSuggestion",
         async (documentUri: string, suggestion: any) => {
            try {
               const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri))
               const editor = await vscode.window.showTextDocument(document)

               await editor.edit((builder) => {
                  builder.replace(suggestion.range, suggestion.suggestion)
               })

               vscode.window.showInformationMessage("Suggestion accepted")
               // Remove only this specific suggestion instead of clearing all
               if (suggestion.id) {
                  provider.removeSuggestion(documentUri, suggestion.id)
               } else {
                  // Fallback for backwards compatibility
                  provider.clearSuggestions(documentUri)
               }

               // Close the specific diff editor for this suggestion
               if (suggestion.id) {
                  await DiffEditorManager.closeDiffEditor(suggestion.id)
               }

               // Clean up block decorations for this range
               LineByLineAnimator.removeBlockDecorationsForRange(documentUri, suggestion.range)
            } catch (error) {
               console.error("Error accepting suggestion:", error)
               vscode.window.showErrorMessage("Failed to accept suggestion")
            }
         }
      )
   )

   // Reject single suggestion
   context.subscriptions.push(
      vscode.commands.registerCommand(
         "codemate.rejectSuggestion",
         async (documentUri: string, suggestion: any) => {
            try {
               // Remove only this specific suggestion instead of clearing all
               if (suggestion.id) {
                  provider.removeSuggestion(documentUri, suggestion.id)
               } else {
                  // Fallback for backwards compatibility
                  provider.clearSuggestions(documentUri)
               }
               vscode.window.showInformationMessage("Suggestion rejected")

               // Close the specific diff editor for this suggestion
               if (suggestion.id) {
                  await DiffEditorManager.closeDiffEditor(suggestion.id)
               }

               // Clean up block decorations for this range
               LineByLineAnimator.removeBlockDecorationsForRange(documentUri, suggestion.range)
            } catch (error) {
               console.error("Error rejecting suggestion:", error)
               vscode.window.showErrorMessage("Failed to reject suggestion")
            }
         }
      )
   )

   // Accept all suggestions
   context.subscriptions.push(
      vscode.commands.registerCommand("codemate.acceptAllSuggestions", async (documentUri: string) => {
         try {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri))
            const editor = await vscode.window.showTextDocument(document)

            // Create a workspace edit to apply all changes
            const workspaceEdit = new vscode.WorkspaceEdit()
            const suggestions = provider["suggestions"].get(documentUri) || []

            for (const suggestion of suggestions) {
               if (!suggestion.isLoading) {
                  workspaceEdit.replace(document.uri, suggestion.range, suggestion.suggestion)
               }
            }

            await vscode.workspace.applyEdit(workspaceEdit)

            // Capture suggestions BEFORE clearing so we can clean decorations
            const acceptedSuggestions = [...suggestions]

            provider.clearSuggestions(documentUri)
            vscode.window.showInformationMessage("All suggestions accepted")

            // Clean up all block decorations for each accepted suggestion
            for (const suggestion of acceptedSuggestions) {
               LineByLineAnimator.removeBlockDecorationsForRange(documentUri, suggestion.range)
            }
         } catch (error) {
            console.error("Error accepting all suggestions:", error)
            vscode.window.showErrorMessage("Failed to accept all suggestions")
         }
      })
   )

   // Reject all suggestions
   context.subscriptions.push(
      vscode.commands.registerCommand("codemate.rejectAllSuggestions", async (documentUri: string) => {
         try {
            provider.clearSuggestions(documentUri)
            vscode.window.showInformationMessage("All suggestions rejected")

            // Clean up all block decorations for this document
            const docSuggestions = provider.getSuggestions(documentUri)
            if (docSuggestions) {
               for (const suggestion of docSuggestions) {
                  LineByLineAnimator.removeBlockDecorationsForRange(documentUri, suggestion.range)
               }
            }
         } catch (error) {
            console.error("Error rejecting all suggestions:", error)
            vscode.window.showErrorMessage("Failed to reject all suggestions")
         }
      })
   )

   // Show diff
   context.subscriptions.push(
      vscode.commands.registerCommand(
         "codemate.showSuggestionDiff",
         async (documentUri: string, suggestion: any) => {
            if (suggestion.isLoading) {
               return // Don't show diff while loading
            }
            try {
               const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri))

               // Use DiffEditorManager to show the diff view
               await DiffEditorManager.openDiffView(
                  scheme,
                  document.getText(suggestion.range),
                  suggestion.suggestion,
                  document.languageId,
                  suggestion.id
               )
            } catch (error) {
               console.error("Error showing diff:", error)
               vscode.window.showErrorMessage("Failed to show diff")
            }
         }
      )
   )

   //Apply suggested change
   context.subscriptions.push(
      vscode.commands.registerCommand(
         "codemate.applySuggestedChange",
         async (documentUri: string, suggestion: SuggestionRange) => {
            try {
               const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri))

               const editor = await vscode.window.showTextDocument(document)

               // Get full document text
               const fullText = document.getText()

               // Call LLM with suggestion as prompt
               const response = await axios.post<{ code: string }>(
                  `${API.BACKEND}/inline/apply/change`,
                  {
                     target_code: fullText,
                     suggestion: suggestion.suggestion,
                     range: {
                        start: suggestion.range.start,
                        end: suggestion.range.end,
                     },
                     language: document.languageId,
                  },
                  { headers: { "x-session": await LocalServersState.getSessionID() } }
               )

               if (response.status !== 200) {
                  throw new Error("Failed to apply change")
               }

               // Clean up markers and apply edit
               const newText = response.data.code.replace(/\/\/ \.\.\. keep existing code \.\.\./g, fullText)

               await editor.edit((builder) => {
                  const fullRange = new vscode.Range(
                     document.positionAt(0),
                     document.positionAt(fullText.length)
                  )
                  builder.replace(fullRange, newText)
               })

               // Clean up the suggestion
               provider.removeSuggestion(documentUri, suggestion.id!)

               vscode.window.showInformationMessage("Changes applied successfully")
            } catch (error: any) {
               vscode.window.showErrorMessage(`Failed to apply changes: ${error.message}`)
            }
         }
      )
   )
}

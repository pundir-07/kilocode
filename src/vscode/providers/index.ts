import * as vscode from "vscode"
import { SuggestionCodeLensProvider } from "./codelens/suggestion-codelens-provider"
import { SuggestionCodeActionProvider } from "./codeaction"
import { InlineSuggestionsProvider } from "./inline-suggestions"

let suggestionCodeLensProvider: SuggestionCodeLensProvider
let suggestionCodeActionProvider: SuggestionCodeActionProvider
let inlineSuggestionsProvider: InlineSuggestionsProvider

export function initializeProviders(context: vscode.ExtensionContext) {
   // Initialize CodeLens provider
   suggestionCodeLensProvider = new SuggestionCodeLensProvider()
   context.subscriptions.push(
      vscode.languages.registerCodeLensProvider({ scheme: "file" }, suggestionCodeLensProvider)
   )

   // Initialize CodeAction provider
   suggestionCodeActionProvider = new SuggestionCodeActionProvider()
   context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
         "*", // Register for all languages
         suggestionCodeActionProvider,
         {
            providedCodeActionKinds: SuggestionCodeActionProvider.providedCodeActionKinds,
         }
      )
   )

   // Initialize Inline Suggestions provider
   inlineSuggestionsProvider = new InlineSuggestionsProvider()
   context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider({ pattern: "**" }, inlineSuggestionsProvider)
   )

   return {
      suggestionCodeLensProvider,
      suggestionCodeActionProvider,
      inlineSuggestionsProvider,
   }
}

export function getSuggestionCodeLensProvider() {
   return suggestionCodeLensProvider
}

export function getSuggestionCodeActionProvider() {
   return suggestionCodeActionProvider
}

export function getInlineSuggestionsProvider() {
   return inlineSuggestionsProvider
}

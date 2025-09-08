import * as vscode from "vscode"

import InlineSuggestionContext from "./mod/context"
import { IInlineSuggestionStrategy } from "./strategy"
import { FastInlineSuggestions } from "./strategy/fast"
import { SlowInlineSuggestions } from "./strategy/slow"

// ----------------------------------------------------------------------------------------------------------

let lastSuggestionUUID: string | null = null
let lastInlineStrategy: IInlineSuggestionStrategy | null = null
let lastInlineStrategyExecutionTS: number | null = null
let slowSuggestionsExecutionTimeout: NodeJS.Timeout | null = null

// ----------------------------------------------------------------------------------------------------------

export class InlineSuggestionsProvider implements vscode.InlineCompletionItemProvider {
   readonly SLOW_SUGGESTION_THRESHOLD_TIME = 2000 // milliseconds

   scheduleSlowSuggestions() {
      if (slowSuggestionsExecutionTimeout) {
         clearTimeout(slowSuggestionsExecutionTimeout)
      }
      slowSuggestionsExecutionTimeout = setTimeout(() => {
         // Cancel the fast inline strategy if it is still running
         lastInlineStrategy?.cancel()

         // Trigger the inline suggestion again and because of the time gap, it will use the slow strategy
         vscode.commands.executeCommand("editor.action.inlineSuggest.trigger")
      }, 2000)
   }

   doPerformSlowSuggestions(now: number): boolean {
      if (!lastInlineStrategyExecutionTS) return false
      const timeGap = now - lastInlineStrategyExecutionTS

      const exceedsThreshold = timeGap > this.SLOW_SUGGESTION_THRESHOLD_TIME
      return exceedsThreshold
   }

   async provideInlineCompletionItems(
      document: vscode.TextDocument,
      position: vscode.Position,
      context: vscode.InlineCompletionContext & { requestUuid: string },
      token: vscode.CancellationToken
   ): Promise<vscode.InlineCompletionList | null> {
      // Deduplicate requests
      if (context.requestUuid === lastSuggestionUUID) return null
      lastSuggestionUUID = context.requestUuid

      // If the request is cancelled, return null
      if (token.isCancellationRequested) {
         lastInlineStrategy?.cancel()
         return null
      }

      // Prepare the context
      const suggestionContext = new InlineSuggestionContext()
      await suggestionContext.prepare(document, position)
      if (!suggestionContext.prepared) {
         console.error("Failed to prepare the inline suggestion context.")
         return null
      }

      // Check if a slow suggestion is allowed based on the last execution time
      const now = Date.now()
      if (this.doPerformSlowSuggestions(now)) {
         lastInlineStrategy = new SlowInlineSuggestions({ debounceTimeInMs: 0 })
      } else {
         lastInlineStrategy = new FastInlineSuggestions({ debounceTimeInMs: 200 })
      }

      // Choose a strategy if not already set
      lastInlineStrategyExecutionTS = Date.now()

      // Schedule slow suggestions for later & better results
      this.scheduleSlowSuggestions()

      // Get suggestions from the chosen strategy
      const suggestions = await lastInlineStrategy.get(suggestionContext)
      if (!suggestions) return null

      // Prepare and return the inline completion item
      return suggestions
   }
}

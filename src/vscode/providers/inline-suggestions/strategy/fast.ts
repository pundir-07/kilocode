import * as vscode from "vscode"

import { IInlineSuggestionStrategy } from "."
import { inlineSuggestionsBin } from "../mod/bin"
import InlineSuggestionContext from "../mod/context"
import { getInlineSuggestionsFromCloud } from "../utils/ai"

export class FastInlineSuggestions implements IInlineSuggestionStrategy {
   private cancelFn: ((reason?: any) => void) | null = null
   private debounceTimeInMs: number
   private static debounceTimeout: NodeJS.Timeout | null = null

   constructor(config?: { debounceTimeInMs?: number }) {
      this.debounceTimeInMs = config?.debounceTimeInMs || 500
   }

   cancel() {
      if (!this.cancelFn) return
      this.cancelFn("Suggestion cancelled")
      this.cancelFn = null
   }

   async generateAndCacheSuggestions(context: InlineSuggestionContext): Promise<Set<string>> {
      // If there's already a request in progress, cancel it
      if (FastInlineSuggestions.debounceTimeout) {
         console.log("Cancelling previous suggestion request.")
         clearTimeout(FastInlineSuggestions.debounceTimeout)
      }

      // Make a new promise to resolve when we have got the suggestions
      return new Promise<Set<string>>(async (resolve) => {
         FastInlineSuggestions.debounceTimeout = setTimeout(async () => {
            // Check if there are already suggestions available
            const prompt = context.renderAsInstructions()
            const suggestions = await getInlineSuggestionsFromCloud(prompt, "\n")

            for (const suggestion of suggestions) {
               // Add the suggestion to the bin
               inlineSuggestionsBin.addSuggestion(
                  context.data.editor.filepath,
                  context.data.editor.position.line,
                  context.data.code.current,
                  suggestion
               )
            }

            resolve(suggestions)
         }, this.debounceTimeInMs)
      })
   }

   transformSuggestion(text: string, line: number, character: number): vscode.InlineCompletionItem {
      const position = new vscode.Position(line, character)
      return new vscode.InlineCompletionItem(
         text,
         new vscode.Range(
            position.with(position.line, position.character),
            position.with(position.line, position.character + text.length)
         )
      )
   }

   async get(context: InlineSuggestionContext): Promise<vscode.InlineCompletionList | null> {
      if (!context.prepared) throw new Error("Context not prepared")

      // Get the current line from the context
      const currentLine = context.data.code.current

      // Dispatch a new non-awaited request to generate suggestions
      const generateSuggestionsPromise = this.generateAndCacheSuggestions(context)

      // Check if there are already suggestions available
      const cachedSuggestions = inlineSuggestionsBin.getSuggestions(
         context.data.editor.filepath,
         context.data.editor.position.line,
         currentLine
      )

      // Cache hit
      if (cachedSuggestions.length) {
         return new vscode.InlineCompletionList(
            cachedSuggestions.map((x) =>
               this.transformSuggestion(
                  x,
                  context.data.editor.position.line,
                  context.data.editor.position.character
               )
            )
         )
      }

      // If no suggestions are available, wait for the suggestion to be added
      try {
         const suggestions = await new Promise<string[] | null>(async (resolve, reject) => {
            this.cancelFn = reject

            // Wait for the suggestion to be added to the bin
            await generateSuggestionsPromise

            // After the promise resolves, check again for suggestions
            const freshSuggestions = inlineSuggestionsBin.getSuggestions(
               context.data.editor.filepath,
               context.data.editor.position.line,
               currentLine
            )
            if (!freshSuggestions.length) {
               console.log("No suggestions found even after waiting.")
               return null
            }

            resolve(freshSuggestions)
         })
         if (!suggestions?.length) {
            console.log("No suggestions found even after waiting.")
            return null
         }

         return new vscode.InlineCompletionList(
            suggestions.map((suggestion) =>
               this.transformSuggestion(
                  suggestion,
                  context.data.editor.position.line,
                  context.data.editor.position.character
               )
            )
         )
      } catch (e) {
         console.log("Suggestion cancelled or failed.", e)
         return null
      }
   }
}

import * as vscode from "vscode"

import InlineSuggestionContext from "../mod/context"

export interface IInlineSuggestionStrategy {
   /**
    * Cancels any ongoing suggestion process.
    * @returns {void}
    * @memberof IInlineSuggestionStrategy
    * @description This method should be called to cancel any ongoing suggestion process.
    * It should handle cleanup and ensure that no further suggestions are processed.
    */
   cancel(): void

   /**
    * Retrieves an inline suggestion for the given document and position.
    * @param context - The context containing the document and position for which to generate suggestions.
    * @returns A promise that resolves to a set of suggestions.
    * @memberof IInlineSuggestionStrategy
    * @description This method should generate and cache suggestions based on the provided context.
    * It should return a set of suggestions that can be used for inline completion.
    */
   get(context: InlineSuggestionContext): Promise<vscode.InlineCompletionList | null>
}

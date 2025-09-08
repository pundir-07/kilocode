import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"
import { DiffEditorManager } from "../../utils/diff-helper"

interface SuggestionRange {
   range: vscode.Range
   suggestion: string
   originalText: string
   isLoading?: boolean
   id?: string // Add an ID field to uniquely identify suggestions
   symbolName?: string // Add symbol name for better context
}

export class SuggestionCodeLensProvider implements vscode.CodeLensProvider {
   private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>()
   public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event
   private suggestions: Map<string, SuggestionRange[]> = new Map()
   private nextId: number = 1 // Counter for generating unique IDs
   private fileRanges: Map<string, vscode.Range> = new Map() // Track file-level ranges for multi-symbol operations

   constructor() {
      // Watch for document changes to update lenses
      vscode.workspace.onDidChangeTextDocument((e) => {
         // Check if any of our suggestions are affected by the change
         const docUri = e.document.uri.toString()
         const suggestions = this.suggestions.get(docUri)
         if (suggestions) {
            const affectedSuggestions = suggestions.filter((s) =>
               e.contentChanges.some((change) => s.range.contains(change.range))
            )

            if (affectedSuggestions.length > 0) {
               // Only remove affected suggestions, not all of them
               affectedSuggestions.forEach((suggestion) => {
                  if (suggestion.id) {
                     this.removeSuggestion(docUri, suggestion.id)
                  }
               })
            }
         }
         this._onDidChangeCodeLenses.fire()
      })
   }

   public addSuggestion(
      documentUri: string,
      range: vscode.Range,
      suggestion: string,
      originalText: string,
      symbolName?: string
   ) {
      const docSuggestions = this.suggestions.get(documentUri) || []

      // Remove any existing suggestions that overlap with this range
      const filteredSuggestions = docSuggestions.filter((s) => !s.range.intersection(range) && !s.isLoading)

      // Generate a unique ID for this suggestion
      const id = `suggestion_${this.nextId++}`

      const newSuggestion = { range, suggestion, originalText, isLoading: false, id, symbolName }
      filteredSuggestions.push(newSuggestion)
      this.suggestions.set(documentUri, filteredSuggestions)

      // Update file range if needed
      this.updateFileRange(documentUri, range)

      this._onDidChangeCodeLenses.fire()

      // Automatically show the diff view using our DiffEditorManager
      this.showDiffForSuggestion(documentUri, newSuggestion)

      return id // Return the ID for reference
   }

   /**
    * Automatically show the diff view for a suggestion
    */
   private async showDiffForSuggestion(documentUri: string, suggestion: any) {
      try {
         // Get the document to extract language information
         const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri))

         // Use the DiffEditorManager to show the diff view
         await DiffEditorManager.openDiffView(
            "codemate-diff", // Use the same scheme as before
            suggestion.originalText,
            suggestion.suggestion,
            document.languageId,
            suggestion.id
         )
      } catch (error) {
         console.error("Error showing diff view:", error)
      }
   }

   public setLoading(documentUri: string, range: vscode.Range, symbolName?: string) {
      const docSuggestions = this.suggestions.get(documentUri) || []

      // Remove any existing suggestions that overlap with this range
      const filteredSuggestions = docSuggestions.filter((s) => !s.range.intersection(range))

      // Generate a unique ID for this suggestion
      const id = `loading_${this.nextId++}`

      filteredSuggestions.push({
         range,
         suggestion: "",
         originalText: "",
         isLoading: true,
         id,
         symbolName,
      })
      this.suggestions.set(documentUri, filteredSuggestions)

      // Update file range if needed
      this.updateFileRange(documentUri, range)

      this._onDidChangeCodeLenses.fire()

      return id
   }

   private updateFileRange(documentUri: string, range: vscode.Range) {
      // Track the overall range of all suggestions in a file for file-level operations
      const existingRange = this.fileRanges.get(documentUri)
      if (!existingRange) {
         this.fileRanges.set(documentUri, range)
      } else {
         // Expand the existing range to include the new range
         const startLine = Math.min(existingRange.start.line, range.start.line)
         const startChar = Math.min(existingRange.start.character, range.start.character)
         const endLine = Math.max(existingRange.end.line, range.end.line)
         const endChar = Math.max(existingRange.end.character, range.end.character)

         this.fileRanges.set(
            documentUri,
            new vscode.Range(new vscode.Position(startLine, startChar), new vscode.Position(endLine, endChar))
         )
      }
   }

   public clearSuggestions(documentUri: string) {
      this.suggestions.delete(documentUri)
      this.fileRanges.delete(documentUri)
      this._onDidChangeCodeLenses.fire()

      // Update context
      vscode.commands.executeCommand("setContext", "codemate.hasMultipleSymbolsProcessed", false)
   }

   /**
    * Remove a single suggestion by its ID
    */
   public removeSuggestion(documentUri: string, suggestionId: string) {
      const docSuggestions = this.suggestions.get(documentUri)
      if (!docSuggestions) return false

      const filteredSuggestions = docSuggestions.filter((s) => s.id !== suggestionId)

      if (filteredSuggestions.length === 0) {
         this.suggestions.delete(documentUri)
         this.fileRanges.delete(documentUri)
         // Update context
         vscode.commands.executeCommand("setContext", "codemate.hasMultipleSymbolsProcessed", false)
      } else {
         this.suggestions.set(documentUri, filteredSuggestions)
      }

      this._onDidChangeCodeLenses.fire()
      return true
   }

   /**
    * Check if a document has any active suggestions
    */
   public hasActiveSuggestions(documentUri: string): boolean {
      const docSuggestions = this.suggestions.get(documentUri)
      return !!docSuggestions && docSuggestions.length > 0
   }

   /**
    * Check if a document has multiple suggestions
    */
   public hasMultipleSuggestions(documentUri: string): boolean {
      const docSuggestions = this.suggestions.get(documentUri)
      // Count only non-loading suggestions
      return !!docSuggestions && docSuggestions.filter((s) => !s.isLoading).length > 1
   }

   /**
    * Get the suggestion closest to the given position
    */
   public getNearestSuggestion(documentUri: string, position: vscode.Position): SuggestionRange | undefined {
      const docSuggestions = this.suggestions.get(documentUri)
      if (!docSuggestions || docSuggestions.length === 0) return undefined

      // Filter out loading suggestions
      const activeSuggestions = docSuggestions.filter((s) => !s.isLoading)
      if (activeSuggestions.length === 0) return undefined

      // First check if any suggestion contains the position
      const containingSuggestion = activeSuggestions.find((s) => s.range.contains(position))
      if (containingSuggestion) return containingSuggestion

      // If not, find the closest suggestion by line distance
      let closestSuggestion = activeSuggestions[0]
      let minDistance = Number.MAX_SAFE_INTEGER

      for (const suggestion of activeSuggestions) {
         // Calculate distance to start line of suggestion
         const startDistance = Math.abs(suggestion.range.start.line - position.line)
         // Calculate distance to end line of suggestion
         const endDistance = Math.abs(suggestion.range.end.line - position.line)
         // Take the minimum of the two
         const distance = Math.min(startDistance, endDistance)

         if (distance < minDistance) {
            minDistance = distance
            closestSuggestion = suggestion
         }
      }

      return closestSuggestion
   }

   async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
      const { disableCodeLens } = CachedState.getSettings()
      if (disableCodeLens) return []

      const docSuggestions = this.suggestions.get(document.uri.toString()) || []
      const lenses: vscode.CodeLens[] = []

      // Add individual suggestion lenses
      for (const suggestion of docSuggestions) {
         if (suggestion.isLoading) {
            // Add loading state
            lenses.push(
               new vscode.CodeLens(suggestion.range, {
                  title: `$(loading~spin) Generating suggestion${suggestion.symbolName ? ` for ${suggestion.symbolName}` : ""}...`,
                  command: "", // No command while loading
               })
            )
         } else {
            // For each suggestion, show detailed title if we have symbolic info
            const symbolInfo = suggestion.symbolName ? ` (${suggestion.symbolName})` : ""

            // Add individual actions
            lenses.push(
               new vscode.CodeLens(suggestion.range, {
                  title: `$(check) Accept${symbolInfo}`,
                  command: "codemate.acceptSuggestion",
                  arguments: [document.uri.toString(), suggestion],
               }),
               new vscode.CodeLens(suggestion.range, {
                  title: `$(x) Reject${symbolInfo}`,
                  command: "codemate.rejectSuggestion",
                  arguments: [document.uri.toString(), suggestion],
               })
            )

            // If we have multiple suggestions, also add accept all/reject all at each suggestion
            const nonLoadingSuggestions = docSuggestions.filter((s) => !s.isLoading)
            if (nonLoadingSuggestions.length > 1) {
               lenses.push(
                  new vscode.CodeLens(suggestion.range, {
                     title: "$(check-all) Accept All",
                     command: "codemate.acceptAllSuggestions",
                     arguments: [document.uri.toString()],
                  }),
                  new vscode.CodeLens(suggestion.range, {
                     title: "$(x) Reject All",
                     command: "codemate.rejectAllSuggestions",
                     arguments: [document.uri.toString()],
                  })
               )
            }
         }
      }

      return lenses
   }

   /**
    * Get suggestions for a document (for cleanup purposes)
    */
   public getSuggestions(documentUri: string): SuggestionRange[] | undefined {
      return this.suggestions.get(documentUri)
   }

   dispose() {
      this._onDidChangeCodeLenses.dispose()
   }
}

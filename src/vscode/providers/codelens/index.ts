import { PRODUCT_NAME } from "@/common/core/constants"
import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"
import { SuggestionCodeLensProvider } from "./suggestion-codelens-provider"

export { SuggestionCodeLensProvider }

const codemateLens = {
   title: PRODUCT_NAME,
   tooltip: "Open CodeMate actions menu",
   command: "codemate.codelensAction",
}

export class CodelensProvider implements vscode.CodeLensProvider {
   private codeLenses: vscode.CodeLens[] = []
   private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>()
   public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event
   private processingSymbol: { range: vscode.Range; action: string } | null = null

   constructor() {
      vscode.workspace.onDidChangeConfiguration((_) => {
         this._onDidChangeCodeLenses.fire()
      })
   }

   setProcessingState(range: vscode.Range | null, action: string | null) {
      if (range && action) {
         this.processingSymbol = { range, action }
      } else {
         this.processingSymbol = null
      }
      this._onDidChangeCodeLenses.fire()
   }

   public async provideCodeLenses(
      document: vscode.TextDocument,
      token: vscode.CancellationToken
   ): Promise<vscode.CodeLens[]> {
      token.onCancellationRequested(() => [])

      const { disableCodeLens } = CachedState.getSettings()
      if (disableCodeLens) {
         return []
      }

      const allSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
         "vscode.executeDocumentSymbolProvider",
         document.uri
      )

      const symbols =
         allSymbols?.filter(
            (symbol) =>
               symbol.kind === vscode.SymbolKind.Function ||
               symbol.kind === vscode.SymbolKind.Class ||
               symbol.kind === vscode.SymbolKind.Method ||
               symbol.kind === vscode.SymbolKind.Property ||
               symbol.kind === vscode.SymbolKind.Field ||
               symbol.kind === vscode.SymbolKind.Enum ||
               symbol.kind === vscode.SymbolKind.Interface ||
               symbol.kind === vscode.SymbolKind.Namespace ||
               symbol.kind === vscode.SymbolKind.Constructor ||
               symbol.kind === vscode.SymbolKind.Variable ||
               symbol.kind === vscode.SymbolKind.Constant ||
               symbol.kind === vscode.SymbolKind.Event ||
               symbol.kind === vscode.SymbolKind.TypeParameter
         ) ?? []

      this.codeLenses = []
      const lensLines = new Set()

      for (const symbol of symbols) {
         const range = symbol.location.range
         const startLine = range.start.line
         if (lensLines.has(startLine)) {
            continue
         }

         // Only show codelens if:
         // 1. No symbol is being processed, or
         // 2. This is the symbol being processed
         const isProcessingThisSymbol = this.processingSymbol?.range.isEqual(range)
         if (!this.processingSymbol || isProcessingThisSymbol) {
            const title =
               isProcessingThisSymbol && this.processingSymbol
                  ? `Processing ${this.processingSymbol.action}...`
                  : codemateLens.title
            const tooltip = isProcessingThisSymbol
               ? "Processing action, please wait..."
               : codemateLens.tooltip

            const selection = new vscode.Selection(startLine, 0, range.end.line + 1, 0)
            const text = document.getText(selection)

            this.codeLenses.push(
               new vscode.CodeLens(range, {
                  title,
                  tooltip,
                  command: isProcessingThisSymbol ? "" : codemateLens.command,
                  arguments: [
                     {
                        text,
                        documentUri: document.uri,
                        range: selection,
                     },
                  ], // Pass both selection and range
               })
            )
         }

         lensLines.add(startLine)
      }

      return this.codeLenses
   }
}

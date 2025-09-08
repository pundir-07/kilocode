import * as vscode from "vscode"

export interface ReferencedSymbol {
   name: string
   uri: vscode.Uri
   range: vscode.Range
   text: string
   kind?: vscode.SymbolKind
}

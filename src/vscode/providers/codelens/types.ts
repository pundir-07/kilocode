import * as vscode from "vscode"

export interface SuggestionRange {
    range: vscode.Range
    suggestion: string
    originalText: string
    isLoading?: boolean
    id?: string
    symbolName?: string
}
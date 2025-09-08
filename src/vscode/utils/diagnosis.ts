import * as vscode from "vscode"

// --------------------------------------------------------------------------------------------------------------------
// Get Diagnosis Results for Files
// --------------------------------------------------------------------------------------------------------------------

export async function getDiagnosisResultsForFiles(globPattern: string, severity: vscode.DiagnosticSeverity) {
   const files = await vscode.workspace.findFiles(globPattern, null, 1000)

   const results = files.flatMap((file) => {
      const diagnostics = vscode.languages.getDiagnostics(file)
      const results = diagnostics
         .filter((d) => d.severity === severity)
         .map((x) => ({
            file: vscode.workspace.asRelativePath(file),
            message: x.message,
            severity: severity,
            line: x.range.start.line + 1,
            column: x.range.start.character + 1,
            source: x.source || "linter",
         }))
      return results
   })

   return results
}

// --------------------------------------------------------------------------------------------------------------------
// Get Diagnosis Results for Editor
// --------------------------------------------------------------------------------------------------------------------

export async function getDiagnosisResultsForEditor(severity: vscode.DiagnosticSeverity) {
   const editor = vscode.window.activeTextEditor
   if (!editor) return []

   const diagnostics = vscode.languages.getDiagnostics(editor.document.uri)
   const results = diagnostics
      .filter((d) => d.severity === severity)
      .map((x) => ({
         file: vscode.workspace.asRelativePath(editor.document.uri.fsPath),
         message: x.message,
         severity: severity,
         line: x.range.start.line + 1,
         column: x.range.start.character + 1,
         source: x.source || "linter",
      }))
   return results
}

// --------------------------------------------------------------------------------------------------------------------

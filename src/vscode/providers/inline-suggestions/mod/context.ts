import * as vscode from "vscode"

import { contentToLanguageComment } from "@/vscode/providers/inline-suggestions/utils/comment-content"
import { getParentNodeBody } from "@/vscode/utils/tree-sitter"

export type InlineSuggestionContextData_t = {
   // Basic context
   env: {
      clipboard: string
      language: string
      git: { branch: string; dirty: boolean } | null
   }

   // Information about the code snippet
   code: {
      prefix: string
      current: string
      suffix: string
      parent: string
      context: string
   }

   // Editor state
   editor: {
      // Basic information
      filepath: string
      position: { line: number; character: number }
      selectedText: string | null

      // Additional information
      diagnostics: { message: string; line: number }[]
      openEditorFiles: string[]
      codeActions: string[]
      neighboringSymbols: string[]
   }
}

export default class InlineSuggestionContext {
   private _data: InlineSuggestionContextData_t | null = null

   get data(): InlineSuggestionContextData_t {
      if (!this._data) {
         throw new Error("InlineSuggestionContext not prepared")
      }
      return Object.freeze(this._data)
   }

   get prepared(): boolean {
      return this._data !== null
   }

   async getPrefix(document: vscode.TextDocument, position: vscode.Position): Promise<string> {
      const nLines = 30

      let result = ""
      for (let i = Math.max(0, position.line - nLines); i < position.line; i++) {
         result += document.lineAt(i).text + "\n"
      }
      return result
   }

   async getSuffix(document: vscode.TextDocument, position: vscode.Position): Promise<string> {
      const nLines = 20
      let result = ""
      for (let i = position.line + 1; i < Math.min(document.lineCount, position.line + nLines); i++) {
         result += document.lineAt(i).text + "\n"
      }
      return result
   }

   async getCurrentLine(document: vscode.TextDocument, position: vscode.Position): Promise<string> {
      return document.lineAt(position.line).text
   }

   async getDiagnosis(document: vscode.TextDocument): Promise<{ message: string; line: number }[]> {
      return vscode.languages
         .getDiagnostics(document.uri)
         .slice(0, 50)
         .map((d) => ({ message: d.message, line: d.range.start.line }))
   }

   async getGitInfo(): Promise<{ branch: string; dirty: boolean } | null> {
      try {
         // Get the Git extension API
         const git = vscode.extensions.getExtension("vscode.git")?.exports?.getAPI(1)
         if (!git) return null

         // Get the first repository
         if (!git.repositories || git.repositories.length === 0) return null

         // Get the first repository
         const repo = git?.repositories?.[0]
         if (!repo) return null

         // Get the current branch name
         const branch = repo.state.HEAD?.name
         if (!branch) return null

         // Check if the repository has any changes
         const dirty = repo.state.workingTreeChanges.length > 0 || repo.state.indexChanges.length > 0

         return { branch, dirty }
      } catch {}
      return null
   }

   async getOpenEditorFiles(): Promise<string[]> {
      return vscode.window.visibleTextEditors.map((editor) => editor.document.uri.fsPath)
   }

   async getNeighboringSymbols(document: vscode.TextDocument, position: vscode.Position): Promise<string[]> {
      try {
         const symbols = (await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            "vscode.executeDocumentSymbolProvider",
            document.uri
         )) as vscode.DocumentSymbol[]
         return symbols?.slice(0, 50).map((s) => s.name) || []
      } catch {}
      return []
   }

   async getCodeActions(document: vscode.TextDocument, position: vscode.Position): Promise<string[]> {
      try {
         const actions = (await vscode.commands.executeCommand<vscode.CodeAction[]>(
            "vscode.executeCodeActionProvider",
            document.uri,
            new vscode.Range(position, position)
         )) as vscode.CodeAction[]
         return actions?.slice(0, 20).map((a) => a.title) || []
      } catch {}
      return []
   }

   async prepare(document: vscode.TextDocument, position: vscode.Position): Promise<void> {
      this._data = {
         code: {
            prefix: await this.getPrefix(document, position),
            current: await this.getCurrentLine(document, position),
            suffix: await this.getSuffix(document, position),
            parent: (await getParentNodeBody(document, position)) || "",
            context: "",
         },
         env: {
            language: document.languageId || "plaintext",
            clipboard: await vscode.env.clipboard.readText(),
            git: await this.getGitInfo(),
         },
         editor: {
            filepath: document.uri.fsPath,
            position: position,
            selectedText: document.getText(vscode.window.activeTextEditor?.selection) || null,

            diagnostics: await this.getDiagnosis(document),
            openEditorFiles: await this.getOpenEditorFiles(),
            codeActions: await this.getCodeActions(document, position),
            neighboringSymbols: await this.getNeighboringSymbols(document, position),
         },
      }
   }

   renderAsInstructions(): string {
      if (!this._data) {
         throw new Error("InlineSuggestionContext not prepared")
      }

      const data = this._data

      // Build the current state info section
      const stateInfoParts: string[] = []

      // Basic info
      stateInfoParts.push(`File path: ${data.editor.filepath}`)
      stateInfoParts.push(`Language: ${data.env.language}`)

      // Git information
      if (data.env.git) {
         let gitStatus = `Branch: ${data.env.git.branch || "unknown"}`
         if (data.env.git.dirty) {
            gitStatus += ", Dirty: true"
         }
         stateInfoParts.push(gitStatus)
      }

      // Clipboard content
      if (data.env.clipboard) {
         stateInfoParts.push(`Clipboard: ${data.env.clipboard}`)
      }

      // Diagnostics
      if (data.editor.diagnostics && data.editor.diagnostics.length > 0) {
         const diagnosticsStr = data.editor.diagnostics
            .map((diag) => `Line ${diag.line}: ${diag.message}`)
            .join(", ")
         stateInfoParts.push(`Diagnostics: ${diagnosticsStr}`)
      }

      // Open files
      if (data.editor.openEditorFiles && data.editor.openEditorFiles.length > 0) {
         const openFilesStr = data.editor.openEditorFiles.join(", ")
         stateInfoParts.push(`Open files in IDE: ${openFilesStr}`)
      }

      // Symbols
      if (data.editor.neighboringSymbols && data.editor.neighboringSymbols.length > 0) {
         const symbolsStr = data.editor.neighboringSymbols.join(", ")
         stateInfoParts.push(`Symbols nearby: ${symbolsStr}`)
      }

      // Add selection context if available
      if (data.editor.selectedText) {
         const selectionCommented = contentToLanguageComment(data.editor.selectedText, data.env.language)
         stateInfoParts.push(`Selected text:\n${selectionCommented}`)
      }

      // Build current state info
      let currentStateInfo = "Current state info:\n"
      if (stateInfoParts.length > 0) {
         currentStateInfo += stateInfoParts.map((part) => `- ${part}`).join("\n")
      } else {
         currentStateInfo += "- No additional context available"
      }

      let finalPrompt = contentToLanguageComment(currentStateInfo, data.env.language)

      // Add parent/context code (commented out in original but available)
      // if (data.code.parent) {
      //    finalPrompt += `\n\n${data.code.parent}`
      // }

      // Add suffix context if available (commented out in original)
      // if (data.code.suffix.trim()) {
      //    finalPrompt += "\n\n" + contentToLanguageComment(
      //       `Content below cursor:\n${data.code.suffix}`, data.env.language
      //    )
      // }

      // Add prefix context if available
      if (data.code.prefix.trim()) {
         finalPrompt += `\n\n${data.code.prefix}`
      }

      // Add current line
      if (data.code.current) {
         finalPrompt += `\n${data.code.current}`
      }

      return finalPrompt
   }
}

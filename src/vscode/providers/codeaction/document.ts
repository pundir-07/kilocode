import * as vscode from "vscode"

import { CommandNames } from "@/vscode/commands"

export class DocumentCodeAction implements vscode.CodeActionProvider {
   public static readonly providedCodeActionKinds = [vscode.CodeActionKind.RefactorRewrite]

   public provideCodeActions(
      document: vscode.TextDocument,
      range: vscode.Range | vscode.Selection,
      context: vscode.CodeActionContext,
      token: vscode.CancellationToken
   ): vscode.CodeAction[] {
      const editor = vscode.window.activeTextEditor

      if (!editor) {
         return []
      }

      if (range.isEmpty && !document.lineAt(range.start.line).isEmptyOrWhitespace) {
         return []
      }

      const selectedText = document.getText(range).trim()

      if (!selectedText) {
         return []
      }

      return [
         this.createTestAction(document, range, selectedText),
         this.createDebugAction(document, range, selectedText),
         this.createReviewAction(document, range, selectedText),
         this.createOptimizeAction(document, range, selectedText),
      ]
   }

   private createTestAction(
      document: vscode.TextDocument,
      range: vscode.Range,
      selectedText: string
   ): vscode.CodeAction {
      const action = new vscode.CodeAction("CodeMate: Generate Tests", vscode.CodeActionKind.RefactorRewrite)
      action.command = {
         command: CommandNames.TEST_CODE,
         title: "Generate Tests",
         arguments: [
            {
               text: selectedText,
               documentUri: document.uri,
               range: {
                  start: { line: range.start.line, character: range.start.character },
                  end: { line: range.end.line, character: range.end.character },
               },
            },
         ],
      }
      action.isPreferred = true
      return action
   }

   private createDebugAction(
      document: vscode.TextDocument,
      range: vscode.Range,
      selectedText: string
   ): vscode.CodeAction {
      const action = new vscode.CodeAction("CodeMate: Debug Code", vscode.CodeActionKind.RefactorRewrite)
      action.command = {
         command: CommandNames.DEBUG_CODE,
         title: "Debug Code",
         arguments: [
            {
               text: selectedText,
               documentUri: document.uri,
               range: {
                  start: { line: range.start.line, character: range.start.character },
                  end: { line: range.end.line, character: range.end.character },
               },
            },
         ],
      }
      action.isPreferred = true
      return action
   }

   private createReviewAction(
      document: vscode.TextDocument,
      range: vscode.Range,
      selectedText: string
   ): vscode.CodeAction {
      const action = new vscode.CodeAction("CodeMate: Review Code", vscode.CodeActionKind.RefactorRewrite)
      action.command = {
         command: CommandNames.REVIEW_CODE,
         title: "Review Code",
         arguments: [
            {
               text: selectedText,
               documentUri: document.uri,
               range: {
                  start: { line: range.start.line, character: range.start.character },
                  end: { line: range.end.line, character: range.end.character },
               },
            },
         ],
      }
      action.isPreferred = true
      return action
   }

   private createOptimizeAction(
      document: vscode.TextDocument,
      range: vscode.Range,
      selectedText: string
   ): vscode.CodeAction {
      const action = new vscode.CodeAction("CodeMate: Optimize Code", vscode.CodeActionKind.RefactorRewrite)
      action.command = {
         command: CommandNames.OPTIMIZE_CODE,
         title: "Optimize Code",
         arguments: [
            {
               text: selectedText,
               documentUri: document.uri,
               range: {
                  start: { line: range.start.line, character: range.start.character },
                  end: { line: range.end.line, character: range.end.character },
               },
            },
         ],
      }
      action.isPreferred = true
      return action
   }
}

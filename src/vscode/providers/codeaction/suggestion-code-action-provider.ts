import { CommandNames } from "@/vscode/commands"
import * as vscode from "vscode"

export class SuggestionCodeActionProvider implements vscode.CodeActionProvider {
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

      // Only provide code actions for non-empty selections
      if (range.isEmpty) {
         return []
      }

      const selectedText = document.getText(range).trim()

      if (!selectedText) {
         return []
      }

      // Create CodeMate actions for the user-selected content
      return [
         this.createEditAction(document, range, selectedText),
         this.createOptimizeAction(document, range, selectedText),
         this.createDebugAction(document, range, selectedText),
         this.createTestAction(document, range, selectedText),
         this.createReviewAction(document, range, selectedText),
      ]
   }

   private createEditAction(
      document: vscode.TextDocument,
      range: vscode.Range,
      selectedText: string
   ): vscode.CodeAction {
      const action = new vscode.CodeAction("CodeMate: Edit Code", vscode.CodeActionKind.RefactorRewrite)
      action.command = {
         command: CommandNames.DIRECT_EDIT,
         title: "Edit Code",
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
      return action
   }

   private createOptimizeAction(
      document: vscode.TextDocument,
      range: vscode.Range,
      selectedText: string
   ): vscode.CodeAction {
      const action = new vscode.CodeAction("CodeMate: Optimize Code", vscode.CodeActionKind.RefactorRewrite)
      action.command = {
         command: CommandNames.DIRECT_OPTIMIZE,
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
      return action
   }

   private createDebugAction(
      document: vscode.TextDocument,
      range: vscode.Range,
      selectedText: string
   ): vscode.CodeAction {
      const action = new vscode.CodeAction("CodeMate: Debug Code", vscode.CodeActionKind.RefactorRewrite)
      action.command = {
         command: CommandNames.DIRECT_DEBUG,
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
      return action
   }

   private createTestAction(
      document: vscode.TextDocument,
      range: vscode.Range,
      selectedText: string
   ): vscode.CodeAction {
      const action = new vscode.CodeAction("CodeMate: Generate Tests", vscode.CodeActionKind.RefactorRewrite)
      action.command = {
         command: CommandNames.DIRECT_TEST,
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
      return action
   }

   private createReviewAction(
      document: vscode.TextDocument,
      range: vscode.Range,
      selectedText: string
   ): vscode.CodeAction {
      const action = new vscode.CodeAction("CodeMate: Review Code", vscode.CodeActionKind.RefactorRewrite)
      action.command = {
         command: CommandNames.DIRECT_REVIEW,
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
      return action
   }
}

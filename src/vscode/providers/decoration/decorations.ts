import * as vscode from "vscode"

const GHOST_TEXT_COLOR = new vscode.ThemeColor("editorGhostText.foreground")
const UNICODE_SPACE = "\u00a0"
const GHOST_TEXT = "Review with CodeMate"

const ghostTextDecorationType = vscode.window.createTextEditorDecorationType({
   isWholeLine: true,
   after: {
      contentText: UNICODE_SPACE.repeat(2) + GHOST_TEXT,
      color: GHOST_TEXT_COLOR,
      margin: "0 0 0 1em",
   },
})

export class DecorationsProvider {
   private _disposables: vscode.Disposable[] = []
   private _ghostTextDecorationType = ghostTextDecorationType

   constructor() {
      vscode.window.onDidChangeActiveTextEditor(this._onDidChangeActiveTextEditor, this, this._disposables)
      vscode.window.onDidChangeTextEditorSelection(
         this._onDidChangeTextEditorSelection,
         this,
         this._disposables
      )
      this._updateDecorations()
   }

   private _onDidChangeActiveTextEditor() {
      this._updateDecorations()
   }

   private _onDidChangeTextEditorSelection() {
      this._updateDecorations()
   }

   private _updateDecorations() {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
         return
      }

      const ghostTextDecoration = {
         range: new vscode.Range(editor.selection.active, editor.selection.active),
      }

      editor.setDecorations(this._ghostTextDecorationType, [ghostTextDecoration])
   }

   dispose() {
      this._disposables.forEach((d) => d.dispose())
   }
}

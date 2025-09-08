import { getDiagnosisResultsForEditor } from "@/vscode/utils/diagnosis"
import * as vscode from "vscode"

export async function get_editor_warnings(webviewView: vscode.WebviewView, data: any) {
   const workspace = vscode.workspace.workspaceFolders?.length
      ? vscode.workspace.workspaceFolders[0]
      : undefined
   if (!workspace) {
      vscode.window.showErrorMessage("No workspace folder open")
      return
   }

   const results = await getDiagnosisResultsForEditor(vscode.DiagnosticSeverity.Warning)
   webviewView.webview.postMessage({ type: "editorWarnings", value: results })
}

export async function get_editor_errors(webviewView: vscode.WebviewView, data: any) {
   const workspace = vscode.workspace.workspaceFolders?.length
      ? vscode.workspace.workspaceFolders[0]
      : undefined
   if (!workspace) {
      vscode.window.showErrorMessage("No workspace folder open")
      return
   }

   const results = await getDiagnosisResultsForEditor(vscode.DiagnosticSeverity.Error)
   webviewView.webview.postMessage({ type: "editorErrors", value: results })
}

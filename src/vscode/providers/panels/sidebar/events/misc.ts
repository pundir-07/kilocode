import { BinaryManager } from "@/vscode/utils/binary-manager"
import { killServerExe, runServerProcessIfNotRunning } from "@/vscode/utils/process-manager"
import * as vscode from "vscode"

export async function open_url(webviewView: vscode.WebviewView, data: string) {
   await vscode.env.openExternal(vscode.Uri.parse(data))
}

export async function ping(webviewView: vscode.WebviewView, data: any) {
   webviewView.webview.postMessage({ type: "pong", value: data })
}

export async function restart_server(webviewView: vscode.WebviewView, data: any) {
   await killServerExe()
   await runServerProcessIfNotRunning()
   webviewView.webview.postMessage({ type: "server_restarted", value: data })
}

export async function show_error_notification(webviewView: vscode.WebviewView, data: { message: string }) {
   vscode.window.showErrorMessage(data.message)
}

export async function show_warning_notification(webviewView: vscode.WebviewView, data: { message: string }) {
   vscode.window.showWarningMessage(data.message)
}

export async function show_success_notification(webviewView: vscode.WebviewView, data: { message: string }) {
   vscode.window.showInformationMessage(data.message)
}

export async function focus_or_open_file_in_editor(
   webviewView: vscode.WebviewView,
   data: { filePath: string }
) {
   const filePath = vscode.Uri.file(data.filePath)
   const document = await vscode.workspace.openTextDocument(filePath)
   const editor = await vscode.window.showTextDocument(document)
   if (editor) {
      editor.revealRange(new vscode.Range(0, 0, 0, 0))
   }
}

export async function ask_for_input(
   webviewView: vscode.WebviewView,
   data: {
      requestID: string
      title: string
      message: string
      placeHolder: string
      initialValue: string
      optional: boolean
      validateInput?: (input: string) => string | null | undefined
   }
) {
   const input = await vscode.window.showInputBox({
      prompt: data.message,
      placeHolder: data.placeHolder,
      value: data.initialValue,
      validateInput: data.validateInput,
      ignoreFocusOut: false,
      title: data.title,
   })

   webviewView.webview.postMessage({
      type: "ask_for_input_response",
      value: { requestID: data.requestID, input: input },
   })
}

export async function open_files_in_two_panes(
   webviewView: vscode.WebviewView,
   data: { filePaths: string[] }
) {
   const { filePaths } = data
   if (!filePaths || filePaths.length === 0) {
      console.error("No file paths provided to open_files_in_two_panes")
      return
   }

   // Open the first file in a new editor group (beside the current one)
   const firstDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePaths[0]))
   const firstEditor = await vscode.window.showTextDocument(firstDoc, {
      viewColumn: vscode.ViewColumn.Beside,
   })
   firstEditor.revealRange(new vscode.Range(0, 0, 0, 0))

   const targetColumn = firstEditor.viewColumn

   // Open remaining files in the same new group (as additional tabs)
   for (let i = 1; i < filePaths.length; i++) {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePaths[i]))
      await vscode.window.showTextDocument(doc, { viewColumn: targetColumn, preview: false })
   }
}

export async function get_subsystem_version(webviewView: vscode.WebviewView) {
   webviewView.webview.postMessage({
      type: "get_subsystem_version_response",
      value: { version: BinaryManager.getVersion() },
   })
}

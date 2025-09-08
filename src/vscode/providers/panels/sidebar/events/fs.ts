import * as vscode from "vscode"
import * as path from "path"

export async function get_current_file_path(webviewView: vscode.WebviewView, data: { id: string }) {
   const editor = vscode.window.activeTextEditor
   if (!editor) {
      webviewView.webview.postMessage({ type: "current_file_path", value: { id: data.id, filePath: null } })
      return
   }

   const filePath = editor.document.uri.fsPath
   const relativePath = vscode.workspace.asRelativePath(filePath)
   webviewView.webview.postMessage({
      type: "current_file_path",
      value: { id: data.id, filePath: { relative: relativePath, absolute: filePath } },
   })
}

export async function get_file_content(
   webviewView: vscode.WebviewView,
   data: { id: string; filePath: string }
) {
   const content = (await vscode.workspace.fs.readFile(vscode.Uri.file(data.filePath))).toString()
   webviewView.webview.postMessage({ type: "file_content", value: { id: data.id, content } })
}

export async function get_file_language(
   webviewView: vscode.WebviewView,
   data: { id: string; filePath: string }
) {
   const languageId = data.filePath.split(".").pop()
   webviewView.webview.postMessage({ type: "file_language", value: { id: data.id, language: languageId } })
}

export async function write_content_to_file(
   webviewView: vscode.WebviewView,
   data: { id: string; filePath: string; content: string }
) {
   await vscode.workspace.fs.writeFile(vscode.Uri.file(data.filePath), Buffer.from(data.content))
   webviewView.webview.postMessage({ type: "write_content_to_file", value: { id: data.id } })
}

export async function ensure_directory_exists(
   webviewView: vscode.WebviewView,
   data: { id: string; dirPath: string }
) {
   try {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(data.dirPath))
      webviewView.webview.postMessage({
         type: "ensure_directory_exists",
         value: { id: data.id, success: true },
      })
   } catch (error) {
      console.error(`Error creating directory ${data.dirPath}:`, error)
      webviewView.webview.postMessage({
         type: "ensure_directory_exists",
         value: { id: data.id, success: false, error: String(error) },
      })
   }
}

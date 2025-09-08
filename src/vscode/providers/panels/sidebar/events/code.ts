import * as vscode from "vscode"

export async function insert_code(webviewView: vscode.WebviewView, data: any) {
   const { code, id, filePath } = data

   // Get active editor
   let editor = vscode.window.activeTextEditor

   try {
      if (filePath) {
         const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
         if (!workspaceFolder) {
            throw new Error("No workspace folder open")
         }
         const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath)
         await vscode.workspace.fs.writeFile(fileUri, Buffer.from(code))
         const document = await vscode.workspace.openTextDocument(fileUri)
         editor = await vscode.window.showTextDocument(document)
      } else if (!editor) {
         // If no active editor, prompt for file name
         const fileName = await vscode.window.showInputBox({
            prompt: "Enter file name to save the code",
            placeHolder: "example.ts",
            validateInput: (value) => {
               if (!value) return "File name is required"
               if (value.includes(" ")) return "File name cannot contain spaces"
               return null
            },
         })

         if (!fileName) {
            webviewView.webview.postMessage({
               type: "insert_code_response",
               value: {
                  id: id,
                  error: "User cancelled file name input",
               },
            })
            return
         }

         // Get workspace folder
         const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
         if (!workspaceFolder) {
            throw new Error("No workspace folder open")
         }

         // Create file URI
         const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName)

         // Create the file with the code
         await vscode.workspace.fs.writeFile(fileUri, Buffer.from(code))
         // Open the newly created file
         const document = await vscode.workspace.openTextDocument(fileUri)
         editor = await vscode.window.showTextDocument(document)
      } else {
         // Insert code at current cursor position
         const selection = editor.selection
         await editor.edit((editBuilder) => {
            editBuilder.insert(selection.active, code)
         })
      }

      webviewView.webview.postMessage({
         type: "insert_code_response",
         value: {
            id: id,
            success: "Code inserted successfully",
         },
      })
   } catch (error) {
      webviewView.webview.postMessage({
         type: "insert_code_response",
         value: {
            id: id,
            error: `Failed to insert code: ${error}`,
         },
      })
   }
}
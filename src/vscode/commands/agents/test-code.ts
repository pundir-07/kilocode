import { API } from "@/common/api"
import { TESTCASE_FILE_EXTENSIONS } from "@/common/core/constants"
import { LocalServersState } from "@/vscode/core/state"
import * as vscode from "vscode"

interface CommandArgs {
   text: string
   documentUri: vscode.Uri
   range: vscode.Range
}

export function registerTestCodeCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, async (...args) => {
      const commandArgs = args[0] as CommandArgs

      if (!commandArgs?.text || !commandArgs?.documentUri || !commandArgs?.range) {
         console.error("Invalid arguments received:", commandArgs)
         vscode.window.showErrorMessage("Failed to process the code: Invalid arguments")
         return
      }

      const language = commandArgs.documentUri.fsPath.split(".").pop()

      try {
         const res = await API.BACKEND.post<{ understanding: string; code: string }>(
            "/testcases",
            {
               code: commandArgs.text,
               language: language,
               provider: "default",
               custom_instructions: "",
               file_name: commandArgs.documentUri.fsPath,
            },
            { headers: { "x-session": await LocalServersState.getSessionID() } }
         )
         if (res.status !== 200) throw new Error("Network error")

         const baseFilePath = commandArgs.documentUri.fsPath
         const extension = `.${baseFilePath.split(".").pop()}`
         const testcaseFilePath = `${baseFilePath.split(".")[0]}${TESTCASE_FILE_EXTENSIONS[extension as keyof typeof TESTCASE_FILE_EXTENSIONS]}`

         const finalCode = res.data.code.replace(/```(.*)\n/, "").replace(/```\n/, "")
         await vscode.workspace.fs.writeFile(vscode.Uri.file(testcaseFilePath), Buffer.from(finalCode))

         const document = await vscode.workspace.openTextDocument(vscode.Uri.file(testcaseFilePath))
         await vscode.window.showTextDocument(document)

         vscode.window.showInformationMessage("Test code generation complete!")
      } catch (error) {
         console.error("Error in test code command:", error)
         vscode.window.showErrorMessage("Failed to process the code")
      }
   })

   context.subscriptions.push(command)
}

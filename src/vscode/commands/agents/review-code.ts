import { API } from "@/common/api"
import { ReviewEvaluationType } from "@/common/types/review"
import { ensureDirectoryExistsVSCode, writeContentToFileVSCode } from "@webview/views/lib/events/fs-vscode"
import { LocalServersState } from "@/vscode/core/state"
import * as vscode from "vscode"

interface CommandArgs {
   text: string
   documentUri: vscode.Uri
   range: vscode.Range
}

async function storeFileEvaluations(
   filePath: string,
   evaluations: {
      understanding: string
      code_eval: string
      security_eval: string
   }
): Promise<{ paths: string[]; success: boolean }> {
   try {
      // Normalize path to use forward slashes
      const normalizedPath = filePath.replace(/\\/g, "/")

      // Get the directory and filename
      const lastSlashIndex = normalizedPath.lastIndexOf("/")
      const dirPath = lastSlashIndex > -1 ? normalizedPath.substring(0, lastSlashIndex) : ""
      const fileName = lastSlashIndex > -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath

      // Create the .codemate directory and subdirectories
      const codemateDirPath = dirPath ? `${dirPath}/.codemate` : ".codemate"

      // Create directories for each evaluation type
      const understandingDirPath = `${codemateDirPath}/${ReviewEvaluationType.UNDERSTANDING}`
      const codeEvalDirPath = `${codemateDirPath}/${ReviewEvaluationType.CODE_EVAL}`
      const securityEvalDirPath = `${codemateDirPath}/${ReviewEvaluationType.SECURITY_EVAL}`

      // Ensure all directories exist
      await ensureDirectoryExistsVSCode(codemateDirPath)
      await ensureDirectoryExistsVSCode(understandingDirPath)
      await ensureDirectoryExistsVSCode(codeEvalDirPath)
      await ensureDirectoryExistsVSCode(securityEvalDirPath)

      // Create file paths
      const understandingFilePath = `${understandingDirPath}/${fileName}.md`
      const codeEvalFilePath = `${codeEvalDirPath}/${fileName}.md`
      const securityEvalFilePath = `${securityEvalDirPath}/${fileName}.md`

      // Write content to files
      await writeContentToFileVSCode(understandingFilePath, evaluations.understanding)
      await writeContentToFileVSCode(codeEvalFilePath, evaluations.code_eval)
      await writeContentToFileVSCode(securityEvalFilePath, evaluations.security_eval)

      return {
         paths: [understandingFilePath, codeEvalFilePath, securityEvalFilePath],
         success: true,
      }
   } catch (error) {
      console.error(`Error storing evaluations for ${filePath}:`, error)
      return {
         paths: [],
         success: false,
      }
   }
}

export function registerReviewCodeCommand(context: vscode.ExtensionContext, commandName: string) {
   const command = vscode.commands.registerCommand(commandName, async (...args) => {
      const commandArgs = args[0] as CommandArgs

      if (!commandArgs?.text || !commandArgs?.documentUri || !commandArgs?.range) {
         console.error("Invalid arguments received:", commandArgs)
         vscode.window.showErrorMessage("Failed to process the code: Invalid arguments")
         return
      }

      try {
         const res = await API.BACKEND.post<{
            understanding: string
            code_eval: string
            security_eval: string
         }>(
            "/review",
            {
               code: commandArgs.text,
               provider: "default",
            },
            { headers: { "x-session": await LocalServersState.getSessionID() } }
         )

         if (res.status !== 200) throw new Error("Network error")

         // Store evaluations in .codemate directory
         const { paths, success } = await storeFileEvaluations(commandArgs.documentUri.fsPath, res.data)
         if (!success) {
            console.warn(`Failed to store evaluations for ${commandArgs.documentUri.fsPath}`)
            vscode.window.showErrorMessage("Failed to store evaluations")
            return
         }

         // Open all evaluation files
         for (const filePath of paths) {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath))
            await vscode.window.showTextDocument(document)
         }

         vscode.window.showInformationMessage("Code review complete!")
      } catch (error) {
         console.error("Error in review command:", error)
         vscode.window.showErrorMessage("Failed to process the code")
      }
   })

   context.subscriptions.push(command)
}

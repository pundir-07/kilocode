import { API } from "@/common/api"
import { CodeEvaluationStatus, SecurityReviewProblemStatus } from "@/common/types/code-evaluation"
import { writeContentToFileVSCode } from "@webview/views/lib/events/fs-vscode"
import { CachedState } from "@/vscode/core/state"
import { CodeApplyExecutor, CodeApplyReplacement } from "@/vscode/utils/code-apply-executor"
import { CodeEvaluationsHelpers } from "@/vscode/utils/code-evaluations"
import path from "path"
import * as vscode from "vscode"

export interface ApplySecurityProblemFixArgs {
   filePath: string
   problemID: string
}

/**
 * Registers the "APPLY_SECURITY_PROBLEM_FIX" command.
 *
 * The command expects a single argument – an object containing:
 *   { filePath: string (relative path), problemID: string }
 *
 * For now the implementation simply logs the payload. This keeps the
 * public API stable while we work on the actual fix-application logic.
 */
export default function registerApplySecurityProblemFixCommand(
   context: vscode.ExtensionContext,
   commandName: string
) {
   const command = vscode.commands.registerCommand(commandName, async (args: ApplySecurityProblemFixArgs) => {
      const workspacePath = CodeEvaluationsHelpers.getWorkspacePath()
      if (!workspacePath) return

      const { filePath, problemID } = args
      console.log("[APPLY_SECURITY_PROBLEM_FIX]", { filePath, problemID })

      const codeEvaluationsState = CachedState.getCodeEvaluationsState()
      const allWorkspaceEvaluations = codeEvaluationsState.runs[workspacePath]
      if (!allWorkspaceEvaluations) {
         console.error("No workspace evaluations found")
         return
      }

      const codeEvaluation = allWorkspaceEvaluations[filePath]
      if (!codeEvaluation) {
         console.error("Code evaluation not found")
         return
      }

      const securityEvalContent = codeEvaluation.content?.security?.content
      if (!securityEvalContent) {
         console.error("No content found")
         return
      }

      const problem = securityEvalContent.problems.find((p:any) => p.id === problemID)
      if (!problem) {
         console.error("Problem not found")
         return
      }

      const document = vscode.workspace.textDocuments.find((d) => {
         console.log(path.relative(workspacePath, d.uri.fsPath))
         return path.relative(workspacePath, d.uri.fsPath) === filePath
      })
      if (!document) {
         console.error("Document not found")
         return
      }

      problem.status = SecurityReviewProblemStatus.PENDING
      CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "security", {
         status: CodeEvaluationStatus.PENDING,
         content: securityEvalContent,
      })

      try {
         // Make API call to get fix suggestions
         const response = await API.BACKEND_LOCAL.post<{
            result: { fixes: { old_code: string; new_code: string }[] }
         }>("/auto-actions/fix-suggestions", {
            file_path: filePath,
            file_content: document.getText(),
            language: document.languageId,
            model: "gpt-4o-mini", // You might want to make this configurable
            title: problem.title,
            description: problem.description,
            target_code_block: problem.targetCodeBlock,
         })
         if (response.status !== 200) {
            throw new Error(`API call failed: ${response.statusText}`)
         }

         console.log("Fix suggestions response:", response.data)

         // Convert API response to CodeApplyReplacement format
         const replacements: CodeApplyReplacement[] = response.data.result.fixes.map((fix) => ({
            target: fix.old_code,
            replacement: fix.new_code,
         }))

         const updatedContent = CodeApplyExecutor.apply(document.getText(), replacements)
         await writeContentToFileVSCode(document.uri.fsPath, updatedContent)

         problem.status = SecurityReviewProblemStatus.FIXED
         CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "security", {
            status: CodeEvaluationStatus.COMPLETED,
            content: securityEvalContent,
         })
      } catch (error) {
         console.error("Error applying security problem fix:", error)

         problem.status = SecurityReviewProblemStatus.UNTOUCHED
         CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "security", {
            status: CodeEvaluationStatus.FAILED,
            content: securityEvalContent,
         })
      }
   })

   context.subscriptions.push(command)
}

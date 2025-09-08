import { CommandNames } from "@/vscode/commands"
import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export async function set_code_evaluations_state(webviewView: vscode.WebviewView, data: any) {
   try {
      CachedState.setCodeEvaluationsState(data)
   } catch (error) {
      console.error("Error updating code evaluations state:", error)
   }
}

export async function get_code_evaluations_state(webviewView: vscode.WebviewView) {
   try {
      const codeEvaluationsState = CachedState.getCodeEvaluationsState()
      webviewView.webview.postMessage({ type: "code_evaluations_state", value: codeEvaluationsState })
   } catch (error) {
      console.error("Error getting code evaluations state:", error)
   }
}

export async function apply_security_problem_fix(
   webviewView: vscode.WebviewView,
   data: { filePath: string; problemID: string }
) {
   try {
      await vscode.commands.executeCommand(CommandNames.APPLY_SECURITY_PROBLEM_FIX, {
         filePath: data.filePath,
         problemID: data.problemID,
      })
   } catch (error) {
      console.error("Error executing APPLY_SECURITY_PROBLEM_FIX command:", error)
   }
}

export async function highlight_code_snippet_in_file(
   webviewView: vscode.WebviewView,
   data: { filePath: string; codeSnippet: string }
) {
   try {
      await vscode.commands.executeCommand(CommandNames.HIGHLIGHT_CODE_SNIPPET_IN_FILE, {
         filePath: data.filePath,
         codeSnippet: data.codeSnippet,
      })
   } catch (error) {
      console.error("Error executing HIGHLIGHT_CODE_SNIPPET command:", error)
   }
}

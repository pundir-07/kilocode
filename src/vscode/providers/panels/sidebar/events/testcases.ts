import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export async function set_testcase_state(webviewView: vscode.WebviewView, data: any) {
   try {
      CachedState.setTestcaseState(data)
   } catch (error) {
      console.error("Error setting testcase state:", error)
   }
}

export async function get_testcase_state(webviewView: vscode.WebviewView) {
   try {
      const data = CachedState.getTestcaseState()
      webviewView.webview.postMessage({ type: "testcase_state", value: data })
   } catch (error) {
      console.error("Error getting testcase state:", error)
   }
}

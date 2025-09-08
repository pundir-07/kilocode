import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export async function set_review_state(webviewView: vscode.WebviewView, data: any) {
   try {
      CachedState.setReviewState(data)
   } catch (error) {
      console.error("Error setting review state:", error)
   }
}

export async function get_review_state(webviewView: vscode.WebviewView) {
   try {
      const data = CachedState.getReviewState()
      webviewView.webview.postMessage({ type: "review_state", value: data })
   } catch (error) {
      console.error("Error getting review state:", error)
   }
}

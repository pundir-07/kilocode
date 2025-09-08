import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export async function set_optimize_state(webviewView: vscode.WebviewView, data: any) {
   try {
      CachedState.setOptimizeState(data)
   } catch (error) {
      console.error("Error setting optimize state:", error)
   }
}

export async function get_optimize_state(webviewView: vscode.WebviewView) {
   try {
      const data = CachedState.getOptimizeState()
      webviewView.webview.postMessage({ type: "optimize_state", value: data })
   } catch (error) {
      console.error("Error getting optimize state:", error)
   }
}

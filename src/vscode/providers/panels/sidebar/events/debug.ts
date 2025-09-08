import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export async function set_debug_state(webviewView: vscode.WebviewView, data: any) {
   try {
      CachedState.setDebugState(data)
   } catch (error) {
      console.error("Error setting debug state:", error)
   }
}

export async function get_debug_state(webviewView: vscode.WebviewView) {
   try {
      const data = CachedState.getDebugState()
      webviewView.webview.postMessage({ type: "debug_state", value: data })
   } catch (error) {
      console.error("Error getting debug state:", error)
   }
}

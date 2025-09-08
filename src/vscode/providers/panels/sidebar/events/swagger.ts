import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export async function set_swagger_state(webviewView: vscode.WebviewView, data: any) {
   try {
      CachedState.setSwaggerState(data)
   } catch (error) {
      console.error("Error setting swagger state:", error)
   }
}

export async function get_swagger_state(webviewView: vscode.WebviewView) {
   try {
      const data = CachedState.getSwaggerState()
      webviewView.webview.postMessage({ type: "swagger_state", value: data })
   } catch (error) {
      console.error("Error getting swagger state:", error)
   }
}

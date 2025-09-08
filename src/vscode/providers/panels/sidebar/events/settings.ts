import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export async function update_settings(webviewView: vscode.WebviewView, data: any) {
   try {
      CachedState.setSettings(data)
      webviewView.webview.postMessage({
         type: "settings_updated",
         value: data,
      })
   } catch (error) {
      console.error("Error updating settings:", error)
      webviewView.webview.postMessage({
         type: "settings_update_failed",
         error: (error as Error).message,
      })
   }
}

export async function get_settings(webviewView: vscode.WebviewView) {
   try {
      const settings = CachedState.getSettings()
      webviewView.webview.postMessage({ type: "settings", value: settings })
   } catch (error) {
      console.error("Error getting settings:", error)
   }
}

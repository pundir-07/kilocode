import { CommandNames } from "@/vscode/commands"
import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export async function set_chat_state(webviewView: vscode.WebviewView, data: any) {
   try {
      // CachedState.setChatState(data)
   } catch (error) {
      console.error("Error setting chat state:", error)
   }
}

export async function get_chat_state(webviewView: vscode.WebviewView) {
   try {
      // const data = CachedState.getChatState()
      // webviewView.webview.postMessage({ type: "chat_state", value: data })
   } catch (error) {
      console.error("Error getting chat state:", error)
   }
}

export async function export_chat_history(webviewView: vscode.WebviewView, chatID: string) {
   try {
      await vscode.commands.executeCommand(CommandNames.EXPORT_CHAT_HISTORY, chatID)
   } catch (error) {
      console.error("Error exporting chat history:", error)
   }
}

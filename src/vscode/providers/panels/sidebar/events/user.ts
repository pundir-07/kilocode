import { EXTENSION_ID } from "@/common/core/constants"
import { CachedState, LocalServersState } from "@/vscode/core/state"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import * as vscode from "vscode"

export async function get_user(webviewView: vscode.WebviewView, data: any) {
   const user = CachedState.getUser()
   if (user?.personal?.avatar) {
      await cacheUserDP(user.personal.avatar)
   }
   webviewView.webview.postMessage({ type: "user", value: user })
}

export async function get_session(webviewView: vscode.WebviewView, data: any) {
   const session = await LocalServersState.getSessionID()
   webviewView.webview.postMessage({ type: "session", value: session })
}

export async function auth_login(webviewView: vscode.WebviewView, data: any) {
   await vscode.commands.executeCommand("codemate.login")
   await get_session(webviewView, data)
   await get_user(webviewView, data)
}

export async function auth_logout(webviewView: vscode.WebviewView, data: any) {
   await vscode.commands.executeCommand("codemate.logout")
   await get_session(webviewView, data)
   await get_user(webviewView, data)
}

async function cacheUserDP(avatarUrl: string): Promise<void> {
   return
   try {
      const response = await fetch(avatarUrl)
      if (!response.ok) throw new Error("Failed to fetch avatar")

      const buffer = await response.arrayBuffer()
      const fileName = "dp.png"
      const cachePath = path.join(
         vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri?.fsPath ?? os.homedir(),
         fileName
      )

      fs.writeFileSync(cachePath, Buffer.from(buffer))
   } catch (error) {
      console.error("Failed to cache user DP:", error)
   }
}

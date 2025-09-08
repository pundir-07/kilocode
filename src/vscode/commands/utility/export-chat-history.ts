import * as vscode from "vscode"

import { CachedState } from "@/vscode/core/state"

export default function registerExportChatHistoryCommand(
   context: vscode.ExtensionContext,
   commandName: string
) {
   const command = vscode.commands.registerCommand(commandName, async (targetChatID?: string) => {
      // const chatState = CachedState.getChatState()
      // if (!chatState) {
      //    vscode.window.showInformationMessage("No chat history found to export.")
      //    return
      // }

      // const currentChatID = targetChatID || chatState.currentChatID || Object.keys(chatState.chats)[0]
      // if (!currentChatID) {
      //    vscode.window.showInformationMessage("No active chat available to export.")
      //    return
      // }

      // const chat = chatState.chats[currentChatID]
      // if (!chat) {
      //    vscode.window.showWarningMessage("Selected chat not found.")
      //    return
      // }

      // const messages = (chat.messageIDs || []).map((id: string) => chatState.messages[id]).filter(Boolean)
      // if (!messages.length) {
      //    vscode.window.showInformationMessage("Current chat has no messages to export.")
      //    return
      // }

      // const extractText = (content: any): string => {
      //    if (typeof content === "string") return content as string

      //    try {
      //       const traverse = (node: any): string => {
      //          if (!node) return ""
      //          if (node.type === "mention") return node.attrs?.label || ""
      //          if (node.type === "text") return node.text || ""
      //          if (Array.isArray(node.content)) return node.content.map(traverse).join("")
      //          return ""
      //       }
      //       return (content?.content || []).map(traverse).join("")
      //    } catch {
      //       return ""
      //    }
      // }

      // const mdLines: string[] = []
      // messages.forEach((m: any) => {
      //    const sender = m.sender === "user" ? "You" : "Assistant"
      //    mdLines.push(`#### ${sender}\n\n${extractText(m.content)}`)
      // })

      // const markdown = mdLines.join("\n\n")

      // const uri = await vscode.window.showSaveDialog({
      //    filters: { Markdown: ["md"] },
      //    saveLabel: "Export",
      //    defaultUri: vscode.Uri.file(`chat-${currentChatID}.md`),
      // })
      // if (!uri) return

      // await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown, "utf8"))
      // vscode.window.showInformationMessage(`Chat history exported to ${uri.fsPath}`)
   })

   context.subscriptions.push(command)
}

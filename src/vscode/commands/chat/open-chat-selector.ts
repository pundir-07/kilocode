import * as vscode from "vscode"

import { CachedState } from "@/vscode/core/state"
import { SidebarProvider } from "@/vscode/providers/panels/sidebar"

/**
 * Register command that shows a Quick Pick with all existing chats so the user can quickly
 * switch between them.
 *
 * The flow is:
 *   1. Read cached chat state (chats + messages).
 *   2. Build a preview for each chat based on its first message.
 *   3. Show the list in a Quick Pick.
 *   4. When the user picks an item, reveal the sidebar and notify the web-view to
 *      switch to the chosen chat, then navigate to the "/chat" route.
 */
export default function registerOpenChatSelectorCommand(
   context: vscode.ExtensionContext,
   commandName: string
) {
   const command = vscode.commands.registerCommand(commandName, async () => {
      // Get cached chat state
      // const chatState = CachedState.getChatState() as any
      // let chats: any[] = Object.values(chatState?.chats || {})

      // // Only keep chats that actually contain at least one message
      // chats = chats.filter((c) => Array.isArray(c.messageIDs) && c.messageIDs.length > 0)

      // const messages: Record<string, any> = chatState?.messages || {}

      // if (!chats.length) {
      //    vscode.window.showInformationMessage("No chats with messages found.")
      //    return
      // }

      // // Helper — converts the editor content JSON back to plain text (same logic as HistorySidebar)
      // const prepareMessagePreview = (content: any): string => {
      //    if (!content) return ""
      //    try {
      //       const processNode = (node: any): string => {
      //          if (node.type === "mention") {
      //             return `@${node.attrs.label}`
      //          }
      //          if (node.type === "text") {
      //             return node.text || ""
      //          }
      //          if (node.content) {
      //             return node.content.map(processNode).join("")
      //          }
      //          return ""
      //       }
      //       return (content.content || []).map(processNode).join("").trim()
      //    } catch {
      //       return ""
      //    }
      // }

      // // Build quick-pick items (sorted by last updated)
      // const items: (vscode.QuickPickItem & { id: string })[] = chats
      //    .sort((a, b) => b.updatedAt - a.updatedAt)
      //    .map((chat) => {
      //       const firstMessageId: string | undefined = chat.messageIDs?.[0]
      //       const firstMessage = firstMessageId ? messages[firstMessageId] : undefined
      //       const preview = firstMessage ? prepareMessagePreview(firstMessage.content) : "No messages"

      //       const createdAt = new Date(chat.createdAt)
      //       const dateLabel = createdAt.toLocaleDateString(undefined, {
      //          month: "short",
      //          day: "numeric",
      //          year: createdAt.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      //       })

      //       return {
      //          id: chat.id,
      //          label: preview || "No messages",
      //          description: dateLabel,
      //          detail: chat.id,
      //       }
      //    })

      // const picked = await vscode.window.showQuickPick(items, {
      //    placeHolder: "Select a chat to open",
      //    matchOnDescription: true,
      //    matchOnDetail: false,
      // })

      // if (!picked) return

      // // Ensure the sidebar is visible first
      // try {
      //    await vscode.commands.executeCommand("codemate-sidebar.focus")
      // } catch {
      //    // Fallback – open the view container
      //    await vscode.commands.executeCommand("workbench.view.extension.codemate-sidebar-view")
      // }

      // // Tell the web-view to switch to the selected chat & route
      // SidebarProvider.postMessage({ type: "open_chat", value: picked.id })
      // SidebarProvider.postMessage({ type: "navigate", value: "/chat" })
   })

   context.subscriptions.push(command)
}

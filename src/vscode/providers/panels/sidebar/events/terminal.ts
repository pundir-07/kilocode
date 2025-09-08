import * as vscode from "vscode"

export async function get_terminals_list(webviewView: vscode.WebviewView) {
   const terminals = vscode.window.terminals
   const terminalsList = await Promise.all(
      terminals.map(async (t) => ({ name: t.name, pid: await t.processId }))
   )

   webviewView.webview.postMessage({
      type: "terminals_list",
      value: terminalsList,
   })
}

export async function get_terminal_data(webviewView: vscode.WebviewView, data: { terminalName?: string }) {
   let terminal: vscode.Terminal | undefined
   if (data.terminalName) {
      terminal = vscode.window.terminals.find((t) => t.name === data.terminalName)
   } else {
      terminal = vscode.window.activeTerminal
   }
   if (terminal) {
      // Focus the terminal first
      terminal.show(false)
      // Send copy command (Ctrl+A then Ctrl+C)
      await vscode.commands.executeCommand("workbench.action.terminal.selectAll")
      await vscode.commands.executeCommand("workbench.action.terminal.copySelection")

      // Read from clipboard
      const clipboardContent = await vscode.env.clipboard.readText()

      webviewView.webview.postMessage({
         type: "terminal_data",
         value: clipboardContent,
      })
   } else {
      webviewView.webview.postMessage({
         type: "terminal_data",
         value: data.terminalName ? `Terminal "${data.terminalName}" not found.` : "No active terminal",
      })
   }
}

export async function run_command(webviewView: vscode.WebviewView, data: { id: string; command: string }) {
   const terminal = vscode.window.activeTerminal || vscode.window.createTerminal()
   terminal.show(false)
   terminal.sendText(data.command)
   terminal.sendText("\n")

   // Send response back to webview
   webviewView.webview.postMessage({
      type: "run_command_response",
      id: data.id,
   })
}

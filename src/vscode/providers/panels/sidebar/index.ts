import * as vscode from "vscode"

import { Utils } from "@/common/core/utils"
import { Helpers } from "@/vscode/utils/helpers"

// Import all event handlers
import * as ChatEvents from "./events/chat"
import * as CodeEvents from "./events/code"
import * as CodeEvaluationsEvents from "./events/code-evaluations"
import * as DebugEvents from "./events/debug"
import * as DiagnosticsEvents from "./events/diagnostics"
import * as FileEvents from "./events/files"
import * as FsEvents from "./events/fs"
import * as GitEvents from "./events/git"
import * as KBEvents from "./events/kb"
import * as MiscEvents from "./events/misc"
import * as OptimizeEvents from "./events/optimize"
import * as ReviewEvents from "./events/review"
import * as SettingsEvents from "./events/settings"
import * as SwaggerEvents from "./events/swagger"
import * as TerminalEvents from "./events/terminal"
import * as TestcaseEvents from "./events/testcases"
import * as UserEvents from "./events/user"

export class SidebarProvider implements vscode.WebviewViewProvider {
   // Store the current visible webview view so that commands can send messages to it
   private static _currentView: vscode.WebviewView | null = null

   /**
    * Post a message to the sidebar webview if it is available.
    */
   public static postMessage(message: any) {
      if (SidebarProvider._currentView) {
         SidebarProvider._currentView.webview.postMessage(message)
      }
   }

   constructor(private readonly _extensionUri: vscode.Uri) {}

   public resolveWebviewView(webviewView: vscode.WebviewView) {
      // Keep a reference so that external commands (e.g. New Chat) can interact with the view
      SidebarProvider._currentView = webviewView

      const EVENT_HANDLERS: Record<string, (webviewView: vscode.WebviewView, data: any) => Promise<void>> = {
         // General
         update_settings: SettingsEvents.update_settings,
         get_settings: SettingsEvents.get_settings,

         // User Events
         get_user: UserEvents.get_user,
         get_session: UserEvents.get_session,
         auth_login: UserEvents.auth_login,
         auth_logout: UserEvents.auth_logout,

         // Git Events
         get_current_diff: GitEvents.get_current_diff,
         get_pr_diff: GitEvents.get_pr_diff,
         get_pr_list: GitEvents.get_pr_list,
         get_git_commits: GitEvents.get_git_commits,
         get_commit_diff: GitEvents.get_commit_diff,

         // File Events
         get_file_list: FileEvents.get_file_list,
         get_workspace_path: FileEvents.get_workspace_path,
         open_file: FileEvents.open_file,
         preview_image_file:FileEvents.preview_image_file,
         open_image_file:FileEvents.open_image_file,
         // Terminal Events
         get_terminals_list: TerminalEvents.get_terminals_list,
         get_terminal_data: TerminalEvents.get_terminal_data,
         run_command: TerminalEvents.run_command,

         // Diagnostics Events
         get_editor_warnings: DiagnosticsEvents.get_editor_warnings,
         get_editor_errors: DiagnosticsEvents.get_editor_errors,

         // Code Events
         insert_code: CodeEvents.insert_code,

         // Knowledge Base Events
         get_kb_files: KBEvents.get_kb_files,
         select_folder_for_kb: KBEvents.select_folder_for_kb,
         select_file_for_swagger: KBEvents.select_file_for_swagger,

         // Misc Events
         open_url: MiscEvents.open_url,
         ping: MiscEvents.ping,
         restart_server: MiscEvents.restart_server,
         show_error_notification: MiscEvents.show_error_notification,
         show_warning_notification: MiscEvents.show_warning_notification,
         show_success_notification: MiscEvents.show_success_notification,
         focus_or_open_file_in_editor: MiscEvents.focus_or_open_file_in_editor,
         ask_for_input: MiscEvents.ask_for_input,
         open_files_in_two_panes: MiscEvents.open_files_in_two_panes,
         get_subsystem_version: MiscEvents.get_subsystem_version,

         // File System Events
         get_current_file_path: FsEvents.get_current_file_path,
         get_file_content: FsEvents.get_file_content,
         write_content_to_file: FsEvents.write_content_to_file,
         get_file_language: FsEvents.get_file_language,
         ensure_directory_exists: FsEvents.ensure_directory_exists,

         // Chat Events
         set_chat_state: ChatEvents.set_chat_state,
         get_chat_state: ChatEvents.get_chat_state,
         export_chat_history: ChatEvents.export_chat_history,

         // Debug Events
         set_debug_state: DebugEvents.set_debug_state,
         get_debug_state: DebugEvents.get_debug_state,

         // Testcase Events
         set_testcase_state: TestcaseEvents.set_testcase_state,
         get_testcase_state: TestcaseEvents.get_testcase_state,

         // Swagger Events
         set_swagger_state: SwaggerEvents.set_swagger_state,
         get_swagger_state: SwaggerEvents.get_swagger_state,

         // Review Events
         set_review_state: ReviewEvents.set_review_state,
         get_review_state: ReviewEvents.get_review_state,

         // Optimize Events
         set_optimize_state: OptimizeEvents.set_optimize_state,
         get_optimize_state: OptimizeEvents.get_optimize_state,

         // Knowledge Base Events
         set_knowledgebase_state: KBEvents.set_knowledgebase_state,
         get_knowledgebase_state: KBEvents.get_knowledgebase_state,

         // Code Evaluations Events
         set_code_evaluations_state: CodeEvaluationsEvents.set_code_evaluations_state,
         get_code_evaluations_state: CodeEvaluationsEvents.get_code_evaluations_state,
         apply_security_problem_fix: CodeEvaluationsEvents.apply_security_problem_fix,
         highlight_code_snippet_in_file: CodeEvaluationsEvents.highlight_code_snippet_in_file,
      }

      webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] }
      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)
      webviewView.webview.onDidReceiveMessage(async (data) => {
         if (!EVENT_HANDLERS[data.type]) {
            // vscode.window.showErrorMessage(`No handler found for event: ${data.type}`)
            return
         }
         await EVENT_HANDLERS[data.type](webviewView, data.value)
      })
   }

   private _getHtmlForWebview(webview: vscode.Webview) {
      // Use a nonce to only allow a specific script to be run.
      const nonce = Utils.getRandomID()

      const scriptUri = webview.asWebviewUri(Helpers.makeBuiltAssetURI("scripts/bundle.js"))
      const styleScriptUri = webview.asWebviewUri(Helpers.makeAssetURI("scripts/tailwind.js"))
      const styleGlobalUri = webview.asWebviewUri(Helpers.makeAssetURI("css/global.css"))
      const interFontUri = webview.asWebviewUri(Helpers.makeAssetURI("fonts/inter/inter_variable.ttf"))
      const jetbrainsMonoFontUri = webview.asWebviewUri(
         Helpers.makeAssetURI("fonts/jetbrains_mono/jetbrains_mono_variable.ttf")
      )

      const genericUserDPUri =
         "data:image/png;base64,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"
      const genericAssistantDPUri =
         "data:image/png;base64,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"

      return `
<!DOCTYPE html>
<html lang="en">
   <head>
      <meta charset="UTF-8">

      <!-- Tailwind CSS -->
      <script src="${styleScriptUri}"></script>

      <!-- Content Security Policy -->
      <meta http-equiv="Content-Security-Policy" content="img-src https: http: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">

      <!-- Global CSS -->
      <link href="${styleGlobalUri}" rel="stylesheet">

      <!-- JetBrains Mono Font -->
      <style>
         @font-face {
            font-family: "JetBrains Mono";
            src: url("${jetbrainsMonoFontUri}") format("truetype");
         }
      </style>

      <!-- Inter Font -->
      <style>
         @font-face {
            font-family: "Inter";
            src: url("${interFontUri}") format("truetype");
         }
      </style>

      <!-- VSCode API -->
      <script nonce="${nonce}">
         var tsvscode = acquireVsCodeApi();
      </script>

      <!-- Google Analytics -->
      <script nonce="${nonce}"
         async
         src="https://www.googletagmanager.com/gtag/js?id=G-VLQ9PPJYLM" >
      </script>
      <script nonce="${nonce}">
         window.dataLayer = window.dataLayer || [];
         function gtag(){dataLayer.push(arguments);}
         gtag('js', new Date());
         gtag('config', 'G-VLQ9PPJYLM')

         window.genericUserDP = "${genericUserDPUri}"
         window.genericAssistantDP = "${genericAssistantDPUri}"
      </script>
   </head>
   <body>
      <div id="app"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
   </body>
</html>
`
   }
}

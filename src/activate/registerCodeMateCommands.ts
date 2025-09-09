import { CommandNames } from "@/vscode/commands"
import * as vscode from "vscode"
import registerNewChatCommand from "@/vscode/commands/chat/new-chat"
import registerNewChatWithMessageCommand from "@/vscode/commands/chat/new-chat-with-message"
import registerOpenChatSelectorCommand from "@/vscode/commands/chat/open-chat-selector"
import { registerCodeLensKeyboardShortcuts } from "@/vscode/commands/codelens/codelens-action"
import { registerCodeLensCommand } from "@/vscode/commands/codelens/codelens-command"
import { registerSuggestionCommands } from "@/vscode/commands/codelens/suggestion-commands"
import registerDisposeCommand from "@/vscode/commands/inline/dispose"
import registerApplySecurityProblemFixCommand from "@/vscode/commands/utility/apply-security-problem-fix"
import registerLoginCommand from "@/vscode/commands/utility/auth-login"
import registerLogoutCommand from "@/vscode/commands/utility/auth-logout"
import registerClearCacheCommand from "@/vscode/commands/utility/clear-cache"
import registerDisableCodeLensCommand from "@/vscode/commands/utility/disable-code-lens"
import registerDisableInlineSuggestionsCommand from "@/vscode/commands/utility/disable-inline-suggestions"
import registerEnableCodeLensCommand from "@/vscode/commands/utility/enable-code-lens"
import registerEnableInlineSuggestionsCommand from "@/vscode/commands/utility/enable-inline-suggestions"
import registerExportChatHistoryCommand from "@/vscode/commands/utility/export-chat-history"
import registerOpenSidebarRouteCommand from "@/vscode/commands/utility/open-sidebar-route"
import registerOpenWebAppCommand from "@/vscode/commands/utility/open-web-app"
import registerRestartServerCommand from "@/vscode/commands/utility/restart-server"

// Utils
import { registerDebugCodeCommand } from "@/vscode/commands/agents/debug-code"
import { registerDirectActionCommand } from "@/vscode/commands/agents/direct-action"
import { registerOptimizeCodeCommand } from "@/vscode/commands/agents/optimize-code"
import { registerReviewCodeCommand } from "@/vscode/commands/agents/review-code"
import { registerShowAgentMenuCommand } from "@/vscode/commands/agents/show-agent-menu"
import { registerTestCodeCommand } from "@/vscode/commands/agents/test-code"
import { registerOpenSecurityEvaluationCommand } from "@/vscode/commands/utility/open-security-evaluation"
import { CodemateAuthProvider } from "@/vscode/providers/auth"
import { registerCodeEvaluations } from "@/vscode/utils/code-evaluations"
import { LineByLineAnimator } from "@/vscode/utils/line-animation"
import { runServerProcessIfNotRunning } from "@/vscode/utils/process-manager"
import registerHighlightSnippetInFileCommand from "@/vscode/commands/utility/highlight-snippet-in-file"
import { SuggestionCodeLensProvider } from "@/vscode/providers/codelens"

export function registerAllCodeMateCommands(
   context: vscode.ExtensionContext,
   suggestionCodeLensProvider: SuggestionCodeLensProvider
) {
   // Authentication
   registerLoginCommand(context, CommandNames.LOGIN)
   registerLogoutCommand(context, CommandNames.LOGOUT)

//    registerDisposeCommand(context, CommandNames.DISPOSE)
   registerOpenWebAppCommand(context, CommandNames.OPEN_WEB_APP)
   registerClearCacheCommand(context, CommandNames.CLEAR_CACHE)
//    registerRestartServerCommand(context, CommandNames.RESTART_SERVER) //! causing failure extension activation- no extension.js in dist

   // Inline Suggestions Toggle Commands (separate command files)
   registerEnableInlineSuggestionsCommand(context, CommandNames.ENABLE_INLINE_SUGGESTIONS)
   registerDisableInlineSuggestionsCommand(context, CommandNames.DISABLE_INLINE_SUGGESTIONS)

   // CodeLens Toggle Commands
   registerEnableCodeLensCommand(context, CommandNames.ENABLE_CODE_LENS)
   registerDisableCodeLensCommand(context, CommandNames.DISABLE_CODE_LENS)

   // Register agent commands
   registerTestCodeCommand(context, CommandNames.TEST_CODE)
   registerReviewCodeCommand(context, CommandNames.REVIEW_CODE)
   registerDebugCodeCommand(context, CommandNames.DEBUG_CODE)
   registerOptimizeCodeCommand(context, CommandNames.OPTIMIZE_CODE)

   // Register chat commands
//    registerNewChatCommand(context, CommandNames.NEW_CHAT) // ! causing failure extension activation- no extension.js in dist
//    registerNewChatWithMessageCommand(context, CommandNames.NEW_CHAT_WITH_MESSAGE) // ! causing failure extension activation- no extension.js in dist
   registerOpenChatSelectorCommand(context, CommandNames.OPEN_CHAT_SELECTOR)

   // Register direct action commands (no symbol detection)
   registerDirectActionCommand(context, CommandNames.DIRECT_EDIT, "edit")
   registerDirectActionCommand(context, CommandNames.DIRECT_OPTIMIZE, "optimize")
   registerDirectActionCommand(context, CommandNames.DIRECT_DEBUG, "debug")
   registerDirectActionCommand(context, CommandNames.DIRECT_TEST, "test")
   registerDirectActionCommand(context, CommandNames.DIRECT_REVIEW, "review")

   // Register security evaluation command
//    registerOpenSecurityEvaluationCommand(context, CommandNames.OPEN_SECURITY_EVALUATION) // ! causing failure extension activation- no extension.js in dist

   // Security problem fix command
//    registerApplySecurityProblemFixCommand(context, CommandNames.APPLY_SECURITY_PROBLEM_FIX)// ! causing failure extension activation- no extension.js in dist

   // Highlight snippet in file command
   registerHighlightSnippetInFileCommand(context, CommandNames.HIGHLIGHT_CODE_SNIPPET_IN_FILE)

   // Register keyboard shortcuts for code lens suggestions
   registerCodeLensKeyboardShortcuts(context, suggestionCodeLensProvider)

   // Register suggestion commands for accept/reject functionality
   registerSuggestionCommands(context, suggestionCodeLensProvider)

   // Register the main codelens command
   registerCodeLensCommand(context, suggestionCodeLensProvider)

   // -------------------------------------------------------------------
   // Sidebar navigation commands
   // -------------------------------------------------------------------

//    registerOpenSidebarRouteCommand(context, CommandNames.OPEN_SETTINGS, "/settings") // ! causing failure extension activation- no extension.js in dist
//    registerOpenSidebarRouteCommand(context, CommandNames.OPEN_KNOWLEDGEBASES, "/knowledgebases")// ! causing failure extension activation- no extension.js in dist
//    registerOpenSidebarRouteCommand(context, CommandNames.OPEN_HISTORY, "/history")// ! causing failure extension activation- no extension.js in dist
//    registerOpenSidebarRouteCommand(context, CommandNames.OPEN_AGENTS, "/agents")// ! causing failure extension activation- no extension.js in dist

   // Register animation commands
   context.subscriptions.push(
      vscode.commands.registerCommand(CommandNames.ANIMATE_SELECTION, async () => {
         await LineByLineAnimator.animateActiveSelection({
            animationSpeed: 100,
            onComplete: () => {
               vscode.window.showInformationMessage("Animation completed!")
            },
         })
      }),

      vscode.commands.registerCommand(CommandNames.CLEAR_ANIMATIONS, () => {
         LineByLineAnimator.clearAllAnimations()
         vscode.window.showInformationMessage("All animations cleared!")
      })
   )

   // Chat utilities
   registerExportChatHistoryCommand(context, CommandNames.EXPORT_CHAT_HISTORY)
}
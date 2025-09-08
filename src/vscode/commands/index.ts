export enum CommandNames {
   // Authentication
   LOGIN = "codemate.login",
   LOGOUT = "codemate.logout",

   // System Commands
   GET_TERMINAL_INFO = "extension.getTerminalInfo",
   DISPOSE = "codemate.dispose",
   ENABLE_CODE_LENS = "codemate.enableCodeLens",
   DISABLE_CODE_LENS = "codemate.disableCodeLens",
   ENABLE_INLINE_SUGGESTIONS = "codemate.enableInlineSuggestions",
   DISABLE_INLINE_SUGGESTIONS = "codemate.disableInlineSuggestions",
   OPEN_WEB_APP = "codemate.open_web_app",
   CLEAR_CACHE = "codemate.clear_cache",
   RESTART_SERVER = "codemate.restartServer",

   // Code Actions & CodeLens
   SHOW_AGENT_MENU = "codemate.showAgentMenu",
   CODELENS_ACTION = "codemate.codelensAction",
   TEST_CODE = "codemate.testCode",
   DEBUG_CODE = "codemate.debugCode",
   REVIEW_CODE = "codemate.reviewCode",
   OPTIMIZE_CODE = "codemate.optimizeCode",

   // Direct Code Actions (no symbol detection)
   DIRECT_EDIT = "codemate.directEdit",
   DIRECT_OPTIMIZE = "codemate.directOptimize",
   DIRECT_DEBUG = "codemate.directDebug",
   DIRECT_TEST = "codemate.directTest",
   DIRECT_REVIEW = "codemate.directReview",

   // Animation Commands
   ANIMATE_SELECTION = "codemate.animateSelection",
   CLEAR_ANIMATIONS = "codemate.clearAnimations",

   // Chat
   EXPORT_CHAT_HISTORY = "codemate.exportChatHistory",

   // Chat commands
   NEW_CHAT = "codemate.newChat",
   NEW_CHAT_WITH_MESSAGE = "codemate.newChatWithMessage",
   OPEN_CHAT_SELECTOR = "codemate.openChatSelector",

   // Navigation / Sidebar commands
   OPEN_SETTINGS = "codemate.openSettings",
   OPEN_KNOWLEDGEBASES = "codemate.openKnowledgebases",
   OPEN_HISTORY = "codemate.openHistory",
   OPEN_AGENTS = "codemate.openAgents",

   // Security
   APPLY_SECURITY_PROBLEM_FIX = "codemate.applySecurityProblemFix",
   OPEN_SECURITY_EVALUATION = "codemate.openSecurityEvaluation",

   // Utility Commands
   HIGHLIGHT_CODE_SNIPPET_IN_FILE = "codemate.highlightCodeSnippetInFile",
}

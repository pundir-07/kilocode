import { ChatModel_t } from "@/common/types/model"

// ----------------------------------------------------------------------------------------------------------

export enum ExtensionFlavour {
   GENERIC = "generic",
   ENTERPRISE = "enterprise",
}

// ----------------------------------------------------------------------------------------------------------

export const FLAVOUR: ExtensionFlavour = ExtensionFlavour.GENERIC

export const IS_DEBUG = false //process.env.NODE_ENV === "development"
export const AUTOSTART_CLIENT_SERVER = !IS_DEBUG || false // make it true to start even in debug mode
export const CACHE_VERSION = 1.5
export const EXTENSION_VERSION = "3.1.0"
export const CLIENT_SERVER_VERSIONS_URL = "https://inferx.in/codemate/subsystem/versions.json"

// ----------------------------------------------------------------------------------------------------------

export const IGNORE_SERVER_ABSENCE = IS_DEBUG
export const MAKE_EMBEDDINGS_ON_START = true

// ----------------------------------------------------------------------------------------------------------

export const WS_SERVER_URL = "ws://127.0.0.1:45214"

// ----------------------------------------------------------------------------------------------------------

export const PRODUCT_NAME = "CodeMate"
export const EXTENSION_ID = "AyushSinghal.Code-Mate"
export const AUTH_TIMEOUT_IN_MS = 5 * 60 * 1000 // 5 minutes
export const NEW_CHAT_ID_PREFIX = "<NEW_CHAT_"

// ----------------------------------------------------------------------------------------------------------

export const DEFAULT_CHAT_MODEL: ChatModel_t = {
   id: "default",
   display_name: "Auto",
   icon: "",
   description: "Use the default cloud model",
   disabled: false,
   type: "cloud",
}

// ----------------------------------------------------------------------------------------------------------

export const LINKS = {
   TUTORIALS: "https://www.codemate.ai",
   DOCUMENTATION: "https://www.codemate.ai",
   SUPPORT: "https://app.codemate.ai/contact",
   PRODUCTS: "https://www.codemate.ai",
   MANAGE_ACCOUNT: "https://app.codemate.ai/settings",
   UPGRADE: "https://app.codemate.ai/pricing",
   TERMS_OF_SERVICE: "https://docs.codemate.ai/faqs/terms-of-service",
   PRIVACY_POLICY: "https://docs.codemate.ai/faqs/privacy-policy",
} as const

// ----------------------------------------------------------------------------------------------------------

export const LANGUAGES_SUPPORTED_BY_VSCODE = {
   ".ts": "typescript",
   ".md": "markdown",
   ".json": "json",
   ".yaml": "yaml",
   ".yml": "yaml",
   ".toml": "toml",
   ".xml": "xml",
   ".html": "html",
   ".css": "css",
   ".js": "javascript",
   ".jsx": "javascript",
   ".tsx": "typescript",
   ".py": "python",
   ".java": "java",
   ".c": "c",
   ".cpp": "cpp",
   ".cs": "csharp",
   ".php": "php",
   ".rb": "ruby",
   ".swift": "swift",
   ".kt": "kotlin",
   ".go": "go",
   ".rust": "rust",
   ".sql": "sql",
   ".bash": "bash",
   ".sh": "sh",
   ".zsh": "zsh",
   ".fish": "fish",
   ".powershell": "powershell",
   ".ps1": "powershell",
}

export const TESTCASE_FILE_EXTENSIONS = {
   ".py": "_testcase.py",
   ".js": ".test.js",
   ".ts": ".test.ts",
   ".java": "Test.java",
   ".kt": "Test.kt",
   ".scala": "Spec.scala",
   ".go": "_test.go",
   ".cpp": "_test.cpp",
   ".c": "_test.c",
   ".h": "_test.h",
   ".cs": ".Tests.cs",
   ".rs": "_test.rs",
   ".swift": "Tests.swift",
   ".php": "Test.php",
   ".rb": "_spec.rb",
   ".sh": ".test.sh",
   ".lua": "_spec.lua",
   ".r": "_test.R",
   ".dart": "_test.dart",
   ".m": "Tests.m",
   ".mm": "Tests.mm",
   ".fs": ".Tests.fs",
   ".fsx": ".Tests.fsx",
   ".ex": "_test.exs",
   ".elm": "_test.elm",
   ".clj": "_test.clj",
   ".cljs": "_test.cljs",
   ".hs": "_test.hs",
   ".erl": "_test.erl",
   ".ml": "_test.ml",
   ".mli": "_test.mli",
   ".zig": "_test.zig",
   ".nim": "_test.nim",
   ".cr": "_test.cr",
   ".vb": ".Tests.vb",
   ".groovy": "Spec.groovy",
   ".json": ".test.json",
   ".yml": ".test.yml",
   ".toml": ".test.toml",
   ".yaml": ".test.yaml",
   ".md": ".test.md",
   ".coffee": ".test.coffee",
   ".pl": "_test.pl",
   ".pm": "_test.pm",
   ".tcl": "_test.tcl",
   ".f90": "_test.f90",
   ".for": "_test.for",
   ".lisp": "_test.lisp",
   ".scm": "_test.scm",
   ".rkt": "_test.rkt",
   ".adb": "_test.adb",
   ".ads": "_test.ads",
   ".vhdl": "_test.vhdl",
   ".verilog": "_test.v",
   ".tla": "_test.tla",
   ".lean": "_test.lean",
   ".purs": "_test.purs",
   ".idr": "_test.idr",
   ".agda": "_test.agda",
   ".cob": "_test.cob",
   ".asm": "_test.asm",
   ".ps1": ".test.ps1",
   ".bat": ".test.bat",
   ".cmd": ".test.cmd",
   ".sql": "_test.sql",
}

export const LANGUAGE_EXTENSIONS = {
   typescript: ".ts",
   javascript: ".js",
   python: ".py",
   java: ".java",
   csharp: ".cs",
   cpp: ".cpp",
   c: ".c",
   swift: ".swift",
   kotlin: ".kt",
   go: ".go",
   rust: ".rs",
   sql: ".sql",
   bash: ".sh",
   powershell: ".ps1",
   markdown: ".md",
   json: ".json",
   yaml: ".yaml",
   toml: ".toml",
   xml: ".xml",
   html: ".html",
   css: ".css",
   php: ".php",
   ruby: ".rb",
   scala: ".scala",
   elm: ".elm",
   clojure: ".clj",
   clojurescript: ".cljs",
   haskell: ".hs",
   erlang: ".erl",
   ml: ".ml",
   mli: ".mli",
   zig: ".zig",
   nim: ".nim",
   crystal: ".cr",
   vb: ".vb",
   groovy: ".groovy",
   coffee: ".coffee",
   pl: ".pl",
   pm: ".pm",
   tcl: ".tcl",
   f90: ".f90",
   for: ".for",
   lisp: ".lisp",
   scm: ".scm",
   rkt: ".rkt",
   adb: ".adb",
   ads: ".ads",
   vhdl: ".vhdl",
}

// ----------------------------------------------------------------------------------------------------------

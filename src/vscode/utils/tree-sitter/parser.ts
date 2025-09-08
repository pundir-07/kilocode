import { Parser ,Language} from "web-tree-sitter"
import * as vscode from "vscode"
import * as path from "path"
import { EXTENSION_ID } from "@/common/core/constants"

// VS Code language identifiers -> Tree-sitter file names (from `tree-sitter-wasms`)
const supportedLanguages = new Map<string, string>([
   ["typescript", "typescript"],
   ["typescriptreact", "tsx"],
   ["javascript", "javascript"],
   ["javascriptreact", "tsx"],
   ["python", "python"],
   ["java", "java"],
   ["cpp", "cpp"],
   ["c", "c"],
   ["csharp", "c_sharp"],
   ["go", "go"],
   ["rust", "rust"],
   ["php", "php"],
   ["ruby", "ruby"],
   ["lua", "lua"],
   ["html", "html"],
   ["css", "css"],
   ["json", "json"],
   ["yaml", "yaml"],
   ["toml", "toml"],
   ["bash", "bash"],
   ["vue", "vue"],
   ["swift", "swift"],
   ["kotlin", "kotlin"],
   ["scala", "scala"],
   ["ocaml", "ocaml"],
   ["elixir", "elixir"],
   ["elm", "elm"],
   ["solidity", "solidity"],
   ["zig", "zig"],
   ["tlaplus", "tlaplus"],
   ["objective-c", "objc"],
])

let isInitialized = false

/**
 * Initialize web-tree-sitter if not already initialized
 */
async function initializeParser(): Promise<void> {
   if (!isInitialized) {
      await Parser.init()
      isInitialized = true
   }
}

/**
 * Get a Tree-sitter parser for the specified language
 * @param language - VS Code language identifier
 * @returns Promise<Parser> - Configured Tree-sitter parser instance
 * @throws Error if language is unsupported or parser cannot be created
 */
export async function getTreeSitterForLanguage(language: string): Promise<Parser> {
   // Initialize the parser library if not already done
   await initializeParser()

   // Check if the language is supported
   const treeSitterLanguageName = supportedLanguages.get(language)
   if (!treeSitterLanguageName) {
      throw new Error(`Unsupported language: ${language}. Supported languages: ${Array.from(supportedLanguages.keys()).join(", ")}`)
   }

   // Get the extension path
   const extension = vscode.extensions.getExtension(EXTENSION_ID)
   if (!extension) {
      throw new Error(`Could not find extension with ID: ${EXTENSION_ID}`)
   }

   const extensionPath = extension.extensionPath
   if (!extensionPath) {
      throw new Error("Extension path is undefined")
   }

   // Construct the WASM file path using the mapped tree-sitter language name
   const wasmPath = path.join(extensionPath, "dist", "treesitters", `tree-sitter-${treeSitterLanguageName}.wasm`)

   try {
      // Load the language WASM module
      const languageModule = await Language.load(wasmPath)

      // Create and configure the parser
      const parser = new Parser()
      parser.setLanguage(languageModule)

      return parser
   } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to load Tree-sitter parser for ${language}: ${errorMessage}. WASM path: ${wasmPath}`)
   }
}

/**
 * Check if a language is supported by Tree-sitter
 * @param language - VS Code language identifier
 * @returns boolean - True if language is supported
 */
export function isLanguageSupported(language: string): boolean {
   return supportedLanguages.has(language)
}

/**
 * Get all supported language identifiers
 * @returns string[] - Array of supported VS Code language identifiers
 */
export function getSupportedLanguages(): string[] {
   return Array.from(supportedLanguages.keys())
}

/**
 * Get the Tree-sitter language name for a VS Code language identifier
 * @param language - VS Code language identifier
 * @returns string | undefined - Tree-sitter language name or undefined if not supported
 */
export function getTreeSitterLanguageName(language: string): string | undefined {
   return supportedLanguages.get(language)
}
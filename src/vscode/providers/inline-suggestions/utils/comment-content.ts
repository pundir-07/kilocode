/**
 * Utility to convert content to language-specific comments
 */

type CommentFunction = (content: string) => string

/**
 * Convert content to language-specific commented form
 *
 * @param content - The content to be commented
 * @param language - The programming language
 * @returns The content formatted as comments for the specific language
 */
export function contentToLanguageComment(content: string, language: string): string {
   // Define comment patterns for different languages
   const commentPatterns: Record<string, CommentFunction> = {
      // Single-line comment languages
      python: (text: string) => addSingleLineComments(text, "#"),
      ruby: (text: string) => addSingleLineComments(text, "#"),
      shell: (text: string) => addSingleLineComments(text, "#"),
      bash: (text: string) => addSingleLineComments(text, "#"),
      zsh: (text: string) => addSingleLineComments(text, "#"),
      perl: (text: string) => addSingleLineComments(text, "#"),
      r: (text: string) => addSingleLineComments(text, "#"),
      yaml: (text: string) => addSingleLineComments(text, "#"),
      toml: (text: string) => addSingleLineComments(text, "#"),
      dockerfile: (text: string) => addSingleLineComments(text, "#"),
      // Double slash comment languages
      javascript: (text: string) => addSingleLineComments(text, "//"),
      typescript: (text: string) => addSingleLineComments(text, "//"),
      java: (text: string) => addSingleLineComments(text, "//"),
      c: (text: string) => addSingleLineComments(text, "//"),
      cpp: (text: string) => addSingleLineComments(text, "//"),
      "c++": (text: string) => addSingleLineComments(text, "//"),
      csharp: (text: string) => addSingleLineComments(text, "//"),
      "c#": (text: string) => addSingleLineComments(text, "//"),
      go: (text: string) => addSingleLineComments(text, "//"),
      rust: (text: string) => addSingleLineComments(text, "//"),
      kotlin: (text: string) => addSingleLineComments(text, "//"),
      scala: (text: string) => addSingleLineComments(text, "//"),
      swift: (text: string) => addSingleLineComments(text, "//"),
      dart: (text: string) => addSingleLineComments(text, "//"),
      php: (text: string) => addSingleLineComments(text, "//"),
      // Semicolon comment languages
      lisp: (text: string) => addSingleLineComments(text, ";"),
      scheme: (text: string) => addSingleLineComments(text, ";"),
      clojure: (text: string) => addSingleLineComments(text, ";"),
      // Percent comment languages
      matlab: (text: string) => addSingleLineComments(text, "%"),
      erlang: (text: string) => addSingleLineComments(text, "%"),
      // Double dash comment languages
      sql: (text: string) => addSingleLineComments(text, "--"),
      haskell: (text: string) => addSingleLineComments(text, "--"),
      lua: (text: string) => addSingleLineComments(text, "--"),
      // Special cases with different comment styles
      html: (text: string) => addHtmlComments(text),
      xml: (text: string) => addHtmlComments(text),
      css: (text: string) => addCssComments(text),
      vim: (text: string) => addSingleLineComments(text, '"'),
      // Block comment languages (fallback to single line for simplicity)
      pascal: (text: string) => addSingleLineComments(text, "//"),
      delphi: (text: string) => addSingleLineComments(text, "//"),
   }

   // Normalize language name
   const normalizedLanguage = language.toLowerCase().trim()

   // Get the appropriate comment function
   const commentFunc = commentPatterns[normalizedLanguage]

   if (commentFunc) {
      return commentFunc(content)
   } else {
      // Default fallback - use // for unknown languages
      return addSingleLineComments(content, "//")
   }
}

/**
 * Add single-line comments to each line of content
 */
function addSingleLineComments(content: string, commentPrefix: string): string {
   if (!content.trim()) {
      return content
   }

   const lines = content.split("\n")
   const commentedLines: string[] = []

   for (const line of lines) {
      if (line.trim()) {
         // Non-empty line
         commentedLines.push(`${commentPrefix} ${line}`)
      } else {
         // Empty line
         commentedLines.push(commentPrefix)
      }
   }

   return commentedLines.join("\n")
}

/**
 * Add HTML/XML style comments
 */
function addHtmlComments(content: string): string {
   if (!content.trim()) {
      return content
   }

   const lines = content.split("\n")
   const commentedLines: string[] = []

   for (const line of lines) {
      if (line.trim()) {
         // Non-empty line
         commentedLines.push(`<!-- ${line} -->`)
      } else {
         // Empty line
         commentedLines.push("<!--  -->")
      }
   }

   return commentedLines.join("\n")
}

/**
 * Add CSS style comments
 */
function addCssComments(content: string): string {
   if (!content.trim()) {
      return content
   }

   const lines = content.split("\n")
   const commentedLines: string[] = []

   for (const line of lines) {
      if (line.trim()) {
         // Non-empty line
         commentedLines.push(`/* ${line} */`)
      } else {
         // Empty line
         commentedLines.push("/*  */")
      }
   }

   return commentedLines.join("\n")
}

/**
 * Language aliases for common variations
 */
const LANGUAGE_ALIASES: Record<string, string> = {
   js: "javascript",
   ts: "typescript",
   py: "python",
   rb: "ruby",
   cs: "csharp",
   fs: "fsharp",
   vb: "vbnet",
   sh: "shell",
   ps1: "powershell",
   md: "markdown",
   yml: "yaml",
   json: "javascript", // JSON doesn't have comments, but treat like JS
}

/**
 * Normalize language name, handling common aliases
 *
 * @param language - The language name or alias
 * @returns Normalized language name
 */
export function getNormalizedLanguage(language: string): string {
   const normalized = language.toLowerCase().trim()
   return LANGUAGE_ALIASES[normalized] || normalized
}

import Parser from "web-tree-sitter"
import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import { ReferencedSymbol } from "./types"

type ImportMap = Record<string, ReferencedSymbol>

// Map of language IDs to their possible index files
const LANGUAGE_INDEX_FILES = new Map([
   // JavaScript/TypeScript family
   ["javascript", ["index.js", "index.jsx"]],
   ["typescript", ["index.ts", "index.tsx"]],
   ["javascriptreact", ["index.jsx", "index.js"]],
   ["typescriptreact", ["index.tsx", "index.ts"]],
   // Python
   ["python", ["__init__.py"]],
   // Ruby
   ["ruby", ["index.rb"]],
   // PHP
   ["php", ["index.php"]],
   // Java
   ["java", ["package-info.java"]],
   // Go
   ["go", ["doc.go"]],
])

/**
 * Resolves a module path to an actual file path
 * Handles directory imports that should resolve to index files
 */
async function resolveModulePath(
   sourceModule: string,
   documentUri: vscode.Uri | undefined,
   documentLanguage: string | undefined
): Promise<string> {
   const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
   let resolvedPath: string

   // Try to use VSCode's findFiles API first for more accurate path resolution
   if (sourceModule.startsWith(".") && documentUri) {
      // For relative imports, resolve relative to the document
      const documentDir = path.dirname(documentUri.fsPath)
      resolvedPath = path.resolve(documentDir, sourceModule)
   } else if (sourceModule.startsWith("/") && workspaceFolder) {
      // For absolute imports, resolve from workspace root
      resolvedPath = path.resolve(workspaceFolder, sourceModule.substring(1))
   } else {
      // For node modules or other non-relative imports
      resolvedPath = sourceModule
   }

   // Check if the resolved path exists and is a directory
   try {
      const stats = await fs.promises.stat(resolvedPath).catch(() => null)

      if (stats?.isDirectory() && documentLanguage) {
         // If it's a directory, look for index files based on the language
         const possibleIndexFiles = LANGUAGE_INDEX_FILES.get(documentLanguage) || []

         for (const indexFile of possibleIndexFiles) {
            const indexPath = path.join(resolvedPath, indexFile)
            try {
               const indexStats = await fs.promises.stat(indexPath).catch(() => null)
               if (indexStats?.isFile()) {
                  return indexPath
               }
            } catch (error) {
               // Continue to the next possible index file
            }
         }
      }
   } catch (error) {
      // File or directory doesn't exist, return the best resolution we have
   }

   return resolvedPath
}

export async function getImportedSymbolsFromTree(
   tree: Parser.Tree,
   documentUri?: vscode.Uri,
   documentLanguage?: string
): Promise<ImportMap> {
   const importMap: ImportMap = {}
   const rootNode = tree.rootNode
   const nodes = rootNode.descendantsOfType("import_statement")

   for (const node of nodes) {
      if(!node)
         continue
      // Get the source module path (it's the last child node)
      const sourceNode = node.children[node.children.length - 1]
      if (!sourceNode) continue
      const sourceModule = sourceNode.text.replace(/["']/g, "") // Remove quotes

      // Get the import text without the source
      const importText = node.text.replace(sourceNode.text, "").trim()

      // Resolve the source module path
      const resolvedPath = await resolveModulePath(
         sourceModule,
         documentUri,
         documentLanguage || documentUri?.fsPath.split(".").pop()
      )

      // Create a ReferencedSymbol for the source module
      const sourceSymbol: ReferencedSymbol = {
         name: sourceModule,
         uri: vscode.Uri.file(resolvedPath),
         range: new vscode.Range(
            sourceNode.startPosition.row,
            sourceNode.startPosition.column,
            sourceNode.endPosition.row,
            sourceNode.endPosition.column
         ),
         text: "",
         kind: vscode.SymbolKind.Module,
      }

      // Handle different import patterns
      if (importText.startsWith("import * as")) {
         // Handle namespace import: import * as name from "module"
         const alias = importText.match(/import \* as (\w+)/)?.[1]
         if (alias) {
            sourceSymbol.name = alias
         }
      } else if (importText.includes("{")) {
         // Handle named imports: import { a, b } from "module"
         const matches = importText.match(/import\s*{([^}]+)}/)
         if (matches) {
            const symbols = matches[1].split(",").map((s) => s.trim())
            for (const symbol of symbols) {
               // Handle "original as alias" format
               const [originalName, alias] = symbol.split(/\s+as\s+/).map((s) => s.trim())
               const symbolName = alias || originalName

               // Create a new symbol object for each imported item
               const namedSymbol: ReferencedSymbol = {
                  ...sourceSymbol,
                  name: symbolName,
               }

               importMap[symbolName] = namedSymbol
            }
         }
      } else {
         // Handle default import: import name from "module"
         const matches = importText.match(/import\s+(\w+)/)
         if (matches) {
            const name = matches[1]
            sourceSymbol.name = name
         }
      }
      importMap[sourceSymbol.name] = sourceSymbol
   }

   return importMap
}

import * as vscode from "vscode"
import Parser from "web-tree-sitter"

import { getImportedSymbolsFromTree } from "./imports"
import { ReferencedSymbol } from "./types"
import {
   EXPRESSIONS,
   IDENTIFIERS,
   findNodeFromVSCodeRange,
   findRecognizedParentNode,
   getFullNodeBody,
   getNodeName,
   getNodesFromTreeByName,
   getVSCodeRangeForNode,
   textToTreeSitterTree,
} from "./utils"

async function recursivelyGetReferencedSymbolsFromNode(
   targetNode: Parser.Node,
   source: { document: vscode.TextDocument; tree: Parser.Tree },
   depth: number = 0
): Promise<ReferencedSymbol[]> {
   if (depth >= 2) return []

   const importMap = await getImportedSymbolsFromTree(
      source.tree,
      source.document.uri,
      source.document.languageId
   )

   const referencedSymbols: Map<string, ReferencedSymbol> = new Map()

   const queue: Parser.Node[] = [targetNode]
   while (queue.length > 0) {
      const node = queue.shift()
      if (!node) continue

      // Get the symbol name and
      const symbolName = getNodeName(node)
      const targetSymbolName = getNodeName(targetNode)

      // Search in imports
      // 1. Check if it's an import, if so, add it to the referenced symbols
      const referencedImport = importMap[symbolName]
      if (referencedImport) {
         let fileContent = ""
         try {
            const document = await vscode.workspace.openTextDocument(referencedImport.uri)
            fileContent = document.getText()
         } catch (error) {
            continue
         }

         const tree = await textToTreeSitterTree(fileContent, source.document.languageId)
         const nodes = getNodesFromTreeByName(referencedImport.name, tree).filter(
            (node) => !EXPRESSIONS.includes(node.type)
         )

         let finalContent = nodes.map((node) => getFullNodeBody(node)).join("\n")
         referencedSymbols.set(symbolName, { ...referencedImport, text: finalContent })
      }

      // 2. Check if it's a valid identifier, if so, get it from the same file
      if (
         IDENTIFIERS.includes(node.type) && // must be a valid identifier
         symbolName && // means something unrecognized
         symbolName !== targetSymbolName && // means it's the target node itself
         !referencedSymbols.has(symbolName) // means already resolved/visited
      ) {
         const sameFileNodes = getNodesFromTreeByName(symbolName, source.tree)
         for (const sameFileNode of sameFileNodes) {
            const name = getNodeName(sameFileNode)
            const body = getFullNodeBody(sameFileNode)
            const range = getVSCodeRangeForNode(sameFileNode)

            if (!name || !body) continue

            referencedSymbols.set(symbolName, {
               name: symbolName,
               text: body,
               uri: source.document.uri,
               range: range,
            })
         }
      }

      //  Move the queue forward
      // queue.push(...node.children)
      queue.push(...node.children.filter((c): c is Parser.Node => !!c));

   }

   // Filter out symbols whose files are not resolvable (i.e. they might be library imports)
   for (const [key, value] of referencedSymbols.entries()) {
      try {
         await vscode.workspace.openTextDocument(value.uri)
      } catch (error) {
         referencedSymbols.delete(key)
      }
   }

   // Filter out symbols that have no text
   for (const [key, value] of referencedSymbols.entries()) {
      if (value.text) continue
      referencedSymbols.delete(key)
   }

   return Array.from(referencedSymbols.values())
}

export async function getReferencedSymbolsFromRange(
   document: vscode.TextDocument,
   range: vscode.Range
): Promise<ReferencedSymbol[]> {
   const tree = await textToTreeSitterTree(document.getText(), document.languageId)
   const targetNode = findNodeFromVSCodeRange(range, tree)
   if (!targetNode) return []

   const referencedSymbols = await recursivelyGetReferencedSymbolsFromNode(
      //
      targetNode,
      { document: document, tree: tree }
   )

   const refSymbolsMap = new Map<string, ReferencedSymbol>()
   for (const symbol of referencedSymbols) refSymbolsMap.set(symbol.name, symbol)

   return referencedSymbols
}

export async function getSymbolsInFile(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
   const symbols =
      (await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
         "vscode.executeDocumentSymbolProvider",
         document.uri
      )) || []

   return symbols.filter(
      (symbol) =>
         symbol.kind === vscode.SymbolKind.Function ||
         symbol.kind === vscode.SymbolKind.Class ||
         symbol.kind === vscode.SymbolKind.Method ||
         symbol.kind === vscode.SymbolKind.Property ||
         symbol.kind === vscode.SymbolKind.Field ||
         symbol.kind === vscode.SymbolKind.Enum ||
         symbol.kind === vscode.SymbolKind.Interface ||
         symbol.kind === vscode.SymbolKind.Namespace ||
         symbol.kind === vscode.SymbolKind.Constructor ||
         symbol.kind === vscode.SymbolKind.Variable ||
         symbol.kind === vscode.SymbolKind.Constant ||
         symbol.kind === vscode.SymbolKind.Event ||
         symbol.kind === vscode.SymbolKind.TypeParameter
   )
}

export async function getParentNodeBody(
   document: vscode.TextDocument,
   position: vscode.Position
): Promise<string | undefined> {
   const tree = await textToTreeSitterTree(document.getText(), document.languageId)
   const targetNode = tree.rootNode.descendantForPosition({ row: position.line, column: position.character })
   if (!targetNode) return undefined

   const parentNode = findRecognizedParentNode(targetNode)
   if (!parentNode) return undefined

   return getFullNodeBody(parentNode)
}

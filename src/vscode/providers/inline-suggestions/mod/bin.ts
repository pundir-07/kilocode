import { nanoid } from "nanoid"

class InlineSuggestionsTreeNode {
   id: string
   char: string
   children: InlineSuggestionsTreeNode[]
   isEndOfSuggestion: boolean

   constructor(char: string) {
      this.id = nanoid()
      this.char = char
      this.children = []
      this.isEndOfSuggestion = false
   }

   findChild(char: string): InlineSuggestionsTreeNode | undefined {
      return this.children.find((child) => child.char === char)
   }

   addChildIfAbsent(char: string): InlineSuggestionsTreeNode {
      const existing = this.findChild(char)
      if (existing) return existing
      const newNode = new InlineSuggestionsTreeNode(char)
      this.children.push(newNode)
      return newNode
   }
}

export class InlineSuggestionsBin {
   // file path -> number -> root of suggestion tree
   private roots = new Map<string, Map<number, InlineSuggestionsTreeNode>>()

   private getOrCreateRoot(filePath: string, line: number): InlineSuggestionsTreeNode {
      if (!this.roots.has(filePath)) {
         this.roots.set(filePath, new Map<number, InlineSuggestionsTreeNode>())
      }

      const fileRoots = this.roots.get(filePath)!
      if (!fileRoots.has(line)) {
         fileRoots.set(line, new InlineSuggestionsTreeNode(""))
      }
      return fileRoots.get(line)!
   }

   /**
    * Adds a suggestion (character-by-character) under a specific line number.
    */
   addSuggestion(filePath: string, line: number, target: string, suggestion: string): void {
      if (!suggestion) return

      let currentNode = this.getOrCreateRoot(filePath, line)
      for (const char of target + suggestion) {
         currentNode = currentNode.addChildIfAbsent(char)
      }
      currentNode.isEndOfSuggestion = true
   }

   /**
    * Returns the node at the end of the input prefix if it exists.
    * Then returns all child completions from that point.
    */
   getSuggestions(filePath: string, line: number, prefix: string): string[] {
      const root = this.roots.get(filePath)?.get(line)
      if (!root || !prefix) return []

      let currentNode = root
      for (const char of prefix) {
         const next = currentNode.findChild(char)
         if (!next) return []
         currentNode = next
      }

      return this.collectSuggestions(currentNode, prefix).map((s) => s.slice(prefix.length))
   }

   private collectSuggestions(
      node: InlineSuggestionsTreeNode,
      currentPath: string,
      results: string[] = []
   ): string[] {
      if (node.isEndOfSuggestion) {
         results.push(currentPath)
      }

      for (const child of node.children) {
         this.collectSuggestions(child, currentPath + child.char, results)
      }

      return results
   }

   private estimateNodeSize(node: InlineSuggestionsTreeNode): number {
      // Rough estimate: id (uuid, 36 bytes), char (2 bytes per char), children (array ref), boolean (1 byte)
      let size = 36 + node.char.length * 2 + 8 + 1
      for (const child of node.children) {
         size += this.estimateNodeSize(child)
      }
      return size
   }

   get size(): number {
      let total = 0
      for (const fileRoots of this.roots.values()) {
         for (const root of fileRoots.values()) {
            total += this.estimateNodeSize(root)
         }

         // Add overhead for the Map itself
         total += fileRoots.size * 64 // Rough estimate: 64 bytes per Map entry
      }

      // Add overhead for the main Map
      // Assuming each entry in the main Map is around 40 bytes (key + value reference)
      // This is a rough estimate and can vary based on the actual implementation
      // but should be sufficient for our purposes.
      total += this.roots.size * 40
      return total
   }
}

export const inlineSuggestionsBin = new InlineSuggestionsBin()

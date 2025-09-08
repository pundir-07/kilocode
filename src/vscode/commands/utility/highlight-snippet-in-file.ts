import * as vscode from "vscode"

import path from "path"

// Function to find the best matching substring in the document
function findBestMatch(documentText: string, codeSnippet: string): { index: number; length: number } | null {
   const snippetLines = codeSnippet
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
   const documentLines = documentText.split("\n").map((line) => line.trim())

   let bestMatch = { index: -1, length: 0, score: 0 }

   // Try to find consecutive matching lines
   for (let docIndex = 0; docIndex < documentLines.length; docIndex++) {
      for (let snippetStart = 0; snippetStart < snippetLines.length; snippetStart++) {
         let matchingLines = 0
         let currentDocIndex = docIndex
         let currentSnippetIndex = snippetStart

         // Count consecutive matching lines
         while (
            currentDocIndex < documentLines.length &&
            currentSnippetIndex < snippetLines.length &&
            documentLines[currentDocIndex].includes(
               snippetLines[currentSnippetIndex].substring(
                  0,
                  Math.min(20, snippetLines[currentSnippetIndex].length)
               )
            )
         ) {
            matchingLines++
            currentDocIndex++
            currentSnippetIndex++
         }

         // Calculate score based on matching lines and position
         const score = matchingLines + (snippetStart === 0 ? 0.5 : 0) // Bonus for starting from beginning

         if (score > bestMatch.score && matchingLines >= 1) {
            // Calculate actual character positions
            const startLineIndex = docIndex
            const endLineIndex = Math.min(docIndex + matchingLines - 1, documentLines.length - 1)

            // Find character positions in original document
            let charIndex = 0
            let lineCount = 0
            for (let i = 0; i < documentText.length; i++) {
               if (lineCount === startLineIndex) {
                  charIndex = i
                  break
               }
               if (documentText[i] === "\n") {
                  lineCount++
               }
            }

            // Find end position
            let endCharIndex = charIndex
            let currentLine = startLineIndex
            for (let i = charIndex; i < documentText.length && currentLine <= endLineIndex; i++) {
               endCharIndex = i
               if (documentText[i] === "\n") {
                  currentLine++
               }
            }

            bestMatch = {
               index: charIndex,
               length: endCharIndex - charIndex,
               score: score,
            }
         }
      }
   }

   return bestMatch.index !== -1 ? { index: bestMatch.index, length: bestMatch.length } : null
}

export default function registerHighlightSnippetInFileCommand(
   context: vscode.ExtensionContext,
   commandName: string
) {
   const command = vscode.commands.registerCommand(
      commandName,
      async (args: { filePath: string; codeSnippet: string }) => {
         const targetFile = vscode.Uri.file(args.filePath)
         if (!targetFile) {
            vscode.window.showErrorMessage("File path is not valid.")
            return
         }

         const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
         if (!workspacePath) {
            vscode.window.showErrorMessage("File is not part of any workspace.")
            return
         }

         const fullPath = path.resolve(workspacePath, args.filePath)
         const document = await vscode.workspace.openTextDocument(fullPath)
         const editor = await vscode.window.showTextDocument(document)

         // Find and highlight the code snippet with fuzzy matching
         const documentText = document.getText()

         // First try exact match
         let snippetIndex = documentText.indexOf(args.codeSnippet)
         let matchLength = args.codeSnippet.length

         if (snippetIndex === -1) {
            // Try fuzzy matching - find best partial match
            const result = findBestMatch(documentText, args.codeSnippet)
            if (result) {
               snippetIndex = result.index
               matchLength = result.length
            }
         }

         if (snippetIndex !== -1) {
            // Calculate start and end positions
            const startPosition = document.positionAt(snippetIndex)
            const endPosition = document.positionAt(snippetIndex + matchLength)

            // Create selection range
            const range = new vscode.Range(startPosition, endPosition)

            // Set selection and reveal the range
            editor.selection = new vscode.Selection(range.start, range.end)
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport)
         } else {
            vscode.window.showWarningMessage("Code snippet not found in the file.")
         }

         console.log(args)
      }
   )

   context.subscriptions.push(command)
}

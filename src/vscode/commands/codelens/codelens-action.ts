import * as fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"

import { API } from "@/common/api"
import { LANGUAGE_EXTENSIONS, TESTCASE_FILE_EXTENSIONS } from "@/common/core/constants"
import { storeFileEvaluationsVSCode } from "@webview/views/lib/utils/review-vscode"
import { CachedState, LocalServersState } from "@/vscode/core/state"
import { SuggestionCodeLensProvider } from "@/vscode/providers/codelens/suggestion-codelens-provider"
import { CodeApplyExecutor } from "@/vscode/utils/code-apply-executor"
import { getDiagnosisResultsForEditor } from "@/vscode/utils/diagnosis"
import { LineByLineAnimator } from "@/vscode/utils/line-animation"
import { getReferencedSymbolsFromRange, getSymbolsInFile } from "@/vscode/utils/tree-sitter"

type ScopeOption = "symbol" | "selection" | "file"
type ActionType = "optimize" | "debug" | "test" | "review" | "edit" | "docs"

export async function handleCodeLensAction(
   document: vscode.TextDocument,
   position: vscode.Position,
   provider: SuggestionCodeLensProvider
) {
   // First, determine the trigger symbol at the cursor position
   const triggerSymbol = await getSymbolAtPosition(document, position)

   if (!triggerSymbol) {
      vscode.window.showErrorMessage("No symbol found at cursor position")
      return
   }

   // Ask user to select scope
   const scopeOptions: (vscode.QuickPickItem & { scope: ScopeOption })[] = [
      {
         label: "$(symbol-method) Current Symbol",
         description: triggerSymbol.name,
         scope: "symbol" as ScopeOption,
      },
      {
         label: "$(file) Entire File",
         description: "Process all symbols in the file",
         scope: "file" as ScopeOption,
      },
   ]

   // Only add selection option if there's an active selection
   if (!vscode.window.activeTextEditor?.selection.isEmpty) {
      scopeOptions.splice(1, 0, {
         label: "$(edit) Current Selection",
         description: "Process the selected text",
         scope: "selection" as ScopeOption,
      })
   }

   const scopeSelection = await vscode.window.showQuickPick<vscode.QuickPickItem & { scope: ScopeOption }>(
      scopeOptions,
      {
         placeHolder: "Select the scope for this action",
      }
   )

   if (!scopeSelection) return // User cancelled

   // If user selected 'selection' but there's no active selection, show error
   if (scopeSelection.scope === "selection" && (vscode.window.activeTextEditor?.selection.isEmpty ?? true)) {
      vscode.window.showErrorMessage("No text selected. Please select some text first.")
      return
   }

   // Ask user to select action
   const actionSelection = await vscode.window.showQuickPick<vscode.QuickPickItem & { action: ActionType }>(
      [
         {
            label: "$(edit) Edit",
            description: "Edit the code with custom instructions",
            action: "edit",
         },
         {
            label: "$(sparkle) Optimize",
            description: "Improve code quality, performance, and readability",
            action: "optimize",
         },
         {
            label: "$(bug) Debug",
            description: "Find and fix issues in the code",
            action: "debug",
         },
         // {
         //    label: "$(beaker) Test",
         //    description: "Test the code",
         //    action: "test",
         // },
         {
            label: "$(eye) Review",
            description: "Review the code",
            action: "review",
         },
         // {
         //    label: "$(book) Generate Docs",
         //    description: "Generate documentation for the code",
         //    action: "docs",
         // },
      ],
      {
         placeHolder: "Select the action to perform",
      }
   )

   if (!actionSelection) return // User cancelled

   // If edit action is selected, prompt for instructions
   let editInstructions: string | undefined
   if (actionSelection.action === "edit") {
      editInstructions = await vscode.window.showInputBox({
         prompt: "Enter your editing instructions",
         placeHolder: "e.g. Add error handling, Convert to async/await, etc.",
         ignoreFocusOut: true,
         validateInput: (value) => {
            return value.trim().length > 0 ? null : "Instructions cannot be empty"
         },
      })

      if (!editInstructions) return // User cancelled instruction input
   }

   // Process based on scope and action
   switch (scopeSelection.scope) {
      case "symbol":
         await processSymbols([triggerSymbol], actionSelection.action, document, provider, editInstructions)
         break

      case "selection":
         if (vscode.window.activeTextEditor) {
            const selectionRange = new vscode.Range(
               vscode.window.activeTextEditor.selection.start,
               vscode.window.activeTextEditor.selection.end
            )
            await processTextRange(
               selectionRange,
               actionSelection.action,
               document,
               provider,
               editInstructions
            )
         }
         break

      case "file":
         const symbols = await getSymbolsInFile(document)
         if (symbols.length === 0) {
            vscode.window.showInformationMessage("No processable symbols found in file")
            return
         }
         await processSymbols(symbols, actionSelection.action, document, provider, editInstructions)
         break
   }
}

async function getSymbolAtPosition(document: vscode.TextDocument, position: vscode.Position) {
   const symbols =
      (await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
         "vscode.executeDocumentSymbolProvider",
         document.uri
      )) || []

   // Flatten the symbol hierarchy to find the innermost matching symbol
   function flattenSymbols(
      symbols: vscode.DocumentSymbol[],
      parent?: vscode.DocumentSymbol
   ): vscode.DocumentSymbol[] {
      let result: vscode.DocumentSymbol[] = []
      for (const symbol of symbols) {
         result.push(symbol)
         if (symbol.children.length > 0) {
            result = result.concat(flattenSymbols(symbol.children, symbol))
         }
      }
      return result
   }

   const allSymbols = flattenSymbols(symbols)

   // Find the innermost symbol containing the position
   return allSymbols
      .filter((s) => s.range.contains(position))
      .sort((a, b) => a.range.start.line - b.range.end.line - (b.range.start.line - b.range.end.line))[0]
}

async function processSymbols(
   symbols: vscode.DocumentSymbol[],
   action: ActionType,
   document: vscode.TextDocument,
   provider: SuggestionCodeLensProvider,
   editInstructions?: string
) {
   // Show progress indicator
   await vscode.window.withProgress(
      {
         location: vscode.ProgressLocation.Notification,
         title: `Processing ${symbols.length} symbol(s)...`,
         cancellable: true,
      },
      async (progress, token) => {
         const increment = 100 / symbols.length

         // Process each symbol
         for (let i = 0; i < symbols.length; i++) {
            if (token.isCancellationRequested) break

            const symbol = symbols[i]
            progress.report({
               increment,
               message: `${i + 1}/${symbols.length}: ${symbol.name}`,
            })

            const isLastSymbol = i === symbols.length - 1
            await processTextRange(symbol.range, action, document, provider, editInstructions, isLastSymbol)
         }

         // After processing all symbols, clear any lingering line animations
         LineByLineAnimator.clearAllAnimations()
      }
   )

   // If there are multiple symbols, add Accept All/Reject All buttons at top of file
   if (symbols.length > 1) {
      await vscode.commands.executeCommand("setContext", "codemate.hasMultipleSymbolsProcessed", true)
   }
}

async function handleOptimize(
   text: string,
   range: vscode.Range,
   document: vscode.TextDocument,
   codeLensProvider: SuggestionCodeLensProvider
) {
   const targetCode = document.getText(range)
   const response = await API.BACKEND_DEV.post<{ data: { data: string } }>(
      "/inline/optimize",
      {
         target_code: targetCode,
         context_code: text,
      },
      { headers: { "x-session": await LocalServersState.getSessionID() } }
   )

   if (response.status !== 200) {
      throw new Error("Failed to optimize code")
   }

   const updatedCode = response.data.data.data
   codeLensProvider.addSuggestion(document.uri.toString(), range, updatedCode, targetCode)
}

async function handleDebug(
   text: string,
   range: vscode.Range,
   document: vscode.TextDocument,
   codeLensProvider: SuggestionCodeLensProvider
) {
   const errors = await getDiagnosisResultsForEditor(vscode.DiagnosticSeverity.Error)
   const warnings = await getDiagnosisResultsForEditor(vscode.DiagnosticSeverity.Warning)

   const targetCode = document.getText(range)
   const response = await API.BACKEND_DEV.post<{ data: { data: string } }>(
      "/inline/debug",
      {
         target_code: targetCode,
         context_code: text,
         errors: errors,
         warnings: warnings,
      },
      { headers: { "x-session": await LocalServersState.getSessionID() } }
   )

   if (response.status !== 200) {
      throw new Error("Failed to debug code")
   }

   const updatedCode = response.data.data.data
   codeLensProvider.addSuggestion(document.uri.toString(), range, updatedCode, targetCode)
}

async function handleTest(text: string, range: vscode.Range, document: vscode.TextDocument) {
   const framework =
      (
         await vscode.window.showInputBox({
            prompt: "Enter the framework to use for testing",
            value: "",
            placeHolder: "e.g. pytest, unittest, etc.",
            ignoreFocusOut: true,
            title: "Select Testing Framework",
         })
      )?.trim() ?? ""

   const customInput =
      (await vscode.window.showInputBox({
         prompt: "Enter any additional instructions for the test framework",
         value: "",
         placeHolder: "e.g. user object oriented testing, use mock objects, etc.",
         ignoreFocusOut: true,
         title: "Custom Framework (optional)",
      })) ?? ""

   const targetCode = document.getText(range)
   const response = await API.BACKEND_DEV.post<{ data: { data: string } }>(
      "/inline/test",
      {
         target_code: targetCode,
         context_code: text,
         file_name: document.uri.fsPath.split("/").pop(),
         framework: framework,
         instructions: customInput,
      },
      { headers: { "x-session": await LocalServersState.getSessionID() } }
   )

   if (response.status !== 200) {
      throw new Error("Failed to generate test")
   }

   // Get the test file extension for the current language
   const fileExt = LANGUAGE_EXTENSIONS[document.languageId as keyof typeof LANGUAGE_EXTENSIONS]
   const testExtension = TESTCASE_FILE_EXTENSIONS[fileExt as keyof typeof TESTCASE_FILE_EXTENSIONS]
   if (!testExtension) {
      throw new Error(`No test file extension defined for language ${document.languageId}`)
   }

   // Create the test file path by replacing the extension
   const testcaseFilePath = document.uri.fsPath.replace(/\.[^.]+$/, testExtension)

   // Remove code block markers if present
   let testCode = response.data.data.data
   testCode = testCode.replace(/^```[^\n]*\n/, "").replace(/\n```$/, "")

   // Write the test code to file
   await fs.writeFile(testcaseFilePath, testCode, "utf8")

   // Open the test file
   const testDocument = await vscode.workspace.openTextDocument(testcaseFilePath)
   await vscode.window.showTextDocument(testDocument, { preview: false })

   // Show success message
   vscode.window.showInformationMessage(`Test case generated and saved to ${path.basename(testcaseFilePath)}`)
}

async function handleReview(text: string,reviewSetting:{
   code_evaluation:boolean,
   security_evaluation:boolean,
   understanding:boolean
}, range: vscode.Range, document: vscode.TextDocument) {
   const targetCode = document.getText(range)
   const response = await API.BACKEND_DEV.post<{
      data: { understanding: string; code_eval: string; security_eval: string }
   }>(
      "/inline/review",
      {
         target_code: targetCode,
         context_code: text,
         provider: "default",
         file_name: document.uri.fsPath.split("/").pop(),
         code_evaluation: reviewSetting.code_evaluation,
         security_evaluation:reviewSetting.security_evaluation,
         understanding:reviewSetting.understanding
      },
      { headers: { "x-session": await LocalServersState.getSessionID() } }
   )

   if (response.status !== 200) {
      throw new Error("Failed to run review")
   }

   // Store evaluations in markdown files
   const storeSuccess = await storeFileEvaluationsVSCode(document.uri.fsPath, response.data.data)
   if (!storeSuccess) {
      console.warn(`Failed to store evaluations for ${document.uri.fsPath}`)
   }

   vscode.window.showInformationMessage("Review completed successfully")
}

async function handleEdit(
   text: string,
   range: vscode.Range,
   document: vscode.TextDocument,
   codeLensProvider: SuggestionCodeLensProvider,
   editInstructions?: string,
   shouldClearAnimation: boolean = true
) {
   if (!editInstructions) {
      editInstructions = await vscode.window.showInputBox({
         prompt: "Enter your editing instructions",
         placeHolder: "e.g. Add error handling, Convert to async/await, etc.",
         ignoreFocusOut: true,
         validateInput: (value) => {
            return value.trim().length > 0 ? null : "Instructions cannot be empty"
         },
      })
      if (!editInstructions) {
         return
      }
   }

   // Start animation when API request begins (after user input)
   const editor = vscode.window.activeTextEditor
   // Compute a unique animation ID for this range so we can clear it once the response is received
   const animationId = `${document.uri.toString()}-${range.start.line}-${range.end.line}`
   if (editor) {
      LineByLineAnimator.startAnimation({
         range,
         editor,
         animationSpeed: 800, // Much slower animation
         onLineProcessed: (lineNumber) => {
            console.log(`Processing edit on line ${lineNumber}`)
         },
      })
   }

   const targetCode = document.getText(range)

   try {
      const response = await API.BACKEND_DEV.post<{ old_code: string; new_code: string }[]>(
         "/inline/edit",
         {
            target_code: targetCode,
            context_code: text,
            instructions: editInstructions,
         },
         { headers: { "x-session": await LocalServersState.getSessionID() } }
      )

      if (!response || response.status !== 200) {
         throw new Error("Failed to edit code")
      }

      const replacements = response.data.map(({ old_code, new_code }) => ({
         target: old_code,
         replacement: new_code,
      }))
      const appliedCode = CodeApplyExecutor.apply(targetCode, replacements)
      codeLensProvider.addSuggestion(document.uri.toString(), range, appliedCode, targetCode)
   } finally {
      // Stop the animation only if requested (i.e., when this is the final request)
      if (shouldClearAnimation) {
         LineByLineAnimator.clearAnimation(animationId)
      }
   }
}

async function handleGenerateDocs(
   text: string,
   range: vscode.Range,
   document: vscode.TextDocument,
   codeLensProvider: SuggestionCodeLensProvider,
   shouldClearAnimation: boolean = true
) {
   // Optionally animate the document generation process
   const editor = vscode.window.activeTextEditor
   const animationId = `${document.uri.toString()}-${range.start.line}-${range.end.line}`
   if (editor) {
      LineByLineAnimator.startAnimation({
         range,
         editor,
         animationSpeed: 800,
         onLineProcessed: (lineNumber) => {
            console.log(`Generating docs on line ${lineNumber}`)
         },
      })
   }

   const targetCode = document.getText(range)

   try {
      const response = await API.BACKEND.post<{ data: { data: string } }>(
         "/inline/docs",
         {
            target_code: targetCode,
            context_code: text,
            provider: "default",
            language: document.languageId,
         },
         { headers: { "x-session": await LocalServersState.getSessionID() } }
      )
      if (!response || response.status !== 200) {
         throw new Error("Failed to generate documentation")
      }

      const updatedCode = response.data.data.data
      codeLensProvider.addSuggestion(document.uri.toString(), range, updatedCode, targetCode)
   } finally {
      if (shouldClearAnimation) {
         LineByLineAnimator.clearAnimation(animationId)
      }
   }
}

async function processTextRange(
   range: vscode.Range,
   action: ActionType,
   document: vscode.TextDocument,
   codeLensProvider: SuggestionCodeLensProvider,
   editInstructions?: string,
   shouldClearAnimation: boolean = true
) {
   // Set context for keyboard shortcuts - only for actions that have accept/reject functionality
   if (action === "optimize" || action === "debug") {
      await vscode.commands.executeCommand("setContext", "codemate.hasActiveCodeLens", true)
   }

   // Show loading state
   const loadingId = codeLensProvider.setLoading(document.uri.toString(), range)

   try {
      // Get all referenced symbols up to depth 2
      const referencedSymbols = await getReferencedSymbolsFromRange(document, range)

      // Get the text of all referenced symbols
      const referencedTexts: string[] = []
      const processedTexts = new Set<string>() // Track processed texts to avoid duplicates

      for (const symbol of referencedSymbols) {
         const text = symbol.text.trim()
         if (processedTexts.has(text)) continue
         processedTexts.add(text)
         referencedTexts.push(text)
      }

      // Combine the original text with referenced symbols' text
      const fullContext = referencedTexts.join("\n\n")

      // Handle each action type
      switch (action) {
         case "optimize":
            await handleOptimize(fullContext, range, document, codeLensProvider)
            break
         case "debug":
            await handleDebug(fullContext, range, document, codeLensProvider)
            break
         case "test":
            await handleTest(fullContext, range, document)
            break
         case "review":
            const settings = CachedState.getSettings()
            await handleReview(fullContext,{
               code_evaluation:settings.enableCodeEvaluation,
               security_evaluation:settings.enableSecurityEvaluation,
               understanding:settings.enableUnderstanding
            }, range, document)
            break
         case "edit":
            await handleEdit(
               fullContext,
               range,
               document,
               codeLensProvider,
               editInstructions,
               shouldClearAnimation
            )
            break
         case "docs":
            await handleGenerateDocs(fullContext, range, document, codeLensProvider, shouldClearAnimation)
            break
      }
   } catch (error: any) {
      console.error(`Error in ${action} command:`, error)

      // Show more detailed error message based on error type
      if (error.message?.includes("network")) {
         vscode.window.showErrorMessage("Network error: Please check your connection")
      } else if (error.status === 401 || error.status === 403) {
         vscode.window.showErrorMessage("Authentication failed: Please sign in again")
      } else if (error.status === 429) {
         vscode.window.showErrorMessage("Rate limit exceeded: Please try again later")
      } else {
         vscode.window.showErrorMessage(`Failed to ${action} the code`)
      }

      throw error
   } finally {
      // Clear loading state
      codeLensProvider.removeSuggestion(document.uri.toString(), loadingId)

      // Update context for optimize/debug actions
      if (action === "optimize" || action === "debug") {
         await vscode.commands.executeCommand(
            "setContext",
            "codemate.hasActiveCodeLens",
            codeLensProvider.hasActiveSuggestions(document.uri.toString())
         )
      }
   }
}

// Register keyboard shortcuts handling
export function registerCodeLensKeyboardShortcuts(
   context: vscode.ExtensionContext,
   codeLensProvider: SuggestionCodeLensProvider
) {
   // Register keyboard shortcuts for Accept and Reject nearest suggestion
   context.subscriptions.push(
      vscode.commands.registerCommand("codemate.acceptNearestSuggestion", async () => {
         const editor = vscode.window.activeTextEditor
         if (!editor) return

         const documentUri = editor.document.uri.toString()
         const position = editor.selection.active
         const suggestion = codeLensProvider.getNearestSuggestion(documentUri, position)

         if (suggestion) {
            await vscode.commands.executeCommand("codemate.acceptSuggestion", documentUri, suggestion)
         }
      }),

      vscode.commands.registerCommand("codemate.rejectNearestSuggestion", async () => {
         const editor = vscode.window.activeTextEditor
         if (!editor) return

         const documentUri = editor.document.uri.toString()
         const position = editor.selection.active
         const suggestion = codeLensProvider.getNearestSuggestion(documentUri, position)

         if (suggestion) {
            await vscode.commands.executeCommand("codemate.rejectSuggestion", documentUri, suggestion)
         }
      })
   )
}

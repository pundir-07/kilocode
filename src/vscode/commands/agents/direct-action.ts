import { API } from "@/common/api"
import { LANGUAGE_EXTENSIONS, TESTCASE_FILE_EXTENSIONS } from "@/common/core/constants"
import { CachedState, LocalServersState } from "@/vscode/core/state"
import { getSuggestionCodeLensProvider } from "@/vscode/providers"
import { LineByLineAnimator } from "@/vscode/utils/line-animation"
import * as fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"

// ----------------------------------------------------------------------------------------------------------

async function handleOptimizeAction(
   commandArgs: CommandArgs,
   document: vscode.TextDocument,
   codeLensProvider: any,
   range: vscode.Range
) {
   const sessionID = await LocalServersState.getSessionID()

   // Start animation when API request begins
   const editor = vscode.window.activeTextEditor
   const animationId = `${document.uri.toString()}-${range.start.line}-${range.end.line}`
   if (editor) {
      LineByLineAnimator.startAnimation({
         range,
         editor,
         animationSpeed: 300, // Faster animation
         onLineProcessed: (lineNumber) => {
            console.log(`Processing optimize on line ${lineNumber}`)
         },
      })
   }

   const response = await API.BACKEND.post<{ code: string }>(
      "/inline/optimize/code",
      {
         target_code: commandArgs.text,
         context_code: commandArgs.text,
         provider: "default",
         language: document.languageId,
      },
      { headers: { "x-session": sessionID } }
   )

   // Clear blue animation immediately when response is received
   if (editor) {
      LineByLineAnimator.clearAnimation(animationId)
   }

   if (response && response.status === 200) {
      codeLensProvider.addSuggestion(
         commandArgs.documentUri.toString(),
         range,
         response.data.code,
         commandArgs.text
      )
      vscode.window.showInformationMessage("Optimize suggestions ready!")
   }
   return response
}

async function handleDebugAction(
   commandArgs: CommandArgs,
   document: vscode.TextDocument,
   codeLensProvider: any,
   range: vscode.Range
) {
   const sessionID = await LocalServersState.getSessionID()

   // Start animation when API request begins
   const editor = vscode.window.activeTextEditor
   const animationId = `${document.uri.toString()}-${range.start.line}-${range.end.line}`
   if (editor) {
      LineByLineAnimator.startAnimation({
         range,
         editor,
         animationSpeed: 300, // Faster animation
         onLineProcessed: (lineNumber) => {
            console.log(`Processing debug on line ${lineNumber}`)
         },
      })
   }

   const response = await API.BACKEND.post<{ code: string }>(
      "/inline/debug/code",
      {
         target_code: commandArgs.text,
         context_code: commandArgs.text,
         provider: "default",
         language: document.languageId,
      },
      { headers: { "x-session": sessionID } }
   )

   // Clear blue animation immediately when response is received
   if (editor) {
      LineByLineAnimator.clearAnimation(animationId)
   }

   if (response && response.status === 200) {
      codeLensProvider.addSuggestion(
         commandArgs.documentUri.toString(),
         range,
         response.data.code,
         commandArgs.text
      )
      vscode.window.showInformationMessage("Debug suggestions ready!")
   }
   return response
}

async function handleTestAction(commandArgs: CommandArgs, document: vscode.TextDocument) {
   const sessionID = await LocalServersState.getSessionID()
   const frameworkInput = await vscode.window.showInputBox({
      prompt: "Enter the framework to use for testing",
      value: "",
      placeHolder: "e.g. pytest, unittest, etc.",
      ignoreFocusOut: true,
   })
   const framework = typeof frameworkInput === "string" ? frameworkInput.trim() : ""

   const customInputRaw = await vscode.window.showInputBox({
      prompt: "Enter any additional instructions for the test framework",
      value: "",
      placeHolder: "e.g. use object oriented testing, use mock objects, etc.",
      ignoreFocusOut: true,
   })
   const customInput = typeof customInputRaw === "string" ? customInputRaw : ""

   // Only start animation for the selected code block
   const range = new vscode.Range(
      commandArgs.range.start.line,
      commandArgs.range.start.character,
      commandArgs.range.end.line,
      commandArgs.range.end.character
   )

   const editor = vscode.window.activeTextEditor
   const animationId = `${document.uri.toString()}-${range.start.line}-${range.end.line}`

   try {
      // Start animation only when we begin processing
      if (editor) {
         LineByLineAnimator.startAnimation({
            range,
            editor,
            animationSpeed: 300,
            onLineProcessed: (lineNumber) => {
               console.log(`Processing test on line ${lineNumber}`)
            },
         })
      }

      const targetCode = commandArgs.text
      const relativePath = path.relative(
         vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "",
         commandArgs.documentUri.fsPath
      )
      const fileName = commandArgs.documentUri.fsPath.split("/").pop() ?? ""
      const fileExt = LANGUAGE_EXTENSIONS[document.languageId as keyof typeof LANGUAGE_EXTENSIONS]
      if (!fileExt) {
         throw new Error(`No file extension defined for language ${document.languageId}`)
      }
      const testExtension = TESTCASE_FILE_EXTENSIONS[fileExt as keyof typeof TESTCASE_FILE_EXTENSIONS]
      if (!testExtension) {
         throw new Error(`No test file extension defined for language ${document.languageId}`)
      }
      const testcaseFilePath = commandArgs.documentUri.fsPath.replace(/\.[^.]+$/, testExtension)

      // List of files at root level (level 1 only)
      const rootFiles = Array.from(
         new Set(
            (await vscode.workspace.findFiles("**", null)).map((x) => {
               const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
               if (!workspacePath) return ""
               const relativePath = path.relative(workspacePath, x.fsPath)
               const firstSegment = relativePath.split("/")[0]
               return firstSegment
            })
         )
      )

      const terminalName = `Codemate Test Runner [${relativePath}]`
      let terminal = vscode.window.terminals.find((t) => t.name === terminalName)
      if (!terminal) {
         terminal = vscode.window.createTerminal(terminalName)
         terminal.show()
      }

      const testResponse = await API.BACKEND.post<{ code: string; test_commands: string[] }>(
         "/inline/test/code",
         {
            target_code: targetCode,
            context_code: commandArgs.text,
            provider: "default",
            language: document.languageId,
            framework: framework,
            instructions: customInput,

            file_name: fileName,
            root_file: relativePath,
            file_path: testcaseFilePath,
            folder_structure: rootFiles,
         },
         { headers: { "x-session": sessionID } }
      )

      if (!testResponse || testResponse.status !== 200) {
         throw new Error("Failed to generate test")
      }
      if (editor) {
         LineByLineAnimator.clearAnimation(animationId)
      }

      // Remove code block markers if present
      const testCode = testResponse.data.code.replace(/^```[^\n]*\n/, "").replace(/\n```$/, "")

      // Write the test code to file
      await fs.writeFile(testcaseFilePath, testCode, "utf8")

      // Open the test file
      const testDocument = await vscode.workspace.openTextDocument(testcaseFilePath)
      await vscode.window.showTextDocument(testDocument, { preview: false })

      vscode.window.showInformationMessage(
         `Test case generated and saved to ${path.basename(testcaseFilePath)}`
      )

      await vscode.window.withProgress(
         {
            location: vscode.ProgressLocation.Notification,
            title: "Running tests...",
         },
         async (progress) => {
            const terminalName = `Codemate Test Runner [${relativePath}]`
            let terminal = vscode.window.terminals.find((t) => t.name === terminalName)
            if (!terminal) {
               terminal = vscode.window.createTerminal(terminalName)
               terminal.show()
            }

            const combinedCommand = testResponse.data.test_commands.join("\n")
            terminal.sendText(combinedCommand)
         }
      )
      return testResponse
   } catch (error) {
      // Clear animation on error
      if (editor) {
         LineByLineAnimator.clearAnimation(animationId)
      }
      throw error // Re-throw to be handled by caller
   }
}

async function handleReviewAction(
   commandArgs: CommandArgs,
   reviewSetting: {
      code_evaluation: boolean
      security_evaluation: boolean
      understanding: boolean
   },
   document: vscode.TextDocument
) {
   const sessionID = await LocalServersState.getSessionID()
   const response = await API.BACKEND.post<{
      understanding: string
      code_eval: string
      security_eval: string
   }>(
      "/review",
      {
         code: commandArgs.text,
         provider: "default",
         code_evaluation: reviewSetting.code_evaluation,
         security_evaluation: reviewSetting.security_evaluation,
         understanding: reviewSetting.understanding,
      },
      { headers: { "x-session": sessionID } }
   )
   if (response && response.status === 200) {
      // Handle storing review files
      const filePath = commandArgs.documentUri.fsPath
      try {
         const normalizedPath = filePath.replace(/\\/g, "/")
         const lastSlashIndex = normalizedPath.lastIndexOf("/")
         const dirPath = lastSlashIndex > -1 ? normalizedPath.substring(0, lastSlashIndex) : ""
         const fileName = lastSlashIndex > -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath
         const codemateDirPath = dirPath ? `${dirPath}/.codemate` : ".codemate"
         const understandingDirPath = `${codemateDirPath}/understanding`
         const codeEvalDirPath = `${codemateDirPath}/code_eval`
         const securityEvalDirPath = `${codemateDirPath}/security_eval`
         await vscode.workspace.fs.createDirectory(vscode.Uri.file(codemateDirPath))

         if (response.data.understanding) {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(understandingDirPath))
            const understandingFilePath = `${understandingDirPath}/${fileName}.md`
            await vscode.workspace.fs.writeFile(
               vscode.Uri.file(understandingFilePath),
               Buffer.from(response.data.understanding)
            )
         }
         if (response.data.code_eval) {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(codeEvalDirPath))
            const codeEvalFilePath = `${codeEvalDirPath}/${fileName}.md`
            await vscode.workspace.fs.writeFile(
               vscode.Uri.file(codeEvalFilePath),
               Buffer.from(response.data.code_eval)
            )
         }
         if (response.data.security_eval) {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(securityEvalDirPath))
            const securityEvalFilePath = `${securityEvalDirPath}/${fileName}.md`
            await vscode.workspace.fs.writeFile(
               vscode.Uri.file(securityEvalFilePath),
               Buffer.from(response.data.security_eval)
            )
         }
         // const understandingDoc = await vscode.workspace.openTextDocument(
         //    vscode.Uri.file(understandingFilePath)
         // )
         // await vscode.window.showTextDocument(understandingDoc)
         vscode.window.showInformationMessage("Code review complete!")
      } catch (error) {
         console.error(`Error storing evaluations for ${filePath}:`, error)
         vscode.window.showErrorMessage("Failed to store evaluations")
      }
   }
   return response
}

async function handleEditAction(
   commandArgs: CommandArgs,
   document: vscode.TextDocument,
   codeLensProvider: any,
   range: vscode.Range,
   editInstructions?: string
) {
   const sessionID = await LocalServersState.getSessionID()
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
         return null
      }
   }

   // Start animation when API request begins (after user input)
   const editor = vscode.window.activeTextEditor
   const animationId = `${document.uri.toString()}-${range.start.line}-${range.end.line}`
   if (editor) {
      LineByLineAnimator.startAnimation({
         range,
         editor,
         animationSpeed: 300, // Faster animation
         onLineProcessed: (lineNumber) => {
            console.log(`Processing edit on line ${lineNumber}`)
         },
      })
   }

   const response = await API.BACKEND.post<{ code: string }>(
      "/inline/edit/code",
      {
         target_code: commandArgs.text,
         context_code: commandArgs.text,
         provider: "default",
         language: document.languageId,
         instructions: editInstructions,
      },
      { headers: { "x-session": sessionID } }
   )

   // Clear blue animation immediately when response is received
   if (editor) {
      LineByLineAnimator.clearAnimation(animationId)
   }

   if (response && response.status === 200) {
      codeLensProvider.addSuggestion(
         commandArgs.documentUri.toString(),
         range,
         response.data.code,
         commandArgs.text
      )
      vscode.window.showInformationMessage("Edit suggestions ready!")
   }
   return response
}

// ----------------------------------------------------------------------------------------------------------

interface CommandArgs {
   text: string
   documentUri: vscode.Uri
   range: vscode.Range
   sessionID?: string
}

/**
 * Handles a direct action on a text selection without requiring symbol detection
 */
export async function handleDirectAction(
   commandArgs: CommandArgs,
   action: "optimize" | "debug" | "test" | "review" | "edit",
   editInstructions?: string
) {
   try {
      if (!commandArgs?.text || !commandArgs?.documentUri || !commandArgs?.range) {
         console.error("Invalid arguments received:", commandArgs)
         vscode.window.showErrorMessage("Failed to process the code: Invalid arguments")
         return
      }

      const codeLensProvider = getSuggestionCodeLensProvider()
      if (!codeLensProvider) {
         vscode.window.showErrorMessage("Failed to get suggestions provider")
         return
      }
      // Convert the range from the arguments to a vscode.Range
      const startLine = typeof commandArgs.range.start.line === "number" ? commandArgs.range.start.line : 0
      const startChar =
         typeof commandArgs.range.start.character === "number" ? commandArgs.range.start.character : 0
      const endLine = typeof commandArgs.range.end.line === "number" ? commandArgs.range.end.line : 0
      const endChar =
         typeof commandArgs.range.end.character === "number" ? commandArgs.range.end.character : 0
      const range = new vscode.Range(startLine, startChar, endLine, endChar)
      const document = await vscode.workspace.openTextDocument(commandArgs.documentUri)
      const loadingId = codeLensProvider.setLoading(commandArgs.documentUri.toString(), range)

      let response: any = null

      switch (action) {
         case "optimize":
            response = await handleOptimizeAction(commandArgs, document, codeLensProvider, range)
            break
         case "debug":
            response = await handleDebugAction(commandArgs, document, codeLensProvider, range)
            break
         case "test":
            try {
               response = await handleTestAction(commandArgs, document)
            } catch (error) {
               // Clear loading state
               if (loadingId) {
                  codeLensProvider.removeSuggestion(commandArgs.documentUri.toString(), loadingId)
               }
               throw error
            }
            break
         case "review":
            const settings = CachedState.getSettings()
            response = await handleReviewAction(
               commandArgs,
               {
                  code_evaluation: settings.enableCodeEvaluation,
                  security_evaluation: settings.enableSecurityEvaluation,
                  understanding: settings.enableUnderstanding,
               },
               document
            )
            break
         case "edit":
            response = await handleEditAction(
               commandArgs,
               document,
               codeLensProvider,
               range,
               editInstructions
            )
            if (!response) {
               if (loadingId) {
                  codeLensProvider.removeSuggestion(commandArgs.documentUri.toString(), loadingId)
               }
               return
            }
            break
      }

      if (loadingId) {
         codeLensProvider.removeSuggestion(commandArgs.documentUri.toString(), loadingId)
      }

      if (!response || response.status !== 200) {
         throw new Error(`Failed to process ${action} action`)
      }

      // Complete animation successfully - apply green block decoration (no auto-cleanup)
      const editor = vscode.window.activeTextEditor
      if (editor) {
         // Animation should already be cleared by individual handlers
         LineByLineAnimator.applyBlockDecoration(range, editor)
         // Note: Block decoration will persist until user accepts/rejects
      }
   } catch (error) {
      const editor = vscode.window.activeTextEditor
      if (editor) {
         // Clear any remaining animations on error
         const animationId = `${commandArgs.documentUri.toString()}-${commandArgs.range.start.line}-${commandArgs.range.end.line}`
         LineByLineAnimator.clearAnimation(animationId)
      }
      console.error(`Error in ${action} action:`, error)
      vscode.window.showErrorMessage(`Failed to process the ${action} action`)
   }
}

/**
 * Register command for handling a direct action with a specific action type
 */
export function registerDirectActionCommand(
   context: vscode.ExtensionContext,
   commandName: string,
   actionType: "optimize" | "debug" | "test" | "review" | "edit"
) {
   const command = vscode.commands.registerCommand(commandName, async (args?: CommandArgs) => {
      // If args are provided directly, use them
      if (args && args.text && args.documentUri && args.range) {
         await handleDirectAction(args, actionType)
         return
      }

      // Otherwise, get selection from active editor
      const editor = vscode.window.activeTextEditor
      if (!editor) {
         vscode.window.showErrorMessage("No active editor")
         return
      }

      const selection = editor.selection
      if (selection.isEmpty) {
         vscode.window.showErrorMessage("No text selected")
         return
      }

      // Create command args from current selection
      const document = editor.document
      const selectedText = document.getText(selection)

      const commandArgs: CommandArgs = {
         text: selectedText,
         documentUri: document.uri,
         range: selection,
      }

      await handleDirectAction(commandArgs, actionType)
   })

   context.subscriptions.push(command)
}

// ----------------------------------------------------------------------------------------------------------

import { API } from "@/common/api"
import { Utils } from "@/common/core/utils"
import {
   CodeEvaluation_t,
   CodeEvaluationDocsContent_t,
   CodeEvaluationSecurityContent_t,
   CodeEvaluationStatus,
   SecurityReviewProblemStatus,
} from "@/common/types/code-evaluation"
import { CachedState } from "@/vscode/core/state"
import * as path from "path"
import * as vscode from "vscode"
import { SidebarProvider } from "../providers/panels/sidebar"

// ----------------------------------------------------------------------------------------------------------

// Define actual programming languages (exclude config/markup files)
const PROGRAMMING_LANGUAGE_EXTENSIONS = new Set([
   // TypeScript/JavaScript
   ".ts",
   ".tsx",
   ".js",
   ".jsx",
   // Python
   ".py",
   // Java
   ".java",
   // C/C++
   ".c",
   ".cpp",
   ".cc",
   ".cxx",
   ".h",
   ".hpp",
   ".hxx",
   // C#
   ".cs",
   // PHP
   ".php",
   // Ruby
   ".rb",
   // Swift
   ".swift",
   // Kotlin
   ".kt",
   ".kts",
   // Go
   ".go",
   // Rust
   ".rs",
   // Scala
   ".scala",
   // Haskell
   ".hs",
   ".lhs",
   // OCaml
   ".ml",
   ".mli",
   // Elixir
   ".ex",
   ".exs",
   // Elm
   ".elm",
   // Clojure
   ".clj",
   ".cljs",
   ".cljc",
   ".edn",
   // Dart
   ".dart",
   // Zig
   ".zig",
   // Nim
   ".nim",
   // Crystal
   ".cr",
   // Visual Basic
   ".vb",
   ".vbs",
   // F#
   ".fs",
   ".fsx",
   ".fsi",
   // Objective-C
   ".m",
   ".mm",
   // Lua
   ".lua",
   // Perl
   ".pl",
   ".pm",
   ".t",
   // R
   ".r",
   ".R",
   // Julia
   ".jl",
   // Groovy
   ".groovy",
   ".gvy",
   ".gy",
   ".gsh",
   // CoffeeScript
   ".coffee",
   // Shell scripts
   ".sh",
   ".bash",
   ".zsh",
   ".fish",
   ".ksh",
   ".csh",
   // PowerShell
   ".ps1",
   ".psm1",
   // Batch
   ".bat",
   ".cmd",
   // Assembly
   ".asm",
   ".s",
   ".S",
   // SQL (though arguable, often contains logic)
   ".sql",
   // Fortran
   ".f",
   ".for",
   ".f90",
   ".f95",
   ".f03",
   ".f08",
   // Prolog
   ".plg",
   ".pro",
   ".P",
   // Lisp
   ".lisp",
   ".lsp",
   ".cl",
   ".el",
   // Scheme
   ".scm",
   ".ss",
   // Ada
   ".adb",
   ".ads",
   // COBOL
   ".cob",
   ".cbl",
   ".cpy",
   // Pascal/Delphi
   ".pas",
   ".pp",
   ".p",
   // D
   ".d",
   // Smalltalk
   ".st",
   // Erlang
   ".erl",
   ".hrl",
   // Tcl
   ".tcl",
   ".tk",
   // Apex (Salesforce)
   ".cls",
   // Solidity
   ".sol",
   // VHDL/Verilog
   ".vhd",
   ".vhdl",
   ".v",
   ".sv",
   // Hack
   ".hh",
   // OCaml Reason
   ".re",
   ".rei",
   // Haxe
   ".hx",
   // MATLAB/Octave
   ".m",
   ".oct",
   // Assembly (various)
   ".a51",
   ".inc",
   // Awk
   ".awk",
   // Rexx
   ".rexx",
   ".rex",
   // Q#
   ".qs",
   // Apex
   ".apex",
   // X++
   ".xpp",
   // ABAP
   ".abap",
   // Forth
   ".fs",
   ".4th",
   // OCaml Reason
   ".re",
   ".rei",
   // Others
   ".rkt", // Racket
   ".vala", // Vala
   ".vbs", // Visual Basic Script
   ".mjs", // ES modules
   ".cjs", // CommonJS
   ".tsv", // TypeScript variant
   ".tsx", // TypeScript JSX
   ".jsx", // JavaScript JSX
])

export namespace CodeEvaluationsHelpers {
   export function getWorkspacePath() {
      return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
   }

   export function getFilePath(document: vscode.TextDocument) {
      const workspacePath = getWorkspacePath()
      if (!workspacePath) {
         throw new Error("No workspace path found")
      }
      return path.relative(workspacePath, document.uri.fsPath)
   }

   export function getCodeEvaluationByPath(workspacePath: string, filePath: string) {
      const codeEvaluationsState = CachedState.getCodeEvaluationsState()
      return codeEvaluationsState.runs[workspacePath]?.[filePath]
   }

   export function upsertCodeEvaluation(document: vscode.TextDocument) {
      const workspacePath = getWorkspacePath()
      if (!workspacePath) {
         throw new Error("No workspace path found")
      }
      const filePath = getFilePath(document)
      if (!filePath) {
         throw new Error("No file path found")
      }
      const codeEvaluationsState = CachedState.getCodeEvaluationsState()
      codeEvaluationsState.runs[workspacePath] ||= {}
      codeEvaluationsState.runs[workspacePath][filePath] ||= {
         id: Utils.getRandomID(),
         filePath,
         dateCreated: Date.now(),
         dateUpdated: Date.now(),
         lastEvaluatedCode: document.getText(),
         content: {
            docs: {
               status: CodeEvaluationStatus.PENDING,
               content: null,
            },
            security: {
               status: CodeEvaluationStatus.PENDING,
               content: null,
            },
         },
      }
      CachedState.setCodeEvaluationsState(codeEvaluationsState)
      SidebarProvider.postMessage({ type: "code_evaluations_state", value: codeEvaluationsState })
   }

   export function updateCodeEvaluationContent(
      document: vscode.TextDocument,
      type: keyof CodeEvaluation_t["content"],
      content: CodeEvaluation_t["content"][keyof CodeEvaluation_t["content"]]
   ) {
      const workspacePath = getWorkspacePath()
      if (!workspacePath) {
         throw new Error("No workspace path found")
      }
      const filePath = getFilePath(document)
      if (!filePath) {
         throw new Error("No file path found")
      }

      const codeEvaluationsState = CachedState.getCodeEvaluationsState()
      codeEvaluationsState.runs[workspacePath][filePath].content[type] = content as any
      //Setting last evaluated Code
      codeEvaluationsState.runs[workspacePath][filePath].lastEvaluatedCode = document.getText()
      CachedState.setCodeEvaluationsState(codeEvaluationsState)
      SidebarProvider.postMessage({ type: "code_evaluations_state", value: codeEvaluationsState })
   }

   export function removeCodeEvaluation(document: vscode.TextDocument) {
      const workspacePath = getWorkspacePath()
      if (!workspacePath) {
         throw new Error("No workspace path found")
      }
      const filePath = getFilePath(document)
      if (!filePath) {
         throw new Error("No file path found")
      }

      const codeEvaluationsState = CachedState.getCodeEvaluationsState()
      delete codeEvaluationsState.runs[workspacePath][filePath]
      CachedState.setCodeEvaluationsState(codeEvaluationsState)
      SidebarProvider.postMessage({ type: "code_evaluations_state", value: codeEvaluationsState })
   }
}

namespace AutoActions {
   export async function generateDocs(document: vscode.TextDocument) {
      const code = document.getText()
      if (!code.trim()) {
         throw new Error("Document is empty, cannot generate docs")
      }

      const workspacePath = CodeEvaluationsHelpers.getWorkspacePath()
      if (!workspacePath) {
         throw new Error("No workspace path found")
      }

      // Get the existing evaluation for storing the existing content in the new one
      const existingCodeEvaluation = CodeEvaluationsHelpers.getCodeEvaluationByPath(
         workspacePath,
         path.relative(workspacePath, document.uri.fsPath)
      )

      // Create a new code evaluation
      const codeEvaluation: CodeEvaluationDocsContent_t = {
         status: CodeEvaluationStatus.PENDING,
         content: existingCodeEvaluation.content.docs.content,
      }
      CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "docs", codeEvaluation)
      console.log("Generating docs for", document.uri.fsPath)

      // Prepare payload according to the updated /auto-actions/doc endpoint
      const res = await API.BACKEND_LOCAL.post<{ docs: string }>("/auto-actions/document", {
         file_path: document.uri.fsPath,
         file_content: code,
         language: document.languageId,
         model: "gpt-4o-mini", // default model – adjust if needed
      })
      console.log("Docs generation response:", res)
      if (res.status !== 200) {
         CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "docs", {
            status: CodeEvaluationStatus.FAILED,
            content: null,
         })

         throw new Error("docs endpoint returned non-200")
      }

      // Backend may return docs in different fields – be flexible
      let docsContent: string | undefined = res.data.docs
      if (!docsContent) {
         throw new Error("docs endpoint response missing content field")
      }

      // Remove code-block markers if present
      docsContent = docsContent.replace(/^```[^\n]*\n/, "").replace(/\n```$/, "")

      // // Prepare path for docs file
      // const dir = path.dirname(document.uri.fsPath)
      // const base = path.basename(document.uri.fsPath)
      // const newName = base + `.docs.md`
      // const docsPath = path.join(dir, newName)
      // // Write docs to file
      // await writeContentToFileVSCode(docsPath, docsContent)

      // Update code evaluation
      CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "docs", {
         status: CodeEvaluationStatus.COMPLETED,
         content: docsContent,
      })
   }

   export async function generateSecurityReview(document: vscode.TextDocument) {
      const code = document.getText()
      if (!code.trim()) {
         throw new Error("Document is empty, cannot generate security review")
      }

      const workspacePath = CodeEvaluationsHelpers.getWorkspacePath()
      if (!workspacePath) {
         throw new Error("No workspace path found")
      }

      // Get the existing evaluation for storing the existing content in the new one
      const existingCodeEvaluation = CodeEvaluationsHelpers.getCodeEvaluationByPath(
         workspacePath,
         path.relative(workspacePath, document.uri.fsPath)
      )

      // Create a new code evaluation
      const codeEvaluation: CodeEvaluationSecurityContent_t = {
         status: CodeEvaluationStatus.PENDING,
         content: existingCodeEvaluation.content.security.content,
      }
      CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "security", codeEvaluation)

      // Call the backend security-scan endpoint
      const res = await API.BACKEND_LOCAL.post<{
         overall_eval: string
         problems_identified: {
            title: string
            description: string
            target_code_block: string | null
            severity: number
         }[]
      }>("/auto-actions/security_scan", {
         file_path: document.uri.fsPath,
         file_content: code,
         language: document.languageId,
         model: "gpt-4o-mini", // keep consistent with docs generation
      })
      if (res.status !== 200) {
         throw new Error("security-scan endpoint returned non-200")
      }
      console.log("SECURIT EVAL RES= ", res)
      codeEvaluation.status = CodeEvaluationStatus.COMPLETED
      codeEvaluation.content = {
         summary: res.data.overall_eval,
         problems: res.data.problems_identified.map((p) => ({
            id: Utils.getRandomID(),
            status: SecurityReviewProblemStatus.UNTOUCHED,
            title: p.title,
            description: p.description,
            targetCodeBlock: p.target_code_block ?? "",
            severity: p.severity,
         })),
      }

      // Update code evaluation
      CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "security", codeEvaluation)

      // If any problem's severity is >=8 we need to show a notification with a button saying "Show" that when clicked will log to console "Hello world"
      const highSeverityProblems = codeEvaluation.content.problems.filter((p) => p.severity >= 8)
      if (!highSeverityProblems.length) return

      vscode.window
         .showInformationMessage(
            `${highSeverityProblems.length} potential security issues found\n(${path.basename(document.uri.fsPath)})`,
            "Show"
         )
         .then(async (action) => {
            if (action !== "Show") return
            const relativePath = path.relative(
               CodeEvaluationsHelpers.getWorkspacePath()!,
               document.uri.fsPath
            )
            const urlEncodedPath = encodeURIComponent(relativePath)

            // Ensure the sidebar is visible first
            try {
               await vscode.commands.executeCommand("codemate-sidebar.focus")
            } catch {
               // Fallback – open the view container
               await vscode.commands.executeCommand("workbench.view.extension.codemate-sidebar-view")
            }

            await new Promise((resolve) => setTimeout(resolve, 1000))

            SidebarProvider.postMessage({
               type: "navigate",
               value: `/code-evaluations/${urlEncodedPath}`,
            })
         })
   }
}

// ----------------------------------------------------------------------------------------------------------

export function registerCodeEvaluations(context: vscode.ExtensionContext) {
   let lastActiveDocument: vscode.TextDocument | undefined = undefined

   async function shouldProcess(fsPath: string): Promise<boolean> {
      const fileExtension = path.extname(fsPath).toLowerCase()
      return PROGRAMMING_LANGUAGE_EXTENSIONS.has(fileExtension)
   }

   async function processDocument(document: vscode.TextDocument) {
      // console.log("Processing document:", document.uri.fsPath)
      const settings = CachedState.getSettings()
      if (settings?.disableCodeEvaluations) return

      if (!document) return
      if (document.isUntitled) return // skip unsaved docs

      // Only process files that are part of the current workspace
      const workspacePath = CodeEvaluationsHelpers.getWorkspacePath()
      if (!workspacePath) return // no workspace open

      const fsPath = document.uri.fsPath
      if (!fsPath.startsWith(workspacePath)) return // file is not in workspace

      if (!(await shouldProcess(fsPath))) return
      if (document.getText() === "") {
         // console.log("No evaluation triggered: Empty doc")
         return
      }
      if (
         document.getText() ===
         CodeEvaluationsHelpers.getCodeEvaluationByPath(
            workspacePath,
            path.relative(workspacePath, document.uri.fsPath)
         )?.lastEvaluatedCode
      ) {
         // console.log("No evaulation triggered: Code has not changed since last evaluation")
         return
      }
      CodeEvaluationsHelpers.upsertCodeEvaluation(document)
      try {
         await Promise.all([AutoActions.generateDocs(document), AutoActions.generateSecurityReview(document)])
      } catch (err: any) {
         // :)
         CodeEvaluationsHelpers.removeCodeEvaluation(document)

         // console.error("Automatic actions failed:", err)
         // vscode.window.showErrorMessage(
         //    `CodeMate: automatic action failed for ${path.basename(fsPath)} - ${err.message ?? err}`
         // )

         // const codeEvaluation = CodeEvaluationsHelpers.getCodeEvaluationByPath(
         //    workspacePath,
         //    path.relative(workspacePath, document.uri.fsPath)
         // )
         // if (!codeEvaluation) return

         // // Update the code evaluation to failed
         // CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "docs", {
         //    status: CodeEvaluationStatus.FAILED,
         //    content: codeEvaluation.content.docs.content,
         // })
         // CodeEvaluationsHelpers.updateCodeEvaluationContent(document, "security", {
         //    status: CodeEvaluationStatus.FAILED,
         //    content: codeEvaluation.content.security.content,
         // })
      }
   }

   // Handle editor switch (between two files) and file open
   context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(async (editor) => {
         // console.log("Switching to document :", editor?.document.uri.fsPath)
         // console.log("Last active document :",lastActiveDocument.uri.fsPath)
         const newDoc = editor?.document
         // Only trigger if switching between two different files
         if (newDoc && (!lastActiveDocument || newDoc.uri.fsPath !== lastActiveDocument.uri.fsPath)) {
            await processDocument(newDoc)
         }
         //Trigger when closing the file
         if (!newDoc && lastActiveDocument) {
            await processDocument(lastActiveDocument)
         }
         lastActiveDocument = newDoc
      })
   )

   // Handle file close (when an editor is closed)
   context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument(async (document) => {
         // Only process if the closed document is a real file in the workspace
         // console.log("Closing document:", document.uri.fsPath)
         if (document && !document.isUntitled && document.uri.scheme === "file") {
            const workspacePath = CodeEvaluationsHelpers.getWorkspacePath()
            if (workspacePath && document.uri.fsPath.startsWith(workspacePath)) {
               if (await shouldProcess(document.uri.fsPath)) {
                  await processDocument(document)
               }
            }
         }
      })
   )
}

// ----------------------------------------------------------------------------------------------------------

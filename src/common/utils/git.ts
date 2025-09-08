import { spawn } from "child_process"

export namespace GitSCM {
   function executeGitCommand(args: string[], cwd: string): Promise<string> {
      return new Promise((resolve, reject) => {
         const process = spawn("git", args, { cwd })

         let output = ""
         let errorOutput = ""

         process.stdout.on("data", (data) => {
            output += data.toString()
         })

         process.stderr.on("data", (data) => {
            errorOutput += data.toString()
         })

         process.on("close", (code) => {
            if (code !== 0) {
               reject(new Error(`Git process exited with code ${code}\n${errorOutput}`))
               return
            }
            resolve(output)
         })

         process.on("error", (err) => {
            reject(err)
         })
      })
   }

   export async function getCommitDiffLog(commitID: string, workspacePath: string): Promise<string> {
      try {
         return await executeGitCommand(["show", commitID], workspacePath)
      } catch (error) {
         console.error("Error executing Git command:", error)
         throw new Error(`Git Error: ${error instanceof Error ? error.message : String(error)}`)
      }
   }

   export async function getPRDiff(prID: string, workspacePath: string): Promise<string> {
      try {
         // Fetch the PR branch
         await executeGitCommand(["fetch", "origin", `pull/${prID}/head:pr/${prID}`], workspacePath)

         // Get the diff
         return await executeGitCommand(["diff", `pr/${prID}`], workspacePath)
      } catch (error) {
         console.error("Error executing Git command:", error)
         throw new Error(`Git Error: ${error instanceof Error ? error.message : String(error)}`)
      }
   }

   export async function getWorkingDiff(workspacePath: string): Promise<string> {
      try {
         // Get both staged and unstaged changes
         const stagedDiff = await executeGitCommand(["diff", "--staged"], workspacePath)
         const unstagedDiff = await executeGitCommand(["diff"], workspacePath)

         // Combine both diffs with headers
         const combinedDiff = [
            stagedDiff ? "=== Staged Changes ===\n" + stagedDiff : "",
            unstagedDiff ? "=== Unstaged Changes ===\n" + unstagedDiff : "",
         ]
            .filter(Boolean)
            .join("\n\n")

         return combinedDiff || "No changes found"
      } catch (error) {
         console.error("Error executing Git command:", error)
         throw new Error(`Git Error: ${error instanceof Error ? error.message : String(error)}`)
      }
   }

   export async function getCommitMessage(commitID: string, workspacePath: string): Promise<string> {
      try {
         // Get commit message using git log with --format=%B to only get the commit message
         return await executeGitCommand(["log", "-1", "--format=%B", commitID], workspacePath)
      } catch (error) {
         console.error("Error executing Git command:", error)
         throw new Error(`Git Error: ${error instanceof Error ? error.message : String(error)}`)
      }
   }

   export async function listPullRequests(
      workspacePath: string
   ): Promise<Array<{ id: string; title: string }>> {
      try {
         // This command lists all pull requests with their numbers and titles
         const command = [
            "for-each-ref",
            "--format=%(refname:short)%09%(subject)", // Using tab as delimiter
            "refs/remotes/origin/pr/*",
         ]

         const output = await executeGitCommand(command, workspacePath)

         if (!output.trim()) {
            return []
         }

         return output
            .trim()
            .split("\n")
            .map((line) => {
               const [ref, ...titleParts] = line.split("\t")
               const id = ref.replace("pr/", "") // Extract PR number from ref
               const title = titleParts.join("\t") // Rejoin title parts in case title contained tabs
               return { id, title }
            })
      } catch (error) {
         console.error("Error executing Git command:", error)
         throw new Error(`Git Error: ${error instanceof Error ? error.message : String(error)}`)
      }
   }
}

import { GitSCM } from "@/common/utils/git"
import { CachedState } from "@/vscode/core/state"
import * as vscode from "vscode"

export async function get_current_diff(webviewView: vscode.WebviewView, data: any) {
   const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
   if (!workspacePath) {
      webviewView.webview.postMessage({
         type: "currentDiff",
         value: "No workspace folder found",
      })
      return
   }

   const diff = await GitSCM.getWorkingDiff(workspacePath)
   webviewView.webview.postMessage({
      type: "currentDiff",
      value: diff || "Unable to get current changes",
   })
}

export async function get_pr_list(webviewView: vscode.WebviewView, data: any) {
   const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
   if (!workspacePath) {
      webviewView.webview.postMessage({
         type: "prList",
         value: [],
      })
      return
   }

   try {
      const prs = await GitSCM.listPullRequests(workspacePath)
      webviewView.webview.postMessage({
         type: "prList",
         value: prs,
      })
   } catch (error) {
      webviewView.webview.postMessage({
         type: "prList",
         value: [],
      })
   }
}

export async function get_pr_diff(webviewView: vscode.WebviewView, data: string) {
   if (!data) {
      webviewView.webview.postMessage({
         type: "commitDiff",
         value: { diff: "No commit prID provided", message: "" },
      })
      return
   }

   const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
   if (!workspacePath) {
      webviewView.webview.postMessage({
         type: "prDiff",
         value: "No workspace folder found",
      })
      return
   }

   try {
      const diff = await GitSCM.getPRDiff(data, workspacePath)
      webviewView.webview.postMessage({
         type: "prDiff",
         prID: data,
         value: diff || "No changes found between current branch and main",
      })
   } catch (error) {
      webviewView.webview.postMessage({
         type: "prDiff",
         prID: data,
         value: "Error getting PR diff: " + (error as Error).message,
      })
   }
}

export async function get_git_commits(webviewView: vscode.WebviewView, data: any) {
   const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports
   if (!gitExtension) {
      webviewView.webview.postMessage({
         type: "gitCommits",
         value: [],
      })
      return
   }

   const git = gitExtension.getAPI(1)
   const repo = git.repositories[0]

   if (!repo) {
      webviewView.webview.postMessage({
         type: "gitCommits",
         value: [],
      })
      return
   }

   try {
      // Fetch the number of commits as configured in the user settings (defaults to 100)
      const settings = CachedState.getSettings()
      const maxEntries = settings?.maxGitCommits ?? 100

      const log = await repo.log({ maxEntries })
      const commits = log.map((commit: any) => ({
         hash: commit.hash,
         message: commit.message,
      }))

      webviewView.webview.postMessage({
         type: "gitCommits",
         value: commits,
      })
   } catch (error) {
      webviewView.webview.postMessage({
         type: "gitCommits",
         value: [],
      })
   }
}

export async function get_commit_diff(webviewView: vscode.WebviewView, data: string) {
   if (!data) {
      webviewView.webview.postMessage({
         type: "commitDiff",
         value: { diff: "No commit hash provided", message: "" },
      })
      return
   }

   const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
   if (!workspacePath) {
      webviewView.webview.postMessage({
         type: "commitDiff",
         value: { diff: "No workspace folder found", message: "" },
      })
      return
   }

   try {
      const diff = await GitSCM.getCommitDiffLog(data, workspacePath)
      const message = await GitSCM.getCommitMessage(data, workspacePath)

      webviewView.webview.postMessage({
         type: "commitDiff",
         hash: data,
         value: {
            diff: diff || "No changes found in this commit",
            message: message || "",
         },
      })
   } catch (error) {
      webviewView.webview.postMessage({
         type: "commitDiff",
         hash: data,
         value: {
            diff: "Error getting commit diff: " + (error as Error).message,
            message: "",
         },
      })
   }
}

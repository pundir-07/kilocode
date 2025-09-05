import axios from "axios"
import { AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { KnowledgebaseStatus, KnowledgebaseTypeGithub_t } from "@/common/types/knowledgebase"
import { RootState } from "@/views/lib/store"
import { selectScmAccessTokens } from "@/views/lib/store/globalSlice"
import { selectKnowledgebaseById, updateKnowledgebase } from "@/views/lib/store/knowledgebasesSlice"

// Types
interface GitHubRepo {
   name: string
   full_name: string
   description: string | null
   html_url: string
   default_branch: string
   owner: {
      login: string
   }
}

interface GitHubBranch {
   name: string
   commit: {
      sha: string
   }
}

// Common functionality and API calls namespace
export namespace Algorithms {
   export function getGithubUrl(repoUrl: string, githubToken?: string, githubUsername?: string): string[] {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) return [repoUrl]

      const [, owner, repo] = match

      if (owner && repo && githubToken && githubUsername) {
         // Extract the repository name without .git extension if present
         const cleanRepo = repo.replace(/\.git$/, "")

         // Return formatted URL with PAT
         return [`https://${githubUsername}:${githubToken}@github.com/${owner}/${cleanRepo}.git`]
      }

      // Fallback to original URL if extraction fails
      return [repoUrl]
   }

   export async function fetchUserInfo(token: string): Promise<string | null> {
      try {
         const response = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `token ${token}` },
         })
         return response.data.login
      } catch (error) {
         console.error("Error fetching GitHub username:", error)
         return null
      }
   }

   export async function fetchRepositories(token: string): Promise<GitHubRepo[]> {
      try {
         const response = await axios.get("https://api.github.com/user/repos", {
            headers: { Authorization: `token ${token}` },
            params: {
               visibility: "all",
               affiliation: "owner,collaborator,organization_member",
               sort: "updated",
               per_page: 100,
            },
         })
         return response.data
      } catch (error) {
         console.error("Error fetching repositories:", error)
         throw new Error("Failed to fetch repositories. Please check your GitHub token.")
      }
   }

   export async function fetchBranches(owner: string, repo: string, token?: string): Promise<GitHubBranch[]> {
      try {
         console.log(`Fetching branches for ${owner}/${repo}`, { hasToken: !!token })
         
         const allBranches: GitHubBranch[] = []
         let page = 1
         const perPage = 100 // Maximum allowed by GitHub API

         while (true) {
            const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
               ...(token ? { headers: { Authorization: `token ${token}` } } : {}),
               params: {
                  per_page: perPage,
                  page: page,
               },
            })

            const branches: GitHubBranch[] = response.data
            allBranches.push(...branches)

            // If we received fewer than perPage branches, we've reached the last page
            if (branches.length < perPage) {
               break
            }

            page++
         }

         return allBranches.sort((a, b) => a.name.localeCompare(b.name))
      } catch (error: any) {
         console.error("Error fetching branches:", error)
         
         if (error.response?.status === 404) {
            throw new Error(`Repository '${owner}/${repo}' not found. Please check the repository name and ensure you have access to it.`)
         } else if (error.response?.status === 403) {
            throw new Error("Access denied. Please check your GitHub token permissions.")
         } else if (error.response?.status === 401) {
            throw new Error("Authentication failed. Please check your GitHub token.")
         } else {
            throw new Error(`Failed to fetch branches: ${error.message || 'Unknown error'}`)
         }
      }
   }

   export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
      // Handle different GitHub URL formats
      const patterns = [
         // Standard HTTPS URLs
         /^https:\/\/github\.com\/([a-zA-Z0-9\-_.]+)\/([a-zA-Z0-9\-_.]+?)(?:\.git)?(?:\/.*)?$/,
         // SSH URLs
         /^git@github\.com:([a-zA-Z0-9\-_.]+)\/([a-zA-Z0-9\-_.]+?)(?:\.git)?$/,
         // Simple owner/repo format
         /^([a-zA-Z0-9\-_.]+)\/([a-zA-Z0-9\-_.]+)$/
      ]

      for (const pattern of patterns) {
         const match = repoUrl.trim().match(pattern)
         if (match) {
            const [, owner, repo] = match
            console.log(`Parsed URL "${repoUrl}" -> owner: "${owner}", repo: "${repo}"`)
            return { owner, repo: repo.replace(/\.git$/, '') }
         }
      }

      console.log(`Failed to parse URL: "${repoUrl}"`)
      return null
   }

   export function extractRepoNameFromUrl(repoUrl: string): string | null {
      try {
         const urlObj = new URL(repoUrl)
         const pathParts = urlObj.pathname.split("/").filter(Boolean)
         if (pathParts.length < 2) return null

         // Remove .git extension if present
         const repoName = pathParts[pathParts.length - 1].replace(/\.git$/, "")
         return repoName
      } catch (error) {
         return null
      }
   }
}

export default function Github(props: { kbID: string; readonly?: boolean }) {
   const kb = useSelector(
      (state: RootState) => selectKnowledgebaseById(state, props.kbID) as KnowledgebaseTypeGithub_t
   )
   const isWorking = kb.status === KnowledgebaseStatus.PROGRESS
   const dispatch = useDispatch()

   // State management
   const [listedRepos, setListedRepos] = useState<GitHubRepo[]>([])
   const [listedBranches, setListedBranches] = useState<GitHubBranch[]>([])
   const [validationError, setValidationError] = useState<string | null>(null)
   const [branchError, setBranchError] = useState<string | null>(null)
   const [isCustomRepo, setIsCustomRepo] = useState(false)
   const [githubUsername, setGithubUsername] = useState<string>("")
   const [reposFetched, setReposFetched] = useState(false)

   // Get GitHub token from store
   const scmTokens = useSelector(selectScmAccessTokens)
   const githubToken = scmTokens?.github

   // Update metadata in store
   const updateMetadata = (updates: Partial<typeof kb.metadata>) => {
      dispatch(
         updateKnowledgebase({
            id: props.kbID,
            updates: {
               metadata: {
                  ...kb.metadata,
                  ...updates,
               },
            },
         })
      )
   }

   // Update repo URL and clear branch if changing repos
   const updateRepoUrl = (url: string) => {
      if (url !== kb.metadata.repo_url) {
         updateMetadata({
            repo_url: url,
            branch: "", // Clear branch when repo changes
         })
         // Clear branches when repo changes
         setListedBranches([])
         setBranchError(null)
      } else {
         updateMetadata({ repo_url: url })
      }
   }

   // Update branch selection
   const updateBranch = (branch: string) => {
      updateMetadata({ branch })
   }

   // Fetch GitHub username on token change
   useEffect(() => {
      if (!githubToken) return

      const fetchUsername = async () => {
         const username = await Algorithms.fetchUserInfo(githubToken)
         if (username) setGithubUsername(username)
      }

      fetchUsername()
   }, [githubToken])

   // Fetch repositories when token is available
   useEffect(() => {
      const fetchRepos = async () => {
         if (!githubToken) {
            setListedRepos([])
            setReposFetched(false)
            return
         }

         try {
            const repos = await Algorithms.fetchRepositories(githubToken)
            setListedRepos(repos)
            setReposFetched(true)
         } catch (error) {
            setListedRepos([])
            setReposFetched(true) // Set to true even on error to show custom input
            console.error("Failed to fetch repositories:", error)
         }
      }

      fetchRepos()
   }, [githubToken])

   // Fetch branches when repo URL changes and is valid
   useEffect(() => {
      if (!kb.metadata.repo_url.trim()) {
         setListedBranches([])
         setBranchError(null)
         setValidationError(null)
         return
      }

      const timeoutId = setTimeout(async () => {
         // Parse the repository URL to get owner and repo
         const parsedRepo = Algorithms.parseRepoUrl(kb.metadata.repo_url)
         
         // Also handle the case where user selected from dropdown (owner/repo format)
         let owner: string, repo: string
         
         if (parsedRepo) {
            owner = parsedRepo.owner
            repo = parsedRepo.repo
         } else if (kb.metadata.repo_url.includes("/") && !kb.metadata.repo_url.includes("github.com")) {
            // Handle owner/repo format from dropdown selection
            [owner, repo] = kb.metadata.repo_url.split("/")
         } else {
            setValidationError("Please enter a valid GitHub repository URL")
            setListedBranches([])
            setBranchError(null)
            return
         }

         if (!owner || !repo) {
            setValidationError("Please enter a valid GitHub repository URL")
            setListedBranches([])
            setBranchError(null)
            return
         }

         // Fetch branches
         try {
            const branches = await Algorithms.fetchBranches(owner, repo, githubToken)
            setListedBranches(branches)
            setBranchError(branches.length === 0 ? "No branches found in this repository" : null)
            setValidationError(null)
         } catch (error) {
            setListedBranches([])
            setBranchError("Failed to fetch branches. Please check the repository URL and try again.")
            setValidationError(null) // Don't duplicate the error message
         }
      }, 500) // 500ms debounce

      return () => clearTimeout(timeoutId)
   }, [kb.metadata.repo_url, githubToken])

   // Extract repo name from URL and update knowledgebase name
   useEffect(() => {
      if (!kb.metadata.repo_url.trim()) return

      const repoName = Algorithms.extractRepoNameFromUrl(kb.metadata.repo_url)
      if (repoName) {
         dispatch(updateKnowledgebase({ id: props.kbID, updates: { name: repoName } }))
      }
   }, [kb.metadata.repo_url, dispatch, props.kbID])

   return (
      <div className="grid grid-rows-[min-content,1fr] h-full overflow-auto gap-4">
         {/* Manual Repository URL Input */}
         <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--vscode-foreground)]">GitHub Repository URL</label>
            <input
               type="text"
               value={kb.metadata.repo_url}
               onChange={(e) => updateRepoUrl(e.target.value)}
               placeholder="Enter GitHub repository URL (e.g., https://github.com/owner/repo)"
               className="w-full p-2 rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]"
               disabled={isWorking || props.readonly}
            />
         </div>

         {/* Repository List (only show if token is available and repos are fetched) */}
         {githubToken && reposFetched && (
            <div className="flex flex-col gap-2">
               <label className="text-sm text-[var(--vscode-foreground)]">Or Select from Your Repositories</label>
               
               {listedRepos.length === 0 ? (
                  <div className="p-4 border border-[var(--vscode-input-border)] rounded-md bg-[var(--vscode-input-background)] text-center text-[var(--vscode-foreground)]">
                     No repositories found in your GitHub account
                  </div>
               ) : (
                  <div className="border border-[var(--vscode-input-border)] rounded-md bg-[var(--vscode-input-background)]">
                     {/* Repository List */}
                     <div className="max-h-[30vh] overflow-y-auto">
                        <div className="divide-y divide-[var(--vscode-input-border)]">
                           {listedRepos.map((repo) => (
                              <div
                                 key={repo.full_name}
                                 onClick={() => !props.readonly && updateRepoUrl(`https://github.com/${repo.full_name}`)}
                                 className={`p-3 cursor-pointer ${
                                    kb.metadata.repo_url === `https://github.com/${repo.full_name}` || 
                                    kb.metadata.repo_url === repo.full_name
                                       ? "bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]"
                                       : "hover:bg-[var(--vscode-list-hoverBackground)]"
                                 }`}
                              >
                                 <div className="font-medium">{repo.full_name}</div>
                                 {repo.description && (
                                    <div className="mt-1 text-sm text-[var(--vscode-descriptionForeground)]">
                                       {repo.description}
                                    </div>
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               )}
            </div>
         )}

         {/* Show message if no GitHub token */}
         {!githubToken && (
            <div className="p-3 border border-[var(--vscode-input-border)] rounded-md bg-[var(--vscode-input-background)] text-[var(--vscode-descriptionForeground)] text-sm">
               💡 Add a GitHub token in credentials to see your repositories and get better API rate limits.
            </div>
         )}

         {/* Branch selection */}
         {kb.metadata.repo_url && (
            <div className="flex flex-col gap-2">
               <label className="text-sm text-[var(--vscode-foreground)]">Select Branch</label>
               <select
                  value={kb.metadata.branch}
                  onChange={(e) => updateBranch(e.target.value)}
                  disabled={isWorking || props.readonly}
                  className="w-full p-2 rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]"
               >
                  <option value="">Select a branch</option>
                  {listedBranches.map((branch) => (
                     <option key={branch.commit.sha} value={branch.name}>
                        {branch.name}
                     </option>
                  ))}
               </select>
            </div>
         )}

         {/* Error messages - only show one at a time */}
         {validationError && (
            <div className="flex items-center gap-2 text-[var(--vscode-inputValidation-errorForeground)] text-sm">
               <AlertCircle className="w-4 h-4" />
               <span>{validationError}</span>
            </div>
         )}
         
         {!validationError && branchError && (
            <div className="flex items-center gap-2 text-[var(--vscode-inputValidation-errorForeground)] text-sm">
               <AlertCircle className="w-4 h-4" />
               <span>{branchError}</span>
            </div>
         )}
      </div>
   )
}
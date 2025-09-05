import { store } from "@/views/lib/store"
import { selectPlan, selectSettings, setScmAccessToken } from "@/views/lib/store/globalSlice"
import { KeyIcon, Plus, Trash2 } from "lucide-react"
import { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"

export type Platform = "github" | "gitlab"

namespace Algorithms {
   // Function to handle settings updates
   export function handleSettingsUpdate(newSettings: any) {
      tsvscode.postMessage({
         type: "update_settings",
         value: newSettings,
      })
   }

   // Update all the onChange handlers to include the settings update
   export function handleSettingChange(dispatch: any, action: any) {
      dispatch(action)
      // Get latest settings after state update
      const currentSettings = selectSettings(store.getState())
      handleSettingsUpdate(currentSettings)
   }
}

namespace Components {
   export function AccessTokensUpgradeMessage() {
      return (
         <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full p-4 mb-6">
               <KeyIcon className="w-12 h-12 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
               Access Token Management
            </h3>
            <p className="text-[var(--vscode-descriptionForeground)] max-w-md mb-6">
               Upgrade your plan to manage and secure your access tokens with advanced features and enhanced
               security.
            </p>
            <div
               onClick={() => tsvscode.postMessage({ type: "open_upgrade" })}
               className="w-[80%] cursor-pointer px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
               Upgrade Now
            </div>
         </div>
      )
   }

   function KeyCard(props: {
      token: string
      title: string
      onUpdateKey: (value: string) => void
      onDeleteKey: () => void
   }) {
      return (
         <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-input-border)] p-4 space-y-4">
            <div className="flex items-center justify-between">
               <h4 className="font-medium text-[var(--vscode-foreground)]">Access Token</h4>
               <button
                  onClick={props.onDeleteKey}
                  className="p-2 text-[var(--vscode-errorForeground)] hover:bg-[var(--vscode-inputValidation-errorBackground)] rounded-md transition-colors"
                  title="Delete token"
               >
                  <Trash2 size={16} />
               </button>
            </div>

            <div className="space-y-3">
               <div>
                  <label className="block text-sm text-[var(--vscode-descriptionForeground)] mb-1">
                     Token
                  </label>
                  <input
                     type="password"
                     value={props.token}
                     onChange={(e) => props.onUpdateKey(e.target.value)}
                     className="w-full p-2 bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded-md"
                     placeholder={`Enter your ${props.title} access token`}
                  />
               </div>
            </div>
         </div>
      )
   }

   export function ProviderSection(props: {
      title: string
      description: string
      platform: Platform
      onAddKey: () => void
      onDeleteKey: () => void
      onUpdateKey: (value: string) => void
   }) {
      const token = useSelector(selectSettings).scmAccessTokens[props.platform]

      return (
         <div className="space-y-4">
            <div className="flex items-center justify-between">
               <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-semibold text-[var(--vscode-foreground)]">{props.title}</h3>
                  <p className="text-sm text-[var(--vscode-descriptionForeground)]">{props.description}</p>
               </div>
               {token === null && (
                  <div
                     onClick={props.onAddKey}
                     className="cursor-pointer flex items-center gap-1 px-4 py-2 text-sm text-[var(--vscode-textLink-foreground)] hover:opacity-80 transition-opacity"
                  >
                     <Plus size={16} />
                     Add
                  </div>
               )}
            </div>

            {token !== null && (
               <KeyCard
                  token={token}
                  title={props.title}
                  onUpdateKey={props.onUpdateKey}
                  onDeleteKey={props.onDeleteKey}
               />
            )}
         </div>
      )
   }
}

function CredentialsAccessTokens() {
   const dispatch = useDispatch()
   const plan = useSelector(selectPlan)

   const handlers = useMemo(
      () => ({
         handleAddKey: (platform: Platform) => {
            Algorithms.handleSettingChange(dispatch, setScmAccessToken({ platform, token: "" }))
         },
         handleDeleteKey: (platform: Platform) => {
            Algorithms.handleSettingChange(dispatch, setScmAccessToken({ platform, token: null }))
         },
         handleUpdateKey: (platform: Platform, value: string) => {
            Algorithms.handleSettingChange(dispatch, setScmAccessToken({ platform, token: value }))
         },
      }),
      [dispatch]
   )

   if (!plan) return null
   if (!plan.base.limits.access.access_tokens) return <Components.AccessTokensUpgradeMessage />

   return (
      <div className="space-y-8 p-4">
         <Components.ProviderSection
            platform="github"
            title="GitHub"
            description="Access GitHub repositories and manage your code"
            onAddKey={() => handlers.handleAddKey("github")}
            onDeleteKey={() => handlers.handleDeleteKey("github")}
            onUpdateKey={(value) => handlers.handleUpdateKey("github", value)}
         />
         <Components.ProviderSection
            platform="gitlab"
            title="GitLab"
            description="Access GitLab repositories and manage your code"
            onAddKey={() => handlers.handleAddKey("gitlab")}
            onDeleteKey={() => handlers.handleDeleteKey("gitlab")}
            onUpdateKey={(value) => handlers.handleUpdateKey("gitlab", value)}
         />
      </div>
   )
}

export default CredentialsAccessTokens

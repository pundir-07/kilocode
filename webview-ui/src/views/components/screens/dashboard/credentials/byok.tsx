import { ProviderKey } from "@/common/types/settings"
import { store } from "@/views/lib/store"
import { deleteProviderKey, selectPlan, selectSettings, setProviderKey } from "@/views/lib/store/globalSlice"
import { Plus, Sparkles, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

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
   export type Provider = "openai" | "anthropic" | "azure" | "gemini"

   export const BYOKUpgradeMessage = () => (
      <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
         <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full p-4 mb-6">
            <Sparkles className="w-12 h-12 text-purple-500" />
         </div>
         <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Unlock BYOK Capabilities
         </h3>
         <p className="text-[var(--vscode-descriptionForeground)] max-w-md mb-6">
            Upgrade your plan to bring your own API keys and enhance your AI assistant's knowledge with custom
            models.
         </p>
         <div
            onClick={() => tsvscode.postMessage({ type: "open_upgrade" })}
            className="w-[80%] cursor-pointer px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl"
         >
            Upgrade Now
         </div>
      </div>
   )

   interface ProviderSectionProps {
      title: string
      description: string
      provider: Provider
      keys: ProviderKey[]
      onAddKey: () => void
      onDeleteKey: (id: string) => void
      onUpdateKey: (id: string, value: string, field: string) => void
      dispatch: any
   }

   function KeyCard({
      keyItem,
      title,
      onUpdateKey,
      onDeleteKey,
      provider,
   }: {
      keyItem: ProviderKey
      title: string
      onUpdateKey: (id: string, value: string, field: string) => void
      onDeleteKey: (id: string) => void
      provider: Provider
   }) {
      const [errors, setErrors] = useState<Record<string, boolean>>({})

      const validateField = (field: string, value: string) => {
         const isEmpty = !value.trim()
         setErrors((prev) => ({ ...prev, [field]: isEmpty }))
         return !isEmpty
      }

      const handleFieldChange = (field: string, value: string) => {
         validateField(field, value)
         onUpdateKey(keyItem.id, value, field)
      }

      return (
         <div className="bg-[var(--vscode-editor-background)] rounded-lg border border-[var(--vscode-input-border)] p-4 space-y-4">
            <div className="flex items-center justify-between">
               <h4 className="font-medium text-[var(--vscode-foreground)]">API Key</h4>
               <button
                  onClick={() => onDeleteKey(keyItem.id)}
                  className="p-2 text-[var(--vscode-errorForeground)] hover:bg-[var(--vscode-inputValidation-errorBackground)] rounded-md transition-colors"
                  title="Delete key"
               >
                  <Trash2 size={16} />
               </button>
            </div>

            <div className="space-y-3">
               <div>
                  <label className="block text-sm text-[var(--vscode-descriptionForeground)] mb-1">
                     Model Choice <span className="text-[var(--vscode-errorForeground)]">*</span>
                  </label>
                  <input
                     type="text"
                     value={keyItem.model_choice}
                     onChange={(e) => handleFieldChange("model_choice", e.target.value)}
                     className={`w-full p-2 bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border rounded-md ${
                        errors["model_choice"]
                           ? "border-[var(--vscode-errorForeground)]"
                           : "border-[var(--vscode-input-border)]"
                     }`}
                     placeholder={`Enter your ${title} model choice`}
                     required
                  />
                  {errors["model_choice"] && (
                     <p className="text-sm text-[var(--vscode-errorForeground)] mt-1">
                        Model choice is required
                     </p>
                  )}
               </div>

               <div>
                  <label className="block text-sm text-[var(--vscode-descriptionForeground)] mb-1">
                     API Key <span className="text-[var(--vscode-errorForeground)]">*</span>
                  </label>
                  <input
                     type="password"
                     value={keyItem.API_KEY}
                     onChange={(e) => handleFieldChange("API_KEY", e.target.value)}
                     className={`w-full p-2 bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border rounded-md ${
                        errors["API_KEY"]
                           ? "border-[var(--vscode-errorForeground)]"
                           : "border-[var(--vscode-input-border)]"
                     }`}
                     placeholder={`Enter your ${title} API key`}
                     required
                  />
                  {errors["API_KEY"] && (
                     <p className="text-sm text-[var(--vscode-errorForeground)] mt-1">API key is required</p>
                  )}
               </div>

               {keyItem.type === "azure" && (
                  <>
                     <div>
                        <label className="block text-sm text-[var(--vscode-descriptionForeground)] mb-1">
                           API Version <span className="text-[var(--vscode-errorForeground)]">*</span>
                        </label>
                        <input
                           type="text"
                           value={keyItem.API_VERSION}
                           onChange={(e) => handleFieldChange("API_VERSION", e.target.value)}
                           className={`w-full p-2 bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border rounded-md ${
                              errors["API_VERSION"]
                                 ? "border-[var(--vscode-errorForeground)]"
                                 : "border-[var(--vscode-input-border)]"
                           }`}
                           placeholder="Enter API version"
                           required
                        />
                        {errors["API_VERSION"] && (
                           <p className="text-sm text-[var(--vscode-errorForeground)] mt-1">
                              API version is required
                           </p>
                        )}
                     </div>
                     <div>
                        <label className="block text-sm text-[var(--vscode-descriptionForeground)] mb-1">
                           API Base <span className="text-[var(--vscode-errorForeground)]">*</span>
                        </label>
                        <input
                           type="text"
                           value={keyItem.API_BASE}
                           onChange={(e) => handleFieldChange("API_BASE", e.target.value)}
                           className={`w-full p-2 bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border rounded-md ${
                              errors["API_BASE"]
                                 ? "border-[var(--vscode-errorForeground)]"
                                 : "border-[var(--vscode-input-border)]"
                           }`}
                           placeholder="Enter API base URL"
                           required
                        />
                        {errors["API_BASE"] && (
                           <p className="text-sm text-[var(--vscode-errorForeground)] mt-1">
                              API base URL is required
                           </p>
                        )}
                     </div>
                  </>
               )}
            </div>
         </div>
      )
   }

   export function ProviderSection(props: ProviderSectionProps) {
      return (
         <div className="space-y-4">
            <div className="flex items-center justify-between">
               <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-semibold text-[var(--vscode-foreground)]">{props.title}</h3>
                  <p className="text-sm text-[var(--vscode-descriptionForeground)]">{props.description}</p>
               </div>
               <div
                  onClick={props.onAddKey}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-[var(--vscode-textLink-foreground)] hover:opacity-80 transition-opacity cursor-pointer"
               >
                  <Plus size={16} />
                  Add
               </div>
            </div>

            <div className="space-y-4">
               {props.keys.map((keyItem) => (
                  <KeyCard
                     key={keyItem.id}
                     keyItem={keyItem}
                     title={props.title}
                     onUpdateKey={(id, value, field) => props.onUpdateKey(id, value, field)}
                     onDeleteKey={props.onDeleteKey}
                     provider={props.provider}
                  />
               ))}
            </div>
         </div>
      )
   }
}

export default function CredentialsBYOK() {
   const dispatch = useDispatch()
   const plan = useSelector(selectPlan)
   const settings = useSelector(selectSettings)

   if (!plan) return null
   if (!plan.base.limits.access.byok) return <Components.BYOKUpgradeMessage />
   const keys = settings.keys

   const handlers = useMemo(
      () => ({
         handleAddKey: (provider: Components.Provider) => {
            const baseKey = {
               id: Date.now().toString(),
               model_choice: "",
               API_KEY: "",
            }

            let newKey: ProviderKey
            switch (provider) {
               case "azure":
                  newKey = {
                     ...baseKey,
                     type: "azure",
                     API_VERSION: "",
                     API_BASE: "",
                  }
                  break
               case "openai":
                  newKey = {
                     ...baseKey,
                     type: "open-ai",
                  }
                  break
               case "anthropic":
                  newKey = {
                     ...baseKey,
                     type: "claude",
                  }
                  break
               case "gemini":
                  newKey = {
                     ...baseKey,
                     type: "gemini",
                  }
                  break
               default:
                  return
            }
            Algorithms.handleSettingChange(dispatch, setProviderKey({ provider, key: newKey }))
         },
         handleDeleteKey: (provider: Components.Provider, id: string) => {
            Algorithms.handleSettingChange(dispatch, deleteProviderKey({ provider, keyId: id }))
         },
         handleUpdateKey: (provider: Components.Provider, id: string, value: string, field: string) => {
            const existingKey = keys[provider].find((k: ProviderKey) => k.id === id)
            if (!existingKey) return
            const updatedKey = {
               ...existingKey,
               [field]: value.trim(),
            }
            Algorithms.handleSettingChange(dispatch, setProviderKey({ provider, key: updatedKey }))
         },
      }),
      [dispatch, keys]
   )

   return (
      <div className="space-y-8 p-4">
         <Components.ProviderSection
            title="OpenAI"
            description="Access GPT-4 and GPT-3.5 models for code completion and AI features"
            provider="openai"
            keys={keys.openai}
            onAddKey={() => handlers.handleAddKey("openai")}
            onDeleteKey={(id) => handlers.handleDeleteKey("openai", id)}
            onUpdateKey={(id, value, field) => handlers.handleUpdateKey("openai", id, value, field)}
            dispatch={dispatch}
         />

         <Components.ProviderSection
            title="Anthropic"
            description="Use Claude models for advanced code analysis and generation"
            provider="anthropic"
            keys={keys.anthropic}
            onAddKey={() => handlers.handleAddKey("anthropic")}
            onDeleteKey={(id) => handlers.handleDeleteKey("anthropic", id)}
            onUpdateKey={(id, value, field) => handlers.handleUpdateKey("anthropic", id, value, field)}
            dispatch={dispatch}
         />

         <Components.ProviderSection
            title="Azure"
            description="Enterprise-grade OpenAI models with Azure security and compliance"
            provider="azure"
            keys={keys.azure}
            onAddKey={() => handlers.handleAddKey("azure")}
            onDeleteKey={(id) => handlers.handleDeleteKey("azure", id)}
            onUpdateKey={(id, value, field) => handlers.handleUpdateKey("azure", id, value, field)}
            dispatch={dispatch}
         />

         <Components.ProviderSection
            title="Gemini"
            description="Access Google's Gemini models for code completion and analysis"
            provider="gemini"
            keys={keys.gemini}
            onAddKey={() => handlers.handleAddKey("gemini")}
            onDeleteKey={(id) => handlers.handleDeleteKey("gemini", id)}
            onUpdateKey={(id, value, field) => handlers.handleUpdateKey("gemini", id, value, field)}
            dispatch={dispatch}
         />
      </div>
   )
}

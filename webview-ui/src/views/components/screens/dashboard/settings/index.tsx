import { DEFAULT_CHAT_MODEL } from "@/common/core/constants"
import { ChatModel_t } from "@/common/types/model"
import ChatModeSelector from "@/views/components/common/ChatModeSelector"
import ModelSelector from "@/views/components/common/ModelSelector"
import { store } from "@/views/lib/store"
import {
   selectSettings,
   selectSocketConnected,
   setAutoIndexCodebase,
   setAutoSyncDelay,
   setAutoSyncKnowledgebases,
   setDefaultMode,
   setDefaultModel,
   setDisableCodeEvaluations,
   setDisableCodeLens,
   setDisableInlineSuggestions,
   setEnableCodeEvaluations,
   setEnableSecurityEvaluation,
   setEnableUnderstanding,
   setMaxGitCommits,
   setProvideFollowups,
   setSocketConnected,
   setSyncKBToCloudByDefault,
} from "@/views/lib/store/globalSlice"
import { HelpCircle, RefreshCcw, Settings } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

export default function SettingsSidebar() {
   const dispatch = useDispatch()
   const settings = useSelector(selectSettings)
   const [isRestarting, setIsRestarting] = useState(false)
   const [selectedModel, setSelectedModel] = useState<ChatModel_t | null>(null)
   const isSocketConnected = useSelector(selectSocketConnected)

   // Function to handle settings updates
   const handleSettingsUpdate = useCallback((newSettings: any) => {
      tsvscode.postMessage({
         type: "update_settings",
         value: newSettings,
      })
   }, [])

   // Update all the onChange handlers to include the settings update
   const handleSettingChange = useCallback(
      (action: any) => {
         dispatch(action)
         // Get latest settings after state update
         const currentSettings = selectSettings(store.getState())
         handleSettingsUpdate(currentSettings)
      },
      [dispatch, handleSettingsUpdate]
   )

   // Set the selected model to the first model if no model is selected
   useEffect(() => {
      if (selectedModel) return
      const model = settings.defaultModel || DEFAULT_CHAT_MODEL
      setSelectedModel(model)
   }, [selectedModel, settings.defaultModel])

   useEffect(() => {
      if (!isSocketConnected) return
      setIsRestarting(false)
   }, [isSocketConnected])

   return (
      <div className="h-full grid grid-rows-[min-content_1fr] overflow-auto">
         <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center gap-2">
               <Settings className="w-6 h-6" />
               <h2 className="text-2xl font-bold">Settings</h2>
            </div>
         </div>

         <div className="min-h-0 overflow-y-auto space-y-8 p-4 pt-0">
            {/* General Section */}
            <section className="py-4 pb-8 border-b border-[var(--vscode-input-border)]">
               <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold">General</h3>
               </div>

               <div className="space-y-4 opacity-80">
                  <div className="flex justify-between items-center">
                     <label className="flex items-center gap-1">
                        Default Mode
                        <div title="The default interaction mode for new chats">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </label>
                     <div className="!w-[70%]">
                        <ChatModeSelector
                           currentMode={settings.defaultMode}
                           onModeChange={(mode) => handleSettingChange(setDefaultMode(mode))}
                        />
                     </div>
                  </div>

                  <div className="flex justify-between items-center">
                     <label className="flex items-center gap-1">
                        Default Model
                        <div title="The default AI model to use for new chats">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </label>
                     <div className="!w-[70%]">
                        <ModelSelector
                           currentSelection={selectedModel}
                           onSelectionChange={(model) => {
                              setSelectedModel(model)
                              handleSettingChange(setDefaultModel(model))
                           }}
                        />
                     </div>
                  </div>

                  <div className="flex justify-between items-center">
                     <label className="flex items-center gap-1">
                        Provide follow-ups
                        <div title="Automatically show suggested follow-up questions after AI responses">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </label>
                     <input
                        type="checkbox"
                        checked={!settings.disableFollowups}
                        onChange={(e) => handleSettingChange(setProvideFollowups(!e.target.checked))}
                        className="accent-[var(--vscode-checkbox-background)]"
                     />
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Auto-Index your Codebase
                        <div title="Turn off code evaluations">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>
                     <input
                        type="checkbox"
                        checked={settings.autoIndexCodebase}
                        onChange={(e) => handleSettingChange(setAutoIndexCodebase(e.target.checked))}
                        // className="accent-[var(--vscode-checkbox-background)]"
                     />
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Disable code evaluations
                        <div title="Turn off code evaluations">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>
                     <input
                        type="checkbox"
                        checked={settings.disableCodeEvaluations}
                        onChange={(e) => handleSettingChange(setDisableCodeEvaluations(e.target.checked))}
                        // className="accent-[var(--vscode-checkbox-background)]"
                     />
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Disable inline suggestions
                        <div title="Turn off AI inline code suggestions">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>
                     <input
                        type="checkbox"
                        checked={settings.disableInlineSuggestions}
                        onChange={(e) => handleSettingChange(setDisableInlineSuggestions(e.target.checked))}
                     />
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Disable code lens
                        <div title="Turn off AI CodeLens suggestions (inline actions above code)">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>
                     <input
                        type="checkbox"
                        checked={settings.disableCodeLens}
                        onChange={(e) => handleSettingChange(setDisableCodeLens(e.target.checked))}
                        className="accent-[var(--vscode-checkbox-background)]"
                     />
                  </div>
               </div>
            </section>

            {/* Knowledgebases Section */}
            <section className="py-4 pb-8 border-b border-[var(--vscode-input-border)]">
               <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold">Knowledgebases</h3>
               </div>

               <div className="space-y-4 opacity-80">
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Auto Sync
                        <div title="Automatically sync knowledgebase changes">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>
                     <input
                        type="checkbox"
                        checked={settings.autoSyncKnowledgebases}
                        onChange={(e) => handleSettingChange(setAutoSyncKnowledgebases(e.target.checked))}
                        className="accent-[var(--vscode-checkbox-background)]"
                     />
                  </div>

                  {settings.autoSyncKnowledgebases && (
                     <div className="flex justify-between items-center ml-6">
                        <div className="flex items-center gap-1">
                           Delay (minutes)
                           <div title="Delay in minutes before auto-syncing changes">
                              <HelpCircle size={16} className="text-gray-400" />
                           </div>
                        </div>
                        <input
                           type="number"
                           value={settings.autoSyncDelayInMs}
                           onChange={(e) => handleSettingChange(setAutoSyncDelay(Number(e.target.value)))}
                           className="!w-[70%] px-2 py-1 rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]"
                        />
                     </div>
                  )}

                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Sync to cloud by default
                        <div title="Automatically sync new knowledgebases to cloud storage">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>
                     <input
                        type="checkbox"
                        checked={settings.syncKBToCloudByDefault}
                        onChange={(e) => handleSettingChange(setSyncKBToCloudByDefault(e.target.checked))}
                        className="accent-[var(--vscode-checkbox-background)]"
                     />
                  </div>

                  <div className="flex justify-between items-center">
                     <label className="flex items-center gap-1">
                        Max Git Commits
                        <div title="Maximum number of git commits to fetch for history">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </label>
                     <input
                        type="number"
                        value={settings.maxGitCommits}
                        min={1}
                        onChange={(e) => handleSettingChange(setMaxGitCommits(Number(e.target.value)))}
                        className="!w-[70%] px-2 py-1 rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]"
                     />
                  </div>
               </div>
            </section>
            {/* Code Review Section */}
            <section className="py-4 pb-8 border-b border-[var(--vscode-input-border)]">
               <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold">Code Review</h3>
               </div>

               <div className="space-y-4 opacity-80">
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Code Evaluation
                        <div title="Enable Code Evaluation when reviewing code">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>
                     <input
                        type="checkbox"
                        checked={settings.enableCodeEvaluation}
                        onChange={(e) => handleSettingChange(setEnableCodeEvaluations(e.target.checked))}
                        className="accent-[var(--vscode-checkbox-background)]"
                     />
                  </div>

                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Security Evaluation
                        <div title="Enable Security Evaluation when reviewing code">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>
                     <input
                        type="checkbox"
                        checked={settings.enableSecurityEvaluation}
                        onChange={(e) => handleSettingChange(setEnableSecurityEvaluation(e.target.checked))}
                        className="accent-[var(--vscode-checkbox-background)]"
                     />
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Understanding
                        <div title="Enable understanding when reviewing code">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>
                     <input
                        type="checkbox"
                        checked={settings.enableUnderstanding}
                        onChange={(e) => handleSettingChange(setEnableUnderstanding(e.target.checked))}
                        className="accent-[var(--vscode-checkbox-background)]"
                     />
                  </div>
               </div>
            </section>

            {/* Management Section */}
            {/* <section className="py-4 pb-8 border-b border-[var(--vscode-input-border)]">
               <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold">Management</h3>
               </div>

               <div className="space-y-4 opacity-80">
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-1">
                        Restart server
                        <div title="Restart the CodeMate server">
                           <HelpCircle size={16} className="text-gray-400" />
                        </div>
                     </div>

                     <button
                        className={
                           "flex justify-center items-center gap-2 font-bold text-[var(--vscode-foreground)] bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)] px-2.5 py-1.5 rounded-full " +
                           (isRestarting ? "opacity-50 !cursor-progress" : "")
                        }
                        onClick={async () => {
                           if (isRestarting) return
                           setIsRestarting(true)
                           dispatch(setSocketConnected(false))
                           tsvscode.postMessage({
                              type: "restart_server",
                              value: {},
                           })
                        }}
                     >
                        {isRestarting ? (
                           <RefreshCcw className="w-4 h-4 animate-spin" />
                        ) : (
                           <RefreshCcw className="w-4 h-4" />
                        )}
                        <span className="text-sm whitespace-nowrap">Restart</span>
                     </button>
                  </div>
               </div>
            </section> */}
         </div>
      </div>
   )
}

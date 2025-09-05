import { DEFAULT_CHAT_MODEL } from "@/common/core/constants"
import { ChatMode } from "@/common/types/chat"
import { ChatModel_t } from "@/common/types/model"
import { Plan_t } from "@/common/types/plan"
import { ProviderKey, Settings_t } from "@/common/types/settings"
import { User_t } from "@/common/types/user"
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."

export enum Tab {
   Chat = "chat",
   Agents = "agents",
   History = "history",
   KnowledgeBase = "knowledge-base",
   Settings = "settings",
   Credentials = "credentials",
   Dependencies = "dependencies",
}

export interface GlobalState {
   workspacePath: string | null
   sessionID: string | null
   isFetchingSession:boolean
   isSocketConnected: boolean
   plan: Plan_t | null
   settings: Settings_t
   user: User_t | null
   subsystemVersion: string | null
}

const initialState: GlobalState = {
   workspacePath: null,
   sessionID: null,
   isFetchingSession:false,
   isSocketConnected: false,
   settings: {
      defaultModel: DEFAULT_CHAT_MODEL,
      defaultMode: ChatMode.NORMAL,
      keys: {
         openai: [],
         anthropic: [],
         azure: [],
         gemini: [],
      },
      autoSyncDelayInMs: 5,
      syncKBToCloudByDefault: false,
      autoSyncKnowledgebases: false,
      autoIndexCodebase:false,
      disableInlineSuggestions: false,
      disableCodeEvaluations: false,
      disableCodeLens: false,
      disableFollowups: true,
      enableCodeEvaluation:true,
      enableSecurityEvaluation:true,
      enableUnderstanding:true,
      scmAccessTokens: {
         github: null,
         gitlab: null,
      },
      maxGitCommits: 100,
   },
   plan: null,
   user: null,
   subsystemVersion: null,
}

export const globalSlice = createSlice({
   name: "global",
   initialState,
   reducers: {
      setWorkspacePath: (state, action: PayloadAction<string | null>) => {
         state.workspacePath = action.payload
      },
      setSessionID: (state, action: PayloadAction<string | null>) => {
         state.sessionID = action.payload
      },
      setIsFetchingSession:(state, action: PayloadAction<boolean>) => {
         state.isFetchingSession = action.payload
      },
      setSocketConnected: (state, action: PayloadAction<boolean>) => {
         state.isSocketConnected = action.payload
      },
      setSettings: (state, action: PayloadAction<Settings_t>) => {
         state.settings = action.payload
      },
      setDefaultModel: (state, action: PayloadAction<ChatModel_t>) => {
         state.settings.defaultModel = action.payload
      },
      setProviderKey: (
         state,
         action: PayloadAction<{ provider: keyof Settings_t["keys"]; key: ProviderKey }>
      ) => {
         const { provider, key } = action.payload
         const existingKeyIndex = state.settings.keys[provider].findIndex((k) => k.id === key.id)

         if (existingKeyIndex >= 0) {
            // Update existing key
            state.settings.keys[provider][existingKeyIndex] = key
         } else {
            // Add new key
            state.settings.keys[provider].push(key)
         }
      },
      deleteProviderKey: (
         state,
         action: PayloadAction<{ provider: keyof Settings_t["keys"]; keyId: string }>
      ) => {
         const { provider, keyId } = action.payload
         state.settings.keys[provider] = state.settings.keys[provider].filter((k) => k.id !== keyId)
      },
      setAutoSyncDelay: (state, action: PayloadAction<number>) => {
         state.settings.autoSyncDelayInMs = action.payload
      },
      setSyncKBToCloudByDefault: (state, action: PayloadAction<boolean>) => {
         state.settings.syncKBToCloudByDefault = action.payload
      },
      setAutoSyncKnowledgebases: (state, action: PayloadAction<boolean>) => {
         state.settings.autoSyncKnowledgebases = action.payload
      },
      setAutoIndexCodebase: (state, action: PayloadAction<boolean>) => {
         state.settings.autoIndexCodebase = action.payload
      },
      setDisableInlineSuggestions: (state, action: PayloadAction<boolean>) => {
         state.settings.disableInlineSuggestions = action.payload
      },
      setDisableCodeEvaluations: (state, action: PayloadAction<boolean>) => {
         state.settings.disableCodeEvaluations = action.payload
      },
      setDisableCodeLens: (state, action: PayloadAction<boolean>) => {
         state.settings.disableCodeLens = action.payload
      },
      setEnableCodeEvaluations: (state, action: PayloadAction<boolean>) => {
          state.settings.enableCodeEvaluation = action.payload
      },
      setEnableUnderstanding: (state, action: PayloadAction<boolean>) => {
          state.settings.enableUnderstanding = action.payload
      },
      setEnableSecurityEvaluation: (state, action: PayloadAction<boolean>) => {
          state.settings.enableSecurityEvaluation = action.payload
      },
      setMaxGitCommits: (state, action: PayloadAction<number>) => {
         state.settings.maxGitCommits = action.payload
      },
      setProvideFollowups: (state, action: PayloadAction<boolean>) => {
         state.settings.disableFollowups = action.payload
      },
      setScmAccessToken: (
         state,
         action: PayloadAction<{ platform: keyof Settings_t["scmAccessTokens"]; token: string | null }>
      ) => {
         state.settings.scmAccessTokens[action.payload.platform] = action.payload.token
      },
      setDefaultMode: (state, action: PayloadAction<ChatMode>) => {
         state.settings.defaultMode = action.payload
      },
      setPlan: (state, action: PayloadAction<Plan_t | null>) => {
         state.plan = action.payload
      },
      setUser: (state, action: PayloadAction<User_t | null>) => {
         state.user = action.payload
      },
      setSubsystemVersion: (state, action: PayloadAction<string | null>) => {
         state.subsystemVersion = action.payload
      },
   },
})

export const {
   setWorkspacePath,
   setSessionID,
   setIsFetchingSession,
   setSocketConnected,
   setSettings,
   setDefaultModel,
   setProviderKey,
   deleteProviderKey,
   setAutoSyncDelay,
   setSyncKBToCloudByDefault,
   setAutoSyncKnowledgebases,
   setAutoIndexCodebase,
   setDisableInlineSuggestions,
   setDisableCodeEvaluations,
   setDisableCodeLens,
   setEnableCodeEvaluations,
   setEnableSecurityEvaluation,
   setEnableUnderstanding,
   setMaxGitCommits,
   setProvideFollowups,
   setScmAccessToken,
   setDefaultMode,
   setPlan,
   setUser,
   setSubsystemVersion,
} = globalSlice.actions
export default globalSlice.reducer

// Selectors
export const selectWorkspacePath = (state: { globalState: GlobalState }) => state.globalState.workspacePath
export const selectSessionID = (state: { globalState: GlobalState }) => state.globalState.sessionID
export const selectIsFetchingSession = (state: { globalState: GlobalState }) => state.globalState.isFetchingSession
export const selectSocketConnected = (state: { globalState: GlobalState }) =>
   state.globalState.isSocketConnected

// New selectors
export const selectSettings = (state: { globalState: GlobalState }) => state.globalState.settings
export const selectDefaultModel = createSelector([selectSettings], (settings) => settings.defaultModel)
export const selectProviderKeys = createSelector([selectSettings], (settings) => settings.keys)
export const selectBYOKAsModels = createSelector([selectProviderKeys], (keys): ChatModel_t[] => {
   const getProviderName = (key: ProviderKey) => {
      switch (key.type) {
         case "azure":
            return "Azure"
         case "open-ai":
            return "OpenAI"
         case "claude":
            return "Claude"
      }
   }

   return Object.entries(keys).flatMap(([provider, key]) =>
      key.map((k) => ({
         type: "byok",
         data: k,
         id: k.id,
         display_name: k.model_choice,
         icon: "",
         disabled: false,
         description: getProviderName(k),
      }))
   )
})
export const selectAutoSyncDelay = createSelector([selectSettings], (settings) => settings.autoSyncDelayInMs)
export const selectSyncKBToCloudByDefault = createSelector(
   [selectSettings],
   (settings) => settings.syncKBToCloudByDefault
)
export const selectAutoSyncKnowledgebases = createSelector(
   [selectSettings],
   (settings) => settings.autoSyncKnowledgebases
)
export const selectDisableInlineSuggestions = createSelector(
   [selectSettings],
   (settings) => settings.disableInlineSuggestions
)
export const selectDisableCodeEvaluations = createSelector(
   [selectSettings],
   (settings) => settings.disableCodeEvaluations
)
export const selectDisableCodeLens = createSelector([selectSettings], (settings) => settings.disableCodeLens)
export const selectEnableCodeEvaluation = createSelector([selectSettings], (settings) => settings.enableCodeEvaluation)
export const selectEnableSecurityEvaluation = createSelector([selectSettings], (settings) => settings.enableSecurityEvaluation)
export const selectEnableUnderstanding = createSelector([selectSettings], (settings) => settings.enableUnderstanding)
export const selectProvideFollowups = createSelector(
   [selectSettings],
   (settings) => settings.disableFollowups
)
export const selectScmAccessTokens = createSelector([selectSettings], (settings) => settings.scmAccessTokens)
export const selectDefaultMode = createSelector([selectSettings], (settings) => settings.defaultMode)
export const selectPlan = (state: RootState) => state.globalState.plan
export const selectSubsystemVersion = (state: RootState) => state.globalState.subsystemVersion

// User selector from userSlice
export const selectUser = (state: RootState) => state.globalState.user
export const selectIsAuthenticated = createSelector(
   [selectUser, (state: RootState) => state.globalState.sessionID],
   (user, sessionID) => user && sessionID 
)

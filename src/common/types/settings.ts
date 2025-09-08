import { ChatMode } from "./chat"
import { ChatModel_t } from "./model"

type BaseProviderKey = {
   id: string
}

type AzureProviderKey = BaseProviderKey & {
   type: "azure"
   model_choice: string
   API_KEY: string
   API_VERSION: string
   API_BASE: string
}

type OpenAIProviderKey = BaseProviderKey & {
   type: "open-ai"
   model_choice: string
   API_KEY: string
}

type ClaudeProviderKey = BaseProviderKey & {
   type: "claude"
   model_choice: string
   API_KEY: string
}

type GeminiProviderKey = BaseProviderKey & {
   type: "gemini"
   model_choice: string
   API_KEY: string
}

export type ProviderKey = AzureProviderKey | OpenAIProviderKey | ClaudeProviderKey | GeminiProviderKey

export type ProviderKeys = {
   openai: ProviderKey[]
   anthropic: ProviderKey[]
   azure: ProviderKey[]
   gemini: ProviderKey[]
}

export type Settings_t = {
   defaultModel: ChatModel_t | null
   defaultMode: ChatMode
   keys: ProviderKeys
   autoSyncDelayInMs: number
   syncKBToCloudByDefault: boolean
   autoSyncKnowledgebases: boolean
   autoIndexCodebase:boolean
   disableInlineSuggestions: boolean
   disableCodeEvaluations: boolean
   disableCodeLens: boolean
   disableFollowups: boolean
   enableCodeEvaluation:boolean
   enableSecurityEvaluation:boolean
   enableUnderstanding:boolean
   scmAccessTokens: {
      github: string | null
      gitlab: string | null
   }
   /**
    * Maximum number of git commits to fetch when loading commit history.
    * This value is used by the extension when querying the git log.
    */
   maxGitCommits: number
}

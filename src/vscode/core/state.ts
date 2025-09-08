import * as fs from "fs"
import * as path from "path"

import { API } from "@/common/api"
import { CACHE_VERSION, DEFAULT_CHAT_MODEL } from "@/common/core/constants"
import { ChatMode } from "@/common/types/chat"
import { Settings_t } from "@/common/types/settings"
import { User_t } from "@/common/types/user"
import { CodeEvaluationsState } from "@webview/views/lib/store/codeEvaluationsSlice"
import { CLIENT_SERVER_INSTALL_DIR } from "./constants"

// ----------------------------------------------------------------------------------------------------------

class StorageSyncedState {
   private stateFilePath = path.join(CLIENT_SERVER_INSTALL_DIR, "state.json")
   private state: Record<string, any> = {}
   private isInitialized = false

   private debounceTimeout: NodeJS.Timeout | null = null

   private ensureInitialized() {
      if (this.isInitialized) return

      try {
         this.state = JSON.parse(fs.readFileSync(this.stateFilePath, "utf8"))
      } catch (error) {
         console.error("Error loading state:", error)
      }

      this.isInitialized = true
   }

   private saveState() {
      if (this.debounceTimeout) clearTimeout(this.debounceTimeout)

      this.debounceTimeout = setTimeout(() => {
         console.log("Saving state...")
         try {
            fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), "utf8")
         } catch (error) {
            console.error("Error saving state:", error)
         }
      }, 1000)
   }

   get<T>(key: string): T | undefined {
      this.ensureInitialized()

      return this.state[CACHE_VERSION][key]
   }

   set<T>(key: string, value: T) {
      this.ensureInitialized()

      this.state[CACHE_VERSION] ??= {}
      if (value === undefined) {
         delete this.state[CACHE_VERSION][key]
      } else {
         this.state[CACHE_VERSION][key] = value
      }
      this.saveState()
   }

   clear() {
      this.state = {}
      this.saveState()
   }
}

export class CachedState {
   private static state = new StorageSyncedState()

   // -------------------------------------------------------------------------------------------------------

   static clear() {
      this.state.clear()
   }

   // -------------------------------------------------------------------------------------------------------

   static getProcessID(): number | undefined {
      const value = this.state.get<number>("process-id")
      if (!value) return undefined
      return +value
   }

   static setProcessID(id: number | undefined) {
      return this.state.set("process-id", id)
   }

   // -------------------------------------------------------------------------------------------------------

   static getUser(): User_t | undefined {
      return this.state.get<User_t | undefined>("user")
   }

   static setUser(user: User_t | undefined) {
      return this.state.set("user", user)
   }

   // -------------------------------------------------------------------------------------------------------

   static setSettings(settings: Settings_t) {
      return this.state.set("settings", settings)
   }

   static getSettings(): Settings_t {
      const settings = this.state.get<Settings_t | undefined>("settings")

      return (
         settings || {
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
            disableInlineSuggestions: false,
            disableCodeEvaluations: false,
            disableCodeLens: false,
            disableFollowups: false,
            enableCodeEvaluation:true,
            enableSecurityEvaluation:true,
            enableUnderstanding:true,
            scmAccessTokens: {
               github: null,
               gitlab: null,
            },
            maxGitCommits: 100,
            autoIndexCodebase: false,
         }
      )
   }

   // -------------------------------------------------------------------------------------------------------

   static setDebugState(state: any) {
      return this.state.set("debug", state)
   }

   static getDebugState(): any {
      return this.state.get("debug")
   }

   // -------------------------------------------------------------------------------------------------------

   static setOptimizeState(state: any) {
      return this.state.set("optimize", state)
   }

   static getOptimizeState(): any {
      return this.state.get("optimize")
   }

   // -------------------------------------------------------------------------------------------------------

   static setTestcaseState(state: any) {
      return this.state.set("testcase", state)
   }

   static getTestcaseState(): any {
      return this.state.get("testcase")
   }

   // -------------------------------------------------------------------------------------------------------

   static setSwaggerState(state: any) {
      return this.state.set("swagger", state)
   }

   static getSwaggerState(): any {
      return this.state.get("swagger")
   }

   // -------------------------------------------------------------------------------------------------------

   static setReviewState(state: any) {
      return this.state.set("review", state)
   }

   static getReviewState(): any {
      return this.state.get("review")
   }

   // -------------------------------------------------------------------------------------------------------

   static setKnowledgebaseState(state: any) {
      return this.state.set("knowledgebase", state)
   }

   static getKnowledgebaseState(): any {
      return this.state.get("knowledgebase")
   }

   // -------------------------------------------------------------------------------------------------------

   static setCodeEvaluationsState(state: CodeEvaluationsState) {
      return this.state.set("code-evaluations", state)
   }

   static getCodeEvaluationsState(): CodeEvaluationsState {
      return this.state.get("code-evaluations") || { runs: {} }
   }

   // -------------------------------------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------------------------------------

export class LocalServersState {
   static async getSessionID(): Promise<string | undefined> {
      const { data } = await API.BACKEND_LOCAL.get<{ session_id: string; status: string; message: string }>(
         "/get_session"
      )
      if (data.status !== "success") return undefined
      return data.session_id
   }

   static async setSessionID(sessionID: string | null) {
      if (sessionID !== null) {
         await API.BACKEND_LOCAL.post<{ status: string; message: string }>("/set_session", {
            session_id: sessionID,
         })
      } else {
         await API.BACKEND_LOCAL.post<{ status: string; message: string }>("/logout", {
            session_id: sessionID,
         })
      }
   }
}

// ----------------------------------------------------------------------------------------------------------

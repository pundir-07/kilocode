import { ProviderKey } from "./settings"

export enum SwaggerRunState {
   INPROGRESS = "INPROGRESS",
   FAILED = "FAILED",
   COMPLETED = "COMPLETED",
}

export enum SwaggerEndpointStatus {
   SUCCESS = "SUCCESS",
   ERROR = "ERROR",
   INPROGRESS = "INPROGRESS",
}

export type SwaggerEndpoint_t = {
   id: string
   path: string
   method: string
   code: string
   imports: string[]
   status: SwaggerEndpointStatus
}
export type SwaggerRunResult_t = {
   endpoints: SwaggerEndpoint_t[]
   final_imports: string[]
   final_code: string
   kb_code: Record<string, any>
   references: {
      type: "docs"
      name: string
      path: string
      content: string
   }[]
}

export type SwaggerRun_t = {
   id: string
   source: {
      type: "file" | "url" | "content" | "knowledgebase"
      value: string
   }
   language: string
   base_url: string
   state: SwaggerRunState
   custom_instructions: string
   provider: string | ProviderKey | null
   result: null | SwaggerRunResult_t

   dateCreated: number
   dateUpdated: number
}

export enum KnowledgebaseSource {
   Local = "LOCAL",
   Remote = "REMOTE",
}

export enum KnowledgebaseType {
   Codebase = "codebase",
   Github = "git",
   Docs = "docs",
   Swagger = "swagger",
}

export enum KnowledgebaseScope {
   Personal = "personal",
   Organization = "organization",
}

export enum KnowledgebaseSyncConfig {
   DoNotSync = "do_not_sync",
   CloudSyncPersonal = "cloud_sync_personal",
   CloudSyncTeam = "cloud_sync_team",
}

export type KnowledgebaseSyncConfig_t = {
   enabled: boolean
   lastSynced: number
}

export enum KnowledgebaseStatus {
   READY = "ready",
   DRAFT = "draft",
   PROGRESS = "progress",
   ERROR = "error",
}

export type KnowledgebaseBasic_t = {
   id: string
   name: string
   description: string
   type: KnowledgebaseType
   dateCreated:number,
   dateUpdated:number,
   dateSynced:number,
   isAutoIndexed: boolean
   source: KnowledgebaseSource
   scope: KnowledgebaseScope
   syncConfig: KnowledgebaseSyncConfig_t
   can_sync:boolean,
   can_upload:boolean,
   cloud_id:string,
   status: KnowledgebaseStatus
   progress: {
      status: string
      message: string
      progress: number
   }
}

export type KnowledgebaseTypeCodebase_t = KnowledgebaseBasic_t & {
   type: KnowledgebaseType.Codebase
   metadata: {
      path: string
      files: string[]
   }
}
export type KnowledgebaseTypeGithub_t = KnowledgebaseBasic_t & {
   type: KnowledgebaseType.Github
   metadata: {
      repo_url: string
      branch: string
      accessToken: string | null
   }
}
export type KnowledgebaseTypeDocs_t = KnowledgebaseBasic_t & {
   type: KnowledgebaseType.Docs
   metadata: {
      urls: string[]
   }
}
export type KnowledgebaseTypeSwagger_t = KnowledgebaseBasic_t & {
   type: KnowledgebaseType.Swagger
   metadata: {
      endpoints: {
         path: string
         method: string
         spec: any
      }[]
      source_type: "file" | "content" | "url"
      source_value: string
   }
}

export type Knowledgebase_t =
   | KnowledgebaseTypeCodebase_t
   | KnowledgebaseTypeGithub_t
   | KnowledgebaseTypeDocs_t
   | KnowledgebaseTypeSwagger_t

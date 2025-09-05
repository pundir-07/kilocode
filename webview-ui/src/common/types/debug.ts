export enum DebugRunState {
   INPROGRESS = "INPROGRESS",
   FAILED = "FAILED",
   COMPLETED = "COMPLETED",
}

export type DebugRun_t = {
   id: string
   code: string
   state: DebugRunState
   dateCreated: number
   dateUpdated: number
   file_path: string
}

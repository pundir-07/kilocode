export enum OptimizeRunState {
   INPROGRESS = "INPROGRESS",
   FAILED = "FAILED",
   COMPLETED = "COMPLETED",
}

export type OptimizeRun_t = {
   id: string
   code: string
   state: OptimizeRunState
   dateCreated: number
   dateUpdated: number
   file_path: string
}

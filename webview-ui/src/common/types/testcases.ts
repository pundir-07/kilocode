export enum TestcaseRunState {
   INPROGRESS = "INPROGRESS",
   FAILED = "FAILED",
   COMPLETED = "COMPLETED",
}

export type TestcaseRun_t = {
   id: string
   code: string
   understanding: string
   language: string
   custom_instructions: string
   state: TestcaseRunState
   dateCreated: number
   dateUpdated: number
   file_path: string
}

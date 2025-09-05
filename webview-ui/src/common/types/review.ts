export enum ReviewEvaluationType {
   UNDERSTANDING = "understanding",
   CODE_EVAL = "code_eval",
   SECURITY_EVAL = "security_eval",
}

export interface ReviewRun_t {
   id: string
   title: string
   state: ReviewRunState
   dateCreated: number
   dateUpdated: number
   files: {
      file: string
      content: string
      status: ReviewRunState
      evaluations: { type: ReviewEvaluationType; content: string }[]
   }[]
}

export enum ReviewRunState {
   INPROGRESS = "INPROGRESS",
   COMPLETED = "COMPLETED",
   FAILED = "FAILED",
}

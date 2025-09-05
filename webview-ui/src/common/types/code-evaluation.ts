export enum CodeEvaluationStatus {
   PENDING = "pending",
   COMPLETED = "completed",
   FAILED = "failed",
}

export type CodeEvaluationDocsContent_t = {
   status: CodeEvaluationStatus
   content: string | null
}

export enum SecurityReviewProblemStatus {
   UNTOUCHED = "untouched",
   FIXED = "fixed",
   PENDING = "pending",
}

export type CodeEvaluationSecurityContent_t = {
   status: CodeEvaluationStatus
   content: {
      summary: string
      problems: {
         id: string
         title: string
         description: string
         targetCodeBlock: string
         severity: number // 1-10
         status: SecurityReviewProblemStatus
      }[]
   } | null
}

export type CodeEvaluation_t = {
   id: string
   filePath: string
   dateCreated: number
   dateUpdated: number
   lastEvaluatedCode:string
   content: {
      docs: CodeEvaluationDocsContent_t
      security: CodeEvaluationSecurityContent_t
   }
}

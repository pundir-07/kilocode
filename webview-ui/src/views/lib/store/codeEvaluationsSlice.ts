import { CodeEvaluation_t, CodeEvaluationStatus } from "@/common/types/code-evaluation"
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."

export interface CodeEvaluationsState {
   // Workspace path -> File path -> Code evaluation run
   runs: Record<string, Record<string, CodeEvaluation_t>>
}

const initialState: CodeEvaluationsState = {
   runs: {},
}

const codeEvaluationSlice = createSlice({
   name: "codeEvaluation",
   initialState,
   reducers: {
      setCodeEvaluationsStateFromCache: (state, action: PayloadAction<CodeEvaluationsState>) => {
         state.runs = action.payload.runs
      },
   },
})

export const { setCodeEvaluationsStateFromCache } = codeEvaluationSlice.actions

export default codeEvaluationSlice.reducer

// Selectors
export const selectCodeEvaluationsState = (state: RootState) => state.codeEvaluations
export const selectCodeEvaluationsRuns = createSelector([selectCodeEvaluationsState], (state) => state.runs)

export const selectCodeEvaluationsRunByPath = createSelector(
   [
      selectCodeEvaluationsRuns,
      (_state: RootState, workspacePath: string) => workspacePath,
      (_state: RootState, _workspacePath: string, filePath: string) => filePath,
   ],
   (runs, workspacePath, filePath) => {
      const workspaceRuns = runs[workspacePath] || {}
      const normalizedSearchPath = normalizePath(filePath)
      const matchingKey = Object.keys(workspaceRuns).find(
         (key) => normalizePath(key) === normalizedSearchPath
      )
      return matchingKey ? workspaceRuns[matchingKey] : undefined
   }
)

export const selectCodeEvaluationsRunsByWorkspace = createSelector(
   [selectCodeEvaluationsRuns, (_state: RootState, workspacePath: string) => workspacePath],
   (runs, workspacePath) => {
      if (!runs) return {}

      const workspaceRuns = runs[workspacePath] || {}
      // Create a new object with normalized paths
      return Object.entries(workspaceRuns).reduce(
         (acc, [key, value]) => {
            const normalizedKey = normalizePath(key)
            acc[normalizedKey] = value
            return acc
         },
         {} as Record<string, CodeEvaluation_t>
      )
   }
)

export const selectAllCodeEvaluationsActionRuns = createSelector(
   [selectCodeEvaluationsRuns],
   (runs): CodeEvaluation_t[] => {
      if (!runs) return []

      const allRuns: CodeEvaluation_t[] = []
      for (const workspacePath in runs) {
         for (const filePath in runs[workspacePath]) {
            allRuns.push(runs[workspacePath][filePath])
         }
      }
      return allRuns
   }
)

// Updated selectors to work with the new status structure
export const selectCodeEvaluationsRunsByDocsStatus = createSelector(
   [selectAllCodeEvaluationsActionRuns, (_state: RootState, status: CodeEvaluationStatus) => status],
   (runs, status) => (!runs ? [] : runs.filter((run) => run.content.docs.status === status))
)

export const selectCodeEvaluationsRunsBySecurityStatus = createSelector(
   [selectAllCodeEvaluationsActionRuns, (_state: RootState, status: CodeEvaluationStatus) => status],
   (runs, status) => (!runs ? [] : runs.filter((run) => run.content.security.status === status))
)

// Helper function to check if any action type has a specific status
export const selectCodeEvaluationsRunsByAnyStatus = createSelector(
   [selectAllCodeEvaluationsActionRuns, (_state: RootState, status: CodeEvaluationStatus) => status],
   (runs, status) =>
      !runs
         ? []
         : runs.filter((run) => run.content.docs.status === status || run.content.security.status === status)
)

// Helper function to check if all action types have a specific status
export const selectCodeEvaluationsRunsByAllStatus = createSelector(
   [selectAllCodeEvaluationsActionRuns, (_state: RootState, status: CodeEvaluationStatus) => status],
   (runs, status) =>
      !runs
         ? []
         : runs.filter((run) => run.content.docs.status === status && run.content.security.status === status)
)

// Workspace-specific selectors
// export const selectFilesWithCodeEvaluations = createSelector(
//    [selectCodeEvaluationsRuns, (_state: RootState, workspacePath: string) => workspacePath],
//    (runs, workspacePath) => Object.keys(runs[workspacePath] || {}).filter((k) => Object.keys(runs[k]).length)
// )

// export const selectFilesWithCodeEvaluations = createSelector(
//    [selectCodeEvaluationsRuns, (_state: RootState, workspacePath: string) => workspacePath],
//    (runs, workspacePath) => Object.keys(runs[workspacePath] || {})
// )

// Normalize path for cross-platform compatibility
const normalizePath = (path: string) => path.replace(/[\\/]/g, "/")

export const selectFilesWithCodeEvaluations = createSelector(
   [selectCodeEvaluationsRuns, (_state: RootState, workspacePath: string) => workspacePath],
   (runs, workspacePath) => {
      if (!runs) return []

      const workspaceRuns = runs[workspacePath] || {}
      return Object.keys(workspaceRuns)
         .map((filePath) => normalizePath(filePath))
         .filter(
            (filePath) =>
               workspaceRuns[
                  Object.keys(workspaceRuns).find((key) => normalizePath(key) === filePath) || ""
               ] !== undefined
         )
   }
)

export const selectWorkspacesWithCodeEvaluations = createSelector([selectCodeEvaluationsRuns], (runs) =>
   Object.keys(runs)
)

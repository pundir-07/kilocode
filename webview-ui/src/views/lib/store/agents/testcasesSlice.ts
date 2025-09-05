import { TestcaseRun_t, TestcaseRunState } from "@/common/types/testcases"
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from ".."

export interface TestcaseState {
   runs: TestcaseRun_t[]
   hasLoadedInitialCache: boolean
}

const initialState: TestcaseState = {
   runs: [],
   hasLoadedInitialCache: false,
}

const testcaseSlice = createSlice({
   name: "testcase",
   initialState,
   reducers: {
      setTestcaseStateFromCache: (state, action: PayloadAction<TestcaseState>) => {
         state.runs = action.payload.runs.map((run) => {
            if (run.state === TestcaseRunState.INPROGRESS) {
               return { ...run, state: TestcaseRunState.FAILED }
            }
            return run
         })
         state.hasLoadedInitialCache = true
      },
      addRun: (state, action: PayloadAction<TestcaseRun_t>) => {
         const now = Date.now()
         state.runs.push({
            ...action.payload,
            dateCreated: now,
            dateUpdated: now,
         })
      },
      updateRun: (state, action: PayloadAction<{ id: string; update: Partial<TestcaseRun_t> }>) => {
         state.runs = state.runs.map((r) =>
            r.id === action.payload.id ? { ...r, ...action.payload.update, dateUpdated: Date.now() } : r
         )
      },
      deleteRun: (state, action: PayloadAction<string>) => {
         state.runs = state.runs.filter((run) => run.id !== action.payload)
      },
      clearRuns: (state) => {
         state.runs = []
      },
   },
})

export const { addRun, updateRun, deleteRun, clearRuns, setTestcaseStateFromCache } = testcaseSlice.actions
export default testcaseSlice.reducer

// Selectors
export const selectTestcaseState = (state: RootState) => state.testcases
export const selectTestcaseRuns = createSelector([selectTestcaseState], (state) => state.runs)

export const selectTestcaseRunById = createSelector(
   [selectTestcaseRuns, (_state: RootState, id: string) => id],
   (runs, id) => runs.find((r) => r.id === id)
)

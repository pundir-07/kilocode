import { OptimizeRun_t, OptimizeRunState } from "../../../../common/types/optimize"
import { RootState } from "../../../../views/lib/store"
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"

export interface OptimizeState {
   runs: OptimizeRun_t[]
   hasLoadedInitialCache: boolean
}

const initialState: OptimizeState = {
   runs: [],
   hasLoadedInitialCache: false,
}

const optimizeSlice = createSlice({
   name: "optimize",
   initialState,
   reducers: {
      setOptimizeStateFromCache: (state, action: PayloadAction<OptimizeState>) => {
         state.runs = action.payload.runs.map((run) => {
            if (run.state === OptimizeRunState.INPROGRESS) {
               return { ...run, state: OptimizeRunState.FAILED }
            }
            return run
         })
         state.hasLoadedInitialCache = true
      },
      addRun: (state, action: PayloadAction<OptimizeRun_t>) => {
         const now = Date.now()
         state.runs.push({
            ...action.payload,
            dateCreated: now,
            dateUpdated: now,
         })
      },
      updateRun: (state, action: PayloadAction<{ id: string; update: Partial<OptimizeRun_t> }>) => {
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

export const { addRun, updateRun, deleteRun, clearRuns, setOptimizeStateFromCache } = optimizeSlice.actions
export default optimizeSlice.reducer

// Selectors
export const selectOptimizeState = (state: RootState) => state.optimize
export const selectOptimizeRuns = createSelector([selectOptimizeState], (state) => state.runs)

export const selectOptimizeRunById = createSelector(
   [selectOptimizeRuns, (_state: RootState, id: string) => id],
   (runs, id) => runs.find((r) => r.id === id)
)

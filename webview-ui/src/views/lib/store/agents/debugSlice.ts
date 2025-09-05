import { DebugRun_t, DebugRunState } from "@/common/types/debug"
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from ".."

export interface DebugState {
   runs: DebugRun_t[]
   hasLoadedInitialCache: boolean
}

const initialState: DebugState = {
   runs: [],
   hasLoadedInitialCache: false,
}

const debugSlice = createSlice({
   name: "debug",
   initialState,
   reducers: {
      setDebugStateFromCache: (state, action: PayloadAction<DebugState>) => {
         state.runs = action.payload.runs.map((run) => {
            if (run.state === DebugRunState.INPROGRESS) {
               return { ...run, state: DebugRunState.FAILED }
            }
            return run
         })
         state.hasLoadedInitialCache = true
      },
      addRun: (state, action: PayloadAction<DebugRun_t>) => {
         const now = Date.now()
         state.runs.push({
            ...action.payload,
            dateCreated: now,
            dateUpdated: now,
         })
      },
      updateRun: (state, action: PayloadAction<{ id: string; update: Partial<DebugRun_t> }>) => {
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

export const { addRun, updateRun, deleteRun, clearRuns, setDebugStateFromCache } = debugSlice.actions
export default debugSlice.reducer

// Selectors
export const selectDebugState = (state: RootState) => state.debug
export const selectDebugRuns = createSelector([selectDebugState], (state) => state.runs)

export const selectDebugRunById = createSelector(
   [selectDebugRuns, (_state: RootState, id: string) => id],
   (runs, id) => runs.find((r) => r.id === id)
)

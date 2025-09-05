import { ReviewRun_t, ReviewRunState } from "@/common/types/review"
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from ".."

export interface ReviewState {
   runs: ReviewRun_t[]
   isWorking: boolean
   hasLoadedInitialCache: boolean
}

const initialState: ReviewState = {
   runs: [],
   isWorking: false,
   hasLoadedInitialCache: false,
}

const reviewSlice = createSlice({
   name: "review",
   initialState,
   reducers: {
      setReviewStateFromCache: (state, action: PayloadAction<ReviewState>) => {
         state.isWorking = action.payload.isWorking
         state.runs = action.payload.runs.map((run) => {
            if (run.state === ReviewRunState.INPROGRESS) {
               return { ...run, state: ReviewRunState.FAILED }
            }
            return run
         })
         state.hasLoadedInitialCache = true
      },
      addRun: (state, action: PayloadAction<ReviewRun_t>) => {
         const now = Date.now()
         state.runs.push({
            ...action.payload,
            dateCreated: now,
            dateUpdated: now,
         })
      },
      updateRun: (state, action: PayloadAction<{ id: string; update: Partial<ReviewRun_t> }>) => {
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
      setIsWorking: (state, action: PayloadAction<boolean>) => {
         state.isWorking = action.payload
      },
   },
})

export const { addRun, updateRun, deleteRun, clearRuns, setReviewStateFromCache, setIsWorking } =
   reviewSlice.actions
export default reviewSlice.reducer

// Selectors
export const selectReviewState = (state: RootState) => state.review
export const selectReviewRuns = createSelector([selectReviewState], (state) => state.runs)
export const selectIsWorking = createSelector([selectReviewState], (state) => state.isWorking)

export const selectReviewRunById = createSelector(
   [selectReviewRuns, (_state: RootState, id: string) => id],
   (runs, id) => runs.find((r) => r.id === id)
)

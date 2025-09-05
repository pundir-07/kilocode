import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."

export type DependenciesState = {
   ollama: boolean
   model: boolean
   suggestedModel: string | null
}

const initialState: DependenciesState = {
   ollama: false,
   model: false,
   suggestedModel: null,
}

const dependenciesSlice = createSlice({
   name: "dependencies",
   initialState,
   reducers: {
      setDependenciesState: (state, action: PayloadAction<DependenciesState>) => {
         state.ollama = action.payload.ollama
         state.model = action.payload.model
         state.suggestedModel = action.payload.suggestedModel
      },
   },
})
export default dependenciesSlice.reducer

export const { setDependenciesState } = dependenciesSlice.actions

export const selectDependencies = createSelector(
   [(state: RootState) => state.dependencies],
   (dependencies) => dependencies
)

export const selectEcoModeDependenciesInstalled = createSelector([selectDependencies], (dependencies) => {
   return dependencies?.ollama && dependencies?.model
})

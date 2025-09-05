import { CustomInstruction_t } from "@/common/types/custom-instructions"
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."

export type CustomInstructionsState = {
   loading: boolean
   customInstructions: CustomInstruction_t[]
   personality: boolean
   personalityInstructions: string
}

const initialState: CustomInstructionsState = {
   loading: false,
   customInstructions: [],
   personality: false,
   personalityInstructions: "",
}

const customInstructionsSlice = createSlice({
   name: "customInstructions",
   initialState,
   reducers: {
      // Replace the entire list of instructions
      setCustomInstructions: (state, action: PayloadAction<CustomInstruction_t[]>) => {
         state.customInstructions = action.payload
      },
      setCustomInstructionsLoading: (state, action: PayloadAction<boolean>) => {
         state.loading = action.payload
      },

      // Add a new instruction
      addInstruction: (state, action: PayloadAction<CustomInstruction_t>) => {
         state.customInstructions.push(action.payload)
      },

      // Update an existing instruction (matched by id)
      upsertInstruction: (state, action: PayloadAction<CustomInstruction_t>) => {
         const idx = state.customInstructions.findIndex((inst) => inst.id === action.payload.id)
         if (idx !== -1) {
            state.customInstructions[idx] = action.payload
         } else {
            state.customInstructions.push(action.payload)
         }
      },

      // Delete an instruction (matched by id)
      deleteInstruction: (state, action: PayloadAction<string>) => {
         state.customInstructions = state.customInstructions.filter((inst) => inst.id !== action.payload)
      },

      // Toggle personality state
      togglePersonality: (state, action: PayloadAction<boolean>) => {
         state.personality = action.payload
      },

      // Update personality instructions
      setPersonalityInstructions: (state, action: PayloadAction<string>) => {
         state.personalityInstructions = action.payload
      },
   },
})

export default customInstructionsSlice.reducer
export const {
   setCustomInstructions,
   addInstruction,
   upsertInstruction,
   deleteInstruction,
   setCustomInstructionsLoading,
   togglePersonality,
   setPersonalityInstructions,
} = customInstructionsSlice.actions

// Selectors
export const selectCustomInstructions = createSelector(
   [(state: RootState) => state.customInstructions],
   (instructions) => instructions
)

export const selectInstructionByID = createSelector(
   [selectCustomInstructions, (_: RootState, id: string) => id],
   (state, id) => state.customInstructions.find((inst) => inst.id === id) || null
)

export const selectInstructionByTitle = createSelector(
   [selectCustomInstructions, (_: RootState, title: string) => title],
   (state, title) => state.customInstructions.find((inst) => inst.title === title) || null
)

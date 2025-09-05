import { Knowledgebase_t, KnowledgebaseScope, KnowledgebaseStatus } from "@/common/types/knowledgebase"
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."

export interface KnowledgebaseState {
   isAutoIndexingCodebase: boolean
   currentKBID: string | null
   knowledgebases: Record<string, Knowledgebase_t>
   hasFetchedInitialConsensus: boolean
   isSyncingCloudKBS: boolean
}

const initialState: KnowledgebaseState = {
   isAutoIndexingCodebase: false,
   currentKBID: null,
   knowledgebases: {},
   hasFetchedInitialConsensus: false,
   isSyncingCloudKBS: false,
}

export const knowledgebasesSlice = createSlice({
   name: "knowledgebases",
   initialState,
   reducers: {
      setKnowledgebasesState: (state, action: PayloadAction<Knowledgebase_t[]>) => {
         const draftKnowledgebases = Object.values({ ...state.knowledgebases }).filter(
            (x) => x.status === KnowledgebaseStatus.DRAFT
         )
         state.knowledgebases = {}
         for (const kb of action.payload) {
            state.knowledgebases[kb.id] = kb
         }
         for (const kb of draftKnowledgebases) {
            state.knowledgebases[kb.id] = kb
         }
      },
      setSyncingCloudKBS: (state, action: PayloadAction<boolean>) => {
         state.isSyncingCloudKBS = action.payload
      },
      setAutoIndexingCodebase: (state, action: PayloadAction<boolean>) => {
         state.isAutoIndexingCodebase = action.payload
      },

      addKnowledgebase: (state, action: PayloadAction<Knowledgebase_t>) => {
         state.knowledgebases[action.payload.id] = action.payload
      },
      updateKnowledgebase: (
         state,
         action: PayloadAction<{ id: string; updates: Partial<Knowledgebase_t> }>
      ) => {
         const { id, updates } = action.payload
         if (state.knowledgebases[id]) {
            state.knowledgebases[id] = { ...state.knowledgebases[id], ...updates } as any
         }
      },
      removeKnowledgebase: (state, action: PayloadAction<string>) => {
         delete state.knowledgebases[action.payload]
         if (state.currentKBID === action.payload) {
            state.currentKBID = null
         }
      },
      setCurrentKnowledgebase: (state, action: PayloadAction<string | null>) => {
         state.currentKBID = action.payload
      },
      setHasFetchedInitialConsensus: (state, action: PayloadAction<boolean>) => {
         state.hasFetchedInitialConsensus = action.payload
      },
      updateKnowledgebaseProgress: (
         state,
         action: PayloadAction<{
            kb: Knowledgebase_t
            progress: { status: string; message: string; progress: number }
         }>
      ) => {
         const { kb, progress } = action.payload

         const clone = { ...state.knowledgebases[kb.id], ...kb }
         clone.status = KnowledgebaseStatus.PROGRESS
         clone.progress = progress

         state.knowledgebases[kb.id] = clone
      },
      updateKnowledgebaseStatusAsSuccess: (
         state,
         action: PayloadAction<{ newID: string; kb: Knowledgebase_t }>
      ) => {
         const { newID, kb } = action.payload

         const clone = { ...state.knowledgebases[kb.id], ...kb }
         clone.id = newID
         clone.status = KnowledgebaseStatus.READY
         clone.progress = { status: "", message: "", progress: 0 }

         // replace the current kb with new one from the backend
         delete state.knowledgebases[kb.id]
         state.knowledgebases[clone.id] = clone
      },
      updateKnowledgebaseStatusAsError: (
         state,
         action: PayloadAction<{ kb: Knowledgebase_t; error: { status: string; message: string } }>
      ) => {
         const { kb, error } = action.payload

         if (kb.isAutoIndexed) {
            delete state.knowledgebases[kb.id]
            return
         }

         state.knowledgebases[kb.id] ??= kb

         const clone = { ...state.knowledgebases[kb.id], ...kb }
         clone.status = KnowledgebaseStatus.ERROR
         clone.progress = {
            status: error.status,
            message: error.message,
            progress: 0,
         }
         state.knowledgebases[kb.id] = clone
      },
   },
})

export const {
   setKnowledgebasesState,
   addKnowledgebase,
   updateKnowledgebase,
   removeKnowledgebase,
   setCurrentKnowledgebase,
   setHasFetchedInitialConsensus,
   updateKnowledgebaseStatusAsSuccess,
   updateKnowledgebaseStatusAsError,
   updateKnowledgebaseProgress,
   setSyncingCloudKBS,
   setAutoIndexingCodebase,
} = knowledgebasesSlice.actions

export default knowledgebasesSlice.reducer

// Selectors
export const selectKnowledgebaseState = (state: RootState) => state.knowledgebases

const selectKnowledgebasesRecord = createSelector(
   [selectKnowledgebaseState],
   (kbState) => kbState.knowledgebases
)

export const selectAllKnowledgebases = createSelector([selectKnowledgebasesRecord], (kbs) =>
   Object.values(kbs)
)

export const selectFrequentlyUsedKnowledgebases = createSelector([selectAllKnowledgebases], (kbs) =>
   kbs.slice(0, 3)
)

export const selectAllSwaggerKnowledgebases = createSelector([selectAllKnowledgebases], (kbs) =>
   kbs.filter((kb) => kb.type === "swagger")
)

export const selectPersonalKnowledgebases = createSelector([selectAllKnowledgebases], (kbs) =>
   kbs.filter((kb) => kb.scope === KnowledgebaseScope.Personal)
)

export const selectOrganizationKnowledgebases = createSelector([selectAllKnowledgebases], (kbs) =>
   kbs.filter((kb) => kb.scope === KnowledgebaseScope.Organization)
)

export const selectKnowledgebaseById = createSelector(
   [selectKnowledgebasesRecord, (_state: RootState, id: string) => id],
   (kbs, id): Knowledgebase_t | undefined => kbs[id]
)

export const selectCurrentKnowledgebaseID = createSelector(
   [selectKnowledgebaseState],
   (kbState) => kbState.currentKBID
)

export const selectCurrentKnowledgebase = createSelector(
   [selectKnowledgebasesRecord, selectCurrentKnowledgebaseID],
   (kbs, currentID) => (currentID ? kbs[currentID] : null)
)

export const selectKnowledgebaseByName = createSelector(
   [selectAllKnowledgebases, (_state: RootState, name: string) => name],
   (kbs, name) => kbs.find((kb) => kb.name === name)
)

export const selectHasFetchedInitialConsensus = createSelector(
   [selectKnowledgebaseState],
   (kbState) => kbState.hasFetchedInitialConsensus
)

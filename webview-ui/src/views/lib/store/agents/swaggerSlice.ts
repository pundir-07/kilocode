import { SwaggerEndpoint_t, SwaggerRun_t, SwaggerRunState } from "@/common/types/swagger"
import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from ".."
import { SwaggerEndpointStatus } from "@/common/types/swagger"
import { createSelector } from "@reduxjs/toolkit"

export interface SwaggerState {
	runs: SwaggerRun_t[]
	hasLoadedInitialCache: boolean
}

const initialState: SwaggerState = {
	runs: [],
	hasLoadedInitialCache: false,
}

const swaggerSlice = createSlice({
	name: "swagger",
	initialState,
	reducers: {
		setSwaggerStateFromCache: (state, action: PayloadAction<SwaggerState>) => {
			state.runs = action.payload.runs.map((run) => {
				if (run.state === SwaggerRunState.INPROGRESS) {
					return { ...run, state: SwaggerRunState.FAILED }
				}
				return run
			})
			state.hasLoadedInitialCache = true
		},
		addRun: (state, action: PayloadAction<SwaggerRun_t>) => {
			const now = Date.now()
			state.runs.push({
				...action.payload,
				dateCreated: now,
				dateUpdated: now,
			})
		},
		updateRun: (state, action: PayloadAction<{ id: string; update: Partial<SwaggerRun_t> }>) => {
			state.runs = state.runs.map((r) =>
				r.id === action.payload.id ? { ...r, ...action.payload.update, dateUpdated: Date.now() } : r,
			)
		},
		deleteRun: (state, action: PayloadAction<string>) => {
			state.runs = state.runs.filter((run) => run.id !== action.payload)
		},
		clearRuns: (state) => {
			state.runs = []
		},
		updateRunResult: (
			state,
			action: PayloadAction<{
				id: string
				update: Partial<SwaggerRun_t["result"]>
			}>,
		) => {
			const run = state.runs.find((r) => r.id === action.payload.id)
			if (run) {
				if (run.result) {
					Object.assign(run.result, action.payload.update)
				} else {
					// if result is null, just replace it entirely
					run.result = { ...action.payload.update } as SwaggerRun_t["result"]
				}
			}
		},
		updateResultEndpoint: (
			state,
			action: PayloadAction<{
				runId: string
				endpointId: string
				data: Partial<SwaggerEndpoint_t>
			}>,
		) => {
			const run = state.runs.find((r) => r.id === action.payload.runId)
			if (run?.result?.endpoints) {
				run.result.endpoints = run.result.endpoints.map((endpoint) =>
					endpoint.id === action.payload.endpointId ? { ...endpoint, ...action.payload.data } : endpoint,
				)
			}
		},
		updateInProgressEndpointByPath: (
			state,
			action: PayloadAction<{
				runId: string
				path: string
				data: Partial<SwaggerEndpoint_t>
			}>,
		) => {
			const run = state.runs.find((r) => r.id === action.payload.runId)
			if (run?.result?.endpoints) {
				const endpointIndex = run.result.endpoints.findIndex(
					(e) => e.path === action.payload.path && e.status === SwaggerEndpointStatus.INPROGRESS,
				)

				if (endpointIndex !== -1) {
					const endpoint = run.result.endpoints[endpointIndex]
					run.result.endpoints[endpointIndex] = { ...endpoint, ...action.payload.data }
				}
			}
		},
	},
})

export const {
	addRun,
	updateRun,
	deleteRun,
	clearRuns,
	setSwaggerStateFromCache,
	updateRunResult,
	updateResultEndpoint,
	updateInProgressEndpointByPath,
} = swaggerSlice.actions

export default swaggerSlice.reducer

// Selectors
export const selectSwaggerState = (state: RootState) => state.swagger

const selectSwaggerRuns = createSelector([selectSwaggerState], (swaggerState) => swaggerState.runs)

// Getters
export const selectSwaggerRunByID = createSelector(
	[selectSwaggerRuns, (_state: RootState, runID: string) => runID],
	(runs, runID) => runs.find((run) => run.id === runID),
)

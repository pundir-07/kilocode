import { configureStore } from "@reduxjs/toolkit"
import debugReducer, { DebugState } from "./agents/debugSlice"
import optimizeReducer, { OptimizeState } from "./agents/optimizeSlice"
import reviewReducer, { ReviewState } from "./agents/reviewSlice"
import swaggerReducer, { SwaggerState } from "./agents/swaggerSlice"
import testcasesReducer, { TestcaseState } from "./agents/testcasesSlice"
import chatReducer, { ChatState } from "./chatSlice"
import codeEvaluationsReducer, { CodeEvaluationsState } from "./codeEvaluationsSlice"
import customInstructionsReducer, { CustomInstructionsState } from "./customInstructionsSlice"
import dependenciesReducer, { DependenciesState } from "./dependenciesSlice"
import globalStateReducer, { GlobalState } from "./globalSlice"
import knowledgebasesReducer, { KnowledgebaseState } from "./knowledgebasesSlice"

export interface RootState {
   chat: ChatState
   globalState: GlobalState
   knowledgebases: KnowledgebaseState
   debug: DebugState
   optimize: OptimizeState
   testcases: TestcaseState
   swagger: SwaggerState
   review: ReviewState
   dependencies: DependenciesState
   codeEvaluations: CodeEvaluationsState
   customInstructions: CustomInstructionsState
}

export const store = configureStore({
   reducer: {
      chat: chatReducer,
      globalState: globalStateReducer,
      knowledgebases: knowledgebasesReducer,
      debug: debugReducer,
      optimize: optimizeReducer,
      testcases: testcasesReducer,
      swagger: swaggerReducer,
      review: reviewReducer,
      dependencies: dependenciesReducer,
      codeEvaluations: codeEvaluationsReducer,
      customInstructions: customInstructionsReducer,
   },
   // Disable serializableCheck to suppress non-serializable value warnings/errors
   middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
})

export type AppDispatch = typeof store.dispatch

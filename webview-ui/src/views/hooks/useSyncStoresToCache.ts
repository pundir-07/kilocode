import { useEffect } from "react"
import { useSelector } from "react-redux"

import { selectDebugState } from "@/views/lib/store/agents/debugSlice"
import { selectOptimizeState } from "@/views/lib/store/agents/optimizeSlice"
import { selectReviewState } from "@/views/lib/store/agents/reviewSlice"
import { selectSwaggerState } from "@/views/lib/store/agents/swaggerSlice"
import { selectTestcaseState } from "@/views/lib/store/agents/testcasesSlice"
import { selectCodeEvaluationsState } from "@/views/lib/store/codeEvaluationsSlice"
import useVSCodeBackendReachability from "./useVSCodeBackendReachability"

export default function useSyncStoresToCache() {
   const isVSCodeBackendReachable = useVSCodeBackendReachability()

   const debugState = useSelector(selectDebugState)
   const testcaseState = useSelector(selectTestcaseState)
   const optimizeState = useSelector(selectOptimizeState)
   const codeReviewState = useSelector(selectReviewState)
   const swaggerState = useSelector(selectSwaggerState)
   const codeEvaluationsState = useSelector(selectCodeEvaluationsState)

   // Debug State
   useEffect(() => {
      if (!debugState.hasLoadedInitialCache || !isVSCodeBackendReachable) return
      tsvscode.postMessage({ type: "set_debug_state", value: debugState })
   }, [debugState, isVSCodeBackendReachable])

   // Testcase State
   useEffect(() => {
      if (!testcaseState.hasLoadedInitialCache || !isVSCodeBackendReachable) return
      tsvscode.postMessage({ type: "set_testcase_state", value: testcaseState })
   }, [testcaseState, isVSCodeBackendReachable])

   // Optimize state
   useEffect(() => {
      if (!optimizeState.hasLoadedInitialCache || !isVSCodeBackendReachable) return
      tsvscode.postMessage({ type: "set_optimize_state", value: optimizeState })
   }, [optimizeState, isVSCodeBackendReachable])

   // Review State
   useEffect(() => {
      if (!codeReviewState.hasLoadedInitialCache || !isVSCodeBackendReachable) return
      tsvscode.postMessage({ type: "set_review_state", value: codeReviewState })
   }, [codeReviewState, isVSCodeBackendReachable])

   // Swagger State
   useEffect(() => {
      if (!swaggerState.hasLoadedInitialCache || !isVSCodeBackendReachable) return
      tsvscode.postMessage({ type: "set_swagger_state", value: swaggerState })
   }, [swaggerState, isVSCodeBackendReachable])

   // Code Evaluations State
   useEffect(() => {
      if (!isVSCodeBackendReachable) return
      tsvscode.postMessage({ type: "set_code_evaluations_state", value: codeEvaluationsState })
   }, [codeEvaluationsState, isVSCodeBackendReachable])
}

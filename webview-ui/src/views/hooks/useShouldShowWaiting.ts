import { useMemo } from "react"

import { IGNORE_SERVER_ABSENCE } from "@/common/core/constants"
import useSocketBackendReachability from "./useSocketBackendReachability"
import useVSCodeBackendReachability from "./useVSCodeBackendReachability"
import { useSelector } from "react-redux"
import { selectIsFetchingSession, selectSessionID } from "@/views/lib/store/globalSlice"

export default function useShouldShowWaiting() {
   const isSocketConnected = useSocketBackendReachability()
   const isVSCodeBackendReachable = useVSCodeBackendReachability()
   const isFetchingSession = useSelector(selectIsFetchingSession)
   // Memoize the condition check
   const shouldShowWaiting = useMemo(() => {
      return !isVSCodeBackendReachable || (!isSocketConnected && !IGNORE_SERVER_ABSENCE) || isFetchingSession
   }, [isVSCodeBackendReachable, isSocketConnected,isFetchingSession])

   return shouldShowWaiting
}

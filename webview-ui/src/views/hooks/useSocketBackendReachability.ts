import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

import { wsConnectionObservable } from "@/common/api/ws/socket"
import { selectSocketConnected, setSocketConnected } from "@/views/lib/store/globalSlice"

export default function useSocketBackendReachability() {
   const dispatch = useDispatch()
   const isSocketConnected = useSelector(selectSocketConnected)

   useEffect(() => {
      wsConnectionObservable.subscribe((isConnected) => {
         dispatch(setSocketConnected(isConnected))
      })
   }, [])

   return isSocketConnected
}

import { API } from "@/common/api"
import { setIsFetchingSession, setSessionID } from "@/views/lib/store/globalSlice"
import { useEffect } from "react"
import { useDispatch } from "react-redux"

export default function useFetchSession() {
   const dispatch = useDispatch()

   useEffect(() => {
      let interval: NodeJS.Timeout

      const getSession = async () => {
         dispatch(setIsFetchingSession(true))
         try {
            const { data } = await API.BACKEND_LOCAL.get<{
               session_id: string
               status: string
               message: string
            }>("/get_session")

            if (data.status === "success") {
               // if (data.session_id === null) {
               //    console.log("SESSION:NOT_FOUND")
               // } else {
               //    console.log("SESSION:FOUND")
               // }
               dispatch(setSessionID(data.session_id))
               clearInterval(interval)
            } else {
               console.log("SESSION:ERROR")
               dispatch(setSessionID(null))
               clearInterval(interval)
            }
            dispatch(setIsFetchingSession(false))
         } catch (err) {
            console.error("Error fetching session:", err)
            dispatch(setSessionID(null))
         }
      }

      getSession()

      interval = setInterval(getSession, 2000)

      return () => clearInterval(interval)
   }, [dispatch])
}

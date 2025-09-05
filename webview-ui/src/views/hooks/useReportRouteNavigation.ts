import { API } from "@/common/api"
import { selectSessionID } from "@/views/lib/store/globalSlice"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { useLocation } from "react-router-dom"

export default function useReportRouteNavigation() {
   const location = useLocation()
   const sessionID = useSelector(selectSessionID)
   const [previousRoute, setPreviousRoute] = useState<string>("")

   // Track route navigation for analytics
   useEffect(() => {
      const currentRoute = location.pathname

      // Only send analytics if we have a previous route (not on initial load)
      if (previousRoute && previousRoute !== currentRoute) {
         // Send analytics to backend
         API.BACKEND.post(
            "/navigated_route",
            { to: currentRoute, additional: { referrer: previousRoute } },
            { headers: { "x-session": sessionID } }
         ).catch((error) => {
            // Silently handle analytics errors to not break user experience
            console.warn("Analytics tracking failed:", error)
         })
      }

      // Update previous route for next navigation
      setPreviousRoute(currentRoute)
   }, [location.pathname, previousRoute, sessionID])
}

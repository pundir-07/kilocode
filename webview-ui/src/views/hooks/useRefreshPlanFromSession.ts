import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

import { API } from "@/common/api"
import { BasePlan_t } from "@/common/types/plan"
import { RootState } from "@/views/lib/store"
import { setPlan } from "@/views/lib/store/globalSlice"

export default function useRefreshPlanFromSession() {
   const dispatch = useDispatch()
   const planID = useSelector((state: RootState) => state.globalState.user?.plan?.base?.plan_id)

   useEffect(() => {
      if (!planID) return

      ;(async () => {
         const res = await API.BACKEND.get<BasePlan_t[]>("/plans")
         if (!res.data) return

         const plan = res.data.find((p) => p.plan_id === planID)
         if (!plan) return

         dispatch(setPlan({ base: plan }))
      })()
   }, [planID])
}

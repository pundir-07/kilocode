import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

import { API } from "@/common/api"
import { User_t } from "@/common/types/user"
import { selectSessionID, setUser } from "@/views/lib/store/globalSlice"

export default function useRefreshUserFromSession() {
   const dispatch = useDispatch()
   const session = useSelector(selectSessionID)

   useEffect(() => {
      if (!session) return
      API.IAM.get<User_t>("iam", { headers: { "x-session": session } }) //
         .then((res) => {
            if (res.status !== 200) throw new Error("Failed to authenticate")

            const user = res.data
            user.personal.name ||= ""

            dispatch(setUser(user))
            tsvscode.postMessage({ type: "set_user", value: user })
         })
   }, [session])
}

import { API } from "@/common/api"
import { EXTENSION_VERSION } from "@/common/core/constants"
import {
   selectSessionID,
   selectSocketConnected,
   selectSubsystemVersion,
   selectUser,
} from "@/views/lib/store/globalSlice"
import { useEffect } from "react"
import { useSelector } from "react-redux"

export default function useRegisterMetadataToBackend() {
   const user = useSelector(selectUser)
   const session = useSelector(selectSessionID)
   const socketConnected = useSelector(selectSocketConnected)
   const subsystemVersion = useSelector(selectSubsystemVersion)

   useEffect(() => {
      if (!session || !socketConnected || !subsystemVersion) return

      API.BACKEND_LOCAL.post("/register_meta", {
         session_id: session,
         extension_version: EXTENSION_VERSION,
         subsystem_version: subsystemVersion,
         base_url: {
            general: user?.base_url?.general || "https://backend.v3.codemate.ai",
            chat: user?.base_url?.chat || "https://backend.v3.codemate.ai",
            codebase: user?.base_url?.codebase || "https://codebase.v3.codemate.ai",
            autocomplete: user?.base_url?.autocomplete || "https://autocomplete.codemate.ai",
            embeddings: user?.base_url?.embeddings || "https://embeddings.v3.codemate.ai",
         },
      })
   }, [session, socketConnected, subsystemVersion, user])
}

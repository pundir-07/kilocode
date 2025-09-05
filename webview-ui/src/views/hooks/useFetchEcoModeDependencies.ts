import { useCallback, useEffect } from "react"
import { useDispatch } from "react-redux"

import { API } from "@/common/api"
import { setDependenciesState } from "@/views/lib/store/dependenciesSlice"

export const useFetchEcoModeDependencies = () => {
   const dispatch = useDispatch()

   const fetchDependencies = useCallback(async () => {
      try {
         const response = await API.BACKEND_LOCAL.get<{
            ollama: boolean
            model: boolean
            suggested_model: string
         }>("/eco")
         dispatch(
            setDependenciesState({
               ollama: response.data.ollama,
               model: response.data.model,
               suggestedModel: response.data.suggested_model,
            })
         )
      } catch (error) {
         console.error("Failed to fetch dependencies:", error)
      }
   }, [dispatch])

   useEffect(() => {
      fetchDependencies()
   }, [fetchDependencies])

   return { fetchDependencies }
}

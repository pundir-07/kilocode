export type BasePlan_t = {
   _id: string
   type: "individual" | "team"
   plan_id: string
   display_name: string
   price: { monthly: number; yearly: number }
   limits: {
      rpd: number
      tpm: number
      storage: number
      cloud_kb: number
      local_kb: number
      internet_search: number
      autocomplete: number
      model: string
      playground: number
      access: {
         chat: boolean
         context: {
            git: boolean
            codebase: {
               cloud: boolean
               local: boolean
               current: boolean
            }
         }
         modes: {
            eco: boolean
            normal: boolean
            pro: boolean
         }
         internet_search: boolean
         byok: boolean
         access_tokens: boolean
      }
   }
   additional_information: {}
}

export type Plan_t = {
   base: BasePlan_t
}

export type User_t = {
   id: string
   session: string
   personal: {
      name?: string
      email: string
      how_user_found_out: string
      org_exp: string
      org_name: string
      org_size: string
      role: string
      avatar: string
      wth: string
      script: string
      bio: string
      location: string
      org_website: string
      team: string
   }
   team: string
   base_url: {
      general: string | undefined
      chat: string | undefined
      build: string | undefined
      codebase: string | undefined
      autocomplete: string | undefined
      embeddings: string
   }
   plan: {
      base: {
         plan_id: string
         active_date: number
         expiration: number
         previous_plans: any[]
      }
   }
}

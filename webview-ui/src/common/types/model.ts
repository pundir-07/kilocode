import { ProviderKey } from "./settings"

export type ChatModel_t = {
   id: string
   display_name: string
   icon: string
   disabled: boolean
   description: string
} & ({ type: "cloud" } | { type: "byok"; data: ProviderKey })

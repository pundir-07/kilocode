import { Loader2 } from "lucide-react"
import * as React from "react"
import { useSelector } from "react-redux"

import { CACHE_VERSION, EXTENSION_VERSION, IS_DEBUG } from "@/common/core/constants"
import { selectIsAuthenticated } from "@/views/lib/store/globalSlice"

import useAutoCreateKnowledgebase from "@/views/hooks/useAutoCreateKnowledgebase"
import useFetchChats from "@/views/hooks/useFetchChats"
import useFetchKnowledgebases from "@/views/hooks/useFetchKnowledgebases"
import useFindAndSelectCurrentKnowledgebase from "@/views/hooks/useFindAndSelectCurrentKnowledgebase"
import useGetSubsystemVersion from "@/views/hooks/useGetSubsystemVersion"
import useLoadStoresFromCache from "@/views/hooks/useLoadStoresFromCache"
import useRefreshPlanFromSession from "@/views/hooks/useRefreshPlanFromSession"
import useRefreshUserFromSession from "@/views/hooks/useRefreshUserFromSession"
import useRegisterMetadataToBackend from "@/views/hooks/useRegisterSessionToBackend"
import useShouldShowWaiting from "@/views/hooks/useShouldShowWaiting"
import useSocketBackendReachability from "@/views/hooks/useSocketBackendReachability"
import useSyncStoresToCache from "@/views/hooks/useSyncStoresToCache"

import Auth from "./screens/auth"
import SidebarDashboard from "./screens/dashboard"
import { useFetchEcoModeDependencies } from "@/views/hooks/useFetchEcoModeDependencies"
import useFetchCustomInstructions from "@/views/hooks/useFetchCustomInstructions"
import useFetchPersonality from "@/views/hooks/useFetchPersonality"
import useFetchSession from "@/views/hooks/useFetchSession"

// ------------------------------------------------------------------------------------------------

namespace Components {
   export function HookInitializer() {
      // Cache
      useSyncStoresToCache()
      useLoadStoresFromCache()

      // User
      useFetchSession()
      useRefreshUserFromSession()
      useRefreshPlanFromSession()
      useRegisterMetadataToBackend()
      useFindAndSelectCurrentKnowledgebase()
      useGetSubsystemVersion()
      // useFetchChatsFromCloud()

      // Environment
      useFetchChats()
      useGetSubsystemVersion()
      useRegisterMetadataToBackend()
      useFetchEcoModeDependencies()

      // Knowledgebase related
      useFetchKnowledgebases()
      useFindAndSelectCurrentKnowledgebase()
      useGetSubsystemVersion()
      useFetchCustomInstructions()
      useFetchPersonality()
      return null
   }

   export function WaitingForServer() {
      return (
         <div className="flex items-center justify-center h-screen">
            <div className="text-center">
               <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-[var(--vscode-text-foreground)]" />
            </div>
         </div>
      )
   }

   export function DebugBanner() {
      const isSocketConnected = useSocketBackendReachability()

      if (!IS_DEBUG) return null

      return (
         <div className="py-2 px-4 border-t border-[var(--vscode-panel-border)] text-xs flex justify-between items-center gap-4">
            <div className="text-yellow-500">DEBUG BUILD</div>
            <div className="flex items-center gap-2">
               <div className="opacity-50">
                  C:{CACHE_VERSION} - E:{EXTENSION_VERSION}
               </div>
               <div className={`w-2 h-2 rounded-full ${isSocketConnected ? "bg-green-500" : "bg-red-500"}`} />
            </div>
         </div>
      )
   }

   // memoize the auto indexing component to prevent re-rendering
   export const AutoIndexing = React.memo(() => {
      const { isCreatingKB, kbProgress } = useAutoCreateKnowledgebase()
      if (!isCreatingKB) return null

      return (
         <div className="p-4 py-2 bg-[var(--vscode-editor-background)] border-t border-[var(--vscode-panel-border)]">
            <div className="flex items-center gap-2">
               <Loader2 className="w-4 h-4 animate-spin text-[var(--vscode-text-foreground)]" />
               <div className="flex items-center gap-4 w-full">
                  <div className="text-sm text-[var(--vscode-descriptionForeground)]">Indexing</div>
                  <div className="w-full h-1 bg-[var(--vscode-input-border)] rounded">
                     <div
                        className="h-full bg-[var(--vscode-progressBar-background)] rounded transition-all duration-300"
                        style={{ width: `${kbProgress.progress}%` }}
                     />
                  </div>
               </div>
            </div>
         </div>
      )
   })
}

// ------------------------------------------------------------------------------------------------

const AppLayout = () => {
   const shouldShowWaiting = useShouldShowWaiting()
   const isAuthenticated = useSelector(selectIsAuthenticated)

   return (
      <>
         <Components.HookInitializer />
         {shouldShowWaiting ? (
            <Components.WaitingForServer />
         ) : !isAuthenticated ? (
            <Auth />
         ) : (
            <div className="h-full grid grid-rows-[1fr,min-content,min-content] overflow-auto border-r border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBar-background)]">
               <SidebarDashboard />
               <Components.AutoIndexing />
               <Components.DebugBanner />
            </div>
         )}
      </>
   )
}

export default React.memo(AppLayout)

// ------------------------------------------------------------------------------------------------

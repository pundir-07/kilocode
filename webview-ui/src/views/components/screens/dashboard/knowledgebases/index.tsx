import {
   Book,
   BookOpenIcon,
   CloudIcon,
   CloudUploadIcon,
   Code2,
   GitBranch,
   LaptopIcon,
   Loader2,
   LucideAppWindowMac,
   RefreshCw,
   Trash2Icon,
   XCircle,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useSearchParams } from "react-router-dom"

import { API } from "@/common/api/index"
import { syncToCloud, uploadToCloud } from "@/common/api/ws/socket"
import {
   Knowledgebase_t,
   KnowledgebaseSource,
   KnowledgebaseStatus,
   KnowledgebaseType,
} from "@/common/types/knowledgebase"
import CMDropdown from "@/views/components/common/CMDropdown"
import { store } from "@/views/lib/store"
import { selectSettings, setAutoIndexCodebase } from "@/views/lib/store/globalSlice"
import {
   removeKnowledgebase,
   selectCurrentKnowledgebaseID,
   selectHasFetchedInitialConsensus,
   selectOrganizationKnowledgebases,
   selectPersonalKnowledgebases,
   updateKnowledgebase,
} from "@/views/lib/store/knowledgebasesSlice"

namespace Algorithms {
   function formatDate(date: Date): string {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (date.toDateString() === today.toDateString()) {
         return "Today"
      } else if (date.toDateString() === yesterday.toDateString()) {
         return "Yesterday"
      } else {
         return date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
         })
      }
   }

   export function groupKnowledgebasesByDate(knowledgebases: Knowledgebase_t[]) {
      return knowledgebases.reduce((groups: Record<string, Knowledgebase_t[]>, kb) => {
         const date = new Date(kb.syncConfig.lastSynced)
         const dateKey = formatDate(date)

         if (!groups[dateKey]) {
            groups[dateKey] = []
         }
         groups[dateKey].push(kb)
         return groups
      }, {})
   }

   export function sortKnowledgebasesByDate(knowledgebases: Knowledgebase_t[]) {
      return knowledgebases.sort((a, b) => b.syncConfig.lastSynced - a.syncConfig.lastSynced)
   }
}

namespace Components {
   function KnowledgebaseCard({ knowledgebase }: { knowledgebase: Knowledgebase_t }) {
      const dispatch = useDispatch()
      const [isDeleting, setIsDeleting] = useState(false)
      const [isUploading, setIsUploading] = useState(false)
      const [isSyncing, setIsSyncing] = useState(false)
      const currentKnowledgebaseID = useSelector(selectCurrentKnowledgebaseID)

      const handleDelete = async (e: React.MouseEvent) => {
         e.stopPropagation() // Prevent triggering the card click

         setIsDeleting(true)
         try {
            dispatch(removeKnowledgebase(knowledgebase.id))
            await API.BACKEND_LOCAL.post("/delete_kb", { kbid: knowledgebase.id })
         } catch (error) {
            console.error("Error deleting knowledgebase:", error)
         } finally {
            setIsDeleting(false)
         }
      }
      const handleUploadKB = () => {
         setIsUploading(true)
         uploadToCloud(knowledgebase.id, {
            onSuccess: (data) => {
               if (data.data.id === knowledgebase.id) {
                  dispatch(
                     updateKnowledgebase({
                        id: knowledgebase.id,
                        updates: {
                           can_sync: true,
                           can_upload: false,
                        },
                     })
                  )
               }
               setIsUploading(false)
            },
            onError: () => {
               setIsUploading(false)
            },
            onProgress: () => {},
         })
      }
      const handleSyncKB = () => {
         setIsSyncing(true)
         syncToCloud(knowledgebase.id, {
            onSuccess: (data) => {
               setIsSyncing(false)
            },
            onError: () => {
               setIsSyncing(false)
            },
            onProgress: () => {},
         })
      }

      const getStatusColor = (status: KnowledgebaseStatus) => {
         switch (status) {
            case KnowledgebaseStatus.PROGRESS:
               return "bg-blue-500/10"
            case KnowledgebaseStatus.READY:
               return "bg-green-500/10"
            case KnowledgebaseStatus.ERROR:
               return "bg-red-500/10"
            default:
               return "bg-gray-500/10"
         }
      }

      const getStatusIcon = (status: KnowledgebaseStatus) => {
         switch (status) {
            case KnowledgebaseStatus.PROGRESS:
               return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            case KnowledgebaseStatus.READY:
               const ICONS: Record<KnowledgebaseType, React.ReactNode> = {
                  codebase: <Code2 className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                  docs: <Book className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                  git: <GitBranch className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                  swagger: <LucideAppWindowMac className="w-5 h-5 text-[var(--vscode-foreground)]" />,
               }
               return ICONS[knowledgebase.type]
            case KnowledgebaseStatus.ERROR:
               return <XCircle className="w-5 h-5 text-red-500" />
            default:
               return <BookOpenIcon className="w-5 h-5 text-gray-500" />
         }
      }

      if (knowledgebase.status === KnowledgebaseStatus.DRAFT) return null

      return (
         <div
            key={knowledgebase.id}
            title={knowledgebase.description}
            className={`group bg-[var(--vscode-sideBar-background)] transition-all duration-200 p-3 rounded-lg border border-[var(--vscode-panel-border)] ${
               knowledgebase.status !== KnowledgebaseStatus.PROGRESS
                  ? "hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-activeSelectionBackground)] cursor-default focus:outline-none hover:border-[var(--vscode-focusBorder)] hover:shadow-md"
                  : "pointer-events-none"
            }`}
         >
            <div className="flex items-start justify-between gap-3">
               <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${getStatusColor(knowledgebase.status)}`}>
                     {getStatusIcon(knowledgebase.status)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                     <div className="flex items-center gap-2 mb-1 min-w-0">
                        <div className="flex items-center gap-2 text-base font-medium break-words hyphens-auto min-w-0 flex-1 leading-tight">
                           {knowledgebase.name}
                           {knowledgebase.id === currentKnowledgebaseID && (
                              <span className="text-xs bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] px-2 py-0.5 rounded-full flex-shrink-0">
                                 Current
                              </span>
                           )}
                        </div>
                     </div>
                     <span className="text-xs text-[var(--vscode-descriptionForeground)] break-words hyphens-auto leading-tight">
                        {knowledgebase.description || "No description"}
                     </span>
                  </div>
               </div>
               <div className="flex items-center gap-2 flex-shrink-0">
                  {knowledgebase.status !== KnowledgebaseStatus.PROGRESS && (
                     <button
                        className="p-2 rounded-md hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hidden group-hover:block"
                        onClick={handleDelete}
                        title="Delete knowledgebase"
                        disabled={isDeleting}
                     >
                        {isDeleting ? (
                           <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                           <Trash2Icon className="w-4 h-4" />
                        )}
                     </button>
                  )}
                  {knowledgebase.can_upload && (
                     <button
                        className={`p-2 rounded-md bg-red animate hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed group-hover:block ${isUploading || isSyncing ? "" : "hidden"}`}
                        onClick={handleUploadKB}
                        title="Upload knowledgebase"
                        disabled={isDeleting}
                     >
                        {isUploading ? (
                           <RefreshCw className={`w-4 h-4 opacity-50 animate-spin`} />
                        ) : (
                           <CloudUploadIcon className={`w-4 h-4 opacity-50 `} />
                        )}
                     </button>
                  )}
                  {knowledgebase.can_sync && (
                     <button
                        className={`p-2 rounded-md bg-red animate hover:bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed group-hover:block ${isUploading || isSyncing ? "" : "hidden"}`}
                        onClick={handleSyncKB}
                        title="Sync knowledgebase"
                        disabled={isDeleting}
                     >
                        <RefreshCw className={`w-4 h-4 opacity-50 ${isSyncing && "animate-spin"}`} />
                     </button>
                  )}
                  {knowledgebase.source === KnowledgebaseSource.Local && (
                     <div title="Remote knowledgebase">
                        <LaptopIcon className="w-4 h-4 text-[var(--vscode-foreground)] opacity-50" />
                     </div>
                  )}
                  {knowledgebase.source === KnowledgebaseSource.Remote && (
                     <div title="Remote knowledgebase">
                        <CloudIcon className="w-4 h-4 text-[var(--vscode-foreground)] opacity-50" />
                     </div>
                  )}
               </div>
            </div>
            {knowledgebase.status === KnowledgebaseStatus.PROGRESS && (
               <div className="text-xs grid gap-2 items-center grid-cols-[1fr,min-content] border-t border-[var(--vscode-panel-border)] pt-3 mt-3">
                  <div className="opacity-50 break-words hyphens-auto leading-tight">
                     {knowledgebase.progress.message || "Processing..."}
                  </div>
                  <div className="text-xs text-blue-500 font-medium text-[var(--vscode-foreground)] flex-shrink-0">
                     {Math.round(knowledgebase.progress.progress || 0) === 0
                        ? "Waiting"
                        : `${Math.round(knowledgebase.progress.progress || 0)}%`}
                  </div>
               </div>
            )}
            {knowledgebase.status === KnowledgebaseStatus.ERROR && (
               <div className="text-xs grid gap-2 items-center grid-cols-[1fr] border-t border-[var(--vscode-panel-border)] pt-3 mt-3">
                  <div className="text-red-500 break-words hyphens-auto leading-tight">
                     {knowledgebase.progress.message || "Failed to process knowledge base"}
                  </div>
               </div>
            )}
         </div>
      )
   }

   export function KnowledgebaseSection({
      title,
      knowledgebases,
   }: {
      title: string
      knowledgebases: Knowledgebase_t[]
   }) {
      if (knowledgebases.length === 0) return null
      const sortedKnowledgebases = Algorithms.sortKnowledgebasesByDate(knowledgebases)

      return (
         <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-medium text-[var(--vscode-descriptionForeground)] mb-2">{title}</h3>
            <div className="space-y-2">
               {sortedKnowledgebases.map((kb) => (
                  <KnowledgebaseCard key={kb.id} knowledgebase={kb} />
               ))}
            </div>
         </div>
      )
   }
}

export default function KnowledgeBases() {
   const dispatch = useDispatch()
   const [searchParams] = useSearchParams()
   const info = searchParams.get("info")
   const personalKnowledgebases = useSelector(selectPersonalKnowledgebases)
   const organizationKnowledgebases = useSelector(selectOrganizationKnowledgebases)
   const hasFetchedInitialConsensus = useSelector(selectHasFetchedInitialConsensus)
   const currentKBID = useSelector(selectCurrentKnowledgebaseID)
   const { autoIndexCodebase } = useSelector(selectSettings)

   // Filter states
   const [typeFilter, setTypeFilter] = useState<KnowledgebaseType | "all">("all")
   const [statusFilter, setStatusFilter] = useState<KnowledgebaseStatus | "all">("all")
   const [sourceFilter, setSourceFilter] = useState<KnowledgebaseSource | "all">("all")
   // Search state
   const [searchQuery, setSearchQuery] = useState("")
   const normalizedQuery = searchQuery.trim().toLowerCase()

   const resetFilters = () => {
      setTypeFilter("all")
      setStatusFilter("all")
      setSourceFilter("all")
   }

   const filterFn = (kb: Knowledgebase_t) => {
      if (typeFilter !== "all" && kb.type !== typeFilter) return false
      if (statusFilter !== "all" && kb.status !== statusFilter) return false
      if (sourceFilter !== "all" && kb.source !== sourceFilter) return false
      return true
   }

   const filteredPersonalKnowledgebases = useMemo(() => {
      const base = personalKnowledgebases.filter(filterFn)
      if (!normalizedQuery) return base
      return base.filter(
         (kb) =>
            kb.name.toLowerCase().includes(normalizedQuery) ||
            (kb.description || "").toLowerCase().includes(normalizedQuery)
      )
   }, [personalKnowledgebases, typeFilter, statusFilter, sourceFilter, normalizedQuery])

   const filteredOrganizationKnowledgebases = useMemo(() => {
      const base = organizationKnowledgebases.filter(filterFn)
      if (!normalizedQuery) return base
      return base.filter(
         (kb) =>
            kb.name.toLowerCase().includes(normalizedQuery) ||
            (kb.description || "").toLowerCase().includes(normalizedQuery)
      )
   }, [organizationKnowledgebases, typeFilter, statusFilter, sourceFilter, normalizedQuery])

   const handleSettingsUpdate = useCallback((newSettings: any) => {
      tsvscode.postMessage({
         type: "update_settings",
         value: newSettings,
      })
   }, [])

   // Update all the onChange handlers to include the settings update
   const handleSettingChange = useCallback(
      (action: any) => {
         dispatch(action)
         // Get latest settings after state update
         const currentSettings = selectSettings(store.getState())
         handleSettingsUpdate(currentSettings)
      },
      [dispatch, handleSettingsUpdate]
   )
   // Show loading indicator if initial consensus hasn't been fetched
   if (!hasFetchedInitialConsensus) {
      return (
         <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
               <Loader2 className="w-8 h-8 animate-spin text-[var(--vscode-foreground)]" />
               <span className="text-sm text-[var(--vscode-descriptionForeground)]">
                  Loading knowledgebases...
               </span>
            </div>
         </div>
      )
   }

   return (
      <div className="h-full grid grid-rows-[min-content_min-content_1fr] gap-4 pb-0 min-h-0">
         <div className="space-y-2">
            {/* Filters Row */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 px-4">
               <div className="flex flex-wrap items-center gap-2">
                  {/* Type Filter */}
                  <CMDropdown
                     width={180}
                     currentSelection={typeFilter}
                     categories={[
                        {
                           name: "Knowledgebase Type",
                           items: [
                              {
                                 value: "all",
                                 title: "All types",
                                 onClick: (close) => {
                                    setTypeFilter("all")
                                    close()
                                 },
                              },
                              ...Object.values(KnowledgebaseType).map((type) => ({
                                 value: type,
                                 title: type.charAt(0).toUpperCase() + type.slice(1),
                                 onClick: (close) => {
                                    setTypeFilter(type)
                                    close()
                                 },
                              })),
                           ],
                        },
                     ]}
                  />

                  {/* Status Filter */}
                  <CMDropdown
                     width={180}
                     currentSelection={statusFilter}
                     categories={[
                        {
                           name: "Knowledgebase Status",
                           items: [
                              {
                                 value: "all",
                                 title: "All statuses",
                                 onClick: (close) => {
                                    setStatusFilter("all")
                                    close()
                                 },
                              },
                              ...Object.values(KnowledgebaseStatus).map((status) => ({
                                 value: status,
                                 title: status.charAt(0).toUpperCase() + status.slice(1),
                                 onClick: (close) => {
                                    setStatusFilter(status)
                                    close()
                                 },
                              })),
                           ],
                        },
                     ]}
                  />

                  {/* Source Filter */}
                  <CMDropdown
                     width={180}
                     currentSelection={sourceFilter}
                     categories={[
                        {
                           name: "Knowledgebase Source",
                           items: [
                              {
                                 value: "all",
                                 title: "All sources",
                                 onClick: (close) => {
                                    setSourceFilter("all")
                                    close()
                                 },
                              },
                              ...Object.values(KnowledgebaseSource).map((source) => ({
                                 value: source,
                                 title: source.charAt(0).toUpperCase() + source.slice(1).toLowerCase(),
                                 onClick: (close) => {
                                    setSourceFilter(source)
                                    close()
                                 },
                              })),
                           ],
                        },
                     ]}
                  />
               </div>

               {/* Clear Filters */}
               {(typeFilter !== "all" || statusFilter !== "all" || sourceFilter !== "all") && (
                  <button
                     onClick={resetFilters}
                     className="text-xs underline text-[var(--vscode-linkForeground)] hover:text-[var(--vscode-linkForeground)] hover:bg-transparent focus:bg-transparent active:bg-transparent focus:outline-none whitespace-nowrap"
                  >
                     Clear filters
                  </button>
               )}
            </div>

            {/* Search Bar */}
            <div className="px-4">
               <label className="sr-only" htmlFor="knowledgebase-search">
                  Search knowledge bases
               </label>
               <div className="relative group">
                  <input
                     id="knowledgebase-search"
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Search knowledge bases..."
                     className="w-full px-3 py-2 pr-16 rounded-md bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] placeholder-[var(--vscode-input-placeholderForeground)] border border-[var(--vscode-input-border)] !focus:outline-none"
                  />
                  {searchQuery && (
                     <button
                        onClick={() => setSearchQuery("")}
                        className="absolute top-1/2 -translate-y-1/2 right-2 text-xs px-2 py-1 rounded bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-hoverBackground)]"
                        aria-label="Clear search"
                     >
                        Clear
                     </button>
                  )}
               </div>
            </div>
         </div>

         {/* Auto index */}
         <div className="px-4">
            <div className="group bg-[var(--vscode-sideBar-background)] transition-all duration-200 p-3 rounded-lg border border-[var(--vscode-panel-border)] ">
               <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                     <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                           <h3 className="text-base font-medium">Auto-Index Codebase </h3>
                        </div>
                        <span className="text-xs text-[var(--vscode-descriptionForeground)] truncate max-w-[300px]">
                           Automatically index your current codebase.
                        </span>
                        {/* Toggle Switch - moved below description */}
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="flex items-center gap-2 mt-4">
                        <button
                           className={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors ${
                              autoIndexCodebase
                                 ? "bg-[var(--vscode-button-background)]"
                                 : "bg-[var(--vscode-input-border)]"
                           }`}
                           onClick={(e) => {
                              e.stopPropagation()
                              handleSettingChange(setAutoIndexCodebase(!autoIndexCodebase))
                           }}
                        >
                           <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 autoIndexCodebase ? "translate-x-5" : "translate-x-1"
                              }`}
                           />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
            {info === "no_current_codebase" && !currentKBID && (
               <div className="text-xs text-amber-500/60">
                  No current codebase found. Create a knowledge base of you current workspace or enable
                  auto-indexing.
               </div>
            )}
         </div>

         {/* Scrollable Content Row */}
         <div className="min-h-0 overflow-y-auto px-4 pb-4">
            {filteredPersonalKnowledgebases.length > 0 || filteredOrganizationKnowledgebases.length > 0 ? (
               <>
                  <Components.KnowledgebaseSection
                     title="Personal"
                     knowledgebases={filteredPersonalKnowledgebases}
                  />
                  <Components.KnowledgebaseSection
                     title="Organization"
                     knowledgebases={filteredOrganizationKnowledgebases}
                  />
               </>
            ) : (
               <div className="text-center text-[var(--vscode-descriptionForeground)] mt-8">
                  {normalizedQuery ? "No knowledge bases match your search." : "No knowledge base found."}
               </div>
            )}
         </div>
      </div>
   )
}

import { ArrowLeft, Cloud, Code, Crown, FileUp, FolderOpen, Globe, Lock, Plus, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
   Knowledgebase_t,
   KnowledgebaseScope,
   KnowledgebaseSource,
   KnowledgebaseStatus,
   KnowledgebaseSyncConfig,
   KnowledgebaseType,
} from "@/common/types/knowledgebase"
import CMDropdown from "@/views/components/common/CMDropdown"
import { RootState } from "@/views/lib/store"
import { selectPlan, selectUser, selectWorkspacePath } from "@/views/lib/store/globalSlice"
import {
   addKnowledgebase,
   removeKnowledgebase,
   selectKnowledgebaseById,
   updateKnowledgebase,
   updateKnowledgebaseProgress,
   updateKnowledgebaseStatusAsError,
   updateKnowledgebaseStatusAsSuccess,
} from "@/views/lib/store/knowledgebasesSlice"
import { nanoid } from "@reduxjs/toolkit"

import { API } from "@/common/api"
import { createKnowledgebaseWS } from "@/common/api/ws/socket"
import { LINKS } from "@/common/core/constants"
import useFetchKnowledgebases from "@/views/hooks/useFetchKnowledgebases"
import { useNavigate } from "react-router-dom"
import Codebase from "./components/Codebase"
import Docs from "./components/Docs"
import Github from "./components/Github"
import Swagger from "./components/Swagger"

namespace Components {
   export function SelectKnowledgebaseType(props: { kbID: string; kb: Knowledgebase_t }) {
      const dispatch = useDispatch()
      const kb = useSelector((x: RootState) => selectKnowledgebaseById(x, props.kbID))
      const workspacePath = useSelector(selectWorkspacePath)

      return (
         <div className="flex items-center gap-2">
            <div className="relative">
               <CMDropdown
                  width={250}
                  currentSelection={kb.type}
                  categories={[
                     {
                        name: "Knowledge Base Type",
                        items: [
                           {
                              value: KnowledgebaseType.Codebase,
                              title: "Codebase",
                              description: "Index your local codebase",
                              leading: <Code className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                              onClick: (close) => {
                                 dispatch(
                                    updateKnowledgebase({
                                       id: props.kbID,
                                       updates: {
                                          type: KnowledgebaseType.Codebase,
                                          metadata: {
                                             path: workspacePath,
                                             files: [],
                                          },
                                       },
                                    })
                                 )
                                 close()
                              },
                           },
                           {
                              value: KnowledgebaseType.Github,
                              title: "GitHub Repo",
                              description: "Index a GitHub repository",
                              leading: <Globe className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                              onClick: (close) => {
                                 dispatch(
                                    updateKnowledgebase({
                                       id: props.kbID,
                                       updates: {
                                          type: KnowledgebaseType.Github,
                                          metadata: {
                                             branch: "",
                                             repo_url: "",
                                             accessToken: "",
                                          },
                                       },
                                    })
                                 )
                                 close()
                              },
                           },
                           // {
                           //    value: KnowledgebaseType.Docs,
                           //    title: "Docs",
                           //    description: "Index documentation URLs",
                           //    leading: <FileUp className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                           //    onClick: (close) => {
                           //       dispatch(
                           //          updateKnowledgebase({
                           //             id: props.kbID,
                           //             updates: {
                           //                type: KnowledgebaseType.Docs,
                           //                metadata: { urls: [""] },
                           //             },
                           //          })
                           //       )
                           //       close()
                           //    },
                           // },
                           {
                              value: KnowledgebaseType.Swagger,
                              title: "Swagger",
                              description: "Index Swagger/OpenAPI specs",
                              leading: <Cloud className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                              onClick: (close) => {
                                 dispatch(
                                    updateKnowledgebase({
                                       id: props.kbID,
                                       updates: {
                                          type: KnowledgebaseType.Swagger,
                                          metadata: {
                                             endpoints: [],
                                             source_type: "file",
                                             source_value: "",
                                          },
                                       },
                                    })
                                 )
                                 close()
                              },
                           },
                        ],
                     },
                  ]}
               />
            </div>
         </div>
      )
   }

   export function SelectSyncOptions(props: { kbID: string; kb: Knowledgebase_t }) {
      const dispatch = useDispatch()
      const kb = useSelector((x: RootState) => selectKnowledgebaseById(x, props.kbID))

      const user = useSelector(selectUser)
      const [isAdmin, setIsAdmin] = useState(false)

      useEffect(() => {
         const checkAdminStatus = async () => {
            if (!user) return

            try {
               const teamData = await API.BACKEND.post("/team_details", {
                  team_id: user.team,
               })

               if (!teamData?.data?.team_data?.members && !teamData?.data?.team_members_data) {
                  setIsAdmin(false)
                  return
               }

               const userEmail = user?.personal?.email
               if (!userEmail) {
                  setIsAdmin(false)
                  return
               }

               // Check if user is the team owner
               if (teamData?.data?.owner_data && teamData.data.owner_data[0]?.personal?.email === userEmail) {
                  setIsAdmin(true)
                  return
               }

               // Find user in team_members_data by email
               const teamMember = teamData?.data?.team_members_data?.find(
                  (member) => member?.personal?.email === userEmail
               )

               if (!teamMember) {
                  setIsAdmin(false)
                  return
               }

               // Look for the member in team_data.members by UUID to determine role
               const memberInfo = teamData?.data?.team_data?.members?.find(
                  (member) => member?.uuid === teamMember?.uuid
               )

               setIsAdmin(memberInfo?.role === "admin")
            } catch (error) {
               console.error("Error checking admin status:", error)
               setIsAdmin(false)
            }
         }

         checkAdminStatus()
      }, [user])

      return (
         <div className="flex items-center gap-2">
            <CMDropdown
               width={300}
               currentSelection={
                  kb.syncConfig.enabled
                     ? KnowledgebaseSyncConfig.CloudSyncPersonal
                     : KnowledgebaseSyncConfig.DoNotSync
               }
               categories={[
                  {
                     name: "Sync Options",
                     items: [
                        {
                           value: KnowledgebaseSyncConfig.DoNotSync,
                           title: "Do not sync",
                           description: "Keep knowledge base local only",
                           leading: <Lock className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                           onClick: (close) => {
                              dispatch(
                                 updateKnowledgebase({
                                    id: props.kbID,
                                    updates: {
                                       syncConfig: {
                                          enabled: false,
                                          lastSynced: kb.syncConfig.lastSynced,
                                       },
                                    },
                                 })
                              )
                              close()
                           },
                        },
                        ...(kb.type !== KnowledgebaseType.Swagger
                           ? [
                                {
                                   value: KnowledgebaseSyncConfig.CloudSyncPersonal,
                                   title: "Cloud synced (personal)",
                                   description: "Sync to your personal cloud account",
                                   leading: <Cloud className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                                   onClick: (close) => {
                                      dispatch(
                                         updateKnowledgebase({
                                            id: props.kbID,
                                            updates: {
                                               syncConfig: {
                                                  enabled: true,
                                                  lastSynced: kb.syncConfig.lastSynced,
                                               },
                                            },
                                         })
                                      )
                                      close()
                                   },
                                },
                             ]
                           : []),
                        ...(isAdmin && kb.type !== KnowledgebaseType.Swagger
                           ? [
                                {
                                   value: KnowledgebaseSyncConfig.CloudSyncTeam,
                                   title: "Cloud synced (team)",
                                   description: "Sync and share with your team",
                                   leading: <Users className="w-5 h-5 text-[var(--vscode-foreground)]" />,
                                   onClick: (close) => {
                                      dispatch(
                                         updateKnowledgebase({
                                            id: props.kbID,
                                            updates: {
                                               syncConfig: {
                                                  enabled: true,
                                                  lastSynced: kb.syncConfig.lastSynced,
                                               },
                                            },
                                         })
                                      )
                                      close()
                                   },
                                },
                             ]
                           : []),
                     ],
                  },
               ]}
            />
         </div>
      )
   }
}

export default function KnowledgeBaseAdd() {
   const dispatch = useDispatch()
   const navigate = useNavigate()
   const workspacePath = useSelector(selectWorkspacePath)
   const plan = useSelector(selectPlan)
   const [kbID, setKbID] = useState<string>("")
   const kb = useSelector((x: RootState) => selectKnowledgebaseById(x, kbID))
   const isWorking = kb?.status === KnowledgebaseStatus.PROGRESS

   // Name validation state and regex
   const [nameError, setNameError] = useState("")
   // const nameRegex = /^[a-zA-Z0-9 _]+$/
   const nameRegex = /^[a-zA-Z0-9 _]*$/

   useEffect(() => {
      const knowledgebase: Knowledgebase_t = {
         id: nanoid(),
         isAutoIndexed: false,
         name: "",
         description: "",
         source: KnowledgebaseSource.Local,
         scope: KnowledgebaseScope.Personal,
         syncConfig: { enabled: false, lastSynced: Date.now() },
         status: KnowledgebaseStatus.DRAFT,
         progress: { status: "", message: "", progress: 0 },
         dateCreated: Date.now(),
         dateSynced: null,
         dateUpdated: null,

         can_sync: false,
         can_upload: false,
         cloud_id: "",

         ...(workspacePath
            ? {
                 type: KnowledgebaseType.Codebase,
                 metadata: { path: workspacePath, files: [] },
              }
            : {
                 type: KnowledgebaseType.Github,
                 metadata: { branch: "", repo_url: "", accessToken: "" },
              }),
      }
      dispatch(addKnowledgebase(knowledgebase))
      setKbID(knowledgebase.id)

      // Remove the knowledgebase from the store when the component unmounts
      return () => {
         dispatch(removeKnowledgebase(knowledgebase.id))
      }
   }, [workspacePath])

   useEffect(() => {
      if (!kb) return

      const path: string | undefined = (kb.metadata as any).path
      if (!path) return

      dispatch(
         updateKnowledgebase({
            id: kbID,
            updates: {
               type: KnowledgebaseType.Codebase,
               name: path.split(/[\\/]/).pop() || "My Knowledge Base",
               description: "",
               metadata: { path: path, files: [] },
            },
         })
      )
   }, [(kb?.metadata as any)?.path])

   const syncKnowledgebases = useFetchKnowledgebases()

   const handleCreate = useCallback(async () => {
      if (!kb) return
      if (nameError) return

      navigate("/knowledgebases")

      // Add the knowledgebase to the store
      dispatch(addKnowledgebase(kb))

      // Create the knowledgebase on the server
      createKnowledgebaseWS(kb, {
         onProgress: (progress) => {
            dispatch(
               updateKnowledgebaseProgress({
                  kb: kb,
                  progress: progress,
               })
            )
         },
         onSuccess: ({ data }) => {
            dispatch(updateKnowledgebaseStatusAsSuccess({ newID: data.id, kb }))
         },
         onError: (error) => {
            dispatch(updateKnowledgebaseStatusAsError({ kb, error }))
         },
      })
   }, [kb, syncKnowledgebases, nameError])

   useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
         const message = event.data
         if (message.type === "selected_folder_path") {
            dispatch(
               updateKnowledgebase({
                  id: kbID,
                  updates: { metadata: { path: message.value, files: [] } },
               })
            )
         }
      }
      window.addEventListener("message", handleMessage)
      return () => window.removeEventListener("message", handleMessage)
   }, [kbID])

   if (!kb) return null

   return (
      <div className="grid grid-rows-[min-content,1fr,min-content] p-4 pt-2 h-full overflow-y-auto">
         <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
               <button
                  onClick={() => navigate("/knowledgebases")}
                  className="p-2 w-min rounded-lg hover:bg-[var(--vscode-button-secondaryBackground)]"
                  title="Go back"
               >
                  <ArrowLeft className="w-6 h-6" />
               </button>
               <h2 className="text-lg font-bold text-[var(--vscode-foreground)] whitespace-nowrap">
                  Create Knowledgebase
               </h2>
            </div>
         </div>
         <div
            className={`gap-4 min-h-0 grid grid-rows-[min-content,min-content,min-content,1fr] overflow-y-auto h-full ${
               isWorking ? "opacity-50 pointer-events-none" : ""
            }`}
         >
            <div className="flex items-center justify-between gap-6 pl-1">
               <Components.SelectKnowledgebaseType kbID={kbID} kb={kb} />
               {/* <Components.SelectSyncOptions kbID={kbID} kb={kb} /> */}
            </div>
            <div className="flex gap-2 items-center">
               <div className="flex flex-col gap-2 flex-1">
                  <label className="text-sm text-[var(--vscode-foreground)]">Name</label>
                  <input
                     type="text"
                     value={kb.name}
                     onChange={(e) => {
                        const value = e.target.value

                        if (!nameRegex.test(value)) {
                           setNameError("Only alphanumeric characters, spaces, and underscores are allowed.")
                           return // stop here if invalid
                        } else {
                           setNameError("")
                        }
                        dispatch(
                           updateKnowledgebase({
                              id: kbID,
                              updates: { name: value },
                           })
                        )
                     }}
                     placeholder="Enter knowledge base name"
                     className="w-full rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)]"
                  />
                  {nameError && <p className="text-sm text-red-500">{nameError}</p>}
               </div>
               {kb.type === KnowledgebaseType.Codebase && (
                  <button
                     onClick={() => {
                        tsvscode.postMessage({ type: "select_folder_for_kb" })
                     }}
                     className="hover:bg-[var(--vscode-button-hoverBackground)] px-2 h-9 w-min whitespace-nowrap flex items-center justify-center rounded-md mt-6"
                     title="Select folder"
                  >
                     <FolderOpen className="w-5 h-5 mr-2 text-[var(--vscode-input-foreground)]" />
                     <span className="text-sm whitespace-nowrap">Choose folder</span>
                  </button>
               )}
            </div>
            <textarea
               value={kb.description}
               onChange={(e) =>
                  dispatch(
                     updateKnowledgebase({
                        id: kbID,
                        updates: { description: e.target.value },
                     })
                  )
               }
               placeholder="Enter description"
               className="w-full rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] min-h-[80px] resize-y"
            />

            {kb.type === KnowledgebaseType.Codebase && <Codebase kbID={kbID} />}
            {kb.type === KnowledgebaseType.Github && <Github kbID={kbID} />}
            {kb.type === KnowledgebaseType.Docs && <Docs kbID={kbID} />}
            {kb.type === KnowledgebaseType.Swagger && <Swagger kbID={kbID} />}
         </div>

         <div className="mt-4">
            {plan?.base?.display_name == "HOBBY" ? (
               <button
                  onClick={() => tsvscode.postMessage({ type: "open_url", value: LINKS.UPGRADE })}
                  disabled={isWorking}
                  className={`px-3 py-2 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full ${
                     isWorking ? "hidden" : ""
                  }`}
               >
                  <Crown className="w-4 h-4" />
                  <span>Upgrade to Create</span>
               </button>
            ) : (
               <button
                  onClick={handleCreate}
                  disabled={isWorking || !!nameError || !kb.name}
                  className={`px-3 py-2 rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full ${
                     isWorking ? "hidden" : ""
                  }`}
               >
                  <Plus className="w-4 h-4" />
                  <span>Create</span>
               </button>
            )}
         </div>
      </div>
   )
}

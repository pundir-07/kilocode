import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom"

import { DEFAULT_CHAT_MODEL, NEW_CHAT_ID_PREFIX } from "@/common/core/constants"
import { addChat, selectCurrentChatID, setCurrentChatID } from "@/views/lib/store/chatSlice"

import { ChatFuncionalState, ChatMode } from "@/common/types/chat"
import Navbar from "@/views/components/common/Navbar"
import Agents from "./agents"
import AgentsLayout from "./agents/_layout"
import DebugDashboard from "./agents/debug"
import DebugLayout from "./agents/debug/_layout"
import DebugRun from "./agents/debug/run"
import OptimizeDashboard from "./agents/optimize"
import OptimizeLayout from "./agents/optimize/_layout"
import OptimizeRun from "./agents/optimize/run"
import ReviewDashboard from "./agents/review"
import ReviewLayout from "./agents/review/_layout"
import ReviewCreate from "./agents/review/create"
import ReviewRun from "./agents/review/run"
import SwaggerIndex from "./agents/swagger"
import SwaggerLayout from "./agents/swagger/_layout"
import SwaggerCreate from "./agents/swagger/create"
import SwaggerRun from "./agents/swagger/run"
import TestcasesDashboard from "./agents/testcases"
import TestcasesLayout from "./agents/testcases/_layout"
import TestcaseRun from "./agents/testcases/run"
import ChatSidebar from "./chat"
import CodeEvalutations from "./code-evaluations"
import CodeEvaluationsLayout from "./code-evaluations/_layout"
import CodeEvaluationFile from "./code-evaluations/file/index"
import CredentialsLayout from "./credentials/_layout"
import CredentialsAccessTokens from "./credentials/access-tokens"
import CredentialsBYOK from "./credentials/byok"
import CustomInstructionsLayout from "./custom-instructions/_layout"
import CustomInstructionsAdd from "./custom-instructions/add"
import CustomInstructionsEdit from "./custom-instructions/edit"
import CustomInstructionsIndex from "./custom-instructions/index"
import AssistantPersonality from "./custom-instructions/personality"
import DependenciesSidebar from "./dependencies"
import HistorySidebar from "./history"
import KnowledgeBases from "./knowledgebases"
import KnowledgebasesLayout from "./knowledgebases/_layout"
import KnowledgeBaseAdd from "./knowledgebases/add"
import SettingsSidebar from "./settings"

export default function SidebarDashboard() {
   const dispatch = useDispatch()
   const chatID = useSelector(selectCurrentChatID)

   useEffect(() => {
      if (chatID) return
      const newChatID = `${NEW_CHAT_ID_PREFIX}${Date.now()}`
      dispatch(
         addChat({
            id: newChatID,
            messages: [],
            isWebSearchEnabled: false,
            state: ChatFuncionalState.IDLE,
            title: "New Chat",
            updatedAt: Date.now(),
            mode: ChatMode.NORMAL,
            model: DEFAULT_CHAT_MODEL,
            followups: [],
            usage: { used: 0, limit: 0 },
            isContinueRequired: false,
         })
      )
      dispatch(setCurrentChatID(newChatID))
   }, [chatID])

   return (
      <BrowserRouter>
         {/* Listen for navigation requests coming from the VS Code extension */}
         <NavigationListener />
         <div className="grid grid-rows-[min-content,1fr] h-full overflow-auto">
            {/* Row 1: Header */}
            <Navbar />

            {/* Row 2: Content */}
            <Routes>
               <Route path="/chat" element={<ChatSidebar />} />
               <Route path="/code-evaluations/*" element={<CodeEvaluationsLayout />}>
                  <Route index element={<CodeEvalutations />} />
                  <Route path=":file" element={<CodeEvaluationFile />} />
               </Route>
               <Route path="/agents/*" element={<AgentsLayout />}>
                  <Route index element={<Agents />} />
                  <Route path="debug/*" element={<DebugLayout />}>
                     <Route index element={<DebugDashboard />} />
                     <Route path="run/:id" element={<DebugRun />} />
                  </Route>
                  <Route path="optimize/*" element={<OptimizeLayout />}>
                     <Route index element={<OptimizeDashboard />} />
                     <Route path="run/:id" element={<OptimizeRun />} />
                  </Route>
                  <Route path="testcases/*" element={<TestcasesLayout />}>
                     <Route index element={<TestcasesDashboard />} />
                     <Route path="run/:id" element={<TestcaseRun />} />
                  </Route>
                  <Route path="review/*" element={<ReviewLayout />}>
                     <Route index element={<ReviewDashboard />} />
                     <Route path="create" element={<ReviewCreate />} />
                     <Route path="run/:id" element={<ReviewRun />} />
                  </Route>
                  <Route path="swagger/*" element={<SwaggerLayout />}>
                     <Route index element={<SwaggerIndex />} />
                     <Route path="create" element={<SwaggerCreate />} />
                     <Route path="run/:id" element={<SwaggerRun />} />
                  </Route>
               </Route>
               <Route path="/custom-instructions/*" element={<CustomInstructionsLayout />}>
                  <Route index element={<CustomInstructionsIndex />} />
                  <Route path="add" element={<CustomInstructionsAdd />} />
                  <Route path="edit/:id" element={<CustomInstructionsEdit />} />
                  <Route path="personality" element={<AssistantPersonality />} />
               </Route>
               <Route path="/history" element={<HistorySidebar />} />
               <Route path="/knowledgebases/*" element={<KnowledgebasesLayout />}>
                  <Route index element={<KnowledgeBases />} />
                  <Route path="add" element={<KnowledgeBaseAdd />} />
               </Route>
               <Route path="/settings" element={<SettingsSidebar />} />
               <Route path="/credentials/*" element={<CredentialsLayout />}>
                  <Route path="byok" element={<CredentialsBYOK />} />
                  <Route path="tokens" element={<CredentialsAccessTokens />} />
                  <Route path="*" element={<Navigate to="byok" replace />} />
               </Route>
               <Route path="/dependencies" element={<DependenciesSidebar />} />
               <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
         </div>
      </BrowserRouter>
   )
}

// -------------------------------------------------------------------------------------------------
// Internal component to listen for navigation messages from the VS Code extension and route the
// React application accordingly.
// -------------------------------------------------------------------------------------------------

function NavigationListener() {
   const navigate = useNavigate()

   useEffect(() => {
      const handler = (event: MessageEvent) => {
         if (event.data?.type === "navigate" && typeof event.data?.value === "string") {
            navigate(event.data.value)
         }
      }
      window.addEventListener("message", handler)
      return () => window.removeEventListener("message", handler)
   }, [navigate])

   return null
}

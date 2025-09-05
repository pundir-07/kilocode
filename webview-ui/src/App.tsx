import React, { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { useEvent } from "react-use"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { ExtensionMessage } from "@roo/ExtensionMessage"
import TranslationProvider from "./i18n/TranslationContext"
import { MarketplaceViewStateManager } from "./components/marketplace/MarketplaceViewStateManager"

import { vscode } from "./utils/vscode"
import { telemetryClient } from "./utils/TelemetryClient"
import { TelemetryEventName } from "@roo-code/types"
import { initializeSourceMaps, exposeSourceMapsForDebugging } from "./utils/sourceMapInitializer"
import { ExtensionStateContextProvider, useExtensionState } from "./context/ExtensionStateContext"
import ChatView, { ChatViewRef } from "./components/chat/ChatView"
import HistoryView from "./components/history/HistoryView"
import SettingsView, { SettingsViewRef } from "./components/settings/SettingsView"
import WelcomeView from "./components/kilocode/Welcome/WelcomeView" // kilocode_change
import ProfileView from "./components/kilocode/profile/ProfileView" // kilocode_change
import McpView from "./components/mcp/McpView"
import { MarketplaceView } from "./components/marketplace/MarketplaceView"
import ModesView from "./components/modes/ModesView"
import { HumanRelayDialog } from "./components/human-relay/HumanRelayDialog"
import BottomControls from "./components/kilocode/BottomControls" // kilocode_change
import { MemoryService } from "./services/MemoryService" // kilocode_change
import { DeleteMessageDialog, EditMessageDialog } from "./components/chat/MessageModificationConfirmationDialog"
import ErrorBoundary from "./components/ErrorBoundary"
// import { AccountView } from "./components/account/AccountView" // kilocode_change: we have our own profile view
import { useAddNonInteractiveClickListener } from "./components/ui/hooks/useNonInteractiveClick"
import { TooltipProvider } from "./components/ui/tooltip"
import { STANDARD_TOOLTIP_DELAY } from "./components/ui/standard-tooltip"
import { useKiloIdentity } from "./utils/kilocode/useKiloIdentity"
import Navbar from "./views/components/common/Navbar"
import { Provider } from "react-redux"
import { store } from "./views/lib/store"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import ChatSidebar from "./views/components/screens/dashboard/chat"
import CodeEvaluationsLayout from "./views/components/screens/dashboard/code-evaluations/_layout"
import CodeEvaluationFile from "./views/components/screens/dashboard/code-evaluations/file"
import AgentsLayout from "./views/components/screens/dashboard/agents/_layout"
import CodeEvalutations from "./views/components/screens/dashboard/code-evaluations"
import Agents from "./views/components/screens/dashboard/agents"
import DebugLayout from "./views/components/screens/dashboard/agents/debug/_layout"
import DebugDashboard from "./views/components/screens/dashboard/agents/debug"
import DebugRun from "./views/components/screens/dashboard/agents/debug/run"
import OptimizeLayout from "./views/components/screens/dashboard/agents/optimize/_layout"
import OptimizeDashboard from "./views/components/screens/dashboard/agents/optimize"
import OptimizeRun from "./views/components/screens/dashboard/agents/optimize/run"
import ReviewLayout from "./views/components/screens/dashboard/agents/review/_layout"
import ReviewDashboard from "./views/components/screens/dashboard/agents/review"
import ReviewCreate from "./views/components/screens/dashboard/agents/review/create"
import ReviewRun from "./views/components/screens/dashboard/agents/review/run"
import SwaggerLayout from "./views/components/screens/dashboard/agents/swagger/_layout"
import SwaggerIndex from "./views/components/screens/dashboard/agents/swagger"
import SwaggerCreate from "./views/components/screens/dashboard/agents/swagger/create"
import SwaggerRun from "./views/components/screens/dashboard/agents/swagger/run"
import CustomInstructionsLayout from "./views/components/screens/dashboard/custom-instructions/_layout"
import CustomInstructionsIndex from "./views/components/screens/dashboard/custom-instructions"
import CustomInstructionsAdd from "./views/components/screens/dashboard/custom-instructions/add"
import CustomInstructionsEdit from "./views/components/screens/dashboard/custom-instructions/edit"
import AssistantPersonality from "./views/components/screens/dashboard/custom-instructions/personality"
import KnowledgebasesLayout from "./views/components/screens/dashboard/knowledgebases/_layout"
import HistorySidebar from "./views/components/screens/dashboard/history"
import KnowledgeBases from "./views/components/screens/dashboard/knowledgebases"
import KnowledgeBaseAdd from "./views/components/screens/dashboard/knowledgebases/add"
import SettingsSidebar from "./views/components/screens/dashboard/settings"
import CredentialsLayout from "./views/components/screens/dashboard/credentials/_layout"
import CredentialsBYOK from "./views/components/screens/dashboard/credentials/byok"
import CredentialsAccessTokens from "./views/components/screens/dashboard/credentials/access-tokens"
import DependenciesSidebar from "./views/components/screens/dashboard/dependencies"
import TestcaseRun from "./views/components/screens/dashboard/agents/testcases/run"
import TestcasesLayout from "./views/components/screens/dashboard/agents/testcases/_layout"
import TestcasesDashboard from "./views/components/screens/dashboard/agents/testcases"
import HistoryPage from "./components/history/HistoryPage"

type Tab = "settings" | "history" | "mcp" | "modes" | "chat" | "marketplace" | "account" | "profile" // kilocode_change: add "profile"

interface HumanRelayDialogState {
	isOpen: boolean
	requestId: string
	promptText: string
}

interface DeleteMessageDialogState {
	isOpen: boolean
	messageTs: number
}

interface EditMessageDialogState {
	isOpen: boolean
	messageTs: number
	text: string
	images?: string[]
}

// Memoize dialog components to prevent unnecessary re-renders
const MemoizedDeleteMessageDialog = React.memo(DeleteMessageDialog)
const MemoizedEditMessageDialog = React.memo(EditMessageDialog)
const MemoizedHumanRelayDialog = React.memo(HumanRelayDialog)

const tabsByMessageAction: Partial<Record<NonNullable<ExtensionMessage["action"]>, Tab>> = {
	chatButtonClicked: "chat",
	settingsButtonClicked: "settings",
	promptsButtonClicked: "modes",
	mcpButtonClicked: "mcp",
	historyButtonClicked: "history",
	profileButtonClicked: "profile",
	marketplaceButtonClicked: "marketplace",
	accountButtonClicked: "account",
}

const App = () => {
	const {
		didHydrateState,
		showWelcome,
		shouldShowAnnouncement,
		telemetrySetting,
		telemetryKey,
		machineId,
		// cloudUserInfo, // kilocode_change not used
		// cloudIsAuthenticated, // kilocode_change not used
		renderContext,
		mdmCompliant,
		apiConfiguration, // kilocode_change
	} = useExtensionState()

	// Create a persistent state manager
	const marketplaceStateManager = useMemo(() => new MarketplaceViewStateManager(), [])

	const [showAnnouncement, setShowAnnouncement] = useState(false)
	const [tab, setTab] = useState<Tab>("chat")

	const [humanRelayDialogState, setHumanRelayDialogState] = useState<HumanRelayDialogState>({
		isOpen: false,
		requestId: "",
		promptText: "",
	})

	const [deleteMessageDialogState, setDeleteMessageDialogState] = useState<DeleteMessageDialogState>({
		isOpen: false,
		messageTs: 0,
	})

	const [editMessageDialogState, setEditMessageDialogState] = useState<EditMessageDialogState>({
		isOpen: false,
		messageTs: 0,
		text: "",
		images: [],
	})

	const settingsRef = useRef<SettingsViewRef>(null)
	const chatViewRef = useRef<ChatViewRef & { focusInput: () => void }>(null) // kilocode_change

	const switchTab = useCallback(
		(newTab: Tab) => {
			// Only check MDM compliance if mdmCompliant is explicitly false (meaning there's an MDM policy and user is non-compliant)
			// If mdmCompliant is undefined or true, allow tab switching
			if (mdmCompliant === false && newTab !== "account") {
				// Notify the user that authentication is required by their organization
				vscode.postMessage({ type: "showMdmAuthRequiredNotification" })
				return
			}

			setCurrentSection(undefined)
			setCurrentMarketplaceTab(undefined)

			if (settingsRef.current?.checkUnsaveChanges) {
				settingsRef.current.checkUnsaveChanges(() => setTab(newTab))
			} else {
				setTab(newTab)
			}
		},
		[mdmCompliant],
	)

	const [currentSection, setCurrentSection] = useState<string | undefined>(undefined)
	const [_currentMarketplaceTab, setCurrentMarketplaceTab] = useState<string | undefined>(undefined)

	const onMessage = useCallback(
		(e: MessageEvent) => {
			const message: ExtensionMessage = e.data

			if (message.type === "action" && message.action) {
				// kilocode_change begin
				if (message.action === "focusChatInput") {
					if (tab !== "chat") {
						switchTab("chat")
					}
					chatViewRef.current?.focusInput()
					return
				}
				// kilocode_change end

				// Handle switchTab action with tab parameter
				if (message.action === "switchTab" && message.tab) {
					const targetTab = message.tab as Tab
					switchTab(targetTab)
					setCurrentSection(undefined)
					setCurrentMarketplaceTab(undefined)
				} else {
					// Handle other actions using the mapping
					const newTab = tabsByMessageAction[message.action]
					const section = message.values?.section as string | undefined
					const marketplaceTab = message.values?.marketplaceTab as string | undefined

					if (newTab) {
						switchTab(newTab)
						setCurrentSection(section)
						setCurrentMarketplaceTab(marketplaceTab)
					}
				}
			}

			if (message.type === "showHumanRelayDialog" && message.requestId && message.promptText) {
				const { requestId, promptText } = message
				setHumanRelayDialogState({ isOpen: true, requestId, promptText })
			}

			if (message.type === "showDeleteMessageDialog" && message.messageTs) {
				setDeleteMessageDialogState({ isOpen: true, messageTs: message.messageTs })
			}

			if (message.type === "showEditMessageDialog" && message.messageTs && message.text) {
				setEditMessageDialogState({
					isOpen: true,
					messageTs: message.messageTs,
					text: message.text,
					images: message.images || [],
				})
			}

			if (message.type === "acceptInput") {
				chatViewRef.current?.acceptInput()
			}
		},
		// kilocode_change: add tab
		[tab, switchTab],
	)

	useEvent("message", onMessage)

	useEffect(() => {
		if (shouldShowAnnouncement) {
			setShowAnnouncement(true)
			vscode.postMessage({ type: "didShowAnnouncement" })
		}
	}, [shouldShowAnnouncement])

	// kilocode_change start
	const telemetryDistinctId = useKiloIdentity(apiConfiguration?.kilocodeToken ?? "", machineId ?? "")
	useEffect(() => {
		if (didHydrateState) {
			telemetryClient.updateTelemetryState(telemetrySetting, telemetryKey, telemetryDistinctId)

			// kilocode_change start
			const memoryService = new MemoryService()
			memoryService.start()
			return () => memoryService.stop()
			// kilocode_change end
		}
	}, [telemetrySetting, telemetryKey, telemetryDistinctId, didHydrateState])
	// kilocode_change end

	// Tell the extension that we are ready to receive messages.
	useEffect(() => vscode.postMessage({ type: "webviewDidLaunch" }), [])

	// Initialize source map support for better error reporting
	useEffect(() => {
		// Initialize source maps for better error reporting in production
		initializeSourceMaps()

		// Expose source map debugging utilities in production
		if (process.env.NODE_ENV === "production") {
			exposeSourceMapsForDebugging()
		}

		// Log initialization for debugging
		console.debug("App initialized with source map support")
	}, [])

	// Focus the WebView when non-interactive content is clicked (only in editor/tab mode)
	useAddNonInteractiveClickListener(
		useCallback(() => {
			// Only send focus request if we're in editor (tab) mode, not sidebar
			if (renderContext === "editor") {
				vscode.postMessage({ type: "focusPanelRequest" })
			}
		}, [renderContext]),
	)
	// Track marketplace tab views
	useEffect(() => {
		if (tab === "marketplace") {
			telemetryClient.capture(TelemetryEventName.MARKETPLACE_TAB_VIEWED)
		}
	}, [tab])

	if (!didHydrateState) {
		return null
	}

	// Do not conditionally load ChatView, it's expensive and there's state we
	// don't want to lose (user input, disableInput, askResponse promise, etc.)
	return showWelcome ? (
		<WelcomeView />
	) : (
		<BrowserRouter>
			<div className="flex flex-col h-full overflow-auto">
				{/* Row 1: Header */}
				<div className="max-h-40">
					<Navbar />
				</div>

				{/* Row 2: Content */}
				<Routes>
					<Route
						path="/chat"
						element={
							<ChatView
								ref={chatViewRef}
								isHidden={tab !== "chat"}
								showAnnouncement={showAnnouncement}
								hideAnnouncement={() => setShowAnnouncement(false)}
							/>
						}
					/>
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
					<Route path="/history" element={<HistoryPage onDone={() => {} }/>} />
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

const queryClient = new QueryClient()

const AppWithProviders = () => (
	<ErrorBoundary>
		<ExtensionStateContextProvider>
			<TranslationProvider>
				<QueryClientProvider client={queryClient}>
					<TooltipProvider delayDuration={STANDARD_TOOLTIP_DELAY}>
						<Provider store={store}>
							<App />
						</Provider>
					</TooltipProvider>
				</QueryClientProvider>
			</TranslationProvider>
		</ExtensionStateContextProvider>
	</ErrorBoundary>
)

export default AppWithProviders

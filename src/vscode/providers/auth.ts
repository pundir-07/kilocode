import axios from "axios"
import * as vscode from "vscode"

import { API } from "@/common/api"
import { AUTH_TIMEOUT_IN_MS, EXTENSION_ID, ExtensionFlavour, FLAVOUR } from "@/common/core/constants"
import { User_t } from "@/common/types/user"
import { CachedState, LocalServersState } from "@/vscode/core/state"
import { Helpers } from "@/vscode/utils/helpers"

export class CodemateAuthProvider implements vscode.AuthenticationProvider {
   private sessions: vscode.AuthenticationSession[] = []
   private onDidChangeSessionsEmitter =
      new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>()
   private memento: vscode.Memento

   private flowDisposable: vscode.Disposable | null = null

   onDidChangeSessions = this.onDidChangeSessionsEmitter.event

   constructor(memento: vscode.Memento) {
      this.memento = memento
      this.loadSessions() // Load sessions from memento on initialization
   }

   async getSessions(): Promise<vscode.AuthenticationSession[]> {
      return this.sessions
   }

   private loadSessions() {
      // Load sessions from memento storage
      const storedSessions = this.memento.get<vscode.AuthenticationSession[]>("codemateSessions") || []
      this.sessions = storedSessions
   }

   private saveSessions() {
      // Save current sessions to memento storage
      this.memento.update("codemateSessions", this.sessions)
   }

   async getUserFromSessionID(sessionID: string): Promise<User_t | null> {
      try {
         console.log("GETTING USER FORM IAM sesssion id -",sessionID)
         let user: User_t | null = null
         // Fetch user details & fail if it fails
         const res = await API.IAM.get<User_t>("iam", { headers: { "x-session": sessionID } })
         console.log("IAM RESPONSE = ",res)
         if (res.status !== 200) throw new Error("Failed to authenticate")
         user = res.data

         return user
      } catch (error) {
         console.error("Failed to get user from session ID", error)
         return null
      }
   }

   async askAndSyncUserName(sessionID: string): Promise<string> {
      // Ask the user for their name
      let name = await vscode.window.showInputBox({
         prompt: "Please enter your name",
         placeHolder: "Please enter your name",
         title: "Your name",
         ignoreFocusOut: true,
      })
      name = name?.trim()
      if (!name) {
         throw new Error("Authentication cannot proceed without your name. Please try again.")
      }

      // Update the user details
      const res = await axios.put<User_t>(
         "https://identity.codemate.ai/iam",
         { name: name },
         { headers: { "x-session": sessionID } }
      )
      if (res.status !== 200) {
         throw new Error("Failed to update your name. Please try again.")
      }

      return name
   }

   async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
      // Gather the token from the user
      const token = await vscode.window.withProgress(
         {
            location: vscode.ProgressLocation.Notification,
            title: "Authenticating with Codemate",
            cancellable: true,
         },
         async () => {
            const redirectURI = `${vscode.env.uriScheme}://${EXTENSION_ID}/auth`
            const encodedRedirectURI = encodeURIComponent(redirectURI)

            const authURI = `${FLAVOUR === ExtensionFlavour.GENERIC ? "https://identity.codemate.ai" : "https://iam.codemateai.dev"}/?app=${encodedRedirectURI}`

            const hasOpened = await Helpers.redirectToURI(authURI)
            if (!hasOpened) throw new Error("Failed to open the authentication URL")

            return new Promise<string>(async (resolve, reject) => {
               const timeout = setTimeout(() => {
                  this.flowDisposable?.dispose()
                  this.flowDisposable = null

                  reject(new Error("Authentication timed out"))
               }, AUTH_TIMEOUT_IN_MS)

               await this.flowDisposable?.dispose()
               this.flowDisposable = vscode.window.registerUriHandler({
                  handleUri: async (uri: vscode.Uri) => {
                     clearTimeout(timeout)
                     this.flowDisposable?.dispose()
                     this.flowDisposable = null

                     if (uri.authority.toLocaleLowerCase() !== EXTENSION_ID.toLowerCase()) {
                        reject(new Error("Invalid URI authority"))
                        return
                     }

                     const query = new URLSearchParams(uri.query)
                     const code = query.get("session__id__")
                     if (code) {
                        resolve(code) // Assuming `code` is the token for simplicity
                     } else {
                        reject(new Error("No session ID found in the URI"))
                     }
                  },
               })
            })
         }
      )
      console.log("RECIEVED TOKEN = ",token)
      // Fetch user details
      let user: User_t | null = await this.getUserFromSessionID(token)
      console.log("RETRIEVED USER = ",user)
      if (!user) {
         // TODO: LOGOUT USER
         CachedState.setUser(undefined) // Clear the cached user details
         vscode.window.showErrorMessage("Authentication server is down. Please try again later.")
         throw new Error("Failed to fetch user details")
      }

      // Ask for the user's name if it's not set
      // user.personal.name ||= await this.askAndSyncUserName(token)

      CachedState.setUser(user) // Cache the user details
      await LocalServersState.setSessionID(token)

      // Create the vscode session
      const session: vscode.AuthenticationSession = {
         id: "codemate-auth-session",
         accessToken: token,
         account: { id: user.id, label: user.personal.name || "" },
         scopes: scopes,
      }

      // Add the session to the list
      this.sessions.push(session)
      this.saveSessions() // Save sessions to memento

      // Notify vscode that the sessions have changed
      this.onDidChangeSessionsEmitter.fire({ added: [session], removed: [], changed: [] })

      vscode.window.showInformationMessage(
         `Successfully logged in as ${user.personal.name || user.personal.email}!`
      )

      return session
   }

   async removeSession(sessionId: string): Promise<void> {
      const sessionIndex = this.sessions.findIndex((session) => session.id === sessionId)
      if (sessionIndex === -1) {
         vscode.window.showInformationMessage("You are not authenticated yet.")
         return
      }

      const removed = this.sessions.splice(sessionIndex, 1)
      this.onDidChangeSessionsEmitter.fire({ added: [], removed, changed: [] })

      this.saveSessions() // Save updated sessions to memento
      CachedState.setUser(undefined) // Clear the cached user details
      await LocalServersState.setSessionID(null) // Clear the cached session token

      vscode.window.showInformationMessage("You have been successfully logged out.")
   }
}

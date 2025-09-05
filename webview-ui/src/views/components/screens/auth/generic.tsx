import { LINKS } from "@/common/core/constants"
import { ASSISTANT_DISPLAY_NAME, ASSISTANT_DP_URL } from "@/views/lib/core/constants"
import { LogIn } from "lucide-react"
import { FaGithub, FaGoogle, FaMicrosoft } from "react-icons/fa"

export default function GenericAuth() {
   return (
      <div
         className="min-h-screen flex flex-col"
         style={{
            backgroundColor: "var(--vscode-sideBar-background)",
            color: "var(--vscode-editor-foreground)",
         }}
      >
         {/* Main content */}
         <div className="flex-1 flex flex-col items-start p-4">
            <div className="mt-4 mb-3">
               <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
                  <img src={ASSISTANT_DP_URL} alt={ASSISTANT_DISPLAY_NAME} className="w-8 h-8 -mt-1" />
                  Sign in to CodeMate
               </h2>
            </div>

            <button
               onClick={() => tsvscode.postMessage({ type: "auth_login" })}
               className="w-full flex items-center justify-center py-3 px-4 rounded-lg font-medium text-md transition-all duration-200 hover:opacity-90"
               style={{
                  backgroundColor: "var(--vscode-button-background)",
                  color: "var(--vscode-button-foreground)",
               }}
            >
               <LogIn className="mr-2 w-6 h-6" />
               Continue with browser
            </button>

            <div className="mt-8 w-full">
               <p className="text-sm opacity-80 mb-4">Or continue with</p>
               <div className="grid grid-cols-3 gap-3">
                  <button
                     onClick={() => tsvscode.postMessage({ type: "auth_login" })}
                     className="flex items-center justify-center p-3 rounded-lg transition-all duration-200 hover:opacity-90"
                     style={{
                        backgroundColor: "var(--vscode-button-secondaryBackground)",
                        color: "var(--vscode-button-secondaryForeground)",
                     }}
                  >
                     <FaGoogle className="w-5 h-5" />
                  </button>
                  <button
                     onClick={() => tsvscode.postMessage({ type: "auth_login" })}
                     className="flex items-center justify-center p-3 rounded-lg transition-all duration-200 hover:opacity-90"
                     style={{
                        backgroundColor: "var(--vscode-button-secondaryBackground)",
                        color: "var(--vscode-button-secondaryForeground)",
                     }}
                  >
                     <FaGithub className="w-5 h-5" />
                  </button>
                  <button
                     onClick={() => tsvscode.postMessage({ type: "auth_login" })}
                     className="flex items-center justify-center p-3 rounded-lg transition-all duration-200 hover:opacity-90"
                     style={{
                        backgroundColor: "var(--vscode-button-secondaryBackground)",
                        color: "var(--vscode-button-secondaryForeground)",
                     }}
                  >
                     <FaMicrosoft className="w-5 h-5" />
                  </button>
               </div>
            </div>
         </div>

         {/* Footer */}
         <div
            className="p-4 text-xs"
            style={{
               color: "var(--vscode-descriptionForeground)",
            }}
         >
            By signing in to CodeMate, you agree to our{" "}
            <a
               target="_blank"
               className="underline hover:opacity-80"
               style={{
                  color: "var(--vscode-textLink-foreground)",
                  cursor: "pointer",
               }}
               onClick={() => {
                  tsvscode.postMessage({ type: "open_url", value: LINKS.TERMS_OF_SERVICE })
               }}
            >
               Terms of Service
            </a>{" "}
            and{" "}
            <a
               target="_blank"
               className="underline hover:opacity-80"
               style={{
                  color: "var(--vscode-textLink-foreground)",
                  cursor: "pointer",
               }}
               onClick={() => {
                  tsvscode.postMessage({ type: "open_url", value: LINKS.PRIVACY_POLICY })
               }}
            >
               Privacy Policy
            </a>
         </div>
      </div>
   )
}

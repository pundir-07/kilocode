import { ExtensionFlavour, FLAVOUR } from "@/common/core/constants"
import GenericAuth from "./generic"
import SSOAuth from "./sso"

export default function Auth() {
   switch (FLAVOUR) {
      case ExtensionFlavour.ENTERPRISE:
         return <SSOAuth />
      case ExtensionFlavour.GENERIC:
         return <GenericAuth />
      default:
         return (
            <div
               className="min-h-screen flex flex-col"
               style={{
                  backgroundColor: "var(--vscode-sideBar-background)",
                  color: "var(--vscode-editor-foreground)",
               }}
            >
               <div className="flex-1 flex flex-col items-center justify-center p-4">
                  <div className="text-center">
                     <p className="text-lg font-medium mb-2">Unknown Extension Flavour</p>
                     <p className="text-sm opacity-70">
                        The extension flavour "{FLAVOUR}" is not recognized. Please contact support.
                     </p>
                  </div>
               </div>
            </div>
         )
   }
}
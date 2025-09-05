import { KeyIcon } from "lucide-react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

const CREDENTIALS_LINKS = [
   {
      label: "Bring Your Own Model",
      to: "/credentials/byok",
   },
   {
      label: "Access Tokens",
      to: "/credentials/tokens",
   },
]

export default function CredentialsLayout() {
   const navigate = useNavigate()
   const pathname = useLocation().pathname

   return (
      <div className="h-full grid grid-rows-[min-content_1fr] overflow-auto">
         <div className="flex justify-between items-center px-4 py-4">
            <div className="flex items-center gap-2">
               <KeyIcon className="w-6 h-6" />
               <h2 className="text-2xl font-bold">Credentials</h2>
            </div>
         </div>
         <div className="h-full overflow-y-auto">
            <div className="flex gap-2 border-b border-[var(--vscode-panel-border)]">
               {CREDENTIALS_LINKS.map((link) => (
                  <div
                     key={link.to}
                     onClick={() => navigate(link.to)}
                     className={
                        `cursor-pointer px-4 py-2 font-medium transition-colors ` +
                        (pathname === link.to
                           ? "!text-[var(--vscode-textLink-foreground)] border-b-2 border-[var(--vscode-textLink-foreground)]"
                           : "!text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-foreground)]")
                     }
                  >
                     {link.label}
                  </div>
               ))}
            </div>
            <div className="p-4 h-full overflow-y-auto">
               <Outlet />
            </div>
         </div>
      </div>
   )
}

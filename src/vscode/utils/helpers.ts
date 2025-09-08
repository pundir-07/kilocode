import * as vscode from "vscode"

import { EXTENSION_ID } from "@/common/core/constants"

export namespace Helpers {
   // -------------------------------------------------------------------------

   export function getExtensionURI(...subPath: string[]): vscode.Uri {
      const extension = vscode.extensions.getExtension(EXTENSION_ID)
      if (!extension) {
         throw new Error(`Extension ${EXTENSION_ID} not found`)
      }
      return vscode.Uri.joinPath(extension.extensionUri, ...subPath)
   }

   // -------------------------------------------------------------------------

   export function makeURI(...subPath: string[]) {
      return vscode.Uri.joinPath(getExtensionURI(), ...subPath)
   }

   export function makeAssetURI(...subPath: string[]): vscode.Uri {
      return makeURI("assets", ...subPath)
   }

   export function makeBuiltAssetURI(...subPath: string[]): vscode.Uri {
      return makeURI("build", ...subPath)
   }

   // -------------------------------------------------------------------------

   export async function redirectToURI(url: string) {
      const httpsUri = vscode.Uri.parse(url)
      const success = await vscode.env.openExternal(httpsUri)
      return success
   }

   // -------------------------------------------------------------------------
}

import * as os from "os"
import * as path from "path"

// ----------------------------------------------------------------------------------------------------------

export const CLIENT_SERVER_INSTALL_DIR = path.join(os.homedir(), ".codemate.beta")
export const CLIENT_SERVER_EXE_FILENAME = (() => {
   const platform = os.platform()
   switch (platform) {
      case "win32":
         return "main.exe"
      case "darwin":
         return "main"
      case "linux":
         return "main"
      default:
         return "main"
   }
})()

// ----------------------------------------------------------------------------------------------------------

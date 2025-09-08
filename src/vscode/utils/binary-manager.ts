import { nanoid } from "nanoid"
import AdmZip from "adm-zip"
import { https } from "follow-redirects"
import * as fs from "fs"
import * as glob from "glob"
import * as os from "os"
import * as path from "path"
import * as vscode from "vscode"

import { CLIENT_SERVER_VERSIONS_URL, EXTENSION_VERSION } from "@/common/core/constants"
import { CLIENT_SERVER_INSTALL_DIR } from "../core/constants"
import { killServerExe, runServerProcessIfNotRunning } from "./process-manager"

// ------------------------------------------------------------------------------------------------
// Types
// ------------------------------------------------------------------------------------------------

enum BinaryInstallationStrategyType {
   FirstInstall = "first-install",
   Mandatory = "mandatory",
   Optional = "optional",
}

type BinaryInstallationStrategy = {
   type: BinaryInstallationStrategyType
   meta: { url: string; deleteGlobs: string[]; version: string }
}

type BinaryVersionInfo = {
   latest: string
   delete_dirs: string[]
   links: Record<string, Record<string, string>>
}

export namespace BinaryManager {
   let isCleaningUp = false
   let isInstalling = false
   let isStartingServer = false
   let updateCheckInterval: NodeJS.Timeout | null = null
   let userDismissedUpdateCheck = false

   // ---------------------------------------------------------------------------------------------
   // Paths and File Management
   // ---------------------------------------------------------------------------------------------

   export function getTargetDir(): string {
      if (!fs.existsSync(CLIENT_SERVER_INSTALL_DIR)) {
         fs.mkdirSync(CLIENT_SERVER_INSTALL_DIR, { recursive: true })
      }
      return CLIENT_SERVER_INSTALL_DIR
   }

   export function getBinaryPath(): string {
      let fileName = "initiate"
      if (os.platform() === "win32") fileName += ".exe"
      return path.join(getTargetDir(), fileName)
   }

   export function getVersion(): string | null {
      const versionFile = path.join(getTargetDir(), "VERSION")
      if (fs.existsSync(versionFile)) {
         return fs.readFileSync(versionFile, "utf8").trim()
      }
      return null
   }

   // ---------------------------------------------------------------------------------------------
   // Version Management
   // ---------------------------------------------------------------------------------------------

   export async function getInstallationStrategy(
      versionsURL: string
   ): Promise<BinaryInstallationStrategy | null> {
      try {
         const response = await fetch(versionsURL)
         const allVersions = await response.json()
         const currentVersionInfo = allVersions[EXTENSION_VERSION] as BinaryVersionInfo
         if (!currentVersionInfo) {
            console.error("No version info found for current extension version")
            return null
         }

         const targetDownloadLinkArch = os.arch().includes("arm")
            ? "arm"
            : Object.keys(currentVersionInfo.links[os.platform()]).filter((arch) => !arch.includes("arm"))[0]
         const targetDownloadLink = currentVersionInfo.links[os.platform()][targetDownloadLinkArch]
         if (!targetDownloadLink) {
            console.error("No binary found for current architecture")
            return null
         }

         // Read current version from binary
         const currentVersion = getVersion()
         if (!currentVersion) {
            return {
               type: BinaryInstallationStrategyType.FirstInstall,
               meta: {
                  url: targetDownloadLink,
                  deleteGlobs: [],
                  version: currentVersionInfo.latest,
               },
            }
         }

         const requiresUpdate = currentVersionInfo.latest !== currentVersion
         if (!requiresUpdate) return null

         // Parse versions
         const [currentMajor, currentMinor, _] = currentVersion.split(".").map(Number)
         const [latestMajor, latestMinor, __] = currentVersionInfo.latest.split(".").map(Number)

         // Check if major or minor version changed
         const required = latestMajor > currentMajor || latestMinor > currentMinor

         return {
            type: required
               ? BinaryInstallationStrategyType.Mandatory
               : BinaryInstallationStrategyType.Optional,
            meta: {
               url: targetDownloadLink,
               deleteGlobs: currentVersionInfo.delete_dirs || [],
               version: currentVersionInfo.latest,
            },
         }
      } catch (error) {
         console.error("Error getting update strategy:", error)
         return null
      }
   }

   // ---------------------------------------------------------------------------------------------
   // Download and Extract Binary
   // ---------------------------------------------------------------------------------------------

   export async function downloadAndExtract(
      url: string,
      progress: (message: string, increment: number) => void
   ) {
      const dir = getTargetDir()
      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir, { recursive: true })
      }

      const cwd = getTargetDir()
      const zipPath = path.join(cwd, `${nanoid()}.zip`)

      // Download zip
      await new Promise<void>((resolve, reject) => {
         https.get(url, (response) => {
            if (response.statusCode !== 200) {
               reject(new Error(`Failed to download binary: ${response.statusCode}`))
               return
            }

            const contentLength = parseInt(response.headers["content-length"] || "0", 10)
            let downloadedBytes = 0
            const file = fs.createWriteStream(zipPath)

            response.on("data", (chunk) => {
               downloadedBytes += chunk.length
               if (contentLength) {
                  const percentage = (downloadedBytes / contentLength) * 100
                  progress(`${Math.round(percentage)}% downloaded`, (chunk.length / contentLength) * 100)
               } else {
                  progress(`${(downloadedBytes / 1048576).toFixed(1)}MB downloaded`, 0)
               }
            })

            response.pipe(file)

            file.on("finish", () => {
               file.close()
               if (os.platform() !== "win32") {
                  fs.chmodSync(zipPath, "755")
               }
               resolve()
            })

            file.on("error", (err) => {
               fs.unlink(zipPath, () => {
                  reject(err)
               })
            })
         })
      })

      // Extract zip
      await new Promise<void>((resolve, reject) => {
         const zip = new AdmZip(zipPath)
         zip.extractAllTo(cwd, true)
         resolve()
      })

      // Move browser_binaries to .neocortex
      const browserBinariesSourcePath = path.join(cwd, "browser_binaries")
      if (fs.existsSync(browserBinariesSourcePath)) {
         const neocortexDir = path.join(os.homedir(), ".neocortex")
         if (!fs.existsSync(neocortexDir)) {
            fs.mkdirSync(neocortexDir, { recursive: true })
         }
         const browserBinariesDestPath = path.join(neocortexDir, "browser_binaries")
         if (fs.existsSync(browserBinariesDestPath)) {
            await fs.promises.rm(browserBinariesDestPath, { recursive: true, force: true })
         }
         await fs.promises.rename(browserBinariesSourcePath, browserBinariesDestPath)
      }

      // Make server executable on non-Windows systems
      if (os.platform() !== "win32") {
         const serverPath = getBinaryPath()
         if (fs.existsSync(serverPath)) {
            fs.chmodSync(serverPath, "755")
         }
      }

      // Remove zip
      fs.unlink(zipPath, () => {})

      // Make all files in _internal executable on non-Windows systems
      if (os.platform() !== "win32") {
         const internalDirPath = path.join(cwd, "_internal")
         if (fs.existsSync(internalDirPath)) {
            console.log("Setting executable permissions for _internal files...")
            const files = glob.sync("**/*", { cwd: internalDirPath, nodir: true })
            for (const file of files) {
               const filePath = path.join(internalDirPath, file)
               await fs.promises.chmod(filePath, "755")
            }
            console.log("Executable permissions for _internal files set.")
         }
      }
   }

   async function downloadAndInstallBrowserBinaries() {
      console.log("DISABLED BROWSESR BINARIES INSTALLATION")
      return

      console.clear()
      const cwd = getTargetDir()
      const neocortexDir = path.join(cwd, ".neocortex")
      const browserBinariesDestPath = path.join(neocortexDir, "browser_binaries")
      console.log("downloadAndInstallBrowserBinaries", browserBinariesDestPath)

      if (fs.existsSync(browserBinariesDestPath)) {
         console.log("Browser binaries already installed")
         return // Assume it's installed if the folder exists
      }

      const platform = os.platform() === "win32" ? "windows" : os.platform()
      const arch = os.arch().includes("arm") ? "arm" : os.arch()
      const url = `https://drive.codemate.ai/subsystem/playwright-builds/${platform}-${arch}.zip`
      console.log("Downloading browser binaries from: ", url)

      try {
         await vscode.window.withProgress(
            {
               location: vscode.ProgressLocation.Notification,
               title: "Downloading browser dependencies",
               cancellable: false,
            },
            async (progress) => {
               const cwd = getTargetDir()
               const zipPath = path.join(cwd, `browser-binaries-${nanoid()}.zip`)

               // Download zip
               await new Promise<void>((resolve, reject) => {
                  https.get(url, (response) => {
                     if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download browser binaries: ${response.statusCode}`))
                        return
                     }

                     const contentLength = parseInt(response.headers["content-length"] || "0", 10)
                     let downloadedBytes = 0
                     const file = fs.createWriteStream(zipPath)

                     response.on("data", (chunk) => {
                        downloadedBytes += chunk.length
                        if (contentLength) {
                           const percentage = (downloadedBytes / contentLength) * 100
                           progress.report({
                              message: `${Math.round(percentage)}% downloaded`,
                              increment: (chunk.length / contentLength) * 100,
                           })
                        } else {
                           progress.report({
                              message: `${(downloadedBytes / 1048576).toFixed(1)}MB downloaded`,
                           })
                        }
                     })

                     response.pipe(file)

                     file.on("finish", () => {
                        file.close()
                        resolve()
                     })

                     file.on("error", (err) => {
                        fs.unlink(zipPath, () => {
                           reject(err)
                        })
                     })
                  })
               })

               console.clear()

               // Extract zip
               progress.report({ message: "Extracting..." })
               const tempExtractPath = path.join(cwd, "temp_browser_binaries")
               if (fs.existsSync(tempExtractPath)) {
                  await fs.promises.rm(tempExtractPath, { recursive: true, force: true })
               }
               fs.mkdirSync(tempExtractPath, { recursive: true })

               const zip = new AdmZip(zipPath)
               zip.extractAllTo(tempExtractPath, true)

               // Log contents of extracted directory for debugging
               try {
                  const extractedContents = fs.readdirSync(tempExtractPath)
                  console.log("Extracted contents:", extractedContents)
               } catch (e) {
                  console.error("Could not read extracted directory", e)
               }

               // Move browser_binaries to .neocortex
               progress.report({ message: "Installing..." })
               const browserBinariesSourcePath = path.join(tempExtractPath, "browser_binaries")
               console.log(`Checking for existence of: ${browserBinariesSourcePath}`)

               if (fs.existsSync(browserBinariesSourcePath)) {
                  console.log("`browser_binaries` found. Moving to destination.")
                  if (!fs.existsSync(neocortexDir)) {
                     fs.mkdirSync(neocortexDir, { recursive: true })
                  }
                  if (fs.existsSync(browserBinariesDestPath)) {
                     await fs.promises.rm(browserBinariesDestPath, { recursive: true, force: true })
                  }
                  await fs.promises.rename(browserBinariesSourcePath, browserBinariesDestPath)
                  console.log("Move complete.")

                  // Make files executable on non-Windows systems
                  if (os.platform() !== "win32") {
                     console.log("Setting executable permissions for browser binaries...")
                     const files = glob.sync("**/*", { cwd: browserBinariesDestPath, nodir: true })
                     for (const file of files) {
                        const filePath = path.join(browserBinariesDestPath, file)
                        await fs.promises.chmod(filePath, "755")
                     }
                     console.log("Executable permissions set.")
                  }
               } else {
                  console.warn("'browser_binaries' folder not found in the extracted zip.")
               }

               // Cleanup
               await fs.promises.rm(zipPath, { force: true })
               await fs.promises.rm(tempExtractPath, { recursive: true, force: true })
            }
         )
      } catch (error) {
         console.error("Failed to download and install browser binaries:", error)
         vscode.window.showErrorMessage(
            `Failed to install browser dependencies: ${error instanceof Error ? error.message : String(error)}`
         )
      }
   }

   // ---------------------------------------------------------------------------------------------

   async function cleanup(globs: string[]) {
      if (isCleaningUp) return
      isCleaningUp = true
      const targetDir = getTargetDir()

      // Remove VERSION file
      const versionFile = path.join(targetDir, "VERSION")
      if (fs.existsSync(versionFile)) {
         await fs.promises.rm(versionFile, { recursive: true, force: true })
      }

      // Remove files matching globs
      for (const pattern of globs) {
         const files = glob.sync(pattern, { cwd: targetDir })
         for (const file of files) {
            const absolutePath = path.join(targetDir, file)
            await fs.promises.rm(absolutePath, { recursive: true, force: true })
         }
      }

      // Remove binary
      await killServerExe()
      const binaryPath = getBinaryPath()
      if (fs.existsSync(binaryPath)) {
         await fs.promises.rm(binaryPath, { recursive: true, force: true })
      }
      isCleaningUp = false
   }

   async function install(version: string, url: string, title: string) {
      await vscode.window.withProgress(
         {
            location: vscode.ProgressLocation.Notification,
            title: title,
            cancellable: false,
         },
         async (progress) => {
            const targetDir = getTargetDir()
            await downloadAndExtract(url, (message, increment) => {
               progress.report({
                  message,
                  increment,
               })
            })

            // Create VERSION file
            fs.writeFileSync(path.join(targetDir, "VERSION"), version)
         }
      )
   }

   // ---------------------------------------------------------------------------------------------

   export async function safeRunServerProcessIfNotRunning(): Promise<void> {
      console.log("safeRunServerProcessIfNotRunning: ", isStartingServer)
      if (isStartingServer) {
         return // Already trying to start it
      }
      isStartingServer = true
      try {
         await runServerProcessIfNotRunning()
      } finally {
         isStartingServer = false
      }
   }

   export async function ensure(): Promise<string> {
      // Start the interval if it's not already running
      if (!updateCheckInterval) {
         startUpdateCheckInterval()
      }

      const strategy = await getInstallationStrategy(CLIENT_SERVER_VERSIONS_URL)
      if (!strategy) {
         console.log("Already up to date")
         await downloadAndInstallBrowserBinaries()
         await safeRunServerProcessIfNotRunning()
         return getBinaryPath()
      }

      console.log("Install strategy: ", strategy)

      switch (strategy.type) {
         case BinaryInstallationStrategyType.FirstInstall:
            await killServerExe()
            await install(strategy.meta.version, strategy.meta.url, "Downloading CodeMate Server")
            await downloadAndInstallBrowserBinaries()
            await safeRunServerProcessIfNotRunning()
            return getBinaryPath()

         case BinaryInstallationStrategyType.Mandatory:
            // Pause interval during installation
            pauseUpdateCheckInterval()
            try {
               await killServerExe()
               await cleanup(strategy.meta.deleteGlobs)
               await install(strategy.meta.version, strategy.meta.url, "Updating CodeMate Server")
               await downloadAndInstallBrowserBinaries()
               await safeRunServerProcessIfNotRunning()
               return getBinaryPath()
            } finally {
               // Resume interval after installation
               resumeUpdateCheckInterval()
            }

         case BinaryInstallationStrategyType.Optional:
            // User has already been notified about the update, so we don't need to show the dialog again
            if (userDismissedUpdateCheck) {
               await downloadAndInstallBrowserBinaries()
               await safeRunServerProcessIfNotRunning()
               return getBinaryPath()
            }

            const result = await vscode.window.showInformationMessage(
               "A new version of the CodeMate server is available. Would you like to update now?",
               "Update",
               "Later"
            )
            if (result === "Update") {
               // Pause interval during installation
               pauseUpdateCheckInterval()
               try {
                  await killServerExe()
                  await cleanup(strategy.meta.deleteGlobs)
                  await install(strategy.meta.version, strategy.meta.url, "Updating CodeMate Server")
                  await downloadAndInstallBrowserBinaries()
                  await safeRunServerProcessIfNotRunning()
                  return getBinaryPath()
               } finally {
                  // Resume interval after installation
                  resumeUpdateCheckInterval()
               }
            } else if (result === "Later") {
               userDismissedUpdateCheck = true
            }
            await downloadAndInstallBrowserBinaries()
            await safeRunServerProcessIfNotRunning()
            return getBinaryPath()

         default:
            throw new Error("Invalid strategy type")
      }
   }

   function startUpdateCheckInterval(): void {
      if (updateCheckInterval) {
         return // Already running
      }

      updateCheckInterval = setInterval(
         async () => {
            if (isInstalling) {
               return // Skip this check if installation is in progress
            }

            try {
               console.log("Running periodic update check...")
               const strategy = await getInstallationStrategy(CLIENT_SERVER_VERSIONS_URL)

               if (strategy && strategy.type === BinaryInstallationStrategyType.Optional) {
                  // For optional updates, show the dialog
                  const result = await vscode.window.showInformationMessage(
                     "A new version of the CodeMate server is available. Would you like to update now?",
                     "Update",
                     "Later"
                  )
                  if (result === "Update") {
                     pauseUpdateCheckInterval()
                     try {
                        await cleanup(strategy.meta.deleteGlobs)
                        killServerExe()
                        await install(strategy.meta.version, strategy.meta.url, "Updating CodeMate Server")
                        await safeRunServerProcessIfNotRunning()
                     } finally {
                        resumeUpdateCheckInterval()
                     }
                  }
               } else if (strategy && strategy.type === BinaryInstallationStrategyType.Mandatory) {
                  // For mandatory updates, install automatically
                  pauseUpdateCheckInterval()
                  try {
                     await cleanup(strategy.meta.deleteGlobs)
                     killServerExe()
                     await install(strategy.meta.version, strategy.meta.url, "Updating CodeMate Server")
                     await safeRunServerProcessIfNotRunning()
                  } finally {
                     resumeUpdateCheckInterval()
                  }
               }
            } catch (error) {
               console.error("Error during periodic update check:", error)
            }
         },
         2 * 60 * 1000
      ) // 2 minutes
   }

   function pauseUpdateCheckInterval(): void {
      isInstalling = true
   }

   function resumeUpdateCheckInterval(): void {
      isInstalling = false
   }

   export function stopUpdateCheckInterval(): void {
      if (updateCheckInterval) {
         clearInterval(updateCheckInterval)
         updateCheckInterval = null
         isInstalling = false
      }
   }

   // ---------------------------------------------------------------------------------------------
}

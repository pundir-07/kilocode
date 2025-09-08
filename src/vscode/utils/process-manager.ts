import * as child_process from "child_process"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import * as vscode from "vscode"
import { CachedState } from "../core/state"
import { BinaryManager } from "./binary-manager"

async function pingServer() {
   const pingPromise = async () => {
      const response = await fetch("http://localhost:45213")
      return response.status === 200
   }

   const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), 20000) // 30 seconds
   })

   try {
      return await Promise.race([pingPromise(), timeoutPromise])
   } catch (error) {
      console.error("Server ping timeout after 30 seconds")
      return false
   }
}

import { exec as _exec } from "child_process"
import { promisify } from "util"
import { CLIENT_SERVER_INSTALL_DIR } from "../core/constants"

const exec = promisify(_exec)

let hasStartedServer = false

async function waitForProcessExit(pid: number, timeout = 5000): Promise<void> {
   const start = Date.now()
   return new Promise((resolve, reject) => {
      const check = () => {
         try {
            process.kill(pid, 0) // throws if process is dead
            if (Date.now() - start > timeout) {
               return reject(new Error(`Timeout waiting for process ${pid} to exit`))
            }
            setTimeout(check, 100)
         } catch {
            resolve() // Process is dead
         }
      }
      check()
   })
}

export async function killServerExe() {
   const port = 45213
   const pidsToKill: number[] = []

   console.log("PLATFORM:", os.platform())

   if (os.platform() === "win32") {
      console.log("Platform is Windows")
      console.log(`Attempting to kill process on port ${port}...`)

      try {
         const { stdout } = await exec(`netstat -aon | findstr :${port}`)
         if (!stdout) {
            console.log(`Could not find any process on port ${port}.`)
            return
         }

         const lines = stdout.split("\n").filter((line) => line.includes(`:${port}`))
         const pids = [...new Set(lines.map((line) => line.trim().split(/\s+/).pop()))]

         console.log("PIDs found:", pids)

         for (const pid of pids) {
            if (!pid) continue
            try {
               const { stdout: tasklist } = await exec(`tasklist /FI "PID eq ${pid}"`)
               if (tasklist.toLowerCase().includes("server.exe")) {
                  process.kill(Number(pid))
                  console.log(`Killed server.exe (PID: ${pid})`)
                  pidsToKill.push(Number(pid))
               }
            } catch (err) {
               console.error(`Failed to stop CodeMate Server. PID: ${pid} Error:`, err)
            }
         }
      } catch (err) {
         console.error(`Error finding/killing process on port ${port}:`, err)
      }
   } else {
      // macOS & Linux
      try {
         const { stdout } = await exec(`lsof -i :${port} -sTCP:LISTEN -t`)
         if (!stdout) {
            console.error(`No process found on port ${port}`)
            return
         }

         const pids = stdout.split("\n").filter(Boolean)
         for (const pid of pids) {
            try {
               process.kill(Number(pid))
               console.log(`Killed process on port ${port} (PID: ${pid})`)
               pidsToKill.push(Number(pid))
            } catch (err) {
               console.error(`Failed to kill PID ${pid}:`, err)
            }
         }
      } catch (err) {
         console.error(`Error finding/killing process on port ${port}:`, err)
      }
   }

   // 🔄 Wait for all killed processes to be fully gone
   for (const pid of pidsToKill) {
      try {
         await waitForProcessExit(pid)
         console.log(`Process ${pid} exited cleanly.`)
         // BinaryManager.serverStatusUpdate();
      } catch (err) {
         console.warn(`Process ${pid} did not exit in time:`, err)
      }
   }
}

export async function runServerProcessIfNotRunning() {
   try {
      console.clear()
      const binaryPath = await BinaryManager.ensure()
      console.log(binaryPath)

      // If already running, return
      if ((await pingServer()) || hasStartedServer) return
      hasStartedServer = true

      let childProcess: child_process.ChildProcess | null = null
      if (process.platform === "win32") {
         console.log("windows")
         // 1. Create VBS content
         const vbsContent = `Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run """${binaryPath}""", 0, False`

         console.log("VBS Content:", vbsContent)

         // 2. Write it to a temp file
         const tmpVbsPath = path.join(os.tmpdir(), `run_hidden_${Date.now()}.vbs`)
         fs.writeFileSync(tmpVbsPath, vbsContent, "utf16le") // VBS expects UTF-16LE

         console.log("Temporary VBS Path:", tmpVbsPath)

         // 3. Run the VBS script silently using cscript
         childProcess = child_process.spawn("cscript.exe", ["//nologo", tmpVbsPath], {
            stdio: "ignore",
            windowsHide: true,
            detached: true,
            shell: false,
         })

         console.log("Child process started with PID:", childProcess.pid)

         // // 4. Clean up the temp file later (e.g., after some delay)
         // setTimeout(() => {
         //    fs.unlink(tmpVbsPath, () => {})
         // }, 10_000)
      } else {
         childProcess = child_process.spawn("nohup", [binaryPath, ">/dev/null", "2>&1", "&"], {
            cwd: CLIENT_SERVER_INSTALL_DIR,
            stdio: ["ignore", "ignore", "ignore"],
            detached: true,
            windowsHide: true,
            shell: false,
         })
      }
      if (!childProcess) return

      childProcess.unref()

      childProcess.on("error", (error) => {
         console.error("Server Process Error:", error)
         vscode.window.showErrorMessage(`Server Process Error: ${error.message}`)
         CachedState.setProcessID(undefined)

         // // restart the server
         // hasStartedServer = false
         // runServerProcessIfNotRunning()
      })

      childProcess.on("exit", (code) => {
         console.error("Server Process exited with code:", code)
         CachedState.setProcessID(undefined)

         // // restart the server
         // hasStartedServer = false
         // runServerProcessIfNotRunning()
      })

      CachedState.setProcessID(childProcess.pid ?? undefined)
   } catch (error) {
      console.trace("Error starting server process:", error)
      vscode.window.showErrorMessage(`Failed to start server process: ${error}`)
      CachedState.setProcessID(undefined)
   }
}

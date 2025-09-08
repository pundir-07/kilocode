import { API } from "@/common/api"
import * as vscode from "vscode"
import * as os from "os";
import * as path from "path";
import * as fs from "fs"
import * as https from "https"
import * as http from "http"
import { randomUUID } from "crypto";
// Define ignored patterns
const IGNORED_FOLDERS = new Set([
   // Build & Compilation Outputs
   "bin",
   "obj",
   "out",
   "dist",
   "build",
   "target",
   ".output",
   // Dependency & Package Manager Directories
   "node_modules",
   "bower_components",
   "vendor",
   "site-packages",
   ".venv",
   "env",
   ".env",
   ".virtualenv",
   ".cache/pip",
   ".pnpm-store",
   // Version Control & CI/CD
   ".git",
   ".svn",
   ".hg",
   ".bzr",
   ".gitattributes",
   ".gitmodules",
   ".github",
   ".gitlab",
   ".circleci",
   ".ci",
   // OS-Specific Junk
   ".DS_Store",
   "Thumbs.db",
   ".Trash",
   "Desktop.ini",
   "System Volume Information",
   "RECYCLER",
   "lost+found",
   // Logs & Temporary Files
   "logs",
   "tmp",
   "temp",
   "debug",
   "crash-reports",
   "dumps",
   "sessions",
   "sessions_store",
   "state",
   // Database & Storage Files
   "db",
   "database",
   "migrations",
   "data",
   "backup",
   "dumps",
   "__pycache__",
   // Cloud & Deployment
   ".terraform",
   ".aws",
   ".gcp",
   ".azure",
   ".kube",
   ".kubernetes",
   ".docker",
   ".helm",
   ".serverless",
   // IDE & Editor-Specific Files
   ".vscode",
   ".idea",
   ".sublime-text",
   ".sublime-session",
   ".sublime-project",
   ".config",
   // Java & C# Project Directories
   "target",
   ".gradle",
   ".mvn",
   ".idea",
   ".vs",
   ".nuget",
   "packages",
   // Python-Specific
   "__pycache__",
   ".mypy_cache",
   ".pytest_cache",
   ".tox",
   "venv",
   "env",
   "htmlcov",
   // JavaScript & TypeScript
   ".next",
   ".vercel",
   ".yarn",
   ".pnpm-store",
   ".turbo",
   ".docusaurus",
   "jspm_packages",
   // Miscellaneous
   ".meteor",
   ".expo",
   ".android",
   ".ios",
   "coverage",
   "tests_output",
   ".pytest_cache",
])

const IGNORED_EXTENSIONS = new Set([
   // Compiled binary files
   "exe",
   "dll",
   "so",
   "dylib",
   "o",
   "a",
   "lib",
   "bin",
   "elf",
   "out",
   "class",
   "pyc",
   "pyo",
   "pyd",
   // Archives & Compressed files
   "zip",
   "tar",
   "gz",
   "tgz",
   "bz2",
   "xz",
   "7z",
   "rar",
   "cab",
   "jar",
   "war",
   "ear",
   // Virtual environments & Dependencies
   "egg",
   "egg-info",
   "whl",
   "venv",
   "conda",
   "virtualenv",
   "pip",
   "node_modules",
   // Logs & Temporary files
   "log",
   "tmp",
   "swp",
   "swo",
   "bak",
   "old",
   "orig",
   "rej",
   "~",
   "swp",
   "swn",
   "swo",
   "DS_Store",
   "lock",
   "cache",
   // Version Control & CI/CD
   "git",
   "svn",
   "hg",
   "bzr",
   "gitattributes",
   "gitmodules",
   "gitkeep",
   "gitignore",
   "gpg",
   "ci",
   // Database & Storage Files
   "db",
   "sqlite",
   "sqlite3",
   "db-journal",
   "dat",
   "mdb",
   "accdb",
   "frm",
   "myd",
   "myi",
   "ndf",
   "ldf",
   "ibd",
   "sql",
   // Media & Assets
   "png",
   "jpg",
   "jpeg",
   "gif",
   "bmp",
   "tiff",
   "ico",
   "svg",
   "webp",
   "mp4",
   "mp3",
   "wav",
   "ogg",
   "flac",
   "mov",
   "avi",
   "wmv",
   // Documents & Office Files
   "pdf",
   "doc",
   "docx",
   "xls",
   "xlsx",
   "ppt",
   "pptx",
   "odt",
   "ods",
   "odp",
   "rtf",
   "csv",
   // Configuration & Secrets
   "env",
   "pem",
   "crt",
   "key",
   "pfx",
   "der",
   "csr",
   "p12",
   "p7b",
   "jks",
   "htpasswd",
   // Cloud & Deployment
   "tfstate",
   "tfstate.backup",
   "terraform",
   "kubeconfig",
   "aws",
   "gcp",
   "azure",
   "dockerenv",
   "dockerignore",
   // IDE & Editor-Specific Files
   "vscode",
   "idea",
   "sublime-workspace",
   "sublime-project",
   "code-workspace",
   "iml",
   "classpath",
   "project",
   // Node.js & JavaScript-related
   "map",
   "lock",
   "yarn-integrity",
   "yarnclean",
   "yarn-error.log",
   "eslintcache",
   "prettierignore",
   "stylelintignore",
   // Miscellaneous
   "bak~",
   "nfs*",
   "pid",
   "pid.lock",
   "core",
   "stackdump",
   "winmd",
   "metadata",
])

// Create ignore patterns for VS Code
const createIgnorePattern = () => {
   const folderPattern = Array.from(IGNORED_FOLDERS)
      .map((folder) => `**/${folder}/**`)
      .join(",")
   const extensionPattern = Array.from(IGNORED_EXTENSIONS)
      .map((ext) => `**/*.${ext}`)
      .join(",")
   return `{${folderPattern},${extensionPattern}}`
}

export async function get_file_list(webviewView: vscode.WebviewView, data: any) {
   const workspace = vscode.workspace.workspaceFolders?.length
      ? vscode.workspace.workspaceFolders[0]
      : undefined

   if (!workspace) {
      webviewView.webview.postMessage({
         type: "fileList",
         value: [],
      })
      return
   }

   // Include all files first, then exclude the unwanted ones
   const includePattern = "**/*"
   const excludePattern = createIgnorePattern()

   try {
      const files = await vscode.workspace.findFiles(includePattern, excludePattern)

      const fileList = files.map((file) => {
         const workspacePath = workspace.uri.fsPath
         const relativePath = file.fsPath.replace(workspacePath, "")
         const name = relativePath.split("/").pop() || relativePath

         let description = relativePath.split("/").slice(1).join("/") || relativePath
         if (name === description) {
            description = ""
         }

         return {
            name,
            path: file.fsPath,
            description,
         }
      })

      webviewView.webview.postMessage({
         type: "fileList",
         value: fileList,
      })
   } catch (error) {
      console.error("Error finding files:", error)
      webviewView.webview.postMessage({
         type: "fileList",
         value: [],
      })
   }
}

export async function get_workspace_path(webviewView: vscode.WebviewView, data: any) {
   const workspace = vscode.workspace.workspaceFolders?.length
      ? vscode.workspace.workspaceFolders[0]
      : undefined

   webviewView.webview.postMessage({
      type: "workspacePath",
      value: workspace ? workspace.uri.fsPath : null,
   })
}

export async function get_folder_list(webviewView: vscode.WebviewView, data: any) {
   const workspace = vscode.workspace.workspaceFolders?.length
      ? vscode.workspace.workspaceFolders[0]
      : undefined

   if (!workspace) {
      webviewView.webview.postMessage({
         type: "folderList",
         value: [],
      })
      return
   }

   try {
      const response = await API.BACKEND.get("/get_folder_paths_recursive")
      const folders = response.data

      webviewView.webview.postMessage({
         type: "folderList",
         value: folders,
      })
   } catch (error) {
      console.error("Error fetching folder list:", error)
      webviewView.webview.postMessage({
         type: "folderList",
         value: [],
      })
   }
}

export async function open_file(webviewView: vscode.WebviewView, data: string) {
   const workspace = vscode.workspace.workspaceFolders?.length
      ? vscode.workspace.workspaceFolders[0]
      : undefined

   if (!workspace) {
      webviewView.webview.postMessage({
         type: "openFile",
         value: false,
      })
      return
   }

   const fileUri = vscode.Uri.file(data)
   const document = await vscode.workspace.openTextDocument(fileUri)
   await vscode.window.showTextDocument(document)

   webviewView.webview.postMessage({
      type: "openFile",
      value: true,
   })
}





function detectImageExtFromBase64(
  cleanBase64: string
): ".png" | ".jpg" | ".jpeg" | ".gif" | ".webp" {
  // Decode only the first few bytes for signature detection
  let header: Buffer
  try {
    header = Buffer.from(cleanBase64.substring(0, 64), "base64")
  } catch {
    return ".png"
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return ".png"
  }

  // JPEG: FF D8 FF
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return ".jpg"
  }

  // GIF: "GIF87a" or "GIF89a"
  if (header.length >= 6) {
    const ascii = header.slice(0, 6).toString("ascii")
    if (ascii === "GIF87a" || ascii === "GIF89a") {
      return ".gif"
    }
  }

  // WEBP: RIFF....WEBP
  if (
    header.length >= 12 &&
    header.slice(0, 4).toString("ascii") === "RIFF" &&
    header.slice(8, 12).toString("ascii") === "WEBP"
  ) {
    return ".webp"
  }

  // Default fallback
  return ".png"
}

export async function preview_image_file(
  webviewView: vscode.WebviewView,
  { base64Data, ext }: { base64Data: string; ext: ".png" | ".jpg" | ".jpeg" }
) {
  try {
    // Validate and clean base64 data
    let cleanBase64 = base64Data
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    if (cleanBase64.includes(",")) {
      cleanBase64 = cleanBase64.split(",")[1]
    }
    // Remove any whitespace
    cleanBase64 = cleanBase64.replace(/\s/g, "")
    // Validate base64 format (len%4 and charset)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64) || cleanBase64.length % 4 !== 0) {
      throw new Error("Invalid base64 format")
    }

    // Decode Base64 to buffer with error handling
    let imageBuffer: Buffer
    try {
      imageBuffer = Buffer.from(cleanBase64, "base64")
    } catch (error) {
      throw new Error(`Failed to decode base64: ${error}`)
    }
    if (imageBuffer.length === 0) {
      throw new Error("Decoded image buffer is empty")
    }

    // Detect extension from magic bytes if possible; fallback to provided ext
    const detectedExt = detectImageExtFromBase64(cleanBase64)
    const finalExt = detectedExt || ext || ".png"

    // Create temp file path
    const tmpDir = os.tmpdir()
    const fileName = `image-${randomUUID()}${finalExt}`
    const filePath = path.join(tmpDir, fileName)
    const fileUri = vscode.Uri.file(filePath)

    // Write file using VS Code FS API for cross-platform correctness
    try {
      await vscode.workspace.fs.writeFile(fileUri, new Uint8Array(imageBuffer))
    } catch (writeError) {
      throw new Error(`Failed to write image file: ${writeError}`)
    }

    // Verify file was written correctly
    let stats
    try {
      stats = fs.statSync(filePath)
    } catch (statError) {
      throw new Error(`Failed to stat image file: ${statError}`)
    }
    if (stats.size === 0) {
      throw new Error("Written file is empty")
    }

    // Open in VS Code (main editor area) - try multiple approaches
    try {
      await vscode.commands.executeCommand("vscode.open", fileUri, {
        preview: true,
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus: false,
      })
    } catch (openError) {
      await vscode.commands.executeCommand(
        "vscode.openWith",
        fileUri,
        "imagePreview.previewEditor",
        { preview: true, viewColumn: vscode.ViewColumn.Active, preserveFocus: false }
      )
    }

    // Cleanup logic
    let isFileDeleted = false
    const cleanup = async () => {
      if (isFileDeleted) return
      try {
        fs.unlinkSync(filePath)
        isFileDeleted = true
      } catch (err) {
        // ignore
      }
    }
    const checkIfFileClosed = async () => {
      if (isFileDeleted) return
      let isFileOpen = false
      for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
          if (tab.input instanceof vscode.TabInputText) {
            if (tab.input.uri.toString() === fileUri.toString()) {
              isFileOpen = true
              break
            }
          }
          if ((tab.input as any).uri && (tab.input as any).uri.toString() === fileUri.toString()) {
            isFileOpen = true
            break
          }
        }
        if (isFileOpen) break
      }
      if (!isFileOpen) {
        await cleanup()
        disposable.dispose()
        clearInterval(checkInterval)
      }
    }
    const disposable = vscode.window.tabGroups.onDidChangeTabs(checkIfFileClosed)
    const checkInterval = setInterval(checkIfFileClosed, 3000)
    setTimeout(async () => {
      await cleanup()
      disposable.dispose()
      clearInterval(checkInterval)
    }, 5 * 60 * 1000)

    webviewView.webview.postMessage({
      type: "preview_file_response",
      value: true,
      filePath: filePath,
    })
  } catch (error) {
    console.error("Error previewing image:", error)
    webviewView.webview.postMessage({
      type: "preview_file_response",
      value: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

// Helper to detect image extension from a binary buffer
function detectImageExtFromBuffer(buffer: Buffer): ".png" | ".jpg" | ".jpeg" | ".gif" | ".webp" | ".png" {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return ".png"
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg"
  }
  if (buffer.length >= 6) {
    const ascii = buffer.slice(0, 6).toString("ascii")
    if (ascii === "GIF87a" || ascii === "GIF89a") return ".gif"
  }
  if (
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString("ascii") === "RIFF" &&
    buffer.slice(8, 12).toString("ascii") === "WEBP"
  ) {
    return ".webp"
  }
  return ".png"
}

async function downloadToBuffer(url: string, maxRedirects = 3): Promise<{ buffer: Buffer; contentType?: string }> {
  return new Promise((resolve, reject) => {
    const visited: string[] = []

    const doRequest = (currentUrl: string, redirectsLeft: number) => {
      try {
        const parsed = new URL(currentUrl)
        const lib = parsed.protocol === "https:" ? https : http
        const req = lib.get(currentUrl, { timeout: 1000 * 30 }, (res) => {
          // Handle redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            if (redirectsLeft <= 0) {
              reject(new Error("Too many redirects"))
              return
            }
            const nextUrl = new URL(res.headers.location, currentUrl).toString()
            if (visited.includes(nextUrl)) {
              reject(new Error("Redirect loop detected"))
              return
            }
            visited.push(nextUrl)
            res.resume()
            doRequest(nextUrl, redirectsLeft - 1)
            return
          }

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            reject(new Error(`HTTP ${res.statusCode}`))
            res.resume()
            return
          }

          const chunks: Buffer[] = []
          res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
          res.on("end", () => {
            const buffer = Buffer.concat(chunks)
            resolve({ buffer, contentType: res.headers["content-type"] as string | undefined })
          })
          res.on("error", (err) => reject(err))
        })
        req.on("error", (err) => reject(err))
        req.on("timeout", () => {
          req.destroy(new Error("Request timed out"))
        })
      } catch (e) {
        reject(e)
      }
    }

    doRequest(url, maxRedirects)
  })
}

export async function open_image_file(
  webviewView: vscode.WebviewView,
  { url }: { url: string }
) {
  try {
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("Only http/https URLs are supported")
    }

    const { buffer, contentType } = await downloadToBuffer(url)
    if (!buffer || buffer.length === 0) throw new Error("Downloaded image is empty")

    let ext: ".png" | ".jpg" | ".jpeg" | ".gif" | ".webp" = ".png"
    if (contentType) {
      if (contentType.includes("png")) ext = ".png"
      else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg"
      else if (contentType.includes("gif")) ext = ".gif"
      else if (contentType.includes("webp")) ext = ".webp"
      else ext = detectImageExtFromBuffer(buffer)
    } else {
      ext = detectImageExtFromBuffer(buffer)
    }

    const tmpDir = os.tmpdir()
    const fileName = `image-${randomUUID()}${ext}`
    const filePath = path.join(tmpDir, fileName)
    const fileUri = vscode.Uri.file(filePath)

    await vscode.workspace.fs.writeFile(fileUri, new Uint8Array(buffer))

    try {
      await vscode.commands.executeCommand("vscode.open", fileUri, {
        preview: true,
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus: false,
      })
    } catch (openError) {
      await vscode.commands.executeCommand(
        "vscode.openWith",
        fileUri,
        "imagePreview.previewEditor",
        { preview: true, viewColumn: vscode.ViewColumn.Active, preserveFocus: false }
      )
    }

    let isFileDeleted = false
    const cleanup = async () => {
      if (isFileDeleted) return
      try {
        fs.unlinkSync(filePath)
        isFileDeleted = true
      } catch (err) {
        // ignore
      }
    }
    const checkIfFileClosed = async () => {
      if (isFileDeleted) return
      let isFileOpen = false
      for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
          if (tab.input instanceof vscode.TabInputText) {
            if (tab.input.uri.toString() === fileUri.toString()) {
              isFileOpen = true
              break
            }
          }
          if ((tab.input as any).uri && (tab.input as any).uri.toString() === fileUri.toString()) {
            isFileOpen = true
            break
          }
        }
        if (isFileOpen) break
      }
      if (!isFileOpen) {
        await cleanup()
        disposable.dispose()
        clearInterval(checkInterval)
      }
    }
    const disposable = vscode.window.tabGroups.onDidChangeTabs(checkIfFileClosed)
    const checkInterval = setInterval(checkIfFileClosed, 3000)
    setTimeout(async () => {
      await cleanup()
      disposable.dispose()
      clearInterval(checkInterval)
    }, 5 * 60 * 1000)

    webviewView.webview.postMessage({ type: "open_remote_image_response", value: true, filePath })
  } catch (error) {
    console.error("Error opening remote image:", error)
    webviewView.webview.postMessage({
      type: "open_remote_image_response",
      value: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}


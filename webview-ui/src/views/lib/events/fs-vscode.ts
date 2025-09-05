import { mkdirSync } from "fs"

export async function writeContentToFileVSCode(filePath: string, content: string): Promise<void> {
   // VS Code extension environment
   try {
      const fs = await import("fs/promises")
      const path = await import("path")
      // Ensure the directory exists first
      const dirPath = path.dirname(filePath)
      await fs.mkdir(dirPath, { recursive: true })

      // Write the file
      await fs.writeFile(filePath, content, "utf8")
   } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error)
      throw error
   }
}

export async function ensureDirectoryExistsVSCode(dirPath: string): Promise<boolean> {
   // VS Code extension environment
   try {
      mkdirSync(dirPath, { recursive: true })
      return true
   } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error)
      return false
   }
}

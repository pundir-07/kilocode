import { ReviewEvaluationType } from "@/common/types/review"
import { ensureDirectoryExists, writeContentToFile } from "../events/fs"
import { FileEvaluations } from "./fileStorage"

/**
 * Stores evaluations for a file in markdown files
 *
 * @param filePath The path to the file being evaluated
 * @param evaluations Object containing understanding, code_eval, and security_eval
 * @returns A promise that resolves to true if successful, false otherwise
 */
export async function storeFileEvaluations(filePath: string, evaluations: FileEvaluations): Promise<boolean> {
   try {
      // Normalize path to use forward slashes
      const normalizedPath = filePath.replace(/\\/g, "/")

      // Get the directory and filename
      const lastSlashIndex = normalizedPath.lastIndexOf("/")
      const dirPath = lastSlashIndex > -1 ? normalizedPath.substring(0, lastSlashIndex) : ""
      const fileName = lastSlashIndex > -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath

      // Create the .codemate directory and subdirectories
      const codemateDirPath = dirPath ? `${dirPath}/.codemate` : ".codemate"

      // Create directories for each evaluation type
      const understandingDirPath = `${codemateDirPath}/${ReviewEvaluationType.UNDERSTANDING}`
      const codeEvalDirPath = `${codemateDirPath}/${ReviewEvaluationType.CODE_EVAL}`
      const securityEvalDirPath = `${codemateDirPath}/${ReviewEvaluationType.SECURITY_EVAL}`

      // Ensure all directories exist
      await ensureDirectoryExists(codemateDirPath)
      await ensureDirectoryExists(understandingDirPath)
      await ensureDirectoryExists(codeEvalDirPath)
      await ensureDirectoryExists(securityEvalDirPath)

      // Create file paths
      const understandingFilePath = `${understandingDirPath}/${fileName}.md`
      const codeEvalFilePath = `${codeEvalDirPath}/${fileName}.md`
      const securityEvalFilePath = `${securityEvalDirPath}/${fileName}.md`

      // Write content to files
      await writeContentToFile(understandingFilePath, evaluations.understanding)
      await writeContentToFile(codeEvalFilePath, evaluations.code_eval)
      await writeContentToFile(securityEvalFilePath, evaluations.security_eval)

      return true
   } catch (error) {
      console.error(`Error storing evaluations for ${filePath}:`, error)
      return false
   }
}

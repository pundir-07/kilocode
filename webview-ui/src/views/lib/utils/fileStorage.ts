import { ReviewEvaluationType } from "@/common/types/review"
import { ensureDirectoryExists, writeContentToFile } from "../events/fs"

/**
 * Interface for file evaluation data
 */
export interface FileEvaluations {
   understanding: string
   code_eval: string
   security_eval: string
}

/**
 * Stores a single evaluation for a file in a markdown file
 *
 * @param filePath The path to the file being evaluated
 * @param evaluationType The type of evaluation (understanding, code_eval, security_eval)
 * @param content The evaluation content to store
 * @returns A promise that resolves to true if successful, false otherwise
 */
export async function storeSingleFileEvaluation(
   filePath: string,
   evaluationType: ReviewEvaluationType,
   content: string
): Promise<boolean> {
   try {
      // Normalize path to use forward slashes
      const normalizedPath = filePath.replace(/\\/g, "/")

      // Get the directory and filename
      const lastSlashIndex = normalizedPath.lastIndexOf("/")
      const dirPath = lastSlashIndex > -1 ? normalizedPath.substring(0, lastSlashIndex) : ""
      const fileName = lastSlashIndex > -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath

      // Create the .codemate directory and subdirectory
      const codemateDirPath = dirPath ? `${dirPath}/.codemate` : ".codemate"
      const evaluationDirPath = `${codemateDirPath}/${evaluationType}`

      // Ensure directories exist
      await ensureDirectoryExists(codemateDirPath)
      await ensureDirectoryExists(evaluationDirPath)

      // Create file path
      const mdFilePath = `${evaluationDirPath}/${fileName}.md`

      // Write content to file
      await writeContentToFile(mdFilePath, content)

      return true
   } catch (error) {
      console.error(`Error storing ${evaluationType} for ${filePath}:`, error)
      return false
   }
}

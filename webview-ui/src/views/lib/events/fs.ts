export async function getCurrentFilePath(): Promise<{ relative: string; absolute: string }> {
   return new Promise<{ relative: string; absolute: string }>((resolve) => {
      const requestID = Math.random().toString(36).substring(2, 15)

      const handleMessage = (event: MessageEvent) => {
         if (event.data.type === "current_file_path") {
            if (event.data.value.id === requestID) {
               window.removeEventListener("message", handleMessage)
               const data = event.data.value.filePath
               const normalizedPath = {
                  absolute: data.absolute.replace(/\\/g, "/"),
                  relative: data.relative.replace(/\\/g, "/"),
               }
               resolve(normalizedPath)
            }
         }
      }
      window.addEventListener("message", handleMessage)

      tsvscode.postMessage({ type: "get_current_file_path", value: { id: requestID } })
   })
}

export async function getFileContent(filePath: string) {
   return new Promise<string>((resolve) => {
      const requestID = Math.random().toString(36).substring(2, 15)

      // Create one-time event listener for terminal data
      const handleMessage = (event: MessageEvent) => {
         if (event.data.type === "file_content") {
            if (event.data.value.id === requestID) {
               window.removeEventListener("message", handleMessage)
               resolve(event.data.value.content)
            }
         }
      }
      window.addEventListener("message", handleMessage)

      // Request terminal data from extension
      tsvscode.postMessage({ type: "get_file_content", value: { id: requestID, filePath } })
   })
}

export async function getFileLanguage(filePath: string) {
   return new Promise<string>((resolve) => {
      const requestID = Math.random().toString(36).substring(2, 15)

      const handleMessage = (event: MessageEvent) => {
         if (event.data.type === "file_language") {
            if (event.data.value.id === requestID) {
               window.removeEventListener("message", handleMessage)
               resolve(event.data.value.language)
            }
         }
      }
      window.addEventListener("message", handleMessage)

      tsvscode.postMessage({ type: "get_file_language", value: { id: requestID, filePath } })
   })
}

export async function writeContentToFile(filePath: string, content: string): Promise<void> {
   return new Promise<void>((resolve) => {
      const requestID = Math.random().toString(36).substring(2, 15)

      const handleMessage = (event: MessageEvent) => {
         if (event.data.type === "write_content_to_file") {
            if (event.data.value.id === requestID) {
               window.removeEventListener("message", handleMessage)
               resolve()
            }
         }
      }
      window.addEventListener("message", handleMessage)

      tsvscode.postMessage({ type: "write_content_to_file", value: { id: requestID, filePath, content } })
   })
}

export async function ensureDirectoryExists(dirPath: string): Promise<boolean> {
   return new Promise<boolean>((resolve) => {
      const requestID = Math.random().toString(36).substring(2, 15)

      const handleMessage = (event: MessageEvent) => {
         if (event.data.type === "ensure_directory_exists") {
            if (event.data.value.id === requestID) {
               window.removeEventListener("message", handleMessage)
               resolve(event.data.value.success)
            }
         }
      }
      window.addEventListener("message", handleMessage)

      tsvscode.postMessage({ type: "ensure_directory_exists", value: { id: requestID, dirPath } })
   })
}

export function focusOrOpenFileInEditor(filePath: string) {
   tsvscode.postMessage({ type: "focus_or_open_file_in_editor", value: { filePath } })
}

export function ask_for_input(
   title: string,
   message: string,
   placeHolder: string,
   initialValue: string,
   optional: boolean,
   validateInput?: (input: string) => string | null | undefined
) {
   return new Promise<string | null>((resolve) => {
      const requestID = Math.random().toString(36).substring(2, 15)

      const handleMessage = (event: MessageEvent) => {
         if (event.data.type === "ask_for_input_response") {
            if (event.data.value.requestID === requestID) {
               resolve(event.data.value.input)
            }
         }
      }
      window.addEventListener("message", handleMessage)

      tsvscode.postMessage({
         type: "ask_for_input",
         value: { requestID, title, message, placeHolder, initialValue, optional, validateInput },
      })
   })
}

export function openFilesInTwoPanes(filePaths: string[]) {
   tsvscode.postMessage({ type: "open_files_in_two_panes", value: { filePaths } })
}

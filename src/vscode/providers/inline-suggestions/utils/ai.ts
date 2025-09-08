import { LocalServersState } from "@/vscode/core/state"

/**
 * Cleans up the suggestion by removing any trailing parts that repeat the prompt.
 *
 * @param prompt The original prompt text.
 * @param suggestion The suggestion text to clean up.
 * Cleans up the suggestion by removing any trailing parts that repeat the prompt.
 * It checks if the suggestion ends with the prompt or a partial repetition of it,
 * and removes that part from the suggestion.
 * This helps in ensuring that the suggestion is clean and does not contain unnecessary repetitions.
 * @returns The cleaned-up suggestion text.
 * If no cleanup is needed, it returns the original suggestion.
 * If the suggestion ends with the prompt, it removes that part.
 */
function cleanupPromptFromSuggestion(prompt: string, suggestion: string): string {
   const promptFirstLine = prompt.split("\n")[0].toLocaleLowerCase()

   const suggestionLines = suggestion.split("\n")
   for (let i = 0; i < suggestionLines.length; i++) {
      if (suggestionLines[i].toLowerCase() === promptFirstLine) {
         // If the suggestion contains the first line of the prompt, it's a breaking point
         return suggestionLines.slice(0, i).join("\n")
      }
   }

   return suggestionLines.join("\n")
}

/**
 * Fetch inline suggestions from the cloud API.
 * @param prompt The text prompt to get suggestions for.
 * @param stop Optional stop sequence to end the suggestions.
 * @returns A promise that resolves to a set of suggested texts.
 */
export async function getInlineSuggestionsFromCloud(prompt: string, stop?: string): Promise<Set<string>> {
   let sessionID = await LocalServersState.getSessionID()
   if (!sessionID) {
      console.error("Session ID is not available, cannot fetch inline suggestions.")
      return new Set()
   }

   // sessionID must begin with `sk-`
   if (!sessionID.startsWith("sk-")) {
      sessionID = `sk-${sessionID}`.trim()
   }

   try {
      const res = await fetch("https://autocomplete.v3.codemate.ai/v1/completions", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionID}`,
         },
         body: JSON.stringify({
            model: "code-complete",
            prompt: prompt,
            temperature: 0.3,
            n: 4,
            stop: stop,
         }),
      })
      if (!res.ok) {
         throw new Error(`API error: ${res.statusText}`)
      }

      const data = await res.json()

      const suggestions = new Set<string>(
         data.choices //
            .map((choice: any) => choice.text)
            .map((x: string) => cleanupPromptFromSuggestion(prompt, x))
      )
      return suggestions
   } catch (error) {
      console.error("Error fetching suggestions from cloud:", error)
      return new Set<string>()
   }
}

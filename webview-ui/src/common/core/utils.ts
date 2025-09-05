export namespace Utils {
   // -------------------------------------------------------------------------

   /**
    * The function generates a random string of 32 characters consisting of
    * uppercase and lowercase letters and numbers.
    *
    * @returns
    * The function `getNonce()` returns a randomly generated string of
    * 32 characters consisting of uppercase and lowercase letters and digits.
    */
   export function getRandomID() {
      let text = ""
      const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      for (let i = 0; i < 32; i++) {
         text += possible.charAt(Math.floor(Math.random() * possible.length))
      }
      return text
   }

   // -------------------------------------------------------------------------

   export const withTimeout = <T>(
      promise: Promise<T>,
      timeout: number,
      timeoutCallback: () => T
   ): Promise<T | null> => {
      return Promise.race([
         promise,
         new Promise<T | null>((resolve) => setTimeout(() => resolve(timeoutCallback()), timeout)),
      ])
   }

   // -------------------------------------------------------------------------
}

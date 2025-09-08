/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

export namespace Encryption {
   async function encryptData(plaintext: string, key: CryptoKey | string): Promise<string> {
      // If key is a string, convert it to CryptoKey
      const cryptoKey = typeof key === "string" ? await generateFinalKey(key) : key

      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encoder = new TextEncoder()
      const data = encoder.encode(plaintext)

      // Encrypt using AES-GCM
      const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, cryptoKey, data)

      // Generate HMAC for integrity
      const rawKey = await crypto.subtle.exportKey("raw", cryptoKey)
      const hmacKey = await crypto.subtle.importKey("raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, [
         "sign",
      ])

      // Prepare data for HMAC and final result
      const combined = new Uint8Array(iv.length + ciphertext.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(ciphertext), iv.length)

      const hmacDigest = await crypto.subtle.sign("HMAC", hmacKey, combined)

      const result = new Uint8Array(iv.length + ciphertext.byteLength + hmacDigest.byteLength)
      result.set(iv)
      result.set(new Uint8Array(ciphertext), iv.length)
      result.set(new Uint8Array(hmacDigest), iv.length + ciphertext.byteLength)

      // Convert to hex string
      return Array.from(result)
         .map((b) => b.toString(16).padStart(2, "0"))
         .join("")
   }

   async function generateFinalKey(keyStr: string): Promise<CryptoKey> {
      const encoder = new TextEncoder()
      const revKey = [...keyStr].reverse().join("")
      const tempKey = [...keyStr].map((a, i) => a + revKey[i]).join("")

      let keyData = encoder.encode(tempKey)
      let hashHex = ""

      // Perform multiple hash iterations (simplified from original)
      for (let i = 0; i < 5; i++) {
         const hashBuffer = await crypto.subtle.digest("SHA-256", i === 0 ? keyData : encoder.encode(hashHex))
         hashHex = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
      }

      // Final hash and key import
      const finalHash = await crypto.subtle.digest("SHA-256", encoder.encode(hashHex))
      return crypto.subtle.importKey(
         "raw",
         new Uint8Array(finalHash).slice(0, 32), // 32 bytes for AES-256
         { name: "AES-GCM" },
         true,
         ["encrypt", "decrypt"]
      )
   }

   export async function encrypt(inputString: string, keyString: string): Promise<string> {
      try {
         if (!window.crypto || !window.crypto.subtle) {
            throw new Error("Your browser doesn't support the required cryptographic features")
         }

         const finalKey = await generateFinalKey(keyString)
         return encryptData(inputString, finalKey)
      } catch (error) {
         console.error("Encryption error:", error)
         throw new Error(`Encryption Error: ${error instanceof Error ? error.message : String(error)}`)
      }
   }
}

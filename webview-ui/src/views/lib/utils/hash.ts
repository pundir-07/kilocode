// ----------------------------------------------------------------------------------------------------------

export namespace HashUtils {
   // -------------------------------------------------------------------------

   export async function generic(str: string, algo = "SHA-256") {
      let strBuf = new TextEncoder().encode(str)
      const hash = await crypto.subtle.digest(algo, strBuf)
      // here hash is an arrayBuffer,
      // so we'll connvert it to its hex version
      let result = ""
      const view = new DataView(hash)
      for (let i = 0; i < hash.byteLength; i += 4) {
         result += ("00000000" + view.getUint32(i).toString(16)).slice(-8)
      }
      return result
   }

   // -------------------------------------------------------------------------

   export function cyrb53(str: string, seed = 0) {
      let h1 = 0xdeadbeef ^ seed,
         h2 = 0x41c6ce57 ^ seed
      for (let i = 0, ch: number; i < str.length; i++) {
         ch = str.charCodeAt(i)
         h1 = Math.imul(h1 ^ ch, 2654435761)
         h2 = Math.imul(h2 ^ ch, 1597334677)
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
      h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
      h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

      return 4294967296 * (2097151 & h2) + (h1 >>> 0)
   }

   // -------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------------------------------------

import axios from "axios"

export namespace API {
   // -------------------------------------------------------------------------

   export const IAM = axios.create({
      baseURL: "https://api.identity.codemate.ai",
      headers: { "Content-Type": "application/json" },
   })

   // -------------------------------------------------------------------------

   export const BACKEND = axios.create({
      baseURL: "https://backend.v3.codemate.ai",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "69420" },
   })

   export const BACKEND_DEV = axios.create({
      baseURL: "https://backend.v3.codemateai.dev",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "69420" },
   })

   export const AUTOCOMPLETE = axios.create({
      baseURL: "https://autocomplete.codemate.ai/v1",
      headers: { "Content-Type": "application/json" },
   })

   export const BACKEND_LOCAL = axios.create({
      baseURL: "http://127.0.0.1:45213",
      headers: { "Content-Type": "application/json" },
   })

   // -------------------------------------------------------------------------
}

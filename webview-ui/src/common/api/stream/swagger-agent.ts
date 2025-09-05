import { HttpStreamer } from "."
import { API } from ".."
import {
   StreamSwaggerAgentBodyEndpointError_t,
   StreamSwaggerAgentBodyEndpointStart_t,
   StreamSwaggerAgentBodyEndpointSuccess_t,
   StreamSwaggerAgentBodyError_t,
   StreamSwaggerAgentBodyImports_t,
   StreamSwaggerAgentBodySuccess_t,
} from "./swagger-agent.types"

// ----------------------------------------------------------------------------------------------------------
// HTTP Streaming Chat API
// ----------------------------------------------------------------------------------------------------------

export type SwaggerAgentStreamPayload_t = {
   swagger_file_path: string
   swagger_content: string
   swagger_url: string
   swagger_knowledgebase_id: string
   client_side_language: string
   custom_instructions: string
   base_url: string
   provider: string
}

export async function swaggerAgentStreamFascade(
   payload: SwaggerAgentStreamPayload_t,
   callbacks: {
      onStreamStart: () => any
      onEndpointStart: (data: StreamSwaggerAgentBodyEndpointStart_t) => any
      onEndpointError: (data: StreamSwaggerAgentBodyEndpointError_t) => any
      onEndpointSuccess: (data: StreamSwaggerAgentBodyEndpointSuccess_t) => any
      onImports: (data: StreamSwaggerAgentBodyImports_t) => any
      onSuccess: (data: StreamSwaggerAgentBodySuccess_t) => any
      onStreamEnd: () => any
      onError:(data:StreamSwaggerAgentBodyError_t)=>any
   }
) {
   const streamer = new HttpStreamer(API.BACKEND_LOCAL.getUri())
   await streamer.initiateWithRetry(
      "/swagger/stream",
      payload,
      {
         onEnd: async () => {
            // eat 5 star do nothing :)
         },
         onError: async () => {
            // throw error to reject the overall promise
            throw new Error("Swagger agent stream error")
         },
         onEvent: async (event) => {
            switch (event.event) {
               case "start":
                  await callbacks.onStreamStart()
                  break
               case "endpoint_start":
                  await callbacks.onEndpointStart(event.data)
                  break
               case "endpoint_error":
                  await callbacks.onEndpointError(event.data)
                  break
               case "endpoint_success":
                  await callbacks.onEndpointSuccess(event.data)
                  break
               case "imports":
                  await callbacks.onImports(event.data)
                  break
               case "success":
                  await callbacks.onSuccess(event.data)
                  break
               case "error":
                  await callbacks.onError(event.data)
                  break
               case "end":
                  await callbacks.onStreamEnd()
                  break
               default:
                  console.log("Unknown event from swagger agent stream", event)
                  break
            }
         },
      },
      { maxRetries: 3, retryDelay: 1000 }
   )
}

// ----------------------------------------------------------------------------------------------------------
// Lifecycle events
// ----------------------------------------------------------------------------------------------------------

// Start of the stream
export type StreamSwaggerAgentBodyStart_t = {
   type: "start"
   message: string
}

// End of the stream
export type StreamSwaggerAgentBodyEnd_t = {
   type: "end"
   message: string
}

// ----------------------------------------------------------------------------------------------------------
// Progress events
// ----------------------------------------------------------------------------------------------------------

export type StreamSwaggerAgentBodyEndpointStart_t = {
   type: "endpoint_start"
   endpoint: string
   method: string
}

export type StreamSwaggerAgentBodyEndpointError_t = {
   type: "endpoint_error"
   endpoint: string
}

export type StreamSwaggerAgentBodyEndpointSuccess_t = {
   type: "endpoint_success"
   endpoint: string
   method: string
   result: {
      required_imports: string[]
      code: string
      endpoint: string
   }
}

export type StreamSwaggerAgentBodyImports_t = {
   type: "imports"
   imports: string[]
}

export type StreamSwaggerAgentBodySuccess_t = {
   type: "success"
   message: string
   total_endpoints: number
   successful_endpoints: number
}
export type StreamSwaggerAgentBodyError_t = {
   type: "error"
   message: string
}

// ----------------------------------------------------------------------------------------------------------

export type StreamSwaggerAgentBody_t =
   | StreamSwaggerAgentBodyStart_t
   | StreamSwaggerAgentBodyEnd_t
   | StreamSwaggerAgentBodyEndpointStart_t
   | StreamSwaggerAgentBodyEndpointError_t
   | StreamSwaggerAgentBodyEndpointSuccess_t
   | StreamSwaggerAgentBodyImports_t
   | StreamSwaggerAgentBodySuccess_t

// ----------------------------------------------------------------------------------------------------------

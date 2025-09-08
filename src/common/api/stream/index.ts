// ----------------------------------------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------------------------------------

/**
 * Represents a Server-Sent Event.
 * @property event - The name of the event.
 * @property data - The data payload of the event.
 */
type SSEEvent = {
   event: string
   data: any
}

/**
 * Defines the handlers for stream lifecycle events.
 * @property onEnd - A handler that is called when the stream ends successfully.
 * @property onError - A handler that is called when an error occurs.
 * @property onEvent - A handler that is called for each event received from the stream.
 */
type StreamHandlers = {
   onEnd: () => Promise<void>
   onError: (error: Error) => Promise<void>
   onEvent: (event: SSEEvent) => Promise<void>
}

// ----------------------------------------------------------------------------------------------------------

/**
 * Handles streaming HTTP responses with SSE (Server-Sent Events) like data chunks.
 * It provides functionality for making cancellable, retriable streaming requests and parsing the streamed data.
 */
export class HttpStreamer {
   private abortController: AbortController | null = null
   private serverBaseUrl: string
   private readonly delimeter: string

   /**
    * @param baseUrl - The base URL of the server to send requests to.
    * @param delimeter - The delimeter used to separate data chunks in the stream.
    */
   constructor(baseUrl: string, delimeter = "<__!!__END__!!__>") {
      this.serverBaseUrl = baseUrl
      this.delimeter = delimeter
   }

   /**
    * Parses a buffer of string data, splitting it into individual event chunks.
    * It handles partial chunks by returning the unprocessed part as a remainder.
    * @param buffer - The string buffer to parse.
    * @returns An object containing an array of parsed SSE events and any remaining unparsed string data.
    */
   private parseChunks(buffer: string) {
      const chunks = buffer.split(this.delimeter).filter(Boolean)
      // console.log("parsing buffer")
      const events: SSEEvent[] = []
      let remainder = ""

      for (const chunk of chunks) {
         let parsed
         try {
            parsed = JSON.parse(chunk)
            events.push({ event: parsed.type, data: parsed })
         } catch (err) {
            remainder += chunk
            continue
         }
      }

      return { parsed: events, remainder }
   }

   /**
    * Processes a ReadableStream of Uint8Array, decoding it and parsing SSE events.
    * It calls the provided handlers for events, errors, and stream completion.
    * @param body - The ReadableStream from the fetch response.
    * @param handlers - An object containing callbacks for stream events (onEvent, onError, onEnd).
    */
   private async processStream(body: ReadableStream<Uint8Array>, handlers: StreamHandlers): Promise<void> {
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      try {
         while (true) {
            const { done, value } = await reader.read()

            if (done) {
               await handlers.onEnd()
               break
            }

            buffer += decoder.decode(value, { stream: true })
            const { parsed, remainder } = this.parseChunks(buffer)
            buffer = remainder

            for (const event of parsed) {
               await handlers.onEvent(event)
            }
         }
      } catch (error: any) {
         await handlers.onError(error)
      } finally {
         reader.releaseLock()
      }
   }

   /**
    * Initiates a streaming request with a retry mechanism.
    * It will attempt to connect and process the stream, and if it fails, it will retry
    * with an exponential backoff strategy.
    * @param endpoint - The API endpoint to connect to.
    * @param requestBody - The body of the request.
    * @param headers - The headers for the request.
    * @param handlers - An object containing callbacks for stream events.
    * @param config - Configuration for retry logic, including max retries, delay, and an optional external abort signal.
    */
   public async initiateWithRetry(
      endpoint: string,
      requestBody: Record<string, any>,
      handlers: StreamHandlers,
      config: { maxRetries: number; retryDelay: number; abortController?: AbortController }
   ): Promise<void> {
      let attempt = 0
      let lastError: Error | null = null
      let currentRetryDelay = config.retryDelay

      while (attempt < config.maxRetries) {
         try {
            await this.attemptRequest(endpoint, requestBody, handlers, config.abortController)
            return // Success
         } catch (error: any) {
            lastError = error
            attempt++

            console.warn(`[HTTP Stream] Attempt ${attempt} failed:`, error.message)
            if (attempt < config.maxRetries && !error.message.includes("aborted")) {
               console.log(`[HTTP Stream] Retrying in ${currentRetryDelay}ms...`)
               await new Promise((resolve) => setTimeout(resolve, currentRetryDelay))
               currentRetryDelay *= 2 // Exponential backoff
            } else {
               break // Do not retry on abort or after max retries
            }
         }
      }

      if (lastError) {
         handlers.onError(lastError)
      }
   }

   /**
    * Attempts to make a single streaming request.
    * This method sets up an AbortController to allow for cancellation.
    * This function CANNOT THROW ERRORS.
    * @param endpoint - The API endpoint to connect to.
    * @param requestBody - The body of the request.
    * @param headers - The headers for the request.
    * @param handlers - An object containing callbacks for stream events.
    * @param abortController - An optional AbortSignal to link for external cancellation.
    */
   private async attemptRequest(
      endpoint: string,
      requestBody: any,
      handlers: StreamHandlers,
      abortController?: AbortController
   ): Promise<void> {
      this.abortController = abortController || new AbortController()

      try {
         const response = await fetch(`${this.serverBaseUrl}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: this.abortController.signal,
         })

         if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error")
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
         }

         if (!response.body) {
            throw new Error("Response body stream is null")
         }

         await this.processStream(response.body, handlers)
      } catch (error) {
         console.log("error", error)
         await handlers.onError(error as Error)
      }
   }

   /**
    * Stops the current streaming request by aborting the fetch request.
    */
   public stop(): void {
      if (this.abortController) {
         this.abortController.abort()
         this.abortController = null
      }
   }
}

// ----------------------------------------------------------------------------------------------------------

import { io } from "socket.io-client"

import { WSFileTreeNode } from "@/common/api/ws/socket.types"
import { WS_SERVER_URL } from "@/common/core/constants"
import { Knowledgebase_t } from "@/common/types/knowledgebase"
import { BehaviorSubject } from "rxjs"

export const WS = io(WS_SERVER_URL, {
   timeout: 1000 * 60 * 5, // 5 minutes
   requestTimeout: 1000 * 60 * 5, // 5 minutes
   reconnection: true,
   reconnectionAttempts: 5000, // Attempt reconnection up to 5000 times
   reconnectionDelay: 1000,
})

// ----------------------------------------------------------------------------------------------------------
// Connection - Use existing server startup function instead of HTTP health check
// ----------------------------------------------------------------------------------------------------------

const connectionSubject = new BehaviorSubject<boolean>(false)
WS.on("connect", () => {
   console.log("Connected to WebSocket server")
   connectionSubject.next(true)
})
WS.on("disconnect", () => {
   console.log("Disconnected from WebSocket server")
   connectionSubject.next(false)
})

export const wsConnectionObservable = connectionSubject.asObservable()

// ----------------------------------------------------------------------------------------------------------
// Knowledgebase
// ----------------------------------------------------------------------------------------------------------

export function createKnowledgebaseWS(
   data: Knowledgebase_t,
   {
      onSuccess,
      onProgress,
      onError,
   }: {
      onSuccess: (data: { data: { id: string } }) => void
      onProgress: (progress: { status: string; message: string; progress: number }) => void
      onError: (data: { status: string; message: string }) => void
   }
) {
   const request_id =
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

   const cleanup = () => {
      WS.off("upload:progress", handleProgress)
      WS.off("upload:success", handleSuccess)
      WS.off("upload:error", handleError)
   }

   const handleProgress = (progress: {
      request_id: string
      status: string
      message: string
      progress: number
   }) => {
      if (progress.request_id !== request_id) return
      onProgress(progress)
   }

   const handleSuccess = (data: any) => {
      if (data.request_id !== request_id) return
      cleanup()
      onSuccess(data)
   }

   const handleError = (error: any) => {
      if (error.request_id !== request_id) return
      cleanup()
      onError(error || "Upload failed")
   }

   // Set up event handlers
   WS.on("upload:progress", handleProgress)
   WS.on("upload:error", handleError)
   WS.once("upload:success", handleSuccess)

   // Start upload
   WS.emit("upload", { ...data, request_id })
}

// ----------------------------------------------------------------------------------------------------------
// File Tree
// ----------------------------------------------------------------------------------------------------------

export const uploadToCloud = (
   kb_id: string,
   {
      onSuccess,
      onProgress,
      onError,
   }: {
      onSuccess: (data: {
         message: string
         data: { id: string; cloud_id: string }
         request_id: string
         status: string
      }) => void
      onProgress: (progress: { progress: number; message: string }) => void
      onError: (data: { message: string; code: string; stacktrace: string }) => void
   }
) => {
   const requestId = `test_upload_${Date.now()}`
   const cleanup = () => {
      WS.off("upload_to_cloud:progress", handleProgress)
      WS.off("upload_to_cloud:success", handleSuccess)
      WS.off("upload_to_cloud:error", handleError)
   }
   const handleProgress = (data: any) => {
      if (data.request_id !== requestId) {
         return
      }
      onProgress(data)
   }
   const handleSuccess = (data: any) => {
      if (data.request_id !== requestId) {
         return
      }
      cleanup()
      console.log("Upload success data = ", data)
      console.log("Upload success data = ", data)
      onSuccess(data)
   }
   const handleError = (data: any) => {
      if (data.request_id !== requestId) {
         return
      }
      cleanup()
      onError(data)
   }

   WS.on("upload_to_cloud:progress", handleProgress)
   WS.on("upload_to_cloud:error", handleError)
   WS.once("upload_to_cloud:success", handleSuccess)
   console.log("CLOUD UPLOAD PAYLOAD => ", {
      kb_id: kb_id,
      request_id: requestId,
      sync_config: {
         enabled: true,
         lastSynced: 0,
      },
   })
   WS.emit("upload_to_cloud", {
      kb_id: kb_id,
      request_id: requestId,
      sync_config: {
         enabled: true,
         lastSynced: 0,
      },
   })
}

export const syncToCloud = (
   kb_id: string,
   {
      onSuccess,
      onProgress,
      onError,
   }: {
      onSuccess: (data: { message: string; kb_id: string; upload_id: string }) => void
      onProgress: (progress: { progress: number; message: string }) => void
      onError: (data: { message: string; code: string; stacktrace: string }) => void
   }
) => {
   const requestId = `test_upload_${Date.now()}`
   const cleanup = () => {
      WS.off("sync_to_cloud:progress", handleProgress)
      WS.off("sync_to_cloud:success", handleSuccess)
      WS.off("sync_to_cloud:error", handleError)
   }
   const handleProgress = (data: any) => {
      if (data.request_id !== requestId) {
         return
      }
      onProgress(data)
   }
   const handleSuccess = (data: any) => {
      if (data.request_id !== requestId) {
         return
      }
      cleanup()
      console.log("Sync success data = ", data)
      console.log("Sync success data = ", data)
      onSuccess(data)
   }
   const handleError = (data: any) => {
      if (data.request_id !== requestId) {
         return
      }
      cleanup()
      onError(data)
   }

   WS.on("sync_to_cloud:progress", handleProgress)
   WS.on("sync_to_cloud:error", handleError)
   WS.once("sync_to_cloud:success", handleSuccess)
   console.log("SYnc reqeust payload - ", {
      kb_id: kb_id,
      request_id: requestId,
   })
   WS.emit("sync_to_cloud", {
      kb_id: kb_id,
      request_id: requestId,
   })
}
export const getFolderPathsRecursive = (path: string) => {
   return new Promise<{ path: string; name: string }[]>((resolve, reject) => {
      const handleResponse = (data: { path: string; name: string }[]) => {
         resolve(data)
      }
      const handleError = (error: any) => {
         console.error("Error getting folder paths:", error)
         reject(error)
      }

      WS.once("get_folder_paths_recursive:response", handleResponse)
      WS.once("get_folder_paths_recursive:error", handleError)

      WS.emit("get_folder_paths_recursive", { path })
   })
}

export const getFileTree = (path: string) => {
   return new Promise<{
      allFiles: string[]
      value: WSFileTreeNode[]
      ignoredFiles: string[]
      workspacePath: string
   }>((resolve, reject) => {
      WS.emit("get_file_paths_recursive", { path, socket_call: true })
      WS.once("get_file_paths_recursive:response", (data) => {
         resolve(data)
      })
      WS.once("get_file_paths_recursive:error", (error) => {
         reject(error)
      })
   })
}

// ----------------------------------------------------------------------------------------------------------

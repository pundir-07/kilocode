// ----------------------------------------------------------------------------------------------------------
// File Tree
// ----------------------------------------------------------------------------------------------------------

export type WSFileTreeRequest_t = {
   path: string
   socket_call: boolean
}

export type WSFileTreeNode = {
   name: string
   path: string
   metadata: { absolutePath: string }
   children: WSFileTreeNode[]
}

export type WSFileTreeResponse_t = {
   allFiles: string[]
   value: WSFileTreeNode[]
   workspacePath: string
}

// ----------------------------------------------------------------------------------------------------------

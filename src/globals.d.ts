declare global {
   const tsvscode: {
      postMessage: (message: { type: string; value?: any }) => void
   }
}

export {} // This export makes this a module

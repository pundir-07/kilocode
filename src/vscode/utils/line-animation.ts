import * as vscode from "vscode"

export interface LineAnimationOptions {
   range: vscode.Range
   editor: vscode.TextEditor
   animationSpeed?: number // milliseconds per line
   highlightColor?: string
   onComplete?: () => void
   onLineProcessed?: (lineNumber: number) => void
}

export class LineByLineAnimator {
   private static activeAnimations = new Map<string, NodeJS.Timeout[]>()
   private static decorationType: vscode.TextEditorDecorationType | undefined
   private static blockDecorations = new Map<string, vscode.TextEditorDecorationType>()
   private static animationDecorations = new Map<string, vscode.Range[]>()

   /**
    * Creates the decoration type for line highlighting
    */
   private static createDecorationType(): vscode.TextEditorDecorationType {
      if (this.decorationType) {
         return this.decorationType
      }

      this.decorationType = vscode.window.createTextEditorDecorationType({
         backgroundColor: 'rgba(100, 181, 246, 0.2)', // Soft light blue
         border: '1px solid rgba(100, 181, 246, 0.4)',
         borderRadius: '2px',
         isWholeLine: true,
         overviewRulerColor: 'rgba(100, 181, 246, 0.6)',
         overviewRulerLane: vscode.OverviewRulerLane.Right,
      })

      return this.decorationType
   }

   /**
    * Starts the line-by-line animation for a given range
    */
   public static async startAnimation(options: LineAnimationOptions): Promise<void> {
      const {
         range,
         editor,
         animationSpeed = 50,
         onComplete,
         onLineProcessed
      } = options

      const animationId = `${editor.document.uri.toString()}-${range.start.line}-${range.end.line}`
      
      // Clear any existing animation for this range
      this.clearAnimation(animationId)

      const decorationType = this.createDecorationType()
      const timeouts: NodeJS.Timeout[] = []
      const decoratedLines: vscode.Range[] = []

      // Calculate total lines to animate
      const startLine = range.start.line
      const endLine = range.end.line
      const totalLines = endLine - startLine + 1

      // Animate each line sequentially
      for (let i = 0; i < totalLines; i++) {
         const timeout = setTimeout(() => {
            const currentLine = startLine + i
            
            // Add current line to decorations
            const lineRange = new vscode.Range(
               new vscode.Position(currentLine, 0),
               new vscode.Position(currentLine, editor.document.lineAt(currentLine).text.length)
            )
            decoratedLines.push(lineRange)

            // Store decorations for this animation
            this.animationDecorations.set(animationId, [...decoratedLines])

            // Apply decorations to all processed lines so far
            editor.setDecorations(decorationType, decoratedLines)

            // Call line processed callback
            onLineProcessed?.(currentLine)

            // If this is the last line, complete the animation normally (but don't auto-clear)
            if (i === totalLines - 1) {
               onComplete?.()
            }
         }, i * animationSpeed)

         timeouts.push(timeout)
      }

      // Store timeouts for cleanup
      this.activeAnimations.set(animationId, timeouts)
   }

   /**
    * Starts animation and then applies final block decoration
    */
   public static async animateProcessing(options: LineAnimationOptions): Promise<void> {
      return new Promise((resolve) => {
         this.startAnimation({
            ...options,
            onComplete: () => {
               // After line animation, apply block decoration
               this.applyBlockDecoration(options.range, options.editor)
               options.onComplete?.()
               resolve()
            }
         })
      })
   }

   /**
    * Applies a block decoration to the entire range (for final processed state)
    */
   public static applyBlockDecoration(range: vscode.Range, editor: vscode.TextEditor): string {
      const blockDecorationType = vscode.window.createTextEditorDecorationType({
         backgroundColor: 'rgba(76, 175, 80, 0.1)', // Soft green for completed
         border: '1px solid rgba(76, 175, 80, 0.3)',
         borderRadius: '4px',
         isWholeLine: false,
      })

      editor.setDecorations(blockDecorationType, [range])

      // Generate unique ID for this decoration
      const decorationId = `${editor.document.uri.toString()}-${range.start.line}-${range.end.line}-${Date.now()}`
      this.blockDecorations.set(decorationId, blockDecorationType)

      // Return the decoration ID so it can be cleaned up later
      return decorationId
   }

   /**
    * Removes a specific block decoration by ID
    */
   public static removeBlockDecoration(decorationId: string): void {
      const decoration = this.blockDecorations.get(decorationId)
      if (decoration) {
         decoration.dispose()
         this.blockDecorations.delete(decorationId)
      }
   }

   /**
    * Removes block decorations for a specific range
    */
   public static removeBlockDecorationsForRange(documentUri: string, range: vscode.Range): void {
      const rangeKey = `${documentUri}-${range.start.line}-${range.end.line}`
      
      // Find and remove decorations that match this range
      for (const [decorationId, decoration] of this.blockDecorations) {
         if (decorationId.startsWith(rangeKey)) {
            decoration.dispose()
            this.blockDecorations.delete(decorationId)
         }
      }
   }

   /**
    * Clears animation for a specific range
    */
   public static clearAnimation(animationId: string): void {
      const timeouts = this.activeAnimations.get(animationId)
      if (timeouts) {
         timeouts.forEach(timeout => clearTimeout(timeout))
         this.activeAnimations.delete(animationId)
      }

      // Clear only the decorations for this specific animation
      if (this.decorationType && this.animationDecorations.has(animationId)) {
         const [documentUri] = animationId.split('-')
         const uri = vscode.Uri.parse(documentUri)
         
         vscode.window.visibleTextEditors.forEach(editor => {
            if (editor.document.uri.toString() === uri.toString()) {
               editor.setDecorations(this.decorationType!, [])
            }
         })
         
         this.animationDecorations.delete(animationId)
      }
   }

   /**
    * Clears all active animations
    */
   public static clearAllAnimations(): void {
      for (const [animationId] of this.activeAnimations) {
         this.clearAnimation(animationId)
      }
      
      // Clear any remaining animation decorations
      this.animationDecorations.clear()
   }

   /**
    * Disposes all resources
    */
   public static dispose(): void {
      this.clearAllAnimations()
      if (this.decorationType) {
         this.decorationType.dispose()
         this.decorationType = undefined
      }
      
      // Dispose all block decorations
      for (const [decorationId, decoration] of this.blockDecorations) {
         decoration.dispose()
      }
      this.blockDecorations.clear()
      this.animationDecorations.clear()
   }

   /**
    * Quick utility to animate a selection in the active editor
    */
   public static async animateActiveSelection(options?: {
      animationSpeed?: number
      onComplete?: () => void
   }): Promise<void> {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.selection.isEmpty) {
         return
      }

      return this.animateProcessing({
         range: editor.selection,
         editor,
         animationSpeed: options?.animationSpeed,
         onComplete: options?.onComplete
      })
   }
}

import * as vscode from "vscode"
import * as diff from "diff"

/**
 * Represents a change in the document
 */
interface DocumentChange {
  startLine: number;
  endLine: number;
  originalText: string;
  newText: string;
}

/**
 * Shows changes directly in the current editor with accept/reject buttons
 * 
 * @param editor The active text editor
 * @param originalContent The original content of the file
 * @param newContent The new content to be applied
 */
export async function showInlineChangesView(
  editor: vscode.TextEditor,
  originalContent: string,
  newContent: string
): Promise<void> {
  try {
    // Calculate differences between original and new content
    const changes = calculateChanges(originalContent, newContent);
    
    if (changes.length === 0) {
      vscode.window.showInformationMessage("No changes to apply.");
      return;
    }
    
    // Create decoration type for deleted lines
    const deletedDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      isWholeLine: true,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });
    
    // Create decoration type for added lines
    const addedDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(0, 255, 0, 0.2)',
      isWholeLine: true,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });
    
    // Create arrays to track decorations
    const deletedRanges: vscode.Range[] = [];
    const addedRanges: vscode.Range[] = [];
    
    // Add VSCode buttons at the bottom of the editor
    const acceptAllButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    acceptAllButton.text = "$(check) Accept All Changes";
    acceptAllButton.tooltip = "Apply all changes";
    acceptAllButton.command = 'codemate.inlineAcceptAllChanges';
    acceptAllButton.show();
    
    const rejectAllButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    rejectAllButton.text = "$(x) Reject All Changes";
    rejectAllButton.tooltip = "Discard all changes";
    rejectAllButton.command = 'codemate.inlineRejectAllChanges';
    rejectAllButton.show();
    
    // Register commands for accept/reject all
    const acceptAllDisposable = vscode.commands.registerCommand("codemate.inlineAcceptAllChanges", async () => {
      try {

        // Apply the new content directly to the document
        const fullRange = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(editor.document.getText().length)
        );
        
        await editor.edit(editBuilder => {
          editBuilder.replace(fullRange, newContent);
        });
        
        vscode.window.showInformationMessage("All changes applied successfully.");
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to apply changes: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    
    const rejectAllDisposable = vscode.commands.registerCommand("codemate.inlineRejectAllChanges", async () => {
      try {
        // Clean up the preview
        cleanup();
        
        // Restore the original content
        const fullRange = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(editor.document.getText().length)
        );
        
        await editor.edit(editBuilder => {
          editBuilder.replace(fullRange, originalContent);
        });
        
        vscode.window.showInformationMessage("Changes were rejected and original content restored.");
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to reject changes: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    
    // Apply decorations to show changes
    for (const change of changes) {
      // Make sure start and end lines are within document bounds
      const docLineCount = editor.document.lineCount;
      
      // Skip if document is empty
      if (docLineCount === 0) {
        continue;
      }
      
      const safeStartLine = Math.max(0, Math.min(change.startLine, docLineCount - 1));
      const safeEndLine = Math.max(0, Math.min(change.endLine, docLineCount - 1));
      
      // Skip if the lines are out of bounds
      if (safeStartLine >= docLineCount || safeEndLine < 0 || safeStartLine > safeEndLine) {
        continue;
      }
      
      // Add decorations for deleted lines
      for (let line = safeStartLine; line <= safeEndLine; line++) {
        try {
          const lineRange = editor.document.lineAt(line).range;
          deletedRanges.push(lineRange);
        } catch (error) {
          console.error(`Error accessing line ${line}:`, error);
          // Skip this line if there's an error
          continue;
        }
      }
      
      // Add decorations for new lines (shown as virtual text)
      const newLines = change.newText.split('\n');
      if (newLines.length > 0 && newLines[newLines.length - 1] === '') {
        newLines.pop(); // Remove trailing empty line
      }
      
      // Skip if there are no new lines to show
      if (newLines.length === 0) {
        continue;
      }
      
      try {
        // Insert the new content as a preview with decorations
        await editor.edit(editBuilder => {
          const position = editor.document.lineAt(safeEndLine).range.end;
          editBuilder.insert(position, '\n' + newLines.join('\n'));
        });
        
        // Add decorations for the newly inserted lines
        for (let i = 0; i < newLines.length; i++) {
          const lineNumber = safeEndLine + 1 + i;
          if (lineNumber < editor.document.lineCount) {
            try {
              const lineRange = editor.document.lineAt(lineNumber).range;
              addedRanges.push(lineRange);
            } catch (error) {
              console.error(`Error accessing added line ${lineNumber}:`, error);
              continue;
            }
          }
        }
      } catch (error) {
        console.error(`Error inserting new content after line ${safeEndLine}:`, error);
        // Skip this decoration if there's an error
        continue;
      }
    }
    
    // Apply decorations
    editor.setDecorations(deletedDecoration, deletedRanges);
    editor.setDecorations(addedDecoration, addedRanges);
    
    // Function to clean up resources
    function cleanup() {
      deletedDecoration.dispose();
      addedDecoration.dispose();
      changeDisposable.dispose();
    }
    
    // Dispose decorations when editor changes
    const changeDisposable = vscode.window.onDidChangeActiveTextEditor(() => {
      cleanup();
    });
    
    // Set a timeout to clean up resources if not used
    setTimeout(() => {
      cleanup();
    }, 60000); // 1 minute timeout
  } catch (error) {
    console.error("Error in showInlineChangesView:", error);
    vscode.window.showErrorMessage(`Error showing changes: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Calculate changes between original and new content
 */
function calculateChanges(originalContent: string, newContent: string): DocumentChange[] {
  try {
    const changes: DocumentChange[] = [];
    const diffResult = diff.diffLines(originalContent, newContent);
    
    let lineIndex = 0;
    let currentChange: DocumentChange | null = null;
    
    for (const part of diffResult) {
      if (part.removed) {
        // Start of a change
        const startLine = lineIndex;
        const lineCount = part.count || (part.value.match(/\n/g) || []).length;
        const endLine = startLine + lineCount - (part.value.endsWith('\n') ? 1 : 0);
        
        currentChange = {
          startLine,
          endLine,
          originalText: part.value,
          newText: ''
        };
        
        lineIndex = endLine + 1;
      } else if (part.added && currentChange) {
        // Complete the change with the new text
        currentChange.newText = part.value;
        changes.push(currentChange);
        currentChange = null;
      } else if (!part.added && !part.removed) {
        // Unchanged content
        const lineCount = part.count || (part.value.match(/\n/g) || []).length;
        lineIndex += lineCount;
        
        if (currentChange) {
          // If there was a removal without an addition, add it as a deletion
          changes.push(currentChange);
          currentChange = null;
        }
      }
    }
    
    // Handle any remaining change
    if (currentChange) {
      changes.push(currentChange);
    }
    
    return changes;
  } catch (error) {
    console.error("Error calculating changes:", error);
    return [];
  }
}

// Modify the event handler to not require file focus
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'edit_suggestions_ready') {
    
    // Notify the store about the ready state
    tsvscode.postMessage({
      type: 'edit_suggestions_ready',
      value: {
        status: 'ready',
        timestamp: Date.now()
      }
    });
    
    // If there are animations, ensure they're triggered
    startAnimations();
  }
});

function startAnimations() {
  const animElements = document.querySelectorAll('.animation-element');
  animElements.forEach(el => {
    el.classList.add('animate');
  });
}



import * as vscode from 'vscode';

/**
 * Helper class to manage diff editors for suggestions
 */
export class DiffEditorManager {
    // Map to track open diff editors by suggestion ID
    private static diffEditorTabs = new Map<string, string>();
    
    /**
     * Opens a diff view comparing original and suggested code
     * @param scheme The URI scheme to use for the diff view
     * @param originalContent The original code content
     * @param modifiedContent The suggested code content
     * @param languageId The language ID for syntax highlighting
     * @param suggestionId The unique ID of the suggestion
     * @returns Promise that resolves when the diff view is opened
     */
    public static async openDiffView(
        scheme: string,
        originalContent: string,
        modifiedContent: string,
        languageId: string,
        suggestionId: string
    ): Promise<void> {
        // Create URIs for the diff
        const originalUri = vscode.Uri.parse(`${scheme}:/original/${suggestionId}`);
        const modifiedUri = vscode.Uri.parse(`${scheme}:/modified/${suggestionId}`);
        
        // Register content provider if needed
        await this.ensureContentProviderRegistered(scheme);
        
        // Set content in the provider
        this.getContentProvider(scheme).setContent(originalUri, originalContent, languageId);
        this.getContentProvider(scheme).setContent(modifiedUri, modifiedContent, languageId);
        
        // Show diff with improved options
        await vscode.commands.executeCommand(
            "vscode.diff",
            originalUri,
            modifiedUri,
            "Original ↔ Suggested Changes",
            {
                preview: true,
                viewColumn: vscode.ViewColumn.Beside,
            }
        );
        
        // Track this diff editor
        this.diffEditorTabs.set(suggestionId, `${scheme}:/original/${suggestionId}`);
    }
    
    /**
     * Closes the diff editor for a specific suggestion
     * @param suggestionId The unique ID of the suggestion
     */
    public static async closeDiffEditor(suggestionId: string): Promise<boolean> {
        if (!this.diffEditorTabs.has(suggestionId)) {
            return false;
        }
        
        // Find all tabs that might be showing our diff
        const diffTabs = vscode.window.tabGroups.all
            .flatMap(group => group.tabs)
            .filter(tab => {
                if (tab.input instanceof vscode.TabInputTextDiff) {
                    const scheme = this.diffEditorTabs.get(suggestionId)?.split(':/')[0];
                    return tab.input.original.scheme === scheme || tab.input.modified.scheme === scheme;
                }
                return false;
            });
        
        // Close the diff tabs if any were found
        if (diffTabs.length > 0) {
            await vscode.window.tabGroups.close(diffTabs);
            this.diffEditorTabs.delete(suggestionId);
            return true;
        }
        
        // Clean up even if we didn't find a tab to close
        this.diffEditorTabs.delete(suggestionId);
        return false;
    }
    
    // Content provider instances by scheme
    private static contentProviders = new Map<string, DiffContentProvider>();
    
    // Registrations for content providers
    private static registrations = new Map<string, vscode.Disposable>();
    
    /**
     * Ensures a content provider is registered for the given scheme
     */
    private static async ensureContentProviderRegistered(scheme: string): Promise<void> {
        if (!this.contentProviders.has(scheme)) {
            const provider = new DiffContentProvider();
            this.contentProviders.set(scheme, provider);
            
            // Register the provider
            const registration = vscode.workspace.registerTextDocumentContentProvider(scheme, provider);
            this.registrations.set(scheme, registration);
        }
    }
    
    /**
     * Gets the content provider for a scheme
     */
    private static getContentProvider(scheme: string): DiffContentProvider {
        if (!this.contentProviders.has(scheme)) {
            throw new Error(`No content provider registered for scheme: ${scheme}`);
        }
        return this.contentProviders.get(scheme)!;
    }
    
    /**
     * Disposes all registrations
     */
    public static dispose(): void {
        for (const registration of this.registrations.values()) {
            registration.dispose();
        }
        this.registrations.clear();
        this.contentProviders.clear();
        this.diffEditorTabs.clear();
    }
}

/**
 * Content provider for diff views
 */
class DiffContentProvider implements vscode.TextDocumentContentProvider {
    private contentMap = new Map<string, string>();
    private languageMap = new Map<string, string>();
    
    provideTextDocumentContent(uri: vscode.Uri): string {
        const key = uri.toString();
        return this.contentMap.get(key) || "";
    }
    
    getLanguage(uri: vscode.Uri): string {
        const key = uri.toString();
        return this.languageMap.get(key) || "";
    }
    
    setContent(uri: vscode.Uri, content: string, language: string): void {
        const key = uri.toString();
        this.contentMap.set(key, content);
        this.languageMap.set(key, language);
    }
    
    clear(): void {
        this.contentMap.clear();
        this.languageMap.clear();
    }
}

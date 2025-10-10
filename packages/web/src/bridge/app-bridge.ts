/**
 * AppBridge - Event-based communication layer
 *
 * This is the central event bus that enables communication between Svelte components
 * and the service layer without direct DOM manipulation conflicts.
 *
 * Pattern: Svelte Components → AppBridge → ServiceCoordinator → Services
 *
 * Phase 5.2a - Infrastructure
 */

/**
 * All possible events that can be dispatched through the AppBridge
 */
export type AppEvent =
  // File processing events
  | { type: 'file:local:selected'; file: File; options?: FileProcessingOptions }
  | { type: 'file:drive:requested'; url: string; options?: FileProcessingOptions }
  | { type: 'file:box:requested'; url: string; options?: FileProcessingOptions }
  | { type: 'file:batch:local:requested'; files: File[]; options?: FileProcessingOptions }
  | { type: 'file:batch:drive:requested'; folderUrl: string; options?: FileProcessingOptions }
  | { type: 'file:batch:box:requested'; folderUrl: string; options?: FileProcessingOptions }

  // Analysis lifecycle events
  | { type: 'analysis:started'; filename: string; source: 'local' | 'drive' | 'box' }
  | { type: 'analysis:progress'; filename: string; percent: number; stage: string }
  | { type: 'analysis:completed'; results: any } // TODO: Type this properly
  | { type: 'analysis:error'; filename: string; error: Error }
  | { type: 'analysis:cancelled'; filename: string }

  // Batch analysis events
  | { type: 'batch:started'; totalFiles: number; source: 'local' | 'drive' | 'box' }
  | { type: 'batch:progress'; processedFiles: number; totalFiles: number; currentFile: string }
  | { type: 'batch:completed'; results: any[] } // TODO: Type this properly
  | { type: 'batch:error'; error: Error }
  | { type: 'batch:cancelled' }

  // Advanced analysis events
  | { type: 'advanced:started'; filename: string }
  | { type: 'advanced:progress'; percent: number; stage: string }
  | { type: 'advanced:completed'; results: any } // TODO: Type this properly
  | { type: 'advanced:error'; error: Error }
  | { type: 'advanced:cancelled' }

  // Auth events
  | { type: 'auth:google:signin:requested' }
  | { type: 'auth:google:signin:success'; userInfo: any }
  | { type: 'auth:google:signin:error'; error: Error }
  | { type: 'auth:google:signout:requested' }
  | { type: 'auth:google:signout:success' }
  | { type: 'auth:google:signout:error'; error: Error }
  | { type: 'auth:box:signin:requested' }
  | { type: 'auth:box:signin:success' }
  | { type: 'auth:box:signin:error'; error: Error }
  | { type: 'auth:box:signout:requested' }
  | { type: 'auth:box:signout:success' }
  | { type: 'auth:box:signout:error'; error: Error }

  // Settings events
  | { type: 'settings:preset:changed'; presetId: string }
  | { type: 'settings:criteria:changed'; criteria: any } // TODO: Type this properly
  | { type: 'settings:darkmode:toggled'; enabled: boolean }

  // Tab navigation events
  | { type: 'tab:changed'; tab: 'local' | 'googleDrive' | 'box' | 'settings' };

/**
 * Options for file processing
 */
export interface FileProcessingOptions {
  enableAudioAnalysis?: boolean;
  enableFilenameValidation?: boolean;
  speakerId?: string;
  scriptsFolderUrl?: string;
  criteria?: any; // TODO: Type this properly
}

/**
 * Event handler function type
 */
type EventHandler<T = any> = (detail: T) => void;

/**
 * AppBridge - Singleton event bus for app-wide communication
 *
 * This class provides a type-safe event bus that decouples Svelte components
 * from service layer logic, preventing DOM manipulation conflicts.
 *
 * Usage in Svelte components:
 * ```typescript
 * import { AppBridge } from '../bridge/app-bridge';
 *
 * const bridge = AppBridge.getInstance();
 * bridge.dispatch({ type: 'file:local:selected', file: myFile });
 * ```
 *
 * Usage in services:
 * ```typescript
 * const bridge = AppBridge.getInstance();
 * const unsubscribe = bridge.on('file:local:selected', (event) => {
 *   // Process file
 * });
 * ```
 */
export class AppBridge extends EventTarget {
  private static instance: AppBridge;

  private constructor() {
    super();
    this.setupDebugLogging();
  }

  /**
   * Get the singleton instance of AppBridge
   */
  static getInstance(): AppBridge {
    if (!AppBridge.instance) {
      AppBridge.instance = new AppBridge();
    }
    return AppBridge.instance;
  }

  /**
   * Dispatch an event through the bridge
   *
   * @param event - The event to dispatch
   *
   * @example
   * ```typescript
   * bridge.dispatch({
   *   type: 'file:local:selected',
   *   file: myFile,
   *   options: { enableAudioAnalysis: true }
   * });
   * ```
   */
  dispatch(event: AppEvent): void {
    const customEvent = new CustomEvent('app:event', {
      detail: event,
      bubbles: false,
      cancelable: false
    });
    this.dispatchEvent(customEvent);
  }

  /**
   * Subscribe to a specific event type
   *
   * @param eventType - The event type to listen for
   * @param handler - Function to call when event is dispatched
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = bridge.on('file:local:selected', (event) => {
   *   console.log('File selected:', event.file.name);
   * });
   *
   * // Later, to unsubscribe:
   * unsubscribe();
   * ```
   */
  on<T extends AppEvent['type']>(
    eventType: T,
    handler: EventHandler<Extract<AppEvent, { type: T }>>
  ): () => void {
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<AppEvent>;
      if (customEvent.detail.type === eventType) {
        handler(customEvent.detail as Extract<AppEvent, { type: T }>);
      }
    };

    this.addEventListener('app:event', listener);

    // Return unsubscribe function
    return () => this.removeEventListener('app:event', listener);
  }

  /**
   * Subscribe to all events (useful for debugging or logging)
   *
   * @param handler - Function to call for any event
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = bridge.onAll((event) => {
   *   console.log('Event:', event.type);
   * });
   * ```
   */
  onAll(handler: EventHandler<AppEvent>): () => void {
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<AppEvent>;
      handler(customEvent.detail);
    };

    this.addEventListener('app:event', listener);
    return () => this.removeEventListener('app:event', listener);
  }

  /**
   * Subscribe to an event once - automatically unsubscribes after first call
   *
   * @param eventType - The event type to listen for
   * @param handler - Function to call when event is dispatched
   * @returns Unsubscribe function (in case you want to cancel before it fires)
   */
  once<T extends AppEvent['type']>(
    eventType: T,
    handler: EventHandler<Extract<AppEvent, { type: T }>>
  ): () => void {
    let unsubscribe: (() => void) | null = null;

    const wrappedHandler = (detail: Extract<AppEvent, { type: T }>) => {
      handler(detail);
      if (unsubscribe) {
        unsubscribe();
      }
    };

    unsubscribe = this.on(eventType, wrappedHandler);
    return unsubscribe;
  }

  /**
   * Clear all event listeners (useful for testing)
   * WARNING: This will break the app if used in production
   */
  clearAllListeners(): void {
    const listeners = (this as any)._listeners;
    if (listeners) {
      Object.keys(listeners).forEach(key => {
        delete listeners[key];
      });
    }
  }

  /**
   * Setup debug logging in development mode
   * Logs all events to console when localStorage.debugBridge is set
   */
  private setupDebugLogging(): void {
    if (typeof window !== 'undefined' && localStorage.getItem('debugBridge') === 'true') {
      this.onAll((event) => {
        console.log('[AppBridge]', event.type, event);
      });
    }
  }
}

/**
 * Helper to enable debug logging
 * Call this in the browser console: enableBridgeDebug()
 */
if (typeof window !== 'undefined') {
  (window as any).enableBridgeDebug = () => {
    localStorage.setItem('debugBridge', 'true');
    console.log('AppBridge debug logging enabled. Reload the page to see events.');
  };

  (window as any).disableBridgeDebug = () => {
    localStorage.removeItem('debugBridge');
    console.log('AppBridge debug logging disabled.');
  };
}

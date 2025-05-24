// /Users/aasu/Desktop/closezly/apps/desktop/src/electron.d.ts

// Define the structure of the user object if known, otherwise use 'any'
// interface User {
//   id: string;
//   email: string;
//   // ... other user properties
// }

// Define the structure of the AppState if known, otherwise use 'any'
// interface AppStateSnapshot {
//   isAuthenticated: boolean;
//   user: User | null;
//   overlayVisible: boolean;
//   isProcessing: boolean;
//   // ... other app state properties
// }

export interface IElectronAPI {
  // Window management
  toggleVisibility: () => boolean;
  setWindowPosition: (deltaX: number, deltaY: number) => { x: number; y: number };
  positionAtTop: () => { x: number; y: number };
  resizeWindow: (width: number, height: number) => { width: number; height: number };
  setHoverExpand: (expand: boolean) => void;

  // Screenshot and processing
  takeScreenshotAndProcess: () => Promise<{ success: boolean; image?: string; error?: string }>;

  // Query processing
  processManualQuery: (queryText: string) => Promise<any>; // Consider defining a more specific return type

  // Authentication
  getAuthStatus: () => Promise<{ isAuthenticated: boolean; user: any /* User | null */ }>;
  openLoginPage: () => boolean;
  logout: () => boolean;
  refreshUserProfile: () => Promise<{ success: boolean; user: any /* User | null */ }>;

  // Call management
  startCall: () => boolean;
  endCall: () => boolean;
  addTranscriptSegment: (speaker: 'user' | 'customer', text: string, timestamp: string) => boolean;

  // App state
  getAppState: () => Promise<any>; // Consider defining a more specific return type (e.g., AppStateSnapshot)

  // Event listeners (all return a cleanup function)
  onStateUpdated: (callback: (state: any /* AppStateSnapshot */) => void) => () => void;
  onTriggerAIQuery: (callback: () => void) => () => void;
  onCallRecordingToggled: (callback: (isActive: boolean) => void) => () => void;
  onVisibilityChangedByHotkey: (callback: (newVisibility: boolean) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

// This empty export makes the file a module, which is necessary for 'declare global'.
export {};

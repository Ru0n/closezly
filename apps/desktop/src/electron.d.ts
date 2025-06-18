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
  takeScreenshotAndProcess: () => Promise<{
    success: boolean;
    suggestions?: any[];
    response?: string;
    error?: string
  }>;

  // Query processing
  processManualQuery: (queryText: string) => Promise<{
    success: boolean;
    suggestions?: any[];
    response?: string;
    error?: string
  }>;

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

  // Audio capture
  startAudioCapture: () => Promise<{ success: boolean; error?: string }>;
  stopAudioCapture: () => Promise<{ success: boolean; error?: string }>;
  getAudioStatus: () => Promise<{ isCapturing: boolean; hasMicrophone: boolean; hasSystemAudio: boolean }>;

  // Voice recording (Local Whisper)
  startVoiceRecording: (options?: any) => Promise<{ success: boolean; error?: string }>;
  stopVoiceRecording: () => Promise<{ success: boolean; text?: string; segments?: any[]; error?: string; duration?: number }>;
  getVoiceRecordingStatus: () => Promise<{ success: boolean; isRecording?: boolean; duration?: number; filePath?: string; startTime?: number; error?: string }>;
  cancelVoiceRecording: () => Promise<{ success: boolean; error?: string }>;

  // AI interactions
  handleObjection: (objectionText: string) => Promise<{ success: boolean; suggestions?: any[]; response?: string; error?: string }>;
  processMultimodalAssistance: (queryText?: string) => Promise<{ success: boolean; suggestions?: any[]; response?: string; error?: string }>;
  triggerMultimodalAssistance: () => Promise<{ success: boolean; suggestions?: any[]; response?: string; error?: string }>;
  getAIStatus: () => Promise<{ isProcessing: boolean }>;

  // Audio chunk transmission
  sendAudioChunk: (chunkData: any) => void;

  // Permission management
  checkPermission: (mediaType: string) => Promise<{ success: boolean; status?: string; canRequest?: boolean; requiresManualGrant?: boolean; userGuidance?: string; error?: string }>;
  requestPermission: (mediaType: string) => Promise<{ success: boolean; status?: string; canRequest?: boolean; requiresManualGrant?: boolean; userGuidance?: string; error?: string }>;
  checkAllPermissions: () => Promise<{ success: boolean; allGranted?: boolean; results?: any; error?: string }>;
  showPermissionStatus: () => Promise<{ success: boolean; error?: string }>;
  openSpecificPrivacySettings: (mediaType: string) => Promise<{ success: boolean; error?: string }>;

  // Modal window management
  createModal: (modalId: string, options: any) => Promise<{ success: boolean; modalId?: string; error?: string }>;
  closeModal: (modalId: string) => Promise<{ success: boolean; error?: string }>;
  isModalOpen: (modalId: string) => Promise<{ success: boolean; isOpen?: boolean; error?: string }>;
  updateModalOptions: (modalId: string, options: any) => Promise<{ success: boolean; error?: string }>;
  focusModal: (modalId: string) => Promise<{ success: boolean; error?: string }>;

  // Voice recording modal window functions removed - now using inline interface

  // Event listeners (all return a cleanup function)
  onStateUpdated: (callback: (state: any /* AppStateSnapshot */) => void) => () => void;
  onTriggerAIQuery: (callback: () => void) => () => void;
  onCallRecordingToggled: (callback: (isActive: boolean) => void) => () => void;
  onVisibilityChangedByHotkey: (callback: (newVisibility: boolean) => void) => () => void;
  onPermissionChanged: (callback: (data: { mediaType: string; status: string }) => void) => () => void;

  // Voice recording event listeners
  onVoiceRecordingStarted: (callback: () => void) => () => void;
  onVoiceRecordingStopped: (callback: (data: { duration: number; streamingMode?: boolean }) => void) => () => void;
  onVoiceRecordingTranscriptionStarted: (callback: () => void) => () => void;
  onVoiceRecordingTranscriptionCompleted: (callback: () => void) => () => void;
  onVoiceRecordingError: (callback: (error: string) => void) => () => void;

  // Window event listener for transcription events
  onWindowEvent: (callback: (eventName: string, data: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

// This empty export makes the file a module, which is necessary for 'declare global'.
export {};

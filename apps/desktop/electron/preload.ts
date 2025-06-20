/**
 * preload.ts
 *
 * Preload script for the Electron application.
 * Exposes a limited set of Electron APIs to the renderer process.
 */

import { contextBridge, ipcRenderer } from 'electron'

// Define the API to expose to the renderer process
const electronAPI = {
  // Window management
  toggleVisibility: () => ipcRenderer.sendSync('closezly:toggle-visibility'),
  setWindowPosition: (deltaX: number, deltaY: number) =>
    ipcRenderer.sendSync('closezly:set-window-position', { deltaX, deltaY }),
  positionAtTop: () =>
    ipcRenderer.sendSync('closezly:position-at-top'),
  resizeWindow: (width: number, height: number) =>
    ipcRenderer.sendSync('closezly:resize-window-from-content', { width, height }),
  setHoverExpand: (expand: boolean) =>
    ipcRenderer.sendSync('closezly:set-hover-expand', expand),

  // Screenshot and processing
  takeScreenshotAndProcess: () =>
    ipcRenderer.invoke('closezly:take-screenshot-and-process'),

  // Query processing
  processManualQuery: (queryText: string) =>
    ipcRenderer.invoke('closezly:process-manual-query', { queryText }),

  // Authentication
  getAuthStatus: () => ipcRenderer.invoke('closezly:get-auth-status'),
  openLoginPage: () => ipcRenderer.sendSync('closezly:open-login-page'),
  logout: () => ipcRenderer.sendSync('closezly:logout'),
  refreshUserProfile: () => ipcRenderer.invoke('closezly:refresh-user-profile'),

  // Call management
  startCall: () => ipcRenderer.sendSync('closezly:start-call'),
  endCall: () => ipcRenderer.sendSync('closezly:end-call'),
  addTranscriptSegment: (speaker: 'user' | 'customer', text: string, timestamp: string) =>
    ipcRenderer.sendSync('closezly:add-transcript-segment', { speaker, text, timestamp }),

  // App state
  getAppState: () => ipcRenderer.invoke('closezly:get-app-state'),

  // Audio capture
  startAudioCapture: () => ipcRenderer.invoke('closezly:start-audio-capture'),
  stopAudioCapture: () => ipcRenderer.invoke('closezly:stop-audio-capture'),
  getAudioStatus: () => ipcRenderer.invoke('closezly:get-audio-status'),

  // Voice query
  startVoiceQuery: (options?: any) => ipcRenderer.invoke('closezly:start-voice-query', options),
  stopVoiceQuery: () => ipcRenderer.invoke('closezly:stop-voice-query'),
  getVoiceQueryStatus: () => ipcRenderer.invoke('closezly:get-voice-query-status'),

  // Local Whisper voice recording
  startVoiceRecording: (options?: any) => ipcRenderer.invoke('closezly:start-voice-recording', options),
  stopVoiceRecording: () => ipcRenderer.invoke('closezly:stop-voice-recording'),
  getVoiceRecordingStatus: () => ipcRenderer.invoke('closezly:get-voice-recording-status'),
  cancelVoiceRecording: () => ipcRenderer.invoke('closezly:cancel-voice-recording'),

  // AI interactions
  handleObjection: (objectionText: string) => ipcRenderer.invoke('closezly:handle-objection', objectionText),
  processMultimodalAssistance: (queryText?: string) => ipcRenderer.invoke('closezly:process-multimodal-assistance', queryText),
  triggerMultimodalAssistance: () => ipcRenderer.invoke('closezly:trigger-multimodal-assistance'),
  getAIStatus: () => ipcRenderer.invoke('closezly:get-ai-status'),

  // Permission management
  checkPermission: (mediaType: string) => ipcRenderer.invoke('closezly:check-permission', mediaType),
  requestPermission: (mediaType: string) => ipcRenderer.invoke('closezly:request-permission', mediaType),
  checkAllPermissions: () => ipcRenderer.invoke('closezly:check-all-permissions'),
  showPermissionStatus: () => ipcRenderer.invoke('closezly:show-permission-status'),
  openSpecificPrivacySettings: (mediaType: string) => ipcRenderer.invoke('closezly:open-specific-privacy-settings', mediaType),

  // Modal window management
  createModal: (modalId: string, options: any) => ipcRenderer.invoke('closezly:create-modal', modalId, options),
  closeModal: (modalId: string) => ipcRenderer.invoke('closezly:close-modal', modalId),
  isModalOpen: (modalId: string) => ipcRenderer.invoke('closezly:is-modal-open', modalId),
  updateModalOptions: (modalId: string, options: any) => ipcRenderer.invoke('closezly:update-modal-options', modalId, options),
  focusModal: (modalId: string) => ipcRenderer.invoke('closezly:focus-modal', modalId),

  // Voice recording modal window functions removed - now using inline interface

  // Audio chunk transmission
  sendAudioChunk: (chunkData: any) => ipcRenderer.send('audio-chunk', chunkData),

  // Event listeners
  onStateUpdated: (callback: (state: any) => void) => {
    const listener = (_event: any, state: any) => callback(state)
    ipcRenderer.on('closezly:state-updated', listener)
    return () => {
      ipcRenderer.removeListener('closezly:state-updated', listener)
    }
  },

  onTriggerAIQuery: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('closezly:trigger-ai-query', listener)
    return () => {
      ipcRenderer.removeListener('closezly:trigger-ai-query', listener)
    }
  },

  onCallRecordingToggled: (callback: (isActive: boolean) => void) => {
    const listener = (_event: any, isActive: boolean) => callback(isActive)
    ipcRenderer.on('closezly:call-recording-toggled', listener)
    return () => {
      ipcRenderer.removeListener('closezly:call-recording-toggled', listener)
    }
  },

  onVisibilityChangedByHotkey: (callback: (newVisibility: boolean) => void) => {
    const handler = (_event: any, newVisibility: boolean) => callback(newVisibility);
    ipcRenderer.on('closezly:visibility-changed-by-hotkey', handler);
    return () => {
      ipcRenderer.removeListener('closezly:visibility-changed-by-hotkey', handler);
    };
  },

  // Voice recording real-time event listeners
  onVoiceRecordingStarted: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('closezly:voice-recording-started', handler);
    return () => {
      ipcRenderer.removeListener('closezly:voice-recording-started', handler);
    };
  },

  onVoiceRecordingStopped: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('closezly:voice-recording-stopped', handler);
    return () => {
      ipcRenderer.removeListener('closezly:voice-recording-stopped', handler);
    };
  },

  onVoiceRecordingTranscriptionStarted: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('closezly:voice-recording-transcription-started', handler);
    return () => {
      ipcRenderer.removeListener('closezly:voice-recording-transcription-started', handler);
    };
  },

  onVoiceRecordingTranscriptionCompleted: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('closezly:voice-recording-transcription-completed', handler);
    return () => {
      ipcRenderer.removeListener('closezly:voice-recording-transcription-completed', handler);
    };
  },

  onVoiceRecordingError: (callback: (error: any) => void) => {
    const handler = (_event: any, error: any) => callback(error);
    ipcRenderer.on('closezly:voice-recording-error', handler);
    return () => {
      ipcRenderer.removeListener('closezly:voice-recording-error', handler);
    };
  },



  onPermissionChanged: (callback: (data: { mediaType: string; status: string }) => void) => {
    const listener = (_event: any, data: { mediaType: string; status: string }) => callback(data)
    ipcRenderer.on('closezly:permission-changed', listener)
    return () => {
      ipcRenderer.removeListener('closezly:permission-changed', listener)
    }
  },

  // VAD status communication
  sendVADStatus: (vadStatus: { isVoice: boolean; energy: number; confidence: number }) => {
    ipcRenderer.send('closezly:vad-status', vadStatus)
  },

  // Window event listener for transcription events
  onWindowEvent: (callback: (eventName: string, data: any) => void) => {
    const listener = (_event: any, payload: { eventName: string; data: any }) => {
      callback(payload.eventName, payload.data)
    }
    ipcRenderer.on('window-event', listener)
    return () => {
      ipcRenderer.removeListener('window-event', listener)
    }
  },
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

console.log('Closezly Electron Preload Script loaded')
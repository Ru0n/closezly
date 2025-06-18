# Real-Time Voice-to-Text Implementation Plan

## Overview

This document outlines the implementation plan for upgrading Closezly's voice-to-text functionality to use a real-time approach inspired by [Whispo](https://github.com/egoist/whispo), while maintaining local privacy-first transcription with nodejs-whisper.

## Current vs. Target Implementation

### Current Implementation (Record → Transcribe)
- ❌ Uses `node-record-lpcm16` to record to WAV files
- ❌ Records first, then transcribes with local nodejs-whisper
- ❌ Modal/inline UI for recording controls
- ❌ Manual start/stop workflow
- ❌ No real-time feedback
- ❌ Complex UI with multiple states

### Target Implementation (Real-Time Hold-to-Record)
- ✅ Uses `MediaRecorder` API for real-time audio recording
- ✅ Hold Ctrl key to record, release to transcribe
- ✅ Real-time audio visualization during recording
- ✅ Immediate transcription and text insertion
- ✅ Local transcription with nodejs-whisper (privacy-first)
- ✅ Minimal, elegant UI that appears only during recording
- ✅ Global hotkey support
- ✅ Automatic text insertion into active applications

## Key Features to Implement

### 1. Real-Time Recording with MediaRecorder API
```typescript
// Replace node-record-lpcm16 with MediaRecorder
const mediaRecorder = new MediaRecorder(audioStream, {
  audioBitsPerSecond: 128000,
  mimeType: 'audio/webm;codecs=opus'
})
```

### 2. Global Hotkey Support
- **Hold Ctrl**: Start recording
- **Release Ctrl**: Stop recording and transcribe
- **Escape**: Cancel recording
- **Alternative**: Ctrl+/ for toggle mode

### 3. Real-Time Audio Visualization
```typescript
// Audio analysis for real-time visualization
const analyser = audioContext.createAnalyser()
analyser.fftSize = 256
analyser.minDecibels = -45

// Calculate RMS for visualization bars
const calculateRMS = (data: Uint8Array) => {
  let sumSquares = 0
  for (let i = 0; i < data.length; i++) {
    const normalizedValue = (data[i] - 128) / 128
    sumSquares += normalizedValue * normalizedValue
  }
  return Math.sqrt(sumSquares / data.length)
}
```

### 4. Automatic Text Insertion
- Copy transcribed text to clipboard
- Use accessibility APIs to insert text into active application
- Support for all text input fields across applications

### 5. Minimal Recording UI
- Small overlay that appears during recording
- Real-time audio visualization bars
- Recording duration timer
- Transcription progress indicator
- Auto-hide when complete

## Implementation Architecture

### Core Components

#### 1. RealTimeVoiceService
```typescript
class RealTimeVoiceService extends EventEmitter {
  // Real-time recording with MediaRecorder
  async startRecording(options?: RealTimeVoiceOptions): Promise<boolean>
  async stopRecording(): Promise<TranscriptionResult>
  async cancelRecording(): Promise<boolean>
  
  // Audio analysis for visualization
  private startAudioAnalysis(): void
  private calculateRMS(data: Uint8Array): number
  
  // Local transcription
  private async processRecording(duration: number): Promise<void>
  private async convertToWav(audioBlob: Blob): Promise<Buffer>
}
```

#### 2. Global Hotkey Manager
```typescript
class HotkeyManager {
  // Register global hotkeys
  registerHotkeys(): void
  
  // Handle Ctrl hold/release
  private handleCtrlPress(): void
  private handleCtrlRelease(): void
  
  // Handle alternative shortcuts
  private handleCtrlSlash(): void
  private handleEscape(): void
}
```

#### 3. Real-Time Recording UI
```typescript
// Minimal overlay component
const RealTimeRecordingOverlay = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevels, setAudioLevels] = useState<number[]>([])
  const [duration, setDuration] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  return (
    <motion.div className="recording-overlay">
      <AudioVisualizer levels={audioLevels} />
      <Timer duration={duration} />
      {isTranscribing && <TranscriptionSpinner />}
    </motion.div>
  )
}
```

#### 4. Text Insertion Service
```typescript
class TextInsertionService {
  // Insert text into active application
  async insertText(text: string): Promise<boolean>
  
  // Copy to clipboard as fallback
  private copyToClipboard(text: string): void
  
  // Use accessibility APIs for direct insertion
  private useAccessibilityAPI(text: string): Promise<boolean>
}
```

## Implementation Steps

### Phase 1: Core Real-Time Recording
1. **Create RealTimeVoiceService**
   - Implement MediaRecorder-based recording
   - Add real-time audio analysis
   - Integrate with existing nodejs-whisper transcription

2. **Update IPC Handlers**
   - Add real-time recording endpoints
   - Remove old node-record-lpcm16 handlers
   - Add audio level streaming

3. **Create Minimal Recording UI**
   - Real-time audio visualization
   - Recording timer
   - Transcription progress

### Phase 2: Global Hotkey Support
1. **Implement Hotkey Manager**
   - Cross-platform global hotkey registration
   - Ctrl hold/release detection
   - Alternative shortcut support

2. **Update Main Process**
   - Register global hotkeys on app start
   - Handle hotkey events
   - Manage recording state

### Phase 3: Text Insertion
1. **Create Text Insertion Service**
   - Clipboard integration
   - Accessibility API integration
   - Cross-platform text insertion

2. **Auto-Insert Workflow**
   - Automatic text insertion after transcription
   - Fallback to clipboard if insertion fails
   - User preference for auto-insert behavior

### Phase 4: UI/UX Polish
1. **Enhance Recording Overlay**
   - Smooth animations
   - Better audio visualization
   - Status indicators

2. **Settings Integration**
   - Hotkey customization
   - Model selection
   - Auto-insert preferences

## Technical Specifications

### Audio Recording
- **Format**: WebM with Opus codec
- **Sample Rate**: 16kHz (optimized for speech)
- **Channels**: Mono
- **Bit Rate**: 128kbps
- **Real-time**: 100ms data chunks

### Transcription
- **Engine**: nodejs-whisper (local)
- **Model**: base.en (default)
- **Language**: English
- **Features**: Word-level timestamps
- **Privacy**: All processing local

### Hotkeys
- **Primary**: Hold Ctrl to record, release to transcribe
- **Alternative**: Ctrl+/ for toggle mode
- **Cancel**: Escape key
- **Customizable**: User-defined shortcuts

### UI Design
- **Style**: Minimal overlay similar to Whispo
- **Position**: Center of screen or near cursor
- **Animation**: Smooth fade in/out
- **Visualization**: Real-time audio bars
- **Feedback**: Clear recording/transcribing states

## Performance Targets

### Recording Performance
- **Latency**: < 100ms to start recording
- **Real-time**: No audio dropouts or delays
- **Memory**: < 50MB during recording
- **CPU**: < 10% usage during recording

### Transcription Performance
- **Speed**: < 2x real-time (30s audio in < 60s)
- **Accuracy**: > 95% for clear English speech
- **Memory**: < 500MB during transcription
- **Local**: No internet required

### User Experience
- **Responsiveness**: Immediate visual feedback
- **Reliability**: 99%+ successful recordings
- **Accessibility**: Works with all applications
- **Privacy**: No data leaves the device

## Migration Strategy

### Phase 1: Parallel Implementation
- Keep existing voice recording functionality
- Implement new real-time service alongside
- Add feature flag to switch between implementations

### Phase 2: User Testing
- Beta test with real-time implementation
- Gather user feedback
- Performance testing and optimization

### Phase 3: Full Migration
- Make real-time implementation default
- Remove old node-record-lpcm16 implementation
- Update documentation and user guides

## File Structure

```
apps/desktop/
├── electron/helpers/
│   ├── RealTimeVoiceService.ts          # New: Real-time recording service
│   ├── HotkeyManager.ts                 # New: Global hotkey management
│   ├── TextInsertionService.ts          # New: Text insertion service
│   ├── LocalWhisperService.ts           # Keep: Local transcription
│   └── ipcHandlers.ts                   # Modified: Add real-time handlers
├── src/components/
│   ├── RealTimeRecordingOverlay.tsx     # New: Minimal recording UI
│   ├── AudioVisualizer.tsx              # Modified: Real-time visualization
│   └── App.tsx                          # Modified: Integration
└── src/hooks/
    ├── useRealTimeRecording.ts          # New: Recording hook
    └── useGlobalHotkeys.ts              # New: Hotkey hook
```

## Dependencies

### New Dependencies
```json
{
  "electron-globalshortcut": "^0.2.1",    // Global hotkey support
  "robotjs": "^0.6.0",                    // Text insertion (alternative)
  "@electron/remote": "^2.0.8"            // Remote module access
}
```

### Existing Dependencies (Keep)
```json
{
  "nodejs-whisper": "^0.2.9",             // Local transcription
  "uuid": "^11.1.0",                      // File naming
  "framer-motion": "^12.12.1"             // UI animations
}
```

### Remove Dependencies
```json
{
  "node-record-lpcm16": "^1.0.1"          // Replace with MediaRecorder
}
```

## Security Considerations

### Privacy Protection
- ✅ All audio processing happens locally
- ✅ No data sent to external servers
- ✅ Temporary files automatically cleaned up
- ✅ User control over recording activation

### Permission Management
- ✅ Request microphone permissions appropriately
- ✅ Request accessibility permissions for text insertion
- ✅ Handle permission denials gracefully
- ✅ Clear permission instructions for users

### Global Hotkey Security
- ✅ Secure hotkey registration
- ✅ Prevent hotkey conflicts
- ✅ User control over hotkey configuration
- ✅ Disable hotkeys when app is not active (optional)

## Success Metrics

### Performance Metrics
- **Recording Latency**: < 100ms
- **Transcription Speed**: < 2x real-time
- **Accuracy**: > 95% for clear speech
- **Memory Usage**: < 500MB peak
- **CPU Usage**: < 10% during recording

### User Experience Metrics
- **Ease of Use**: One-handed operation (hold Ctrl)
- **Reliability**: 99%+ successful recordings
- **Speed**: Immediate feedback and results
- **Accessibility**: Works with all applications
- **Privacy**: 100% local processing

## Future Enhancements

### Advanced Features
- **Multi-language Support**: Additional Whisper models
- **Custom Vocabulary**: Domain-specific terms
- **Voice Commands**: Beyond transcription
- **Real-time Streaming**: Live transcription display
- **Audio Enhancement**: Noise reduction, gain control

### Integration Features
- **AI Post-processing**: Grammar correction, formatting
- **Context Awareness**: Application-specific formatting
- **Team Features**: Shared vocabulary, templates
- **Analytics**: Usage patterns, accuracy metrics

## Conclusion

This real-time implementation will transform Closezly's voice-to-text functionality from a traditional record-then-transcribe workflow to a modern, real-time experience similar to Whispo, while maintaining the privacy benefits of local transcription. The hold-to-record functionality with global hotkeys will make voice input as natural as speaking, significantly improving productivity for sales professionals.

The implementation maintains backward compatibility during migration and provides a clear path for future enhancements while keeping user privacy and data security as top priorities.

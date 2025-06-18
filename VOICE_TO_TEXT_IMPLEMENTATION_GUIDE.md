# Voice-to-Text Implementation Guide for Closezly Desktop App

## Overview

This document provides detailed implementation steps for replacing the current Web Speech API implementation with a local, privacy-first voice-to-text solution using OpenAI's Whisper technology via nodejs-whisper.

## Research Summary

### Current Issues with Web Speech API
- ❌ **Privacy Concerns**: Sends audio to Google's servers
- ❌ **Internet Dependency**: Requires internet connection
- ❌ **Browser Limitations**: Only works reliably in Chrome/Chromium
- ❌ **No Customization**: Can't optimize for sales terminology

### Chosen Solution: nodejs-whisper
- ✅ **Privacy**: All processing happens locally
- ✅ **Offline**: Works without internet connection
- ✅ **High Accuracy**: Uses OpenAI's Whisper model (C++ implementation)
- ✅ **Cross-platform**: Works on Windows, macOS, Linux
- ✅ **Professional Quality**: Word-level timestamps and multiple output formats

## Technologies and Tools

### Core Dependencies
- **nodejs-whisper** (v0.2.9+): Node.js bindings for whisper.cpp
- **node-record-lpcm16**: Audio recording for Node.js
- **@types/node-record-lpcm16**: TypeScript definitions

### Whisper Models
- **tiny.en** (39M params): Fastest, good for real-time
- **base.en** (74M params): Balanced speed/accuracy ⭐ **Recommended**
- **small.en** (244M params): Better accuracy, slower

### Audio Requirements
- **Format**: WAV
- **Sample Rate**: 16kHz
- **Channels**: Mono
- **Bit Depth**: 16-bit

## Implementation Steps

### Phase 1: Environment Setup

#### 1.1 Install Dependencies
```bash
cd apps/desktop
npm install nodejs-whisper node-record-lpcm16 @types/node-record-lpcm16
```

#### 1.2 Download Whisper Model
```bash
npx nodejs-whisper download
```

#### 1.3 Verify Installation
```bash
# Test nodejs-whisper installation
node -e "console.log(require('nodejs-whisper'))"
```

### Phase 2: Core Service Implementation

#### 2.1 Create LocalWhisperService.ts
**File**: `apps/desktop/electron/helpers/LocalWhisperService.ts`

**Key Features**:
- Audio recording to temporary WAV files
- Local transcription using nodejs-whisper
- Real-time recording feedback
- Word-level timestamps
- Automatic cleanup

**Core Interface**:
```typescript
interface LocalWhisperOptions {
  modelName?: 'tiny.en' | 'base.en' | 'small.en'
  maxDuration?: number // milliseconds
  language?: string
  wordTimestamps?: boolean
}

interface TranscriptionResult {
  success: boolean
  text?: string
  segments?: TranscriptionSegment[]
  error?: string
}

interface TranscriptionSegment {
  text: string
  start: number // seconds
  end: number // seconds
  confidence?: number
}
```

#### 2.2 Audio Recording Implementation
- Use `node-record-lpcm16` for cross-platform audio recording
- Save to temporary directory with unique filenames
- Convert to 16kHz mono WAV format
- Provide real-time duration feedback

#### 2.3 Transcription Processing
- Use `nodejs-whisper` with local models
- Support different model sizes based on user preference
- Return structured results with timestamps
- Handle processing errors gracefully

### Phase 3: UI Components

#### 3.1 VoiceRecordingModal Component
**File**: `apps/desktop/src/components/VoiceRecordingModal.tsx`

**Features**:
- Recording animation with visual feedback
- Real-time duration display
- Recording controls (start/stop/cancel)
- Transcription progress indicator
- Editable transcript display

**UI Elements**:
- Microphone icon with recording animation
- Circular progress indicator for duration
- Waveform visualization (optional)
- Loading spinner during transcription
- Text area for transcript editing
- Action buttons (Use Text, Re-record, Cancel)

#### 3.2 TranscriptEditor Component
**File**: `apps/desktop/src/components/TranscriptEditor.tsx`

**Features**:
- Editable text area with syntax highlighting
- Word-level confidence indicators
- Timestamp preservation
- Auto-save functionality
- Character/word count display

#### 3.3 Update App.tsx
**Modifications**:
- Replace microphone button handler
- Add voice recording modal state management
- Integrate with LocalWhisperService
- Handle transcription results

### Phase 4: IPC Integration

#### 4.1 Update ipcHandlers.ts
**File**: `apps/desktop/electron/helpers/ipcHandlers.ts`

**New Handlers**:
```typescript
// Voice recording handlers
ipcMain.handle('closezly:start-voice-recording', async (event, options) => {
  return await LocalWhisperService.startRecording(options)
})

ipcMain.handle('closezly:stop-voice-recording', async () => {
  return await LocalWhisperService.stopRecording()
})

ipcMain.handle('closezly:get-voice-recording-status', async () => {
  return LocalWhisperService.getStatus()
})

ipcMain.handle('closezly:cancel-voice-recording', async () => {
  return await LocalWhisperService.cancelRecording()
})
```

#### 4.2 Update preload.ts
**File**: `apps/desktop/electron/preload.ts`

**Add Functions**:
```typescript
// Voice recording API
startVoiceRecording: (options?: LocalWhisperOptions) => 
  ipcRenderer.invoke('closezly:start-voice-recording', options),
stopVoiceRecording: () => 
  ipcRenderer.invoke('closezly:stop-voice-recording'),
getVoiceRecordingStatus: () => 
  ipcRenderer.invoke('closezly:get-voice-recording-status'),
cancelVoiceRecording: () => 
  ipcRenderer.invoke('closezly:cancel-voice-recording'),
```

### Phase 5: Workflow Implementation

#### 5.1 Voice Query Workflow
1. **User clicks microphone button**
   - Open VoiceRecordingModal
   - Check microphone permissions
   - Initialize LocalWhisperService

2. **Recording Phase**
   - Start audio recording to temp WAV file
   - Display real-time duration
   - Show recording animation
   - Handle stop/cancel actions

3. **Transcription Phase**
   - Stop recording
   - Process audio with nodejs-whisper
   - Show loading indicator
   - Display progress feedback

4. **Editing Phase**
   - Show transcribed text in editable area
   - Allow user corrections
   - Highlight confidence levels
   - Preserve timestamps

5. **Completion Phase**
   - User clicks "Use Text"
   - Send transcript to AI processing
   - Close modal
   - Clean up temporary files

#### 5.2 Error Handling Strategy
- **Permission Errors**: Clear instructions for granting microphone access
- **Recording Errors**: Fallback to text input with error message
- **Transcription Errors**: Retry option or manual text entry
- **Model Errors**: Auto-download missing models
- **Storage Errors**: Check disk space and cleanup old files

### Phase 6: Configuration and Optimization

#### 6.1 Model Management
- **Default Model**: base.en (balanced speed/accuracy)
- **Model Storage**: ~/.cache/whisper/ (nodejs-whisper default)
- **Auto-download**: Missing models downloaded on first use
- **Model Switching**: User preference in settings

#### 6.2 Performance Optimization
- **Lazy Loading**: Load nodejs-whisper only when needed
- **Memory Management**: Cache model after first use
- **Worker Threads**: Consider for heavy transcription tasks
- **Audio Compression**: Optimize temporary file sizes

#### 6.3 User Settings
```typescript
interface VoiceSettings {
  modelSize: 'tiny.en' | 'base.en' | 'small.en'
  maxRecordingDuration: number // seconds
  autoCleanupFiles: boolean
  wordTimestamps: boolean
  confidenceThreshold: number
}
```

### Phase 7: Testing Strategy

#### 7.1 Unit Tests
- LocalWhisperService recording/transcription
- Audio file handling and cleanup
- Error scenarios and recovery
- IPC communication

#### 7.2 Integration Tests
- Complete voice query workflow
- Microphone permission handling
- Model download and caching
- UI state management

#### 7.3 Performance Tests
- Recording latency measurement
- Transcription speed benchmarks
- Memory usage monitoring
- Disk space usage tracking

## File Structure

```
apps/desktop/
├── electron/helpers/
│   ├── LocalWhisperService.ts          # New: Core voice service
│   ├── ipcHandlers.ts                  # Modified: Add voice handlers
│   └── preload.ts                      # Modified: Add voice API
├── src/components/
│   ├── VoiceRecordingModal.tsx         # New: Recording UI
│   ├── TranscriptEditor.tsx            # New: Transcript editing
│   └── App.tsx                         # Modified: Integration
└── package.json                        # Modified: Add dependencies
```

## Security Considerations

### Privacy Protection
- All audio processing happens locally
- No data sent to external servers
- Temporary files automatically cleaned up
- User control over recording duration

### Permission Management
- Request microphone permissions appropriately
- Handle permission denials gracefully
- Provide clear permission instructions
- Respect user privacy preferences

## Deployment Considerations

### Model Distribution
- Include base.en model in app bundle (optional)
- Auto-download on first use
- Verify model integrity
- Handle offline scenarios

### Platform-Specific Requirements
- **Windows**: Ensure MinGW-w64 or MSYS2 for compilation
- **macOS**: Native compilation with Xcode tools
- **Linux**: Build tools (build-essential) required

## Success Metrics

### Performance Targets
- **Recording Latency**: < 100ms to start recording
- **Transcription Speed**: < 2x real-time (30s audio in < 60s)
- **Accuracy**: > 95% for clear English speech
- **Memory Usage**: < 500MB during transcription

### User Experience Goals
- **Intuitive Interface**: Clear recording states and feedback
- **Error Recovery**: Graceful handling of all error scenarios
- **Privacy Assurance**: Clear indication of local processing
- **Reliability**: Consistent performance across platforms

## Maintenance and Updates

### Model Updates
- Monitor whisper.cpp releases for new models
- Update nodejs-whisper dependency regularly
- Test new models for accuracy improvements
- Provide model selection in user settings

### Performance Monitoring
- Track transcription accuracy metrics
- Monitor resource usage patterns
- Collect user feedback on voice features
- Optimize based on usage patterns

## Conclusion

This implementation provides a professional, privacy-first voice-to-text solution that maintains the highest standards for sensitive sales conversations while delivering excellent user experience and reliability.

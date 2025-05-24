# Closezly Desktop App

The Closezly desktop app is an Electron-based application that provides an undetectable overlay UI for sales professionals. It captures screen content and audio conversations to provide real-time AI-powered guidance during sales calls.

## Architecture

The desktop app follows the Electron architecture with main and renderer processes:

### Main Process (`electron/`)

- **main.ts**: Entry point for the Electron application
- **preload.ts**: Exposes a limited API to the renderer process
- **helpers/**: Helper modules for various functionalities

#### Helper Modules

- **AppState.ts**: Singleton for managing global app state
- **WindowHelper.ts**: Manages the overlay window (creation, visibility, positioning)
- **ShortcutsHelper.ts**: Handles global keyboard shortcuts
- **ScreenshotHelper.ts**: Manages screen capture functionality
- **ipcHandlers.ts**: Sets up IPC communication between main and renderer processes

### Renderer Process (`src/`)

- **index.tsx**: React application entry point
- **index.css**: Styles for the React application

## Features

- **Overlay UI**: Transparent, frameless, always-on-top window
- **Global Shortcuts**:
  - `Alt+Space`: Toggle overlay visibility
  - `Alt+Q`: Trigger AI query (takes a screenshot)
  - `Alt+R`: Toggle call recording
  - `Alt+Arrow keys`: Move the overlay window
- **Screen Capture**: Capture screenshots for AI analysis
- **Call Management**: Start/stop call recording
- **Suggestions Display**: Show AI-generated suggestions

## Development Setup

### Prerequisites

- Node.js (v18+)
- npm (v9+)

### Installation

```bash
# Install dependencies
npm install
```

### Running in Development Mode

```bash
# Compile TypeScript and watch for changes
npm run watch:electron

# In another terminal, start the development server
npm run dev

# In a third terminal, start Electron
npm run electron
```

Alternatively, use the combined script:

```bash
npm run electron:dev
```

### Building

```bash
# Build the app
npm run build

# Package the app
npm run package

# Create installers
npm run make
```

## TypeScript Configuration

The project uses two TypeScript configurations:

1. **tsconfig.json**: For the React renderer process
2. **tsconfig.electron.json**: For the Electron main process

## IPC Communication

The app uses Electron's IPC (Inter-Process Communication) for communication between the main and renderer processes:

### From Renderer to Main

- `closezly:toggle-visibility`: Toggle the overlay visibility
- `closezly:take-screenshot-and-process`: Capture and process a screenshot
- `closezly:process-manual-query`: Process a manual query from the user
- `closezly:set-window-position`: Move the overlay window
- `closezly:resize-window-from-content`: Resize the window based on content
- `closezly:add-transcript-segment`: Add a segment to the call transcript
- `closezly:start-call`: Start a call recording session
- `closezly:end-call`: End a call recording session

### From Main to Renderer

- `closezly:state-updated`: Notify the renderer of state changes
- `closezly:trigger-ai-query`: Trigger an AI query from a global shortcut
- `closezly:call-recording-toggled`: Notify when call recording is toggled

## Security Considerations

The app follows Electron security best practices:

- Context isolation enabled
- Node integration disabled in renderer
- Preload script for exposing limited API
- Content Security Policy implemented
- IPC message validation

## Known Issues

- Image optimization in the main process is not yet implemented
- Audio capture functionality is not fully implemented
- CRM integration is pending

## Next Steps

- Implement image optimization with a Node.js library like Sharp
- Add audio capture and real-time transcription
- Connect to backend services for AI processing
- Implement authentication flow
- Add CRM integration

## License

Proprietary - All rights reserved

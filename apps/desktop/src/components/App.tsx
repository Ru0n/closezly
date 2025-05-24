import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion'; // Import motion
import Header from './Header';
// Commented out unused imports - will be used in future implementation
// import Question from './Question';
// import Analysis from './Analysis';
// import AudioWaveform from './AudioWaveform';
// import Suggestions from './Suggestions';
// import AudioInputControl from './AudioInputControl';
import RecordingFeedbackPopup from './RecordingFeedbackPopup';

// Define the ElectronAPI interface to match the API exposed in preload.ts
declare global {
  interface Window {
    electronAPI: {
      toggleVisibility: () => boolean;
      setWindowPosition: (deltaX: number, deltaY: number) => { x: number; y: number };
      positionAtTop: () => { x: number; y: number };
      resizeWindow: (width: number, height: number) => { width: number; height: number };
      takeScreenshotAndProcess: () => Promise<{ success: boolean; image?: string; error?: string }>;
      processManualQuery: (queryText: string) => Promise<{
        success: boolean;
        suggestions?: any[];
        error?: string;
      }>;
      getAuthStatus: () => Promise<{ isAuthenticated: boolean; user: any | null }>;
      startCall: () => boolean;
      endCall: () => boolean;
      addTranscriptSegment: (
        speaker: 'user' | 'customer',
        text: string,
        timestamp: string
      ) => boolean;
      getAppState: () => Promise<any>;
      onStateUpdated: (callback: (state: any) => void) => () => void;
      onTriggerAIQuery: (callback: () => void) => () => void;
      onCallRecordingToggled: (callback: (isActive: boolean) => void) => () => void;
      onVisibilityChangedByHotkey: (callback: (newVisibility: boolean) => void) => () => void;
    };
  }
}

// Define constants for window dimensions (should match main process)
const APP_COMPACT_HEIGHT = 40; // Match COMPACT_WINDOW_HEIGHT in WindowHelper.ts
const APP_EXPANDED_HEIGHT = 700; // Match EXPANDED_WINDOW_HEIGHT in WindowHelper.ts
const APP_SETTINGS_HEIGHT = 300; // Height when settings popover is open
const APP_WIDTH = 650; // Match WINDOW_WIDTH in WindowHelper.ts

// Define interfaces for our component props and state
interface AppState {
  isAuthenticated: boolean;
  user: any | null;
  overlayVisible: boolean;
  isProcessing: boolean;
  activeCall: {
    isActive: boolean;
    startTime?: Date;
    transcriptSegments: Array<{
      speaker: 'user' | 'customer';
      text: string;
      timestamp: string;
    }>;
  };
  currentSuggestions: Array<{
    id: string;
    text: string;
    type: string;
    source?: string;
  }>;
  crmContext: any;
  currentQuery: string;
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    isAuthenticated: false,
    user: null,
    overlayVisible: false,
    isProcessing: false,
    activeCall: {
      isActive: false,
      transcriptSegments: []
    },
    currentSuggestions: [],
    crmContext: {},
    currentQuery: ''
  });

  const [isBodyAreaVisible, setIsBodyAreaVisible] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecordingFeedbackVisible, setIsRecordingFeedbackVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Commented out unused state - will be used in future implementation
  // const [previousWindowHeight, setPreviousWindowHeight] = useState(APP_COMPACT_HEIGHT);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatusText, setAnalysisStatusText] = useState('');

  // Determine if the body section should be visible (based on content)
  // This existing logic can determine *what* is in the body,
  // while isBodyAreaVisible determines *if* the body area is expanded.
  // const showBodyContent = !!appState.currentQuery || appState.isProcessing || appState.currentSuggestions.length > 0 || appState.activeCall.isActive;

  // Initialize app state from the main process
  useEffect(() => {
    const initAppState = async () => {
      try {
        const state = await window.electronAPI.getAppState();
        setAppState(state);
      } catch (error) {
        console.error('Error initializing app state:', error);
      }
    };

    initAppState();

    // Subscribe to state updates from the main process
    const unsubscribe = window.electronAPI.onStateUpdated((state) => {
      setAppState(state);
    });

    // Subscribe to AI query triggers
    const unsubscribeTrigger = window.electronAPI.onTriggerAIQuery(() => {
      handleTakeScreenshot();
    });

    // Set up focus event listener to refresh user profile when app regains focus
    const handleFocus = async () => {
      if (appState.isAuthenticated && window.electronAPI && 'refreshUserProfile' in window.electronAPI) {
        try {
          await (window.electronAPI as any).refreshUserProfile();
        } catch (error) {
          console.error('Error refreshing user profile:', error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      unsubscribeTrigger();
      window.removeEventListener('focus', handleFocus);
    };
  }, [appState.isAuthenticated]);

  // Effect to handle visibility changes triggered by main process hotkeys
  useEffect(() => {
    const handleVisibilityChangedByHotkey = (newVisibility: boolean) => {
      console.log(`[App.tsx] IPC 'closezly:visibility-changed-by-hotkey' received. New visibility: ${newVisibility}`);
      // Update React state based on main process. App.tsx no longer calls toggleVisibility itself for hotkeys.
      // The main process (ShortcutsHelper) is now the source of truth for visibility toggle via hotkey.
      // App.tsx's handleToggleVisibility is for UI button clicks.

      // If the app is now hidden by hotkey, ensure the body area is collapsed.
      if (!newVisibility) {
        setIsBodyAreaVisible(false);
      }
      // If it's shown by hotkey, App.tsx doesn't need to decide to expand the body.
      // Expansion is driven by user actions like 'Ask AI'.
    };

    const unsubscribe = window.electronAPI.onVisibilityChangedByHotkey(handleVisibilityChangedByHotkey);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  // Handle recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (appState.activeCall.isActive) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [appState.activeCall.isActive]);

  // Effect to resize window when body visibility changes
  useEffect(() => {
    console.log(`[App.tsx] isBodyAreaVisible changed to: ${isBodyAreaVisible}. Triggering resize.`);
    if (isBodyAreaVisible || isRecordingFeedbackVisible) { // Ensure window expands for feedback UI too
      window.electronAPI.resizeWindow(APP_WIDTH, APP_EXPANDED_HEIGHT);
      // setPreviousWindowHeight(APP_EXPANDED_HEIGHT);
    } else if (isSettingsOpen) {
      // If settings is open but body is not visible, use settings height
      window.electronAPI.resizeWindow(APP_WIDTH, APP_SETTINGS_HEIGHT);
      // setPreviousWindowHeight(APP_SETTINGS_HEIGHT);
    } else {
      window.electronAPI.resizeWindow(APP_WIDTH, APP_COMPACT_HEIGHT);
      // setPreviousWindowHeight(APP_COMPACT_HEIGHT);
    }
  }, [isBodyAreaVisible, isRecordingFeedbackVisible, isSettingsOpen]);

  // Handle taking a screenshot and processing it
  const handleTakeScreenshot = async () => {
    try {
      const result = await window.electronAPI.takeScreenshotAndProcess();
      if (result.success && result.image) {
        console.log('Screenshot taken successfully');
        // In a real app, we would process this image with the LLM
      } else {
        console.error('Failed to take screenshot:', result.error);
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  };

  // Handle Ask AI click - shows the body area
  const handleAskAIClick = () => {
    console.log('[App.tsx] handleAskAIClick called');
    setIsBodyAreaVisible(true);
    // Ensure not in call mode when asking AI, or manage state accordingly
    if (appState.activeCall.isActive) {
      // Optionally stop the call or prevent Ask AI during a call
      // For now, let's assume Ask AI takes precedence or they are mutually exclusive for simplicity
      // window.electronAPI.endCall(); // Example if you want to stop call
    }
    // setAppState(prev => ({ ...prev, isProcessing: true, currentQuery: "Waiting for your question..." }));
  };

  // Handle Start Over - hides the body area and resets relevant state
  const handleStartOver = () => {
    console.log('[App.tsx] handleStartOver called');
    setIsBodyAreaVisible(false);
    setAppState(prev => ({
      ...prev,
      isProcessing: false,
      currentQuery: '',
      currentSuggestions: [],
      // activeCall: { ...prev.activeCall, isActive: false } // Optionally stop call on start over
    }));
    // window.electronAPI.endCall(); // Also stop call in main process if needed
  };

  const handleToggleRecording = () => {
    if (appState.activeCall.isActive) {
      // Stopping recording
      window.electronAPI.endCall(); // This should trigger onStateUpdated, which sets appState.activeCall.isActive to false
      setIsRecordingFeedbackVisible(false);
      setIsBodyAreaVisible(true); // Open the main analysis area
      setIsAnalyzing(true);
      setAnalysisStatusText("Analyzing...");
      // Simulate AI processing and then show response
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisStatusText("AI Response would appear here."); // Placeholder for actual AI response
      }, 3000); // Simulate delay
    } else {
      // Starting recording
      window.electronAPI.startCall(); // This should trigger onStateUpdated, which sets appState.activeCall.isActive to true
      setIsRecordingFeedbackVisible(true);
      setIsBodyAreaVisible(false); // Keep main analysis area closed
      setIsAnalyzing(false);
      setAnalysisStatusText("Closezly is listening...");
      setRecordingTime(0); // Reset timer on new recording start
    }
  };

  // Handle visibility toggle from Header button
  const handleToggleVisibility = () => {
    const newVisibility = window.electronAPI.toggleVisibility();
    // Main process now emits 'closezly:visibility-changed-by-hotkey'
    // which App.tsx already listens to. So, direct state update here might be redundant
    // if the event handler covers it. However, for immediate UI feedback from button:
    if (!newVisibility) {
      setIsBodyAreaVisible(false); // Collapse body if app is hidden
    }
    // setAppState(prev => ({ ...prev, overlayVisible: newVisibility })); // Reflect main process state if needed
  };

  const handleLogin = () => {
    if (window.electronAPI && 'openLoginPage' in window.electronAPI) {
      (window.electronAPI as any).openLoginPage();
    } else {
      console.log('Login action triggered, but openLoginPage method not available');
    }
  };
  const handleUpgrade = () => console.log('Upgrade action triggered');
  const handleAccount = () => console.log('Account action triggered');
  const handleQuit = () => console.log('Quit action triggered'); // This should ideally use IPC to quit app

  // Handle settings popover open/close
  const handleSettingsOpenChange = (open: boolean) => {
    console.log(`[App.tsx] Settings popover ${open ? 'opened' : 'closed'}`);
    setIsSettingsOpen(open);
  };

  // Determine what to show in the AI Response section based on state
  // Note: aiResponseContent is currently not used in the JSX, but kept for future implementation
  // TODO: Replace the motion.p with aiResponseContent when components are ready
  // let aiResponseContent = null;
  let statusMessage = '';

  if (appState.activeCall.isActive) {
    statusMessage = 'Listening...';
    // aiResponseContent = (
    //   <>
    //     <AudioInputControl
    //       isRecording={appState.activeCall.isActive}
    //       recordingTime={recordingTime}
    //       onToggleRecording={handleToggleRecording}
    //       className="mb-2 mx-auto" // Centering and margin
    //     />
    //     <AudioWaveform isActive={appState.activeCall.isActive} />
    //   </>
    // );
  } else if (appState.isProcessing) {
    statusMessage = 'Thinking...';
    // if Analysis handles its loading state well.
    // For now, the statusMessage will be displayed above.
    // aiResponseContent = <Analysis text={appState.currentQuery} isProcessing={appState.isProcessing} />;
  } else if (appState.currentQuery) {
    // If there's a query but not processing, show Question and Analysis (not loading)
    // aiResponseContent = (
    //   <>
    //     <Question text={appState.currentQuery} />
    //     <Analysis text={appState.currentQuery} isProcessing={false} />
    //   </>
    // );
  } else if (appState.currentSuggestions.length > 0) {
    // aiResponseContent = <Suggestions suggestions={appState.currentSuggestions} />;
  }

  // Prop to pass to Header to hide its mic/timer
  const hideHeaderMic = isBodyAreaVisible && appState.activeCall.isActive;

  return (
    <div className={`flex flex-col h-screen w-full bg-transparent text-white antialiased rounded-xl shadow-2xl`}>
      <Header
        isRecording={appState.activeCall.isActive} // Header might still need to know for its own icon state if not fully hidden
        recordingTime={recordingTime}
        onToggleRecording={handleToggleRecording} // Use the new handler
        onToggleVisibility={handleToggleVisibility}
        isVisible={appState.overlayVisible} // Assuming overlayVisible reflects the window's actual visibility
        isAuthenticated={appState.isAuthenticated}
        userSubscriptionStatus={appState.user?.subscriptionStatus || null}
        userInitials={appState.user?.initials}
        userEmail={appState.user?.email}
        username={appState.user?.username}
        profilePictureUrl={appState.user?.profilePictureUrl}
        onLoginClick={handleLogin}
        onUpgradeClick={handleUpgrade}
        onAccountClick={handleAccount}
        onAskAIClick={handleAskAIClick}
        onStartOver={handleStartOver}
        onQuitApp={handleQuit}
        hideMicAndTime={hideHeaderMic} // New prop
        onSettingsOpenChange={handleSettingsOpenChange} // Pass the settings open change handler
      />

      {/* Expanded Body Area / AI Response Section */}
      {isBodyAreaVisible && (
        <motion.div
          layout // Enable layout animation
          className="p-4 pt-3 bg-black bg-opacity-75 backdrop-blur-lg flex-grow overflow-y-auto mt-4 rounded-lg shadow-xl min-h-[150px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-gray-300">AI Response</h2>
            {statusMessage && (
              <span className="text-xs text-gray-400 italic">{statusMessage}</span>
            )}
          </div>
          {isAnalyzing ? (
            <motion.p
              className="text-white text-center text-lg animate-pulse"
              key="analyzing"
            >
              {analysisStatusText}
            </motion.p>
          ) : (
            <motion.p
              className="text-white whitespace-pre-wrap" // Allow text to wrap and preserve newlines
              key="response"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {analysisStatusText}
            </motion.p>// This will show AI response or other content
          )}
          {/* Future components like Question, Analysis, Suggestions will go here or be part of analysisStatusText logic */}
        </motion.div>
      )}

      {/* Recording Feedback Popup Container & Component */}
      {isRecordingFeedbackVisible && (
        // Position this container absolutely, below header (top-10), towards the right (right-4).
        // Use flex to align its content (the popup itself).
        <div className="absolute top-10 right-4 pt-2 flex flex-col items-end z-40 pointer-events-none">
          {/* pointer-events-none on container, popup itself will have pointer-events-auto */}
          <RecordingFeedbackPopup
            statusText={analysisStatusText}
          />
        </div>
      )}
    </div>
  );
};

export default App;

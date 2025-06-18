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
import PermissionDialog from './PermissionDialog';
import PermissionModalDialog from './PermissionModalDialog';
// Removed VoiceRecordingModalWindow - now using inline interface
import PermissionStatus from './PermissionStatus';
import { MainWindowOnly, ModalWindowOnly } from './ModalWindow';
import '../utils/rendererAudioCapture'; // Initialize renderer audio capture

// ElectronAPI interface is now defined in electron.d.ts

// Define constants for window dimensions (should match main process)
const APP_COMPACT_HEIGHT = 40; // Match COMPACT_WINDOW_HEIGHT in WindowHelper.ts
const APP_EXPANDED_HEIGHT = 700; // Match EXPANDED_WINDOW_HEIGHT in WindowHelper.ts
const APP_SETTINGS_HEIGHT = 300; // Height when settings popover is open
const APP_INLINE_RECORDING_HEIGHT = 360; // Height for inline recording dropdown (header + dropdown + margin)
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
  const [isRecordingFeedbackVisible, setIsRecordingFeedbackVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Commented out unused state - will be used in future implementation
  // const [previousWindowHeight, setPreviousWindowHeight] = useState(APP_COMPACT_HEIGHT);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatusText, setAnalysisStatusText] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [showQueryInput, setShowQueryInput] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [hasCheckedPermissions, setHasCheckedPermissions] = useState(false);
  const [hasPermissionIssues, setHasPermissionIssues] = useState(false);
  const [showInlineRecording, setShowInlineRecording] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

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

        // Check if this is the first launch and permissions need to be set up
        await checkInitialPermissions();
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

  // Note: Recording timer removed since we're now using voice-to-text queries instead of call recording

  // Check initial permissions and determine if onboarding is needed
  const checkInitialPermissions = async () => {
    if (hasCheckedPermissions) return;

    try {
      const result = await window.electronAPI.checkAllPermissions();
      if (result.success) {
        const permissionIssues = Object.values(result.results).some((p: any) => p.status !== 'granted');

        // Check if this is likely a first launch (no permissions granted)
        const allPermissionsNotDetermined = Object.values(result.results).every(
          (p: any) => p.status === 'not-determined'
        );

        if (allPermissionsNotDetermined) {
          setIsFirstLaunch(true);
        }

        // Set permission issues state
        setHasPermissionIssues(permissionIssues);
        setHasCheckedPermissions(true);
      }
    } catch (error) {
      console.error('Failed to check initial permissions:', error);
      setHasCheckedPermissions(true);
      setHasPermissionIssues(true); // Assume there are issues if we can't check
    }
  };

  // Effect to resize window when body visibility changes
  useEffect(() => {
    console.log(`[App.tsx] Window resize trigger - isBodyAreaVisible: ${isBodyAreaVisible}, isRecordingFeedbackVisible: ${isRecordingFeedbackVisible}, isSettingsOpen: ${isSettingsOpen}, showInlineRecording: ${showInlineRecording}`);

    if (isBodyAreaVisible || isRecordingFeedbackVisible) {
      // Ensure window expands for feedback UI too
      window.electronAPI.resizeWindow(APP_WIDTH, APP_EXPANDED_HEIGHT);
    } else if (showInlineRecording) {
      // Expand window for inline recording dropdown
      window.electronAPI.resizeWindow(APP_WIDTH, APP_INLINE_RECORDING_HEIGHT);
    } else if (isSettingsOpen) {
      // If settings is open but body is not visible, use settings height
      window.electronAPI.resizeWindow(APP_WIDTH, APP_SETTINGS_HEIGHT);
    } else {
      window.electronAPI.resizeWindow(APP_WIDTH, APP_COMPACT_HEIGHT);
    }
  }, [isBodyAreaVisible, isRecordingFeedbackVisible, isSettingsOpen, showInlineRecording]);

  // Handle taking a screenshot and processing it
  const handleTakeScreenshot = async () => {
    try {
      const result = await window.electronAPI.takeScreenshotAndProcess();
      if (result.success) {
        console.log('Screenshot taken and processed successfully');
        if (result.suggestions && result.suggestions.length > 0) {
          console.log('AI suggestions received:', result.suggestions);
        }
      } else {
        console.error('Failed to take screenshot:', result.error);
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  };

  // Handle Ask AI click - shows the body area and triggers AI processing
  const handleAskAIClick = async () => {
    console.log('[App.tsx] handleAskAIClick called');

    // Check permissions first
    try {
      const permissionResult = await window.electronAPI.checkAllPermissions();
      if (permissionResult.success) {
        // Check if any required permissions are not granted
        const hasPermissionIssues = Object.values(permissionResult.results).some((p: any) => p.status !== 'granted');

        console.log('[App.tsx] Permission check results:', permissionResult.results);
        console.log('[App.tsx] Has permission issues:', hasPermissionIssues);

        if (hasPermissionIssues) {
          // Show permission dialog for first-time users or when permissions are missing
          console.log('[App.tsx] Showing permission dialog due to missing permissions');
          await handleOpenPermissionDialog();
          return;
        }

        console.log('[App.tsx] All permissions granted, proceeding with AI processing');
      }
    } catch (error) {
      console.error('Failed to check permissions before AI processing:', error);
    }

    setIsBodyAreaVisible(true);
    setIsAnalyzing(true);
    setAnalysisStatusText("Analyzing screen context...");

    try {
      // Trigger screenshot and AI processing
      const response = await window.electronAPI.takeScreenshotAndProcess();

      if (response.success) {
        setIsAnalyzing(false);
        if (response.suggestions && response.suggestions.length > 0) {
          // Display suggestions in a formatted way
          const suggestionText = response.suggestions
            .map((s: any, index: number) => `${index + 1}. ${s.text}`)
            .join('\n\n');
          setAnalysisStatusText(suggestionText);
        } else if (response.response) {
          setAnalysisStatusText(response.response);
        } else {
          setAnalysisStatusText("AI analysis complete. No specific suggestions at this time.");
        }
      } else {
        setIsAnalyzing(false);
        // Check if the error is permission-related
        if (response.error && response.error.includes('permission')) {
          setAnalysisStatusText(`Permission Error: ${response.error}`);
          setShowPermissionDialog(true);
        } else {
          setAnalysisStatusText(`Error: ${response.error || 'Failed to process screenshot'}`);
        }
      }
    } catch (error) {
      console.error('[App.tsx] Error in handleAskAIClick:', error);
      setIsAnalyzing(false);
      setAnalysisStatusText('Error: Failed to connect to AI service');
    }
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
    setIsAnalyzing(false);
    setAnalysisStatusText('');
    setIsRecordingFeedbackVisible(false);
    setShowQueryInput(false);
    setQueryInput('');
  };

  // Handle manual query submission
  const handleQuerySubmit = async () => {
    if (!queryInput.trim()) return;

    setIsAnalyzing(true);
    setAnalysisStatusText("Processing your question...");
    setShowQueryInput(false);

    try {
      const response = await window.electronAPI.processManualQuery(queryInput.trim());

      if (response.success) {
        setIsAnalyzing(false);
        if (response.suggestions && response.suggestions.length > 0) {
          const suggestionText = response.suggestions
            .map((s: any, index: number) => `${index + 1}. ${s.text}`)
            .join('\n\n');
          setAnalysisStatusText(`Response to "${queryInput}":\n\n${suggestionText}`);
        } else if (response.response) {
          setAnalysisStatusText(`Response to "${queryInput}":\n\n${response.response}`);
        } else {
          setAnalysisStatusText(`I've processed your question: "${queryInput}"\n\nNo specific suggestions available at this time.`);
        }
      } else {
        setIsAnalyzing(false);
        setAnalysisStatusText(`Error processing query: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[App.tsx] Error processing manual query:', error);
      setIsAnalyzing(false);
      setAnalysisStatusText('Error: Failed to process your question');
    }

    setQueryInput('');
  };

  // Handle showing query input
  const handleShowQueryInput = () => {
    setIsBodyAreaVisible(true);
    setShowQueryInput(true);
    setAnalysisStatusText('');
    setIsAnalyzing(false);
  };

  const handleToggleRecording = async () => {
    // Toggle inline voice recording interface
    if (!showInlineRecording) {
      setShowInlineRecording(true)
      // Start recording immediately
      handleStartVoiceRecording()
    } else {
      // If already showing, stop recording
      if (isVoiceRecording) {
        console.log('[App.tsx] Toggle recording - stopping recording')
        await handleStopVoiceRecording()
      } else {
        setShowInlineRecording(false)
      }
    }
  };

  // Handle start voice recording
  const handleStartVoiceRecording = async () => {
    try {
      setIsVoiceRecording(true)
      const result = await window.electronAPI.startVoiceRecording({
        modelName: 'base.en',
        maxDuration: 45000, // 45 seconds - reasonable limit
        wordTimestamps: true,
        enableStreaming: true, // Enable real-time streaming transcription
        streamingFallback: true // Fallback to batch processing if streaming fails
      })

      if (!result.success) {
        console.error('[App.tsx] Failed to start voice recording:', result.error)
        setIsVoiceRecording(false)
        // Don't close the interface here - let the InlineVoiceRecording component handle it
      }
    } catch (error) {
      console.error('[App.tsx] Error starting voice recording:', error)
      setIsVoiceRecording(false)
      // Don't close the interface here - let the InlineVoiceRecording component handle it
    }
  }

  // Handle stop voice recording
  const handleStopVoiceRecording = async () => {
    try {
      console.log('[App.tsx] Stopping voice recording...')
      setIsVoiceRecording(false)
      // Don't handle the result here - let the InlineVoiceRecording component handle it
      // This function is just for updating the App-level recording state
    } catch (error) {
      console.error('[App.tsx] Error stopping voice recording:', error)
      setIsVoiceRecording(false)
    }
  }

  // Handle cancel voice recording
  const handleCancelVoiceRecording = async () => {
    try {
      console.log('[App.tsx] Cancelling voice recording...')
      setIsVoiceRecording(false)
      setShowInlineRecording(false)

      // Cancel the recording process
      const result = await window.electronAPI.cancelVoiceRecording()
      if (!result.success) {
        console.error('[App.tsx] Failed to cancel voice recording:', result.error)
      }
    } catch (error) {
      console.error('[App.tsx] Error cancelling voice recording:', error)
    }
  }

  // Handle voice recording transcript completion (from InlineVoiceRecording component)
  const handleSendVoiceTranscript = async (transcript: string) => {
    console.log('[App.tsx] Voice transcript completed:', transcript);

    // Set the transcript as the query input
    setQueryInput(transcript);

    // Show the query input area with the transcribed text
    setIsBodyAreaVisible(true);
    setShowQueryInput(true);
    setAnalysisStatusText('');
    setIsAnalyzing(false);

    // Close the inline recording interface
    setShowInlineRecording(false);
    setIsVoiceRecording(false);
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

  // Permission dialog handlers
  const handlePermissionDialogClose = async () => {
    setShowPermissionDialog(false);
    // Close the modal window
    try {
      await window.electronAPI.closeModal('permission-dialog');
    } catch (error) {
      console.error('Failed to close permission modal:', error);
    }
  };

  const handlePermissionGranted = async () => {
    console.log('[App.tsx] Permission granted, proceeding with AI processing');
    setShowPermissionDialog(false);
    // Close the modal window
    try {
      await window.electronAPI.closeModal('permission-dialog');
    } catch (error) {
      console.error('Failed to close permission modal:', error);
    }
    // Retry the AI processing now that permissions are granted
    handleAskAIClick();
  };

  const handleOpenPermissionDialog = async () => {
    setShowPermissionDialog(true);
    // Open the modal window
    try {
      const modalOptions = {
        width: 700,
        height: 600,
        minWidth: 600,
        minHeight: 500,
        resizable: false,
        title: isFirstLaunch ? 'Welcome to Closezly AI' : 'Permissions Required',
        modal: true,
        center: true
      };
      await window.electronAPI.createModal('permission-dialog', modalOptions);
    } catch (error) {
      console.error('Failed to open permission modal:', error);
    }
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
    <>
      {/* Main Window Content */}
      <MainWindowOnly>
        <div className={`flex flex-col h-screen w-full bg-transparent text-white antialiased rounded-xl shadow-2xl`}>
          <Header
            isRecording={isVoiceRecording} // Use voice recording state
            recordingTime={0} // No recording time display for inline interface
            onToggleRecording={handleToggleRecording} // Toggle inline voice recording
            onToggleVisibility={handleToggleVisibility}
            showInlineRecording={showInlineRecording}
            onStartVoiceRecording={handleStartVoiceRecording}
            onStopVoiceRecording={handleStopVoiceRecording}
            onCancelVoiceRecording={handleCancelVoiceRecording}
            onSendVoiceTranscript={handleSendVoiceTranscript}
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
          {showQueryInput ? (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col space-y-2">
                <label className="text-sm text-gray-300">Ask me anything about your sales conversation:</label>
                <textarea
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="e.g., How should I handle their price objection?"
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleQuerySubmit();
                    }
                  }}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleQuerySubmit}
                  disabled={!queryInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
                <button
                  onClick={() => setShowQueryInput(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : isAnalyzing ? (
            <motion.p
              className="text-white text-center text-lg animate-pulse"
              key="analyzing"
            >
              {analysisStatusText}
            </motion.p>
          ) : (
            <div className="space-y-3">
              <motion.p
                className="text-white whitespace-pre-wrap" // Allow text to wrap and preserve newlines
                key="response"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {analysisStatusText || "Click 'Ask AI' to analyze your screen, or ask a specific question below."}
              </motion.p>
              {/* Show follow-up options when there's a response */}
              {analysisStatusText && (
                <div className="flex space-x-2 mt-4 pt-3 border-t border-gray-600">
                  <button
                    onClick={handleShowQueryInput}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Ask Follow-up
                  </button>
                  <button
                    onClick={handleAskAIClick}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Re-analyze Screen
                  </button>
                </div>
              )}
              {!analysisStatusText && (
                <button
                  onClick={handleShowQueryInput}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ask a Question
                </button>
              )}
            </div>
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

          {/* Permission Status - Show in settings or when there are permission issues */}
          {(isSettingsOpen || (hasCheckedPermissions && hasPermissionIssues && !showPermissionDialog)) && (
            <div className="absolute top-12 right-4 z-30">
              <div className="bg-black bg-opacity-75 backdrop-blur-lg rounded-lg p-3 shadow-xl">
                <PermissionStatus
                  onOpenPermissionDialog={handleOpenPermissionDialog}
                  className="w-48"
                  showLabels={true}
                  compact={false}
                />
              </div>
            </div>
          )}
        </div>
      </MainWindowOnly>

      {/* Permission Dialog - Only render in modal window */}
      <ModalWindowOnly modalId="permission-dialog">
        <PermissionModalDialog
          isOpen={true} // Always open when in modal window
          onClose={handlePermissionDialogClose}
          onPermissionGranted={handlePermissionGranted}
          requiredPermissions={['screen', 'microphone']}
          showOnboarding={isFirstLaunch}
        />
      </ModalWindowOnly>

      {/* Voice recording is now handled inline in the Header component */}
    </>
  );
};

export default App;

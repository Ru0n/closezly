import React, { useState, useEffect } from 'react';
import { Mic, Settings, LogIn, LogOut, XCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  isRecording: boolean;
  recordingTime: number;
  onToggleRecording: () => void;
  onToggleVisibility: () => void;
  isVisible: boolean;
  isAuthenticated: boolean;
  userSubscriptionStatus: 'free' | 'paid' | null; // null if not authenticated, or 'free', 'paid'
  userInitials?: string; // For paid users to display initials
  userEmail?: string; // User's email for display in settings
  username?: string; // User's username for display
  profilePictureUrl?: string; // URL to user's profile picture
  onLoginClick: () => void;
  onUpgradeClick: () => void;
  onAccountClick: () => void; // For when paid user clicks their initials/avatar
  onAskAIClick: () => void;
  onStartOver: () => void;
  onQuitApp: () => void;
  hideMicAndTime?: boolean; // New optional prop
  onSettingsOpenChange?: (open: boolean) => void; // Callback for when settings popover opens/closes
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const Header: React.FC<HeaderProps> = ({
  isRecording,
  recordingTime,
  onToggleRecording,
  onToggleVisibility,
  isVisible,
  isAuthenticated,
  userSubscriptionStatus,
  userInitials,
  userEmail,
  username,
  profilePictureUrl,
  onLoginClick,
  onUpgradeClick,
  onAccountClick,
  onAskAIClick,
  onStartOver,
  onQuitApp,
  hideMicAndTime,
  onSettingsOpenChange
}) => {
  // For recording time display
  const [time, setTime] = useState<string>('00:00');
  useEffect(() => {
    setTime(formatTime(recordingTime));
  }, [recordingTime]);

  // For settings popover click state
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);
  // For settings button hover state
  const [isHoveringSettingsButton, setIsHoveringSettingsButton] = useState(false);

  // For hotkeys display
  const [hotkeys, setHotkeys] = useState<any>({});
  useEffect(() => {
    const fetchHotkeys = async () => {
      // In a real app, fetch these from a config or context
      // For now, hardcoding typical macOS shortcuts
      // const fetchedHotkeys = await window.electronAPI.getHotkeys();
      // setHotkeys(fetchedHotkeys);
      // Placeholder if electronAPI.getHotkeys() is not available:
      setHotkeys({
        toggleRecording: '⌘R',
        takeScreenshot: '⌘S',
        askAI: '⌘I',
        startOver: '⌘⇧R',
        toggleVisibility: '⌘H',
        positionAtTop: '⌘P',
      });
    };
    fetchHotkeys();
  }, []);

  const handleSettingsToggle = (open: boolean) => {
    setIsSettingsPopoverOpen(open);
    // This existing prop likely calls WindowHelper.toggleCompactExpand() or similar via App.tsx
    if (onSettingsOpenChange) {
      onSettingsOpenChange(open);
    }
    // If popover is being closed by click, ensure hover state doesn't keep it open visually
    if (!open) {
      setIsHoveringSettingsButton(false);
      // And ensure window shrinks if it was only hover-expanded and not click-expanded prior
      if (window.electronAPI && 'setHoverExpand' in window.electronAPI) {
        (window.electronAPI as any).setHoverExpand(false);
      }
    }
  };

  const handleSettingsMouseEnter = () => {
    setIsHoveringSettingsButton(true);
    if (!isSettingsPopoverOpen) { // Only expand Electron window if not already click-opened
      if (window.electronAPI && 'setHoverExpand' in window.electronAPI) {
        (window.electronAPI as any).setHoverExpand(true);
      }
    }
  };

  const handleSettingsMouseLeave = () => {
    setIsHoveringSettingsButton(false);
    // Only tell Electron window to shrink if settings are not open due to a click.
    // WindowHelper's setHoverExpand(false) will restore to baseHeight, which is EXPANDED if click-opened.
    if (!isSettingsPopoverOpen) {
      if (window.electronAPI && 'setHoverExpand' in window.electronAPI) {
        (window.electronAPI as any).setHoverExpand(false);
      }
    }
  };

  const handleLogout = () => {
    if (window.electronAPI && 'logout' in window.electronAPI) {
      (window.electronAPI as any).logout();
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between px-2 py-1 h-10 bg-black bg-opacity-50 backdrop-blur-xl w-full min-w-[650px] overflow-hidden">
        {/* Left section: Dynamic auth button and main actions */}
        <div className="flex items-center space-x-1">
          {/* Dynamic First Button: Login / Upgrade to Pro / User Account */}
          {(() => {
            if (!isAuthenticated || userSubscriptionStatus === null) {
              return (
                <Button variant="default" size="sm" className="h-7 px-2 text-xs whitespace-nowrap" onClick={onLoginClick}>
                  Login
                </Button>
              );
            } else if (userSubscriptionStatus === 'free') {
              return (
                <Button variant="default" size="sm" className="h-7 px-2 text-xs whitespace-nowrap" onClick={onUpgradeClick}>
                  Upgrade to Pro
                </Button>
              );
            } else { // 'paid'
              return (
                <Button variant="outline" size="sm" className="h-7 px-2 rounded-full flex items-center space-x-1.5" onClick={onAccountClick}>
                  <div className="h-5 w-5 rounded-full flex items-center justify-center bg-muted overflow-hidden">
                    {profilePictureUrl ? (
                      <img
                        src={profilePictureUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      userInitials || <User size={12} />
                    )}
                  </div>
                  <span className="text-xs">
                    {username || (userEmail && userEmail.split('@')[0])}
                  </span>
                </Button>
              );
            }
          })()}

          {/* Ask AI */}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs whitespace-nowrap flex items-center" onClick={onAskAIClick}>
            <div className="flex flex-row items-center space-x-1 mr-2">
              <span className="bg-neutral-700 text-neutral-300 rounded-sm px-1.5 py-0.5 text-xs leading-none">⌥</span>
              <span className="bg-neutral-700 text-neutral-300 rounded-sm px-1.5 py-0.5 text-xs leading-none">Q</span>
            </div>
            Ask AI
          </Button>

          {/* Start Over */}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs whitespace-nowrap flex items-center" onClick={onStartOver}>
            <div className="flex flex-row items-center space-x-1 mr-2">
              <span className="bg-neutral-700 text-neutral-300 rounded-sm px-1.5 py-0.5 text-xs leading-none">⌥</span>
              <span className="bg-neutral-700 text-neutral-300 rounded-sm px-1.5 py-0.5 text-xs leading-none">R</span>
            </div>
            Start Over
          </Button>

          {/* Show/Hide */}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs whitespace-nowrap flex items-center" onClick={onToggleVisibility}>
            <div className="flex flex-row items-center space-x-1 mr-2">
              <span className="bg-neutral-700 text-neutral-300 rounded-sm px-1.5 py-0.5 text-xs leading-none">⌥</span>
              <span className="bg-neutral-700 text-neutral-300 rounded-sm px-1.5 py-0.5 text-xs leading-none">H</span>
            </div>
            {isVisible ? "Hide" : "Show"}
          </Button>
        </div>

        {/* Right section: Timer, Mic and Settings - Always visible unless hideMicAndTime is true */}
        <div className="flex items-center space-x-1 ml-auto">
          {/* Timer display */}
          {!hideMicAndTime && (
            <div className="text-xs font-medium">
              {time}
            </div>
          )}

          {/* Mic button */}
          {!hideMicAndTime && (
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white relative" onClick={onToggleRecording}>
              {isRecording ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Mic size={14} className="text-red-500" />
                </motion.div>
              ) : (
                <Mic size={14} />
              )}
            </Button>
          )}

          {/* Settings - Refactored Popover */}
          <Popover open={isSettingsPopoverOpen || isHoveringSettingsButton} onOpenChange={handleSettingsToggle}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80"
                onMouseEnter={handleSettingsMouseEnter}
                onMouseLeave={handleSettingsMouseLeave}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 bg-background/90 p-2 border-gray-700 shadow-xl backdrop-blur-md rounded-lg"
              sideOffset={5}
              align="end"
            >
              <div className="space-y-0.5">
                {isAuthenticated && userSubscriptionStatus === 'paid' && userEmail && (
                  <>
                    <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-foreground">
                      {userEmail}
                    </DropdownMenuLabel>
                    <div className="border-b border-gray-600 my-1"></div>
                  </>
                )}
                {isAuthenticated && userSubscriptionStatus === 'free' && (
                  <Button variant="ghost" className="w-full justify-start px-2 py-1.5 h-auto text-sm text-primary hover:bg-muted/50" onClick={onUpgradeClick}>
                    Upgrade to Pro
                  </Button>
                )}
                <div className="text-xs text-muted-foreground px-2 py-1 font-semibold">Hotkeys</div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-2 py-1 text-xs text-muted-foreground rounded-sm hover:bg-muted/50 cursor-default">
                    <span>Ask AI</span><Badge variant="secondary" className="ml-2 px-1.5 py-0.5">{hotkeys.askAI}</Badge>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1 text-xs text-muted-foreground rounded-sm hover:bg-muted/50 cursor-default">
                    <span>Start Over</span><Badge variant="secondary" className="ml-2 px-1.5 py-0.5">{hotkeys.startOver}</Badge>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1 text-xs text-muted-foreground rounded-sm hover:bg-muted/50 cursor-default">
                    <span>Toggle Overlay</span><Badge variant="secondary" className="ml-2 px-1.5 py-0.5">{hotkeys.toggleVisibility}</Badge>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1 text-xs text-muted-foreground rounded-sm hover:bg-muted/50 cursor-default">
                    <span>Position at Top</span><Badge variant="secondary" className="ml-2 px-1.5 py-0.5">{hotkeys.positionAtTop}</Badge>
                  </div>
                </div>
                <div className="border-b border-gray-600 my-1"></div> {/* Custom Separator */}
                <Button variant="ghost" className="w-full justify-start px-2 py-1.5 h-auto text-sm text-foreground hover:bg-muted/50" onClick={isAuthenticated ? handleLogout : onLoginClick}>
                  {isAuthenticated ? <LogOut className="mr-2 h-3.5 w-3.5" /> : <LogIn className="mr-2 h-3.5 w-3.5" />}
                  {isAuthenticated ? 'Logout' : 'Login'}
                </Button>
                <Button variant="ghost" className="w-full justify-start px-2 py-1.5 h-auto text-sm text-red-500 hover:bg-muted/50 hover:!text-red-600" onClick={onQuitApp}>
                  <XCircle className="mr-2 h-3.5 w-3.5" />
                  Quit App
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Header;

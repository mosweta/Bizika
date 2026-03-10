import { useEffect, useRef, useState, useCallback } from 'react';
import YouTube from 'react-youtube';
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Settings,
  Clock,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

const EdpuzzleVideoPlayer = ({ 
  videoUrl, 
  onNextLesson,
  onPreviousLesson,
  hasNextLesson,
  hasPreviousLesson,
  lessonTitle = "Current Lesson",
  questions = [],
  onQuestionAnswered,
  lessonId,
  onProgressUpdate,
  markLessonComplete,
  isLessonCompleted,
  autoComplete = false,
  onVideoEnd
}) => {
  // Refs
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const progressBarRef = useRef(null);
  const isDraggingRef = useRef(false);
  
  // Function refs to prevent re-renders
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const markLessonCompleteRef = useRef(markLessonComplete);
  const onVideoEndRef = useRef(onVideoEnd);
  
  // Completion tracking refs
  const hasEndedRef = useRef(false);
  const hasAutoCompletedRef = useRef(false);
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const [showCenterPlayButton, setShowCenterPlayButton] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [isInteractingWithSettings, setIsInteractingWithSettings] = useState(false);
  
  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  
  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Update function refs when props change
  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
    markLessonCompleteRef.current = markLessonComplete;
    onVideoEndRef.current = onVideoEnd;
  }, [onProgressUpdate, markLessonComplete, onVideoEnd]);
  
  // Reset completion flags when video changes
  useEffect(() => {
    hasEndedRef.current = false;
    hasAutoCompletedRef.current = false;
    // Show center play button for new video
    setShowCenterPlayButton(true);
  }, [videoUrl]);

  // Extract YouTube video ID
  const getVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(videoUrl);

  // YouTube player options
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      fs: 0,
      disablekb: 0
    },
  };

  // YouTube event handlers
  const onReady = useCallback((event) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    event.target.setVolume(volume);
    if (isMuted) event.target.mute();
    event.target.setPlaybackRate(playbackRate);
  }, [volume, isMuted, playbackRate]);

  const onStateChange = useCallback((event) => {
    const playerState = event.data;
    
    // Update play/pause state
    setIsPlaying(playerState === 1);
    
    // Hide center play button when playing, show when paused
    setShowCenterPlayButton(playerState !== 1);
    
    // Show controls when playback starts/pauses
    resetControlsTimeout();
    
    // Handle video end
    if (playerState === 0 && !hasEndedRef.current) {
      hasEndedRef.current = true;
      hasAutoCompletedRef.current = true;
      console.log('🎬 Video playback ended');
      
      // Show controls when video ends
      setShowControls(true);
      
      setTimeout(() => {
        onVideoEndRef.current?.();
        
        if (onProgressUpdateRef.current && lessonId) {
          onProgressUpdateRef.current(lessonId, 100);
        }
        
        if (autoComplete && markLessonCompleteRef.current && !isLessonCompleted) {
          console.log('🚀 Auto-completing from video end...');
          markLessonCompleteRef.current();
        }
      }, 100);
    }
    
    // Update duration when video starts
    if (playerState === 1 && playerRef.current) {
      setDuration(playerRef.current.getDuration());
    }
  }, [lessonId, autoComplete, isLessonCompleted]);

  const onError = useCallback((error) => {
    console.error('YouTube Player Error:', error);
  }, []);

  // Progress tracking
  useEffect(() => {
    if (!isPlaying || isDragging) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    // Reset completion flag when starting playback
    hasAutoCompletedRef.current = false;

    const updateProgress = () => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;
      
      try {
        const currentTime = playerRef.current.getCurrentTime();
        const currentDuration = playerRef.current.getDuration();
        
        // Update current time with debounce
        setCurrentTime(prev => {
          if (Math.abs(prev - currentTime) < 0.5) return prev;
          return currentTime;
        });
        
        if (currentDuration > 0) {
          const progress = (currentTime / currentDuration) * 100;
          
          // Report progress to parent
          if (onProgressUpdateRef.current && lessonId) {
            onProgressUpdateRef.current(lessonId, progress);
          }
          
          // Auto-complete at 99%
          if (progress >= 99 && 
              autoComplete && 
              markLessonCompleteRef.current && 
              !isLessonCompleted &&
              !hasAutoCompletedRef.current) {
            
            console.log(`🎯 Video at ${Math.round(progress)}%, auto-completing...`);
            hasAutoCompletedRef.current = true;
            markLessonCompleteRef.current();
          }
        }
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    };

    // Clear existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Start progress tracking
    progressIntervalRef.current = setInterval(updateProgress, 1000);
    updateProgress();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isPlaying, lessonId, autoComplete, isLessonCompleted, isDragging]);

  // Player controls
  const togglePlay = useCallback(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setShowCenterPlayButton(true);
      } else {
        playerRef.current.playVideo();
        setShowCenterPlayButton(false);
      }
    }
    // Show controls and reset timer
    resetControlsTimeout();
  }, [isPlaying]);

  const seekTo = useCallback((seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  }, []);

  const skip = useCallback((seconds) => {
    if (playerRef.current) {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
      seekTo(newTime);
    }
    resetControlsTimeout();
  }, [currentTime, duration, seekTo]);

  // Volume controls
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
    resetControlsTimeout();
  }, []);

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
    resetControlsTimeout();
  }, [isMuted]);

  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        
        if (window.screen.orientation && window.screen.orientation.lock) {
          try {
            await window.screen.orientation.lock('landscape');
          } catch (err) {
            console.log('Orientation lock not supported:', err);
          }
        }
      } else {
        if (window.screen.orientation && window.screen.orientation.unlock) {
          await window.screen.orientation.unlock();
        }
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
    resetControlsTimeout();
  }, []);

  // Playback rate
  const changePlaybackRate = useCallback((rate) => {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
    }
    setShowSettings(false);
    resetControlsTimeout();
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Show controls when entering/exiting fullscreen
      setShowControls(true);
      resetControlsTimeout();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Disable right-click
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('contextmenu', handleContextMenu);
      return () => container.removeEventListener('contextmenu', handleContextMenu);
    }
  }, []);

  // Helper functions
  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds) || seconds === undefined) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  // Draggable progress bar handlers
  const handleProgressMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    // Keep controls visible while dragging
    setShowControls(true);
    
    const updateDragPosition = (clientX) => {
      if (!progressBarRef.current || !duration) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setDragPosition(percentage);
    };

    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      updateDragPosition(e.clientX);
    };

    const handleMouseUp = (e) => {
      if (!isDraggingRef.current || !duration) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const newTime = duration * percentage;
      
      seekTo(newTime);
      
      isDraggingRef.current = false;
      setIsDragging(false);
      
      // Reset controls timeout after dragging
      resetControlsTimeout();
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [duration, seekTo]);

  const handleProgressTouchStart = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    // Keep controls visible while dragging
    setShowControls(true);
    
    const updateTouchPosition = (clientX) => {
      if (!progressBarRef.current || !duration) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setDragPosition(percentage);
    };

    const handleTouchMove = (e) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      updateTouchPosition(e.touches[0].clientX);
    };

    const handleTouchEnd = (e) => {
      if (!isDraggingRef.current || !duration) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.changedTouches[0].clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const newTime = duration * percentage;
      
      seekTo(newTime);
      
      isDraggingRef.current = false;
      setIsDragging(false);
      
      // Reset controls timeout after dragging
      resetControlsTimeout();
      
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [duration, seekTo]);

  // Control visibility timeout - auto-hide after 3 seconds whenever video is playing
const resetControlsTimeout = useCallback(() => {
  setShowControls(true);
  
  if (hideControlsTimerRef.current) {
    clearTimeout(hideControlsTimerRef.current);
  }
  
  // Auto-hide after 3 seconds if video is playing and not dragging
  if (isPlaying && !isDragging && !isInteractingWithSettings) {
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000); // 3 seconds timeout for all devices and modes
  }
}, [isPlaying, isDragging, isInteractingWithSettings]);


  // Touch events for mobile
  const handleTouchStart = useCallback((e) => {
    setTouchStartTime(Date.now());
    setTouchStartX(e.touches[0].clientX);
    
    // Cancel any pending hide timer
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    
    // Show controls on touch
    setShowControls(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    // Cancel hide timer while touching/moving
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartTime || !touchStartX) return;
    
    const touchEndTime = Date.now();
    const touchEndX = e.changedTouches[0].clientX;
    const touchDuration = touchEndTime - touchStartTime;
    const touchDistance = touchEndX - touchStartX;
    
    // Short tap (less than 200ms) - toggle play/pause and manage controls
    if (touchDuration < 200 && Math.abs(touchDistance) < 20) {
      togglePlay();
    }
    
    // Reset timeout after touch ends
    resetControlsTimeout();
    
    setTouchStartTime(null);
    setTouchStartX(null);
  }, [touchStartTime, touchStartX, togglePlay, resetControlsTimeout]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, []);

  // Video not available
  if (!videoId) {
    return (
      <div className="aspect-video bg-gray-900 flex flex-col items-center justify-center rounded-xl p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-white text-lg mb-2">Video Not Available</p>
        <p className="text-gray-400 text-sm text-center">
          This lesson doesn't have a video or the YouTube URL is invalid.
        </p>
      </div>
    );
  }

  const displayProgress = isDragging ? dragPosition : progressPercentage;

  return (
    <div 
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group select-none"
      onMouseMove={resetControlsTimeout}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* YouTube Player */}
      <div className="aspect-video">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
          onError={onError}
          className="w-full h-full pointer-events-none"
          iframeClassName="pointer-events-none"
        />
      </div>

      {/* YouTube-style Center Play Button */}
      {(showCenterPlayButton || (!isPlaying && showControls)) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                     w-16 h-16 sm:w-20 sm:h-20 bg-red-600 hover:bg-red-700
                     rounded-full flex items-center justify-center text-white 
                     transition-all duration-200 z-30 shadow-2xl
                     hover:scale-110 active:scale-95 group"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {/* Outer ring effect */}
          <div className="absolute inset-0 rounded-full bg-red-600 opacity-75 
                        group-hover:opacity-100 transition-opacity animate-ping-slow"></div>
          
          {/* Inner button */}
          <div className="relative bg-red-600 rounded-full w-full h-full 
                        flex items-center justify-center shadow-xl">
            {isPlaying ? (
              <Pause size={isMobile ? 28 : 32} />
            ) : (
              <Play size={isMobile ? 28 : 32} className="ml-1" />
            )}
          </div>
        </button>
      )}

      {/* Fullscreen Button */}
      {(showControls || isMobile) && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 sm:p-2.5 
                     text-white bg-black bg-opacity-60 hover:bg-red-600 
                     rounded-full backdrop-blur-sm z-20 transition-all duration-200
                     active:bg-opacity-90"
          style={{ opacity: showControls ? 1 : 0, transition: 'opacity 0.2s' }}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize size={isMobile ? 18 : 20} /> : <Maximize size={isMobile ? 18 : 20} />}
        </button>
      )}

      {/* Top Controls */}
      <div 
        className="absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/90 to-transparent z-10"
        style={{ opacity: showControls ? 1 : 0, transition: 'opacity 0.2s' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {hasPreviousLesson && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviousLesson?.();
                  resetControlsTimeout();
                }}
                className="p-1.5 sm:p-2 bg-black bg-opacity-50 text-white 
                           rounded-full hover:bg-red-600 backdrop-blur-sm
                           active:bg-opacity-90 transition-all"
                title="Previous lesson"
              >
                <ChevronLeft size={isMobile ? 16 : 20} />
              </button>
            )}
            
            <div className="text-white">
              <h3 className="font-medium text-xs sm:text-base truncate max-w-[150px] sm:max-w-md">
                {lessonTitle}
              </h3>
              <div className="flex items-center gap-1 sm:gap-2 text-2xs sm:text-xs text-gray-300">
                <Clock size={isMobile ? 10 : 12} />
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                {isDragging && (
                  <span className="text-yellow-400">
                    {Math.round(displayProgress)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 to-transparent z-10"
        style={{ opacity: showControls ? 1 : 0, transition: 'opacity 0.2s' }}
      >
        {/* Draggable Progress Bar */}
        <div 
          ref={progressBarRef}
          className="relative mb-2 sm:mb-4 cursor-pointer group touch-none" 
          onMouseDown={handleProgressMouseDown}
          onTouchStart={handleProgressTouchStart}
        >
          {/* Background bar */}
          <div className="w-full h-2 sm:h-2.5 bg-gray-600/50 rounded-full overflow-hidden">
            {/* Progress fill */}
            <div 
              className="h-full bg-red-600 rounded-full transition-all duration-75"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          
          {/* Progress handle */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 
                       bg-red-600 rounded-full shadow-lg border-2 border-white
                       transition-opacity duration-200 ${
                         isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                       }`}
            style={{ left: `calc(${displayProgress}% - ${isMobile ? 6 : 8}px)` }}
          />
          
          {/* Time preview on hover */}
          {!isDragging && showControls && (
            <div 
              className="absolute -top-6 transform -translate-x-1/2 bg-black/80 
                         text-white text-xs px-2 py-1 rounded opacity-0 
                         group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${displayProgress}%` }}
            >
              {formatTime((displayProgress / 100) * duration)}
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 sm:p-2 text-white hover:bg-red-600 
                         rounded-full active:bg-opacity-30 transition-all"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={isMobile ? 18 : 20} /> : <Play size={isMobile ? 18 : 20} />}
            </button>
            
            <button
              onClick={() => skip(-10)}
              className="p-1.5 sm:p-2 text-white hover:bg-red-600 
                         rounded-full active:bg-opacity-30 transition-all"
              title="Rewind 10 seconds"
            >
              <SkipBack size={isMobile ? 16 : 18} />
            </button>
            
            <button
              onClick={() => skip(10)}
              className="p-1.5 sm:p-2 text-white hover:bg-red-600 
                         rounded-full active:bg-opacity-30 transition-all"
              title="Forward 10 seconds"
            >
              <SkipForward size={isMobile ? 16 : 18} />
            </button>
            
            {!isMobile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 text-white hover:bg-red-600 rounded-full"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-20 accent-red-600"
                  title="Volume"
                />
              </div>
            )}
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {hasNextLesson && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNextLesson?.();
                  resetControlsTimeout();
                }}
                className="p-1.5 sm:p-2 text-white hover:bg-red-600 
                           rounded-full active:bg-opacity-30 transition-all"
                title="Next lesson"
              >
                <ChevronRight size={isMobile ? 16 : 20} />
              </button>
            )}
            
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setIsInteractingWithSettings(!showSettings);
                resetControlsTimeout();
              }}
              className={`p-1.5 sm:p-2 rounded-full transition-all ${
                showSettings 
                  ? 'bg-red-600 text-white' 
                  : 'text-white hover:bg-red-600 active:bg-opacity-30'
              }`}
              title="Settings"
            >
              <Settings size={isMobile ? 16 : 20} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Settings Menu */}
      {showSettings && isMobile && (
        <div 
          className="absolute inset-x-0 bottom-0 bg-gray-900/95 backdrop-blur-md text-white 
                     rounded-t-xl shadow-2xl z-40 border-t border-gray-800 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={() => {
            setIsInteractingWithSettings(true);
            // Cancel hide timer when interacting with settings
            if (hideControlsTimerRef.current) {
              clearTimeout(hideControlsTimerRef.current);
            }
          }}
          onTouchEnd={() => {
            setIsInteractingWithSettings(false);
            resetControlsTimeout();
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-700 rounded-full"></div>
          </div>
          
          <div className="px-3 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Speed</h4>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setIsInteractingWithSettings(false);
                  resetControlsTimeout();
                }}
                className="p-1.5 -mr-1.5 text-gray-400 hover:text-white rounded-full"
                aria-label="Close settings"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Speed options */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {playbackRates.map((rate) => (
                <button
                  key={rate}
                  onClick={() => changePlaybackRate(rate)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium
                             transition-colors ${
                    playbackRate === rate 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                    {playbackRate === rate && <Check size={12} />}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Volume control */}
            <div className="mt-3 pt-2 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-1.5 text-white hover:bg-gray-800 rounded-lg"
                >
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-1.5 accent-red-600"
                  style={{ 
                    background: `linear-gradient(to right, #ef4444 ${volume}%, #4b5563 ${volume}%)`
                  }}
                />
                <span className="text-xs text-gray-400 min-w-[35px]">{volume}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Settings Menu */}
      {showSettings && !isMobile && (
        <div 
          className="absolute bottom-16 right-4 w-48 bg-gray-900 text-white 
                     rounded-lg shadow-2xl p-3 z-20 border border-gray-800"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => {
            setIsInteractingWithSettings(true);
            if (hideControlsTimerRef.current) {
              clearTimeout(hideControlsTimerRef.current);
            }
          }}
          onMouseLeave={() => {
            setIsInteractingWithSettings(false);
            resetControlsTimeout();
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-xs uppercase tracking-wider text-gray-400">Speed</h4>
            <button
              onClick={() => {
                setShowSettings(false);
                setIsInteractingWithSettings(false);
                resetControlsTimeout();
              }}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="space-y-1">
            {playbackRates.map((rate) => (
              <button
                key={rate}
                onClick={() => changePlaybackRate(rate)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm 
                           transition-colors ${
                  playbackRate === rate 
                    ? 'bg-red-600 text-white' 
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                  {playbackRate === rate && <Check size={12} />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      

      {/* Add animation keyframes */}
      <style jsx>{`
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

EdpuzzleVideoPlayer.defaultProps = {
  onNextLesson: () => {},
  onPreviousLesson: () => {},
  hasNextLesson: false,
  hasPreviousLesson: false,
  lessonTitle: "Current Lesson",
  questions: [],
  onQuestionAnswered: () => {},
  lessonId: null,
  onProgressUpdate: () => {},
  markLessonComplete: () => {},
  isLessonCompleted: false,
  autoComplete: false,
  onVideoEnd: () => {}
};

export default EdpuzzleVideoPlayer;
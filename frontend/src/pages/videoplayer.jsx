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
  
  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  
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
      fs: 1,
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
    
    // Handle video end - prevent duplicate calls
    if (playerState === 0 && !hasEndedRef.current) {
      hasEndedRef.current = true;
      hasAutoCompletedRef.current = true;
      console.log('🎬 Video playback ended');
      
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

  // Progress tracking - FIXED: No infinite loops
  useEffect(() => {
    if (!isPlaying) {
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
          
          // Auto-complete at 99% - prevent duplicate calls
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
  }, [isPlaying, lessonId, autoComplete, isLessonCompleted]);

  // Player controls
  const togglePlay = useCallback(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  }, [isPlaying]);

  const seekTo = useCallback((seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
    }
  }, []);

  const skip = useCallback((seconds) => {
    if (playerRef.current) {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
      seekTo(newTime);
    }
  }, [currentTime, duration, seekTo]);

  // Volume controls
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
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
  }, [isMuted]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Playback rate
  const changePlaybackRate = useCallback((rate) => {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
    }
    setShowSettings(false);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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

  const handleProgressClick = useCallback((e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = duration * percentage;
    seekTo(newTime);
  }, [duration, seekTo]);

  // Control visibility timeout
  useEffect(() => {
    if (!showControls || !isPlaying) return;
    
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls, isPlaying]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Click outside settings menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSettings && !e.target.closest('.settings-menu') && !e.target.closest('.settings-button')) {
        setShowSettings(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettings]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
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

  return (
    <div 
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group select-none"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
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

      {/* Fullscreen Button */}
      {showControls && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full backdrop-blur-sm z-20"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      )}

      {/* Top Controls */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {hasPreviousLesson && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviousLesson?.();
                  }}
                  className="p-2 bg-white bg-opacity-20 text-white rounded-full hover:bg-opacity-30 backdrop-blur-sm"
                  title="Previous lesson"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              
              <div className="text-white">
                <h3 className="font-medium text-sm sm:text-base truncate max-w-[180px] sm:max-w-md">
                  {lessonTitle}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <Clock size={12} />
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent z-10">
          {/* Progress Bar */}
          <div className="relative mb-4 cursor-pointer" onClick={handleProgressClick}>
            <div className="w-full h-2 bg-gray-600/70 rounded-lg overflow-hidden">
              <div 
                className="h-full bg-red-600 transition-all duration-200"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <button
                onClick={() => skip(-10)}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                title="Rewind 10 seconds"
              >
                <SkipBack size={20} />
              </button>
              
              <button
                onClick={() => skip(10)}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                title="Forward 10 seconds"
              >
                <SkipForward size={20} />
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full"
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
                  className="w-20 accent-white"
                  title="Volume"
                />
              </div>
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2">
              {hasNextLesson && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNextLesson?.();
                  }}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                  title="Next lesson"
                >
                  <ChevronRight size={20} />
                </button>
              )}
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`settings-button p-2 rounded-full ${showSettings ? 'bg-blue-600 text-white' : 'text-white hover:bg-white hover:bg-opacity-20'}`}
                title="Settings"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Menu */}
      {showSettings && (
        <div className="settings-menu absolute bottom-16 right-4 bg-gray-900 text-white rounded-lg shadow-2xl p-4 min-w-[200px] z-20"
             onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Settings</h4>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 hover:bg-gray-800 rounded"
              aria-label="Close settings"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="mb-4">
            <h5 className="text-sm text-gray-400 mb-2">Playback Speed</h5>
            <div className="space-y-1">
              {playbackRates.map((rate) => (
                <button
                  key={rate}
                  onClick={() => changePlaybackRate(rate)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${playbackRate === rate ? 'bg-blue-600' : 'hover:bg-gray-800'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                    {playbackRate === rate && <Check size={14} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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
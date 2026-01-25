import { useEffect, useRef, useState } from 'react';
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
  Captions,
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
  onQuestionAnswered
}) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  
  // Basic player state
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
  
  // Extract video ID from URL
  const getVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(videoUrl);

  // Simple YouTube player options
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0, // Hide YouTube controls
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      fs: 1,
      disablekb: 0
    },
  };

  // Basic event handlers
  const onReady = (event) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    event.target.setVolume(volume);
    if (isMuted) event.target.mute();
    event.target.setPlaybackRate(playbackRate);
  };

  const onStateChange = (event) => {
    setIsPlaying(event.data === 1);
  };

  const onError = (error) => {
    console.error('YouTube Player Error:', error);
  };

  // Basic player controls
  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const seekTo = (seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
    }
  };

  const skip = (seconds) => {
    if (playerRef.current) {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
      seekTo(newTime);
    }
  };

  // Volume controls
  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  // Fullscreen - SIMPLE implementation
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Playback rate change
  const changePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
    }
    setShowSettings(false);
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Disable right-click on the video player
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

  // Format time
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === undefined) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  // Handle progress bar click
  const handleProgressClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = duration * percentage;
    seekTo(newTime);
  };

  // Update current time periodically
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Hide controls after inactivity
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, showControls]);

  const resetControlsTimeout = () => {
    setShowControls(true);
  };

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSettings && !e.target.closest('.settings-menu') && !e.target.closest('.settings-button')) {
        setShowSettings(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettings]);

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
      {/* YouTube Player - Let react-youtube handle it */}
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

      {/* Floating Fullscreen Button - Top Right Corner */}
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

      {/* Center Play/Pause Button */}
      {/* {showControls && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            onClick={togglePlay}
            className="p-4 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 backdrop-blur-sm transition-transform hover:scale-105"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-12 w-12 text-white sm:h-16 sm:w-16" />
            ) : (
              <Play className="h-12 w-12 text-white sm:h-16 sm:w-16 ml-1" />
            )}
          </button>
        </div>
      )} */}

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
            
            {/* Right side - Settings and Next Lesson */}
            <div className="flex items-center gap-2">
              {/* Next Lesson Button - Replaces Captions button */}
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
              
              {/* Settings button */}
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

      {/* Show hint when controls are hidden */}
      
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
  onQuestionAnswered: () => {}
};

export default EdpuzzleVideoPlayer;
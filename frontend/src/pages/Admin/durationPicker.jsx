// components/DurationPicker.jsx
import { useState, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, BookOpen, Video } from 'lucide-react';

export default function DurationPicker({ value, onChange, lessonType = 'video', className = '' }) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [displayMode, setDisplayMode] = useState('slider'); // 'slider' or 'manual'
  const [durationText, setDurationText] = useState('');

  // Parse initial value
  useEffect(() => {
    if (value) {
      parseDurationString(value);
    }
  }, [value]);

  const parseDurationString = (durationStr) => {
    if (!durationStr) return;
    
    const str = durationStr.toString().toLowerCase();
    
    // Check if it's a reading lesson with "min read" format
    if (str.includes('read')) {
      const minutes = extractMinutes(str);
      setMinutes(minutes);
      setHours(0);
      setDurationText(formatDuration(minutes, 'reading'));
      return;
    }
    
    // Check for hours and minutes
    const hoursMatch = str.match(/(\d+)\s*(?:hour|hr|h)/i);
    const minutesMatch = str.match(/(\d+)\s*(?:minute|min|m)(?!\s*read)/i);
    
    const newHours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const newMinutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
    
    setHours(newHours);
    setMinutes(newMinutes);
    setDurationText(formatDuration(newHours * 60 + newMinutes, lessonType));
  };

  const extractMinutes = (str) => {
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const formatDuration = (totalMinutes, type) => {
    if (type === 'reading') {
      return `${totalMinutes} min read`;
    }
    
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    if (hrs === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hrs} hr`;
    } else {
      return `${hrs} hr ${mins} min`;
    }
  };

  const handleSliderChange = (type, value) => {
    if (type === 'hours') {
      setHours(value);
      const totalMinutes = (value * 60) + minutes;
      onChange(formatDuration(totalMinutes, lessonType));
    } else {
      setMinutes(value);
      const totalMinutes = (hours * 60) + value;
      onChange(formatDuration(totalMinutes, lessonType));
    }
  };

  const handleTextChange = (text) => {
    setDurationText(text);
    onChange(text);
  };

  const handleManualInput = () => {
    // Try to parse the manual input
    parseDurationString(durationText);
  };

  const increment = (type) => {
    if (type === 'hours') {
      const newHours = Math.min(hours + 1, 24);
      setHours(newHours);
      const totalMinutes = (newHours * 60) + minutes;
      onChange(formatDuration(totalMinutes, lessonType));
    } else {
      const newMinutes = Math.min(minutes + 5, 59);
      setMinutes(newMinutes);
      const totalMinutes = (hours * 60) + newMinutes;
      onChange(formatDuration(totalMinutes, lessonType));
    }
  };

  const decrement = (type) => {
    if (type === 'hours') {
      const newHours = Math.max(hours - 1, 0);
      setHours(newHours);
      const totalMinutes = (newHours * 60) + minutes;
      onChange(formatDuration(totalMinutes, lessonType));
    } else {
      const newMinutes = Math.max(minutes - 5, 0);
      setMinutes(newMinutes);
      const totalMinutes = (hours * 60) + newMinutes;
      onChange(formatDuration(totalMinutes, lessonType));
    }
  };

  const totalMinutes = (hours * 60) + minutes;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Lesson Type Indicator */}
      <div className="flex items-center gap-2 mb-3">
        {lessonType === 'video' ? (
          <Video className="h-4 w-4 text-blue-600" />
        ) : (
          <BookOpen className="h-4 w-4 text-green-600" />
        )}
        <span className="text-sm font-medium text-gray-700">
          {lessonType === 'video' ? 'Video Duration' : 'Reading Time'}
        </span>
      </div>

      {/* Display Mode Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setDisplayMode('slider')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            displayMode === 'slider'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Slider
        </button>
        <button
          type="button"
          onClick={() => setDisplayMode('manual')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            displayMode === 'manual'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Manual
        </button>
      </div>

      {displayMode === 'slider' ? (
        <>
          {/* Duration Display */}
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-gray-900">
              {hours > 0 && `${hours}h `}
              {minutes > 0 && `${minutes}m`}
              {hours === 0 && minutes === 0 && '0m'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {formatDuration(totalMinutes, lessonType)}
            </div>
          </div>

          {/* Hours Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Hours</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => decrement('hours')}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <ChevronDown size={16} />
                </button>
                <span className="w-8 text-center text-sm font-medium">{hours}</span>
                <button
                  type="button"
                  onClick={() => increment('hours')}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <ChevronUp size={16} />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="1"
              value={hours}
              onChange={(e) => handleSliderChange('hours', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0h</span>
              <span>12h</span>
              <span>24h</span>
            </div>
          </div>

          {/* Minutes Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Minutes</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => decrement('minutes')}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <ChevronDown size={16} />
                </button>
                <span className="w-8 text-center text-sm font-medium">{minutes}</span>
                <button
                  type="button"
                  onClick={() => increment('minutes')}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <ChevronUp size={16} />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="59"
              step="5"
              value={minutes}
              onChange={(e) => handleSliderChange('minutes', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0m</span>
              <span>30m</span>
              <span>59m</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-2">Quick Presets</p>
            <div className="flex flex-wrap gap-2">
              {lessonType === 'video' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(0);
                      setMinutes(5);
                      onChange('5 min');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    5 min
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(0);
                      setMinutes(15);
                      onChange('15 min');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    15 min
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(0);
                      setMinutes(30);
                      onChange('30 min');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    30 min
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(1);
                      setMinutes(0);
                      onChange('1 hr');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    1 hr
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(1);
                      setMinutes(30);
                      onChange('1 hr 30 min');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    1.5 hr
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(0);
                      setMinutes(2);
                      onChange('2 min read');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    2 min read
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(0);
                      setMinutes(5);
                      onChange('5 min read');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    5 min read
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(0);
                      setMinutes(10);
                      onChange('10 min read');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    10 min read
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(0);
                      setMinutes(15);
                      onChange('15 min read');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    15 min read
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHours(0);
                      setMinutes(20);
                      onChange('20 min read');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    20 min read
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Manual Input Mode */
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Enter Duration Manually
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                placeholder={lessonType === 'video' ? 'e.g., 45 min, 1 hr 30 min' : 'e.g., 5 min read'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleManualInput}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 mb-2">Examples:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              {lessonType === 'video' ? (
                <>
                  <span>• "45 min"</span>
                  <span>• "1 hr"</span>
                  <span>• "1 hr 30 min"</span>
                  <span>• "90 minutes"</span>
                  <span>• "2 hours"</span>
                  <span>• "2h 15m"</span>
                </>
              ) : (
                <>
                  <span>• "2 min read"</span>
                  <span>• "5 minutes read"</span>
                  <span>• "10 min read"</span>
                  <span>• "15 minute read"</span>
                  <span>• "20 min reading"</span>
                  <span>• "30 min read"</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Storage Format Hint */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={12} />
          <span>Stored as: <code className="bg-gray-100 px-1 py-0.5 rounded">{formatDuration(totalMinutes, lessonType)}</code></span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          This format will be used for learning hours calculation
        </p>
      </div>
    </div>
  );
}
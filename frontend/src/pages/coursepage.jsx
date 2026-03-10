// src/components/CoursePage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import EdpuzzleVideoPlayer from './videoplayer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  onSnapshot,
  where
} from "firebase/firestore";
import {
  BookOpen,
  Clock,
  Users,
  List,
  CheckCircle,
  ChevronLeft,
  FileText,
  Download,
  Award,
  Eye,
  FileSpreadsheet,
  Presentation,
  Folder,
  Loader2,
  File,
  Image as ImageIcon,
  Video,
  Archive,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Settings
} from "lucide-react";

// Public R2 domain for direct file access
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN;

// File type mapping for icons
const FILE_ICONS = {
  pdf: { icon: FileText, color: "text-red-600", bgColor: "bg-red-50" },
  doc: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
  docx: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
  xls: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-50" },
  ppt: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-50" },
  pptx: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-50" },
  zip: { icon: Archive, color: "text-purple-600", bgColor: "bg-purple-50" },
  jpg: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  jpeg: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  png: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  gif: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  mp4: { icon: Video, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  webm: { icon: Video, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  txt: { icon: FileText, color: "text-gray-600", bgColor: "bg-gray-50" },
  default: { icon: File, color: "text-gray-600", bgColor: "bg-gray-50" }
};

// ========== PROGRESS CALCULATION FUNCTIONS ==========

/**
 * Calculate progress based on ACTIVE lessons only
 */
const calculateActiveProgress = (enrollment, activeLessons) => {
  if (!enrollment || !activeLessons || activeLessons.length === 0) return 0;
  
  const completedActive = activeLessons.filter(lesson => 
    enrollment.completedLessons?.includes(lesson.id)
  ).length;
  
  return Math.min(Math.round((completedActive / activeLessons.length) * 100), 100);
};

/**
 * Filter active lessons (not archived)
 */
const getActiveLessons = (allLessons) => {
  return allLessons.filter(lesson => lesson.status !== 'archived');
};

/**
 * Get archived lessons
 */
const getArchivedLessons = (allLessons) => {
  return allLessons.filter(lesson => lesson.status === 'archived');
};

// Helper function to get file icon
const FileIcon = ({ type, className = "h-5 w-5" }) => {
  const IconComponent = FILE_ICONS[type]?.icon || File;
  return <IconComponent className={className} />;
};

// Helper function to get file type from filename
const getFileType = (filename) => {
  if (!filename || typeof filename !== 'string') return 'default';
  
  const parts = filename.split('.');
  if (parts.length < 2) return 'default';
  
  const ext = parts.pop().toLowerCase();
  return FILE_ICONS[ext] ? ext : 'default';
};

// Resource Card Component with Preview and Download
const ResourceCard = ({ resource, lessonTitle, onDownload, onPreview, downloading }) => {
  const fileType = resource.type || getFileType(resource.name || resource.originalName || '');
  const isPreviewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'txt'].includes(fileType);
  
  // Separate handlers for preview and download
  const handlePreview = (e) => {
    e.stopPropagation();
    onPreview(resource);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    onDownload(resource);
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`p-2 rounded-lg flex-shrink-0 ${FILE_ICONS[fileType]?.bgColor || 'bg-gray-100'}`}>
          <FileIcon type={fileType} className={`h-4 w-4 ${FILE_ICONS[fileType]?.color || 'text-gray-600'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate text-gray-900">
            {resource.name || resource.originalName || 'Unnamed Resource'}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
            {lessonTitle && (
              <>
                <span className="truncate max-w-[150px]">{lessonTitle}</span>
                <span>•</span>
              </>
            )}
            <span className="capitalize">{fileType}</span>
            {resource.size && (
              <>
                <span>•</span>
                <span>{typeof resource.size === 'number' ? 
                  (resource.size / 1024).toFixed(1) + ' KB' : resource.size}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-2">
        {/* Preview Button */}
        {isPreviewable && (
          <button
            onClick={handlePreview}
            disabled={downloading === (resource.key || resource.id)}
            className="p-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
            title="Preview"
          >
            {downloading === (resource.key || resource.id) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye size={16} />
            )}
          </button>
        )}
        
        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={downloading === (resource.key || resource.id)}
          className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
          title="Download"
        >
          {downloading === (resource.key || resource.id) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download size={16} />
          )}
        </button>
      </div>
    </div>
  );
};

const MarkdownLesson = ({ 
  lesson, 
  lessonId, 
  onMarkComplete, 
  enrollment,
  hasNextLesson,
  hasPreviousLesson,
  onNextLesson,
  onPreviousLesson,
  onTakeQuiz,
  hasQuiz
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [fontFamily, setFontFamily] = useState('default');
  const [theme, setTheme] = useState('light');
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [headerHeight, setHeaderHeight] = useState(60);
  const [footerHeight, setFooterHeight] = useState(70);
  const contentRef = useRef(null);
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);

  // Check mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Measure header and footer heights
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
    if (footerRef.current) {
      setFooterHeight(footerRef.current.offsetHeight);
    }
  }, [showSettings, showToc, isFullscreen]);

  // Extract table of contents from markdown
  useEffect(() => {
    if (lesson.markdown) {
      const headings = lesson.markdown.match(/^#{1,3} .+$/gm) || [];
      const tocItems = headings.map(heading => {
        const level = heading.match(/^#+/)[0].length;
        const title = heading.replace(/^#+\s/, '');
        const id = title.toLowerCase().replace(/[^\w]+/g, '-');
        return { level, title, id };
      });
      setToc(tocItems);
    }
  }, [lesson.markdown]);

  // Font size mapping
  const fontSizeClasses = {
    small: 'text-sm sm:text-base',
    medium: 'text-base sm:text-lg',
    large: 'text-lg sm:text-xl',
  };

  // Line height mapping
  const lineHeightClasses = {
    small: 'leading-relaxed',
    medium: 'leading-relaxed',
    large: 'leading-loose',
  };

  // Font family mapping
  const fontFamilyClasses = {
    default: 'font-sans',
    serif: 'font-serif',
    dyslexic: 'font-dyslexic'
  };

  // Theme classes
  const themeClasses = {
    light: 'bg-white text-gray-900',
    sepia: 'bg-amber-50 text-gray-900',
    dark: 'bg-gray-900 text-gray-100',
  };

  // Calculate dynamic heights based on measured header/footer
  const getContentHeight = () => {
    if (isFullscreen) {
      return `calc(100vh - ${headerHeight}px)`;
    }
    return `calc(100vh - ${headerHeight + footerHeight}px)`;
  };

  // Track scroll position for progress
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    
    const element = contentRef.current;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const maxScroll = scrollHeight - clientHeight;
    const percentage = maxScroll > 0 
      ? Math.min(100, Math.round((scrollTop / maxScroll) * 100))
      : 0;
    
    setScrollProgress(percentage);
    
    // Auto-mark complete when they reach the bottom (95%)
    if (percentage >= 95 && !hasMarkedComplete && !enrollment?.completedLessons?.includes(lessonId)) {
      setHasMarkedComplete(true);
      onMarkComplete();
    }
  }, [lessonId, onMarkComplete, hasMarkedComplete, enrollment]);

  // Get display duration
  const getDisplayDuration = () => {
    if (lesson.duration) return lesson.duration;
    return `${readingTime} min read`;
  };

  // Calculate reading time
  const readingTime = lesson.markdown 
    ? Math.ceil(lesson.markdown.split(/\s+/).length / 200) 
    : 0;

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        setShowSettings(false);
        setShowToc(false);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setShowSettings(false);
        setShowToc(false);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Determine next action button text and handler
  const getNextButton = () => {
    if (hasNextLesson) {
      return { text: "Next", handler: onNextLesson };
    } else if (hasQuiz) {
      return { text: "Quiz", handler: onTakeQuiz };
    } else {
      return { text: "Complete", handler: () => {} };
    }
  };

  const nextButton = getNextButton();

  // Scroll to heading
  const scrollToHeading = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setShowToc(false);
    }
  };

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettings && !event.target.closest('.settings-panel') && !event.target.closest('.settings-button')) {
        setShowSettings(false);
      }
      if (showToc && !event.target.closest('.toc-panel') && !event.target.closest('.toc-button')) {
        setShowToc(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings, showToc]);

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen flex flex-col transition-colors duration-300 ${themeClasses[theme]}`}
    >
      {/* Simple progress bar */}
      <div className="h-1 bg-gray-200 fixed top-0 left-0 right-0 z-50">
        <div 
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Sticky Header with Controls */}
<div 
  ref={headerRef}
  className={`sticky top-0 z-40 flex items-center justify-between px-3 sm:px-4 py-2 backdrop-blur-sm ${
    theme === 'dark' ? 'bg-gray-900/95' : 'bg-white/95'
  } border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
>
  
  {/* Left side - Navigation */}
  <div className="flex items-center gap-1 sm:gap-2">
    {hasPreviousLesson && (
      <button
        onClick={onPreviousLesson}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
        title="Previous lesson"
      >
        <ChevronLeft size={18} />
        {!isMobile && <span className="text-sm">Prev</span>}
      </button>
    )}
    
    {/* Table of Contents Toggle */}
    {toc.length > 0 && (
      <button
        onClick={() => setShowToc(!showToc)}
        className={`toc-button p-2 rounded-lg transition-colors flex items-center gap-1 ${
          showToc ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
        }`}
        title="Table of contents"
      >
        <List size={18} />
        {!isMobile && <span className="text-sm">Contents</span>}
      </button>
    )}
  </div>

  {/* Center - Lesson title (desktop only) */}
  {!isMobile && (
    <span className="text-sm font-medium truncate max-w-md px-4">
      {lesson.title}
    </span>
  )}

  {/* Right side - Controls */}
  <div className="flex items-center gap-1 sm:gap-2">
    {/* Next Lesson Button - Now always visible when available */}
    {hasNextLesson && (
      <button
        onClick={nextButton.handler}
        className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
        title="Next lesson"
      >
        {!isMobile && <span className="text-sm">Next</span>}
        <ChevronRight size={18} />
      </button>
    )}

    {/* Reading Settings */}
    <button
      onClick={() => setShowSettings(!showSettings)}
      className={`settings-button p-2 rounded-lg transition-colors ${
        showSettings ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
      }`}
      title="Reading settings"
    >
      <Settings size={18} />
    </button>

    {/* Fullscreen Toggle */}
    <button
      onClick={toggleFullscreen}
      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
  </div>
</div>

      {/* Table of Contents Panel - Fixed width */}
      {showToc && toc.length > 0 && (
        <div className={`toc-panel fixed left-2 sm:left-4 top-14 z-30 w-64 rounded-lg shadow-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } p-3 max-h-96 overflow-y-auto`}>
          <div className="flex items-center justify-between mb-2 sticky top-0 bg-inherit pt-1">
            <h4 className="font-semibold text-sm">Contents</h4>
            <button 
              onClick={() => setShowToc(false)} 
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {toc.map((item, index) => (
              <button
                key={index}
                onClick={() => scrollToHeading(item.id)}
                className={`block w-full text-left text-sm p-2 rounded hover:bg-gray-100 transition-colors ${
                  item.level === 1 ? 'font-bold' : 
                  item.level === 2 ? 'font-medium pl-4' : 'pl-8'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reading Settings Panel - Fixed width */}
      {showSettings && (
        <div className={`settings-panel fixed right-2 sm:right-4 top-14 z-30 w-72 sm:w-80 rounded-lg shadow-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } p-4 max-h-[calc(100vh-100px)] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-inherit pt-1">
            <h3 className="font-semibold">Reading Settings</h3>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 rounded">
              <X size={16} />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Font Size Controls */}
            <div>
              <label className="text-sm font-medium block mb-3">Text Size</label>
              <div className="grid grid-cols-3 gap-2">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      fontSize === size 
                        ? 'bg-blue-600 text-white' 
                        : theme === 'dark' 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {size === 'small' ? 'A-' : size === 'medium' ? 'A' : 'A+'}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="text-sm font-medium block mb-3">Font Family</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: 'default', label: 'Sans-serif', class: '' },
                  { key: 'serif', label: 'Serif', class: 'font-serif' },
                  { key: 'dyslexic', label: 'Open Dyslexic', class: 'font-dyslexic' }
                ].map((font) => (
                  <button
                    key={font.key}
                    onClick={() => setFontFamily(font.key)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${font.class} ${
                      fontFamily === font.key 
                        ? 'bg-blue-600 text-white' 
                        : theme === 'dark' 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme/Color Mode */}
            <div>
              <label className="text-sm font-medium block mb-3">Color Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {['light', 'sepia', 'dark'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      theme === t 
                        ? 'ring-2 ring-blue-600 ring-offset-2' 
                        : theme === 'dark' 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200'
                    } ${t === 'light' ? 'bg-white text-gray-900 border' : 
                       t === 'sepia' ? 'bg-amber-50 text-gray-900 border' : 
                       'bg-gray-900 text-white border-gray-700'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Reading Progress */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Reading progress</span>
                <span className="font-medium">{scrollProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${scrollProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 overflow-hidden">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          {/* Lesson Header */}
          <div className="mb-4 sm:mb-6 flex-shrink-0">
            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 break-words ${fontFamilyClasses[fontFamily]}`}>
              {lesson.title}
            </h1>
            
            {/* Lesson metadata */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full whitespace-nowrap">
                <BookOpen size={12} />
                <span>Reading</span>
              </span>
              
              <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full whitespace-nowrap">
                <Clock size={12} />
                <span>{getDisplayDuration()}</span>
              </span>

              {/* Completed badge */}
              {enrollment?.completedLessons?.includes(lessonId) && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full whitespace-nowrap">
                  <CheckCircle size={12} />
                  <span>Completed</span>
                </span>
              )}
            </div>

            {/* Lesson description */}
            {lesson.description && !isMobile && (
              <p className="mt-3 text-sm text-gray-600 leading-relaxed border-l-4 border-blue-500 pl-3 break-words">
                {lesson.description}
              </p>
            )}
          </div>

          

          {/* Scrollable Content */}
          <div 
            ref={contentRef}
            onScroll={handleScroll}
            className={`overflow-y-auto pr-1 sm:pr-2 break-words whitespace-pre-wrap ${fontSizeClasses[fontSize]} ${lineHeightClasses[fontSize]} ${fontFamilyClasses[fontFamily]}`}
            style={{ height: getContentHeight() }}
          >
            {lesson.markdown ? (
              <div className="markdown-content prose prose-sm sm:prose-base lg:prose-lg max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, children, ...props}) => {
                      const id = children[0]?.toLowerCase().replace(/[^\w]+/g, '-') || '';
                      return <h1 id={id} className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-6 sm:mt-8 mb-4 scroll-mt-20 break-words" {...props}>{children}</h1>;
                    },
                    h2: ({node, children, ...props}) => {
                      const id = children[0]?.toLowerCase().replace(/[^\w]+/g, '-') || '';
                      return <h2 id={id} className="text-xl sm:text-2xl lg:text-3xl font-bold mt-5 sm:mt-6 mb-3 scroll-mt-20 break-words" {...props}>{children}</h2>;
                    },
                    h3: ({node, children, ...props}) => {
                      const id = children[0]?.toLowerCase().replace(/[^\w]+/g, '-') || '';
                      return <h3 id={id} className="text-lg sm:text-xl lg:text-2xl font-bold mt-4 mb-2 scroll-mt-20 break-words" {...props}>{children}</h3>;
                    },
                    p: ({node, ...props}) => <p className="mb-4 leading-relaxed break-words" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 sm:pl-6 mb-4 space-y-1 break-words" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 sm:pl-6 mb-4 space-y-1 break-words" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1 break-words" {...props} />,
                    blockquote: ({node, ...props}) => (
                      <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 pr-3 py-3 italic my-4 text-gray-700 rounded-r-lg break-words" {...props} />
                    ),
                    code: ({node, inline, ...props}) => 
                      inline ? (
                        <code className="bg-gray-100 rounded px-1.5 py-0.5 text-sm font-mono break-words" {...props} />
                      ) : (
                        <code className="block bg-gray-900 text-gray-100 rounded-lg p-3 sm:p-4 font-mono text-sm overflow-x-auto my-4 whitespace-pre" {...props} />
                      ),
                    pre: ({node, ...props}) => <pre className="bg-gray-900 rounded-lg p-3 sm:p-4 overflow-x-auto my-4 whitespace-pre" {...props} />,
                    a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 transition-colors break-words" target="_blank" rel="noopener noreferrer" {...props} />,
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-gray-300" {...props} />
                      </div>
                    ),
                    th: ({node, ...props}) => <th className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-bold break-words" {...props} />,
                    td: ({node, ...props}) => <td className="border border-gray-300 px-4 py-2 break-words" {...props} />,
                    hr: ({node, ...props}) => <hr className="my-8 border-t border-gray-200" {...props} />,
                    img: ({node, ...props}) => <img className="max-w-full h-auto rounded-lg shadow-md my-4 mx-auto" {...props} />,
                  }}
                >
                  {lesson.markdown}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-400 italic">No content available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with navigation - Hidden in fullscreen */}
      {!isFullscreen && (
        <div 
          ref={footerRef}
          className={`border-t px-3 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 ${
            theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
          }`}
        >
          {/* Progress - Only on desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm opacity-60">
              Progress: {scrollProgress}%
            </span>
          </div>

          {/* Mobile progress indicator */}
          {isMobile && (
            <div className="w-full flex justify-center">
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${scrollProgress}%` }}
                  />
                </div>
                <span className="text-xs opacity-60">{scrollProgress}%</span>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2 w-full sm:w-auto justify-center">
            <button
              onClick={onPreviousLesson}
              disabled={!hasPreviousLesson}
              className="flex-1 sm:flex-none px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 min-w-[70px] sm:min-w-[80px]"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>

            {!enrollment?.completedLessons?.includes(lessonId) && (
              <button
                onClick={onMarkComplete}
                className="flex-1 sm:flex-none px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1 min-w-[90px] sm:min-w-[100px]"
              >
                <CheckCircle size={16} />
                <span>Complete</span>
              </button>
            )}

            <button
              onClick={nextButton.handler}
              disabled={!hasNextLesson && !hasQuiz}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-1 min-w-[70px] sm:min-w-[80px] ${
                !hasNextLesson && hasQuiz 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : hasNextLesson
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              <span>{isMobile ? 'Next' : nextButton.text}</span>
              {hasNextLesson && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Video Player Layout Component with navigation buttons
const VideoPlayerLayout = ({ 
  activeLesson, 
  lessons,
  currentLessonIndex,
  hasNextLesson,
  hasPreviousLesson,
  setActiveLesson,
  enrollment,
  isAutoCompleting,
  autoCompleteLesson,
  markCompleteAndGoNext,
  questions,
  handleQuestionAnswered,
  handleLessonProgress,
  onTakeQuiz,
  hasQuiz
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Determine next action button text and handler
  const getNextButton = () => {
    if (hasNextLesson) {
      return { text: "Next Lesson →", handler: () => setActiveLesson(lessons[currentLessonIndex + 1]) };
    } else if (hasQuiz) {
      return { text: "Take Quiz →", handler: onTakeQuiz };
    } else {
      return { text: "Course Complete 🎉", handler: () => {} };
    }
  };

  const nextButton = getNextButton();

return (
  <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
    {/* Video Container */}
    <div 
      ref={videoContainerRef}
      className={`relative bg-black ${isFullscreen ? 'h-screen' : 'aspect-video'}`}
      style={{ isolation: 'isolate' }} /* Creates a new stacking context */
    >
      <EdpuzzleVideoPlayer
        videoUrl={activeLesson.videoUrl}
        lessonTitle={activeLesson.title}
        hasNextLesson={hasNextLesson}
        hasPreviousLesson={hasPreviousLesson}
        onNextLesson={() => {
          if (hasNextLesson && !isAutoCompleting) {
            setActiveLesson(lessons[currentLessonIndex + 1]);
          }
        }}
        onPreviousLesson={() => {
          if (hasPreviousLesson && !isAutoCompleting) {
            setActiveLesson(lessons[currentLessonIndex - 1]);
          }
        }}
        questions={questions}
        onQuestionAnswered={handleQuestionAnswered}
        lessonId={activeLesson.id}
        onProgressUpdate={handleLessonProgress}
        markLessonComplete={autoCompleteLesson}
        isLessonCompleted={enrollment?.completedLessons?.includes(activeLesson.id)}
        isAutoCompleting={isAutoCompleting}
        autoComplete={true}
      />
    
        
      </div>

      {/* Lesson Info */}
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-900">{activeLesson.title}</h2>
        <p className="text-gray-600 mt-1 text-sm">{activeLesson.description}</p>
        
        {/* Lesson metadata */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            <Video size={12} />
            Video Lesson
          </span>
          {activeLesson.duration && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
              <Clock size={12} />
              {activeLesson.duration}
            </span>
          )}
          {enrollment?.completedLessons?.includes(activeLesson.id) && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <CheckCircle size={12} />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
        <button
          onClick={() => setActiveLesson(lessons[currentLessonIndex - 1])}
          disabled={!hasPreviousLesson || isAutoCompleting}
          className="px-4 py-2 text-sm border bg-white rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        
        <div className="flex items-center gap-3">
          {!enrollment?.completedLessons?.includes(activeLesson.id) && (
            <button
              onClick={markCompleteAndGoNext}
              disabled={isAutoCompleting}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              {isAutoCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              Mark Complete
            </button>
          )}
          
          <button
            onClick={nextButton.handler}
            disabled={(!hasNextLesson && !hasQuiz) || isAutoCompleting}
            className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-1 ${
              !hasNextLesson && hasQuiz 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : hasNextLesson
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            {nextButton.text}
            {hasNextLesson && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================
// MAIN COURSE PAGE COMPONENT
// =============================================
export default function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [allLessons, setAllLessons] = useState([]);
  const [activeLessons, setActiveLessons] = useState([]);
  const [archivedLessons, setArchivedLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [downloading, setDownloading] = useState(null);
  const [showMobileLessons, setShowMobileLessons] = useState(false);
  const [expandedResources, setExpandedResources] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  
  // Layout state - 2/3 - 1/3 ratio
  const [layout, setLayout] = useState({
    mainColumn: 'lg:w-2/3',
    sidebarColumn: 'lg:w-1/3',
    isReadingMode: false,
    showSidebar: true
  });

  // Progress tracking
  const [videoProgress, setVideoProgress] = useState({});
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const completingLessonRef = useRef(null);

  // Adjust layout based on lesson type
  useEffect(() => {
    if (activeLesson) {
      const isReading = !activeLesson.videoUrl || 
                       activeLesson.lessonType === 'reading' || 
                       activeLesson.markdown;
      
      if (isReading) {
        setLayout({
          mainColumn: 'lg:w-full',
          sidebarColumn: 'lg:w-0',
          isReadingMode: true,
          showSidebar: false
        });
      } else {
        setLayout({
          mainColumn: 'lg:w-2/3',
          sidebarColumn: 'lg:w-1/3',
          isReadingMode: false,
          showSidebar: true
        });
      }
    }
  }, [activeLesson]);

  // Real-time listener for course updates
  useEffect(() => {
    if (!courseId) return;
    
    const courseRef = doc(db, "courses", courseId);
    
    const unsubscribe = onSnapshot(courseRef, (docSnap) => {
      if (docSnap.exists()) {
        const courseData = { id: docSnap.id, ...docSnap.data() };
        setCourse(courseData);
      }
    });
    
    return () => unsubscribe();
  }, [courseId]);

  // Fetch questions for active lesson
  useEffect(() => {
    const fetchQuestions = async () => {
      if (activeLesson && courseId && user) {
        try {
          const questionsRef = collection(db, "courses", courseId, "lessons", activeLesson.id, "questions");
          const questionsSnap = await getDocs(questionsRef);
          const questionsData = questionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setQuestions(questionsData.sort((a, b) => a.timestamp - b.timestamp));
        } catch (error) {
          console.error("Error fetching questions:", error);
          setQuestions([]);
        }
      }
    };
    
    fetchQuestions();
  }, [activeLesson, courseId, user]);

  // Auth state and course data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchCourseData(currentUser.uid);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [courseId, navigate]);

  const fetchCourseData = async (userId) => {
    try {
      setLoading(true);
      
      // Fetch course document
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      if (!courseDoc.exists()) {
        navigate("/courses");
        return;
      }
      
      const courseData = { id: courseDoc.id, ...courseDoc.data() };
      setCourse(courseData);

      // Fetch ALL lessons
      const lessonsRef = collection(db, "courses", courseId, "lessons");
      const lessonsSnap = await getDocs(lessonsRef);
      const allLessonsData = lessonsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.order - b.order);
      
      setAllLessons(allLessonsData);
      
      // Separate active and archived lessons
      const active = allLessonsData.filter(lesson => lesson.status !== 'archived');
      const archived = allLessonsData.filter(lesson => lesson.status === 'archived');
      setActiveLessons(active);
      setArchivedLessons(archived);

      // Fetch user's enrollment
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQuery = query(
        enrollmentsRef,
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );
      const enrollmentSnap = await getDocs(enrollmentQuery);
      
      if (!enrollmentSnap.empty) {
        const enrollmentDoc = enrollmentSnap.docs[0];
        let enrollmentData = enrollmentDoc.data();
        
        // Calculate progress using ACTIVE lessons only
        const completedActiveCount = active.filter(lesson => 
          enrollmentData.completedLessons?.includes(lesson.id)
        ).length;
        
        const progressPercentage = active.length > 0
          ? Math.min(Math.round((completedActiveCount / active.length) * 100), 100)
          : 0;
        
        // Update if needed
        if (enrollmentData.progress !== progressPercentage || 
            enrollmentData.totalLessons !== active.length) {
          await updateDoc(enrollmentDoc.ref, {
            progress: progressPercentage,
            totalLessons: active.length,
            lastUpdated: serverTimestamp()
          });
        }
        
        setEnrollment({
          id: enrollmentDoc.id,
          ...enrollmentData,
          progress: progressPercentage,
          totalLessons: active.length,
          completedActiveCount,
          activeLessonsCount: active.length
        });
      }

      // Set active lesson if none is selected
      if (active.length > 0 && !activeLesson) {
        const userEnrollment = enrollmentSnap.empty ? null : enrollmentSnap.docs[0].data();
        const completedLessons = userEnrollment?.completedLessons || [];
        
        const firstIncomplete = active.find(lesson => !completedLessons.includes(lesson.id));
        setActiveLesson(firstIncomplete || active[0]);
      }

    } catch (error) {
      console.error("Error fetching course data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-mark lesson complete
  const autoCompleteLesson = useCallback(async () => {
    if (!activeLesson || !enrollment) return;
    if (completingLessonRef.current === activeLesson.id) return;
    if (enrollment.completedLessons?.includes(activeLesson.id)) return;

    try {
      completingLessonRef.current = activeLesson.id;
      setIsAutoCompleting(true);

      const completedLessons = enrollment.completedLessons || [];
      const newCompletedLessons = [...completedLessons, activeLesson.id];
      
      const completedActiveCount = activeLessons.filter(lesson => 
        newCompletedLessons.includes(lesson.id)
      ).length;
      
      const progressPercentage = activeLessons.length > 0
        ? Math.min(Math.round((completedActiveCount / activeLessons.length) * 100), 100)
        : 0;

      await updateDoc(doc(db, "enrollments", enrollment.id), {
        completedLessons: newCompletedLessons,
        progress: progressPercentage,
        totalLessons: activeLessons.length,
        lastAccessed: serverTimestamp()
      });

      setEnrollment(prev => ({
        ...prev,
        completedLessons: newCompletedLessons,
        progress: progressPercentage,
        totalLessons: activeLessons.length,
        completedActiveCount
      }));

    } catch (e) {
      console.error('❌ Auto-completion error:', e);
    } finally {
      setIsAutoCompleting(false);
      setTimeout(() => {
        completingLessonRef.current = null;
      }, 1500);
    }
  }, [activeLesson, enrollment, activeLessons]);

  // Manual completion
  const markCompleteAndGoNext = async () => {
    if (!activeLesson || !enrollment) return;
    if (enrollment.completedLessons?.includes(activeLesson.id)) return;

    try {
      setIsAutoCompleting(true);

      const completedLessons = enrollment.completedLessons || [];
      const newCompletedLessons = [...completedLessons, activeLesson.id];
      
      const completedActiveCount = activeLessons.filter(lesson => 
        newCompletedLessons.includes(lesson.id)
      ).length;
      
      const progressPercentage = activeLessons.length > 0
        ? Math.min(Math.round((completedActiveCount / activeLessons.length) * 100), 100)
        : 0;

      await updateDoc(doc(db, "enrollments", enrollment.id), {
        completedLessons: newCompletedLessons,
        progress: progressPercentage,
        totalLessons: activeLessons.length,
        lastAccessed: serverTimestamp()
      });

      setEnrollment(prev => ({
        ...prev,
        completedLessons: newCompletedLessons,
        progress: progressPercentage,
        totalLessons: activeLessons.length,
        completedActiveCount
      }));

    } catch (e) {
      console.error('❌ Completion error:', e);
    } finally {
      setIsAutoCompleting(false);
    }
  };

  const handleQuestionAnswered = async (question) => {
    try {
      await updateDoc(
        doc(db, "courses", courseId, "lessons", activeLesson.id, "questions", question.id),
        {
          userAnswer: question.userAnswer,
          answered: true,
          answeredAt: serverTimestamp()
        }
      );
      
      setQuestions(prev => prev.map(q => q.id === question.id ? question : q));
    } catch (error) {
      console.error("Error saving question answer:", error);
    }
  };

  // Download handler
  const handleDownloadResource = async (resource) => {
    try {
      setDownloading(resource.key || resource.id);
      
      const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
      if (!accountId) {
        throw new Error("Configuration error: Missing R2 account ID");
      }
      
      const publicUrl = `https://pub-${accountId}.r2.dev/${resource.key || resource.filePath}`;
      const response = await fetch(publicUrl);
      
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      let filename = resource.name || resource.originalName || 'download';
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      if (!filename.includes('.')) {
        const contentType = response.headers.get('content-type');
        if (contentType) {
          const extension = contentType.split('/').pop();
          filename = `${filename}.${extension}`;
        }
      }
      
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setDownloading(null);
      }, 100);
      
    } catch (error) {
      console.error("Download error:", error);
      try {
        const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
        if (accountId) {
          const publicUrl = `https://pub-${accountId}.r2.dev/${resource.key || resource.filePath}`;
          window.open(publicUrl, '_blank');
        }
      } catch (fallbackError) {
        alert(`Download failed: ${error.message}`);
      }
      setDownloading(null);
    }
  };

  // Preview handler
  const handlePreviewResource = async (resource) => {
    try {
      setDownloading(resource.key || resource.id);
      
      const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'txt'];
      const fileType = resource.type || getFileType(resource.name || resource.originalName || '');
      
      let previewUrl = null;
      
      if (resource.key) {
        previewUrl = `${R2_PUBLIC_DOMAIN}/${resource.key}`;
      } else if (resource.url) {
        previewUrl = resource.url;
      }
      
      if (previewUrl && previewableTypes.includes(fileType)) {
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      } else {
        await handleDownloadResource(resource);
      }
      
    } catch (error) {
      console.error("Preview error:", error);
      await handleDownloadResource(resource);
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  // Get all resources from active lessons
  const getAllResources = () => {
    const allResources = [];
    const resourceMap = new Map();
    
    activeLessons.forEach(lesson => {
      const combinedResources = [
        ...(lesson.slides || []),
        ...(lesson.documents || []),
        ...(lesson.templates || []),
        ...(lesson.resources || [])
      ];
      
      combinedResources.forEach(resource => {
        if (!resource) return;
        
        const key = resource.key || resource.name || resource.originalName;
        if (!key) return;
        
        if (!resourceMap.has(key)) {
          const enhancedResource = {
            ...resource,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonOrder: lesson.order
          };
          
          resourceMap.set(key, enhancedResource);
          allResources.push(enhancedResource);
        }
      });
    });
    
    return allResources;
  };

  const currentLessonIndex = activeLesson 
    ? activeLessons.findIndex(lesson => lesson.id === activeLesson.id)
    : -1;
  const hasNextLesson = currentLessonIndex < activeLessons.length - 1;
  const hasPreviousLesson = currentLessonIndex > 0;
  const hasQuiz = course?.hasQuiz && enrollment?.progress >= 70;

  const handleLessonProgress = useCallback((lessonId, progress) => {
    if (!user || !courseId) return;
    setVideoProgress(prev => ({
      ...prev,
      [lessonId]: Math.min(100, Math.max(0, progress))
    }));
  }, [user, courseId]);

  const allResources = getAllResources();

  // Get safe enrollment progress based on active lessons
  const getSafeEnrollmentProgress = () => {
    if (!enrollment) return 0;
    const completedCount = enrollment.completedLessons?.filter(id => 
      activeLessons.some(lesson => lesson.id === id)
    ).length || 0;
    return activeLessons.length > 0
      ? Math.min(Math.round((completedCount / activeLessons.length) * 100), 100)
      : 0;
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      business: 'bg-blue-100 text-blue-800',
      technology: 'bg-purple-100 text-purple-800',
      marketing: 'bg-green-100 text-green-800',
      finance: 'bg-yellow-100 text-yellow-800',
      entrepreneurship: 'bg-indigo-100 text-indigo-800',
      leadership: 'bg-pink-100 text-pink-800',
      fitness: 'bg-red-100 text-red-800',
    };
    return colors[category?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Render lesson list
  const renderLessonList = () => {
    return (
      <>
        {/* Active Lessons */}
        {activeLessons.map((lesson, index) => {
          const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
          const isActive = activeLesson?.id === lesson.id;
          const lessonResources = [
            ...(lesson.slides || []),
            ...(lesson.documents || []),
            ...(lesson.templates || []),
            ...(lesson.resources || [])
          ].filter(r => r);
          
          const lessonProgress = videoProgress[lesson.id] || 0;
          
          return (
            <div
              key={`lesson-${lesson.id}`}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                isActive ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
              onClick={() => {
                if (isAutoCompleting) return;
                setActiveLesson(lesson);
                if (window.innerWidth < 1024) {
                  setShowMobileLessons(false);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  isCompleted ? "bg-green-100" : "bg-gray-100"
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium text-sm ${
                      isCompleted ? "text-green-700" : "text-gray-900"
                    }`}>
                      {lesson.title}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {lesson.duration || (lesson.markdown ? 'Reading' : '')}
                    </span>
                  </div>
                  
                  {lessonProgress > 0 && !isCompleted && (
                    <div className="mb-2">
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${lessonProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {lesson.description}
                  </p>
                  
                  {/* Lesson type indicators */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {lesson.markdown && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        <BookOpen size={10} />
                        Reading
                      </span>
                    )}
                    {lesson.videoUrl && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        <Video size={10} />
                        Video
                      </span>
                    )}
                    {lessonResources.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        <Folder size={10} />
                        {lessonResources.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Archived Lessons Section */}
        {archivedLessons.length > 0 && (
          <div className="border-t border-gray-200 mt-4">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <Archive size={16} className="text-gray-500" />
                <span className="font-medium text-gray-700">
                  Archived ({archivedLessons.length})
                </span>
              </div>
              {showArchived ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {showArchived && (
              <div className="bg-gray-50">
                {archivedLessons.map((lesson) => {
                  const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
                  return (
                    <div key={`archived-${lesson.id}`} className="p-4 border-b border-gray-200 opacity-75">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          isCompleted ? "bg-green-100" : "bg-gray-100"
                        }`}>
                          {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-600">{lesson.title}</h4>
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                              Archived
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Course not found</h2>
          <button
            onClick={() => navigate("/courses")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Simplified with only course tag */}
      <header className="bg-white border-b border-gray-200 lg:hidden sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/course/${course.id}`)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(course.category)}`}>
                  {course.title || 'Course'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {enrollment && (
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {getSafeEnrollmentProgress()}%
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setShowMobileLessons(!showMobileLessons)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {showMobileLessons ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Header - Simplified with course tag */}
      <header className="bg-white border-b border-gray-200 hidden lg:block sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/course/${course.id}`)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(course.category)}`}>
                    {course.category || 'Course'}
                  </span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-500">{activeLessons.length} lessons</span>
                </div>
              </div>
            </div>
            
            {enrollment && (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {getSafeEnrollmentProgress()}% Complete
                  </div>
                  <div className="text-xs text-gray-500">
                    {enrollment.completedLessons?.filter(id => 
                      activeLessons.some(l => l.id === id)
                    ).length || 0} of {activeLessons.length} lessons
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

{/* Main Content - 2/3 - 1/3 Layout */}
<div className="w-full px-4 lg:px-6 py-4">
  <div className="flex flex-col lg:flex-row gap-6">
    {/* Main Column - 2/3 width */}
    <div className={`${layout.mainColumn} transition-all duration-300 ${layout.isReadingMode ? 'mx-auto' : ''}`}>
      {/* Lesson Content */}
      {activeLesson ? (
        activeLesson.videoUrl ? (
          <VideoPlayerLayout
            activeLesson={activeLesson}
            lessons={activeLessons}
            currentLessonIndex={currentLessonIndex}
            hasNextLesson={hasNextLesson}
            hasPreviousLesson={hasPreviousLesson}
            setActiveLesson={setActiveLesson}
            enrollment={enrollment}
            isAutoCompleting={isAutoCompleting}
            autoCompleteLesson={autoCompleteLesson}
            markCompleteAndGoNext={markCompleteAndGoNext}
            questions={questions}
            handleQuestionAnswered={handleQuestionAnswered}
            handleLessonProgress={handleLessonProgress}
            onTakeQuiz={() => navigate(`/course/${courseId}/quiz`)}
            hasQuiz={hasQuiz}
          />
        ) : (
          <MarkdownLesson 
            lesson={activeLesson}
            lessonId={activeLesson.id}
            onMarkComplete={autoCompleteLesson}
            enrollment={enrollment}
            hasNextLesson={hasNextLesson}
            hasPreviousLesson={hasPreviousLesson}
            onNextLesson={() => {
              if (hasNextLesson && !isAutoCompleting) {
                setActiveLesson(activeLessons[currentLessonIndex + 1]);
              }
            }}
            onPreviousLesson={() => {
              if (hasPreviousLesson && !isAutoCompleting) {
                setActiveLesson(activeLessons[currentLessonIndex - 1]);
              }
            }}
            onTakeQuiz={() => navigate(`/course/${courseId}/quiz`)}
            hasQuiz={hasQuiz}
          />
        )
      ) : (
        <div className="bg-white rounded-xl shadow border p-8 text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Select a lesson to begin
          </h3>
          <p className="text-gray-600">
            Choose a lesson from the sidebar to start learning
          </p>
        </div>
      )}

      {/* REMOVED: Mobile Resources Section - Now handled by CourseHome */}

      {/* Quiz Section */}
      {hasQuiz && !layout.isReadingMode && (
        <div className="mt-6 bg-white rounded-xl shadow border p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Course Quiz</h3>
              <p className="text-sm text-gray-500">
                Test your knowledge with the final quiz
              </p>
            </div>
            {enrollment?.quizCompleted ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    Score: {enrollment.quizScore}%
                  </div>
                  <div className="text-sm text-gray-500">
                    {enrollment.quizScore >= 70 ? "Passed" : "Failed"}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/course/${courseId}/quiz`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retake Quiz
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate(`/course/${courseId}/quiz`)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Take Quiz
              </button>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Sidebar - 1/3 width */}
    {layout.showSidebar && (
      <div className={`${layout.sidebarColumn} transition-all duration-300 ${
        showMobileLessons 
          ? 'fixed inset-0 z-30 bg-white overflow-y-auto' 
          : 'hidden lg:block'
      }`}>
        {/* Mobile Lessons Header */}
        {showMobileLessons && (
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900">Course Lessons</h2>
            <button
              onClick={() => setShowMobileLessons(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow border h-full">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Course Lessons</h3>
            <p className="text-sm text-gray-500">
              {enrollment?.completedLessons?.filter(id => 
                activeLessons.some(l => l.id === id)
              ).length || 0} of {activeLessons.length} completed
            </p>
            {archivedLessons.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {archivedLessons.length} archived {archivedLessons.length === 1 ? 'lesson' : 'lessons'}
              </p>
            )}
          </div>
          
          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            {renderLessonList()}
          </div>

          {/* Desktop Resources Section */}
          {allResources.length > 0 && (
            <div className="border-t p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Resources</h3>
                <span className="text-xs text-gray-500">{allResources.length} files</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {allResources.slice(0, 5).map((resource, index) => (
                  <ResourceCard
                    key={index}
                    resource={resource}
                    lessonTitle={resource.lessonTitle}
                    onDownload={handleDownloadResource}
                    onPreview={handlePreviewResource}
                    downloading={downloading}
                  />
                ))}
                {allResources.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{allResources.length - 5} more resources
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
 </div>
    </div>
  );
}
import { v4 as uuidv4 } from "uuid";
import { useState, useEffect, useRef } from "react";
import { db, storage, auth } from "../firebase/config";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import DurationPicker from "./Admin/durationPicker";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  writeBatch,
  where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

import mammoth from 'mammoth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  BookOpen, 
  EyeOff, 
  Upload,
  Youtube,
  FileText,
  X,
  Check,
  Image as ImageIcon,
  Loader2,
  Download,
  File,
  FileSpreadsheet,
  Presentation,
  Folder,
  Grid,
  List,
  Cloud,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  LogOut,
  Shield,
  User,
  Video,
  FileUp,
  FileDown,
  Bold, Italic, Underline, Strikethrough,
   ListOrdered, Quote, Code,
  Link as LinkIcon,
  Heading1, Heading2, Heading3, Heading4,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Palette, Highlighter, ListChecks,
  Undo, Redo, Minus, Square,
  Sparkles,
} from "lucide-react";

// Import R2Service
import R2Service from "../services/r2service";

import TurndownService from 'turndown';
// Set up PDF.js worker

// ========== PDF.js Setup ==========
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use CDN for reliability in Vite
try {
  // Use a reliable CDN URL that definitely exists
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  console.log('✅ PDF.js worker configured with CDN');
} catch (error) {
  console.error('❌ PDF.js worker setup failed:', error);
}


// File type mapping
const FILE_TYPES = {
  pdf: { icon: FileText, color: "text-red-600", bgColor: "bg-red-50" },
  doc: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
  docx: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
  xls: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-50" },
  ppt: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-50" },
  pptx: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-50" },
  zip: { icon: Folder, color: "text-purple-600", bgColor: "bg-purple-50" },
  jpg: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  jpeg: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  png: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  gif: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  mp4: { icon: Video, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  webm: { icon: Video, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  default: { icon: File, color: "text-gray-600", bgColor: "bg-gray-50" }
};
// Image compression utility
const compressImage = (file, options = {}) => {
  return new Promise((resolve) => {
    resolve(file);
  });
};
// Helper function to get file type
const getFileType = (filename) => {
  if (!filename) return 'default';
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_TYPES[ext] ? ext : 'default';
};

// Helper function to get file icon
const FileIcon = ({ type, className = "h-5 w-5" }) => {
  const IconComponent = FILE_TYPES[type]?.icon || File;
  return <IconComponent className={className} />;
};

// Helper function to validate video URLs
const validateVideoUrl = (url) => {
  if (!url) return { valid: true, type: null };
  
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/
  ];
  
  const vimeoPatterns = [
    /^https?:\/\/(www\.)?vimeo\.com\/([0-9]+)/,
    /^https?:\/\/(www\.)?vimeo\.com\/\/([0-9]+)/
  ];
  
  const videoFilePatterns = [
    /^https?:\/\/.*\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i
  ];
  
  for (const pattern of youtubePatterns) {
    if (pattern.test(url)) return { valid: true, type: 'youtube' };
  }
  
  for (const pattern of vimeoPatterns) {
    if (pattern.test(url)) return { valid: true, type: 'vimeo' };
  }
  
  for (const pattern of videoFilePatterns) {
    if (pattern.test(url)) return { valid: true, type: 'direct' };
  }
  
  if (url.startsWith('http')) {
    return { valid: true, type: 'other' };
  }
  
  return { valid: false, type: 'unknown' };
};
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// Configure Turndown for better conversion
turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: function (content) {
    return '~~' + content + '~~';
  }
});

// List of common abbreviations that should keep their periods
const COMMON_ABBREVIATIONS = [
  'St', 'Mt', 'Mrs', 'Ms', 'Dr', 'Prof', 'Rev', 'Fr', 'Sr',
  'Mr', 'Capt', 'Col', 'Gen', 'Lt', 'Sgt', 'Ave', 'Blvd',
  'Rd', 'St', 'Ln', 'Dr', 'Ct', 'Pl', 'Ter', 'Cir',
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Create regex pattern from abbreviations
const abbrPattern = new RegExp('\\b(' + COMMON_ABBREVIATIONS.join('|') + ')\\\\.', 'gi');
// Replace the htmlToMarkdown function with this
const htmlToMarkdown = (html) => {
  if (!html) return '';
  
  // Convert to markdown
  let markdown = turndownService.turndown(html);
  
  // Fix escaped periods in numbered lists
  markdown = markdown.replace(/^(\d+)\\. /gm, '$1. ');
  
  // Fix all common abbreviations
  markdown = markdown.replace(abbrPattern, '$1.');
  
  // Also fix any remaining escaped periods that might be in the middle of text
  // This catches any other instances not covered by the abbreviation list
  markdown = markdown.replace(/([A-Za-z])\\. /g, '$1. ');
  
  return markdown;
};
// Simple Markdown to HTML converter (for preview)
const markdownToHtml = (markdown) => {
  if (!markdown) return '';
  
  let html = markdown
    // Headers
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/__(.*?)__/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/_(.*?)_/gim, '<em>$1</em>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" />')
    // Lists
    .replace(/^\s*-\s+(.*)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gim, '<ul>$&</ul>')
    // Paragraphs
    .split('\n\n').map(p => {
      if (!p.trim()) return '';
      if (p.startsWith('<')) return p;
      return `<p>${p}</p>`;
    }).join('')
    // Line breaks
    .replace(/\n/g, '<br />');
  
  return html;
};

// Add this helper function to parse durations consistently
const parseDurationToMinutes = (durationStr) => {
  if (!durationStr) return 30; // Default fallback
  
  const str = durationStr.toString().toLowerCase();
  
  // Handle "X min read" format
  if (str.includes('read')) {
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1]) : 30;
  }
  
  let totalMinutes = 0;
  
  // Extract hours
  const hoursMatch = str.match(/(\d+)\s*(?:hour|hr|h)/i);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60;
  }
  
  // Extract minutes
  const minutesMatch = str.match(/(\d+)\s*(?:minute|min|m)(?!\s*read)/i);
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1]);
  }
  
  // If no hours or minutes found, try to extract just a number
  if (totalMinutes === 0) {
    const justNumber = str.match(/(\d+)/);
    if (justNumber) {
      totalMinutes = parseInt(justNumber[0]);
    }
  }
  
  return totalMinutes || 30; // Fallback to 30 if parsing fails
};

// =============================================
// MARKDOWN EDITOR COMPONENT
// =============================================
const MarkdownEditor = ({ value, onChange }) => {
  const [tab, setTab] = useState('write'); // 'write' or 'preview'
  
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Editor tabs */}
      <div className="flex border-b bg-gray-50">
        <button
          type="button"
          onClick={() => setTab('write')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'write' 
              ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'preview' 
              ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Preview
        </button>
      </div>
      
      {/* Write tab */}
      {tab === 'write' && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={15}
          className="w-full p-4 font-mono text-sm border-0 focus:ring-0 focus:outline-none"
          placeholder="# Lesson Title

Write your lesson content in markdown here...

## Section 1
- Use **bold** or *italic* text
- Create lists
- Add [links](https://example.com)

## Section 2
1. Numbered lists
2. Work too

> Add blockquotes for important notes

```js
// Code blocks work great
console.log('Hello World');
```"
        />
      )}
      
      {/* Preview tab */}
      {tab === 'preview' && (
        <div className="p-4 prose prose-sm max-w-none min-h-[300px] max-h-[500px] overflow-y-auto bg-white">
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-gray-400 italic">No content to preview</p>
          )}
        </div>
      )}
      
      {/* Helper text */}
      <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-500">
        <span className="flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          <span>Supports GitHub Flavored Markdown: tables, task lists, code blocks, and more</span>
        </span>
      </div>
    </div>
  );
};
// =============================================
// TIPTAP EDITOR COMPONENT (Modern WYSIWYG)
// =============================================


const TipTapEditor = ({ value, onChange, placeholder = "Write your lesson content here..." }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
         heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: 'heading', // Optional: add custom class
          },
        },
        // Configure each feature explicitly
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
        listItem: {
          HTMLAttributes: {
            class: 'ml-4',
          },
        },
        
        // Exclude link to avoid duplication (we add it separately)
        link: false,
      }),
      // Text style must come before color
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'highlight',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-md my-4',
        },
      }),
      Typography,
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2 my-1',
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const MenuButton = ({ onClick, isActive, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded transition-colors ${
        isActive ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
      }`}
      title={title}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <span className="w-px h-6 bg-gray-300 mx-1" />
  );

  // Color picker component
  const ColorPicker = ({ icon: Icon, title, onColorChange, currentColor }) => {
    return (
      <div className="relative group">
        <button
          type="button"
          className="p-2 rounded hover:bg-gray-200 text-gray-700"
          title={title}
        >
          <Icon size={18} />
        </button>
        <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-white shadow-lg rounded-lg p-2 z-20">
          <input
            type="color"
            onChange={(e) => onColorChange(e.target.value)}
            value={currentColor || '#000000'}
            className="w-8 h-8 cursor-pointer"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b p-2 flex flex-wrap items-center gap-1 sticky top-0 z-10">
        {/* Headings */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          isActive={editor.isActive('heading', { level: 4 })}
          title="Heading 4"
        >
          <Heading4 size={18} />
        </MenuButton>

        <Divider />

        {/* Text formatting */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={18} />
        </MenuButton>

        <Divider />

        {/* Alignment */}
        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify size={18} />
        </MenuButton>

        <Divider />

        {/* Lists */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Task List"
        >
          <ListChecks size={18} />
        </MenuButton>

        <Divider />

        {/* Block elements */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isActive={false}
          title="Horizontal Line"
        >
          <Minus size={18} />
        </MenuButton>

        <Divider />

        {/* Links & Colors */}
        <MenuButton
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon size={18} />
        </MenuButton>
        
        {/* Color picker */}
        <ColorPicker
          icon={Palette}
          title="Text Color"
          onColorChange={(color) => editor.chain().focus().setColor(color).run()}
          currentColor={editor.getAttributes('textStyle').color}
        />

        {/* Highlight picker */}
        <ColorPicker
          icon={Highlighter}
          title="Highlight"
          onColorChange={(color) => editor.chain().focus().setHighlight({ color }).run()}
          currentColor={editor.getAttributes('highlight').color}
        />

        <Divider />

        {/* Undo/Redo */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          title="Undo"
        >
          <Undo size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          title="Redo"
        >
          <Redo size={18} />
        </MenuButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Helper text */}
      <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-500 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          <span>Rich text editor - automatically converts to Markdown when saved</span>
        </span>
        {editor && (
          <span className="text-gray-400">
            Words: {editor.storage.characterCount?.words() || 0}
          </span>
        )}
      </div>
    </div>
  );
};

// =============================================
// MAIN COURSE MANAGER COMPONENT
// =============================================
export default function CourseManager() {
  // ========== AUTHENTICATION STATES ==========
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  // ========== COURSE MANAGEMENT STATES ==========
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [r2Loading, setR2Loading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [mobileView, setMobileView] = useState(false);
  const [activeDownloading, setActiveDownloading] = useState(null);
  const [failedUploads, setFailedUploads] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [r2Error, setR2Error] = useState(null);
  const fileInputRef = useRef(null);
  const docxInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const [courseImage, setCourseImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  // Add these with your other useState declarations
const [editorMode, setEditorMode] = useState('markdown'); // 'markdown' or 'wysiwyg'
const [wysiwygContent, setWysiwygContent] = useState('');
// Add modules state
const [modules, setModules] = useState([]);

// Fetch modules when course is selected
useEffect(() => {
  if (selectedCourse) {
    fetchModules(selectedCourse.id);
  }
}, [selectedCourse]);

const fetchModules = async (courseId) => {
  try {
    const modulesRef = collection(db, "courses", courseId, "modules");
    const q = query(modulesRef, orderBy("order"));
    const snapshot = await getDocs(q);
    const modulesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setModules(modulesData);
  } catch (error) {
    console.error("Error fetching modules:", error);
  }
};

  // ========== FORM STATES ==========
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "",
    price: 0,
    isFree: true,
    duration: "",
    level: "beginner"
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    lessonType: "video", // "video" or "reading"
    videoUrl: "",
    markdown: "", // For reading lessons
    duration: "",
    isPublished: true,
    slides: [],
    documents: [],
    templates: [],
    originalFile: null, // Track original uploaded file
    originalFileUrl: null, // URL to original file in R2
    originalFileKey: null // R2 key for deletion
  });


  
  // New resource state
  const [newResource, setNewResource] = useState({
    name: "",
    file: null,
    type: "document",
    category: "document",
    description: "",
    downloadable: true,
    viewable: true
  });

  // ========== INITIALIZATION EFFECTS ==========
  
  // Check R2 configuration
  useEffect(() => {
    if (!import.meta.env.VITE_R2_WORKER_URL) {
      console.warn('R2 service URL not configured. File uploads will not work.');
      setR2Error('R2 service is not configured. Please contact administrator.');
    }
  }, []);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setViewMode("list");
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Test R2 connection
  useEffect(() => {
    const testR2Connection = async () => {
      try {
        const connection = await R2Service.testConnection();
        if (!connection.connected) {
          console.warn('R2 Service not available:', connection.error);
          setR2Error('R2 service is not available. File uploads may fail.');
        }
      } catch (error) {
        console.error('R2 connection test failed:', error);
      }
    };
    
    if (import.meta.env.VITE_R2_WORKER_URL) {
      testR2Connection();
    }
  }, []);

  // Authentication management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthenticated(!!user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            setIsAdmin(true);
            fetchCourses();
          } else {
            setIsAdmin(false);
            console.log("User is not an admin");
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  

  // ========== CONVERSION FUNCTIONS ==========
  
  // Convert DOCX to Markdown using Mammoth
  const convertDocxToMarkdown = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToMarkdown({ arrayBuffer });
      
      return {
        success: true,
        markdown: result.value,
        messages: result.messages
      };
    } catch (error) {
      console.error("DOCX conversion failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Convert PDF to Markdown (basic text extraction)
  const convertPdfToMarkdown = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `## Page ${i}\n\n${pageText}\n\n`;
      }
      
      return {
        success: true,
        markdown: fullText,
        pageCount: pdf.numPages
      };
    } catch (error) {
      console.error("PDF conversion failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Handle file upload and conversion
  const handleFileUploadAndConvert = async (file) => {
    try {
      setR2Loading(true);
      setUploadProgress(10);
      
      const fileType = file.name.split('.').pop().toLowerCase();
      let conversionResult;
      
      if (fileType === 'docx') {
        conversionResult = await convertDocxToMarkdown(file);
      } else if (fileType === 'pdf') {
        conversionResult = await convertPdfToMarkdown(file);
      } else {
        alert('Unsupported file type. Please upload DOCX or PDF files.');
        return;
      }
      
      setUploadProgress(70);
      
      if (conversionResult.success) {
        // Update lesson form with converted markdown
        setLessonForm(prev => ({
          ...prev,
          markdown: conversionResult.markdown,
          lessonType: 'reading',
          originalFile: {
            name: file.name,
            type: fileType,
            converted: true,
            size: file.size
          }
        }));
        
        setUploadProgress(90);
        
        // Also upload the original file to R2 for download
        try {
          const uploadResult = await R2Service.uploadFile(file, {
            folder: 'lesson-originals',
            lessonId: selectedCourse?.id || 'new',
            category: 'original-documents'
          });
          
          if (uploadResult.success) {
            setLessonForm(prev => ({
              ...prev,
              originalFileUrl: uploadResult.data.url,
              originalFileKey: uploadResult.data.key
            }));
          }
        } catch (uploadError) {
          console.error("Failed to upload original file to R2:", uploadError);
          // Don't fail the whole process if R2 upload fails
        }
        
        setUploadProgress(100);
        alert(`✅ ${fileType.toUpperCase()} converted to Markdown successfully!`);
      } else {
        alert(`Conversion failed: ${conversionResult.error}`);
      }
      
    } catch (error) {
      console.error("File conversion error:", error);
      alert(`Error converting file: ${error.message}`);
    } finally {
      setR2Loading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // ========== DATA FETCHING FUNCTIONS ==========
  
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesRef = collection(db, "courses");
      const q = query(coursesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
      alert("Failed to load courses. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // ========== AUTHENTICATION FUNCTIONS ==========
  
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setShowLoginModal(false);
      setLoginForm({ email: "", password: "" });
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ========== FILE UPLOAD FUNCTIONS ==========
  
  const handleFileUpload = async (file, metadata = {}) => {
    try {
      const uploadOptions = {
        folder: 'course-resources',
        courseId: selectedCourse?.id || 'general',
        metadata: {
          type: getFileType(file.name),
          originalName: file.name,
          uploadedBy: user?.email || 'admin',
          ...metadata
        }
      };

      const uploadResult = await R2Service.uploadFile(file, uploadOptions);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      const r2Data = uploadResult.data;
      
      return {
        url: r2Data.url,
        key: r2Data.key,
        name: r2Data.originalName || r2Data.filename || file.name,
        fileName: r2Data.filename,
        size: r2Data.size,
        type: r2Data.contentType?.split('/')[0] || getFileType(file.name),
        uploadedAt: r2Data.metadata?.uploadedAt || new Date().toISOString(),
        ...r2Data.metadata
      };
    } catch (error) {
      console.error("Error uploading to R2:", error);
      
      const failedUpload = {
        file,
        metadata,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      setFailedUploads(prev => [...prev, failedUpload]);
      throw error;
    }
  };

  const handleAddResource = async () => {
    if (!newResource.name || !newResource.file) {
      alert("Please provide a resource name and select a file");
      return;
    }

    try {
      setR2Loading(true);
      setUploadProgress(0);
      
      const uploadedFile = await R2Service.uploadFile(newResource.file, {
        category: newResource.category,
        description: newResource.description,
        downloadable: newResource.downloadable,
        viewable: newResource.viewable
      }, (progress) => {
        setUploadProgress(progress);
      });
      
      setUploadProgress(100);
      
      const resource = {
        ...uploadedFile.data,
        category: newResource.category,
        description: newResource.description,
        downloadable: newResource.downloadable,
        viewable: newResource.viewable,
        addedAt: new Date().toISOString()
      };

      const categoryKey = newResource.category === 'slides' ? 'slides' :
                         newResource.category === 'template' ? 'templates' : 'documents';
      
      setLessonForm(prev => ({
        ...prev,
        [categoryKey]: [...prev[categoryKey], resource]
      }));

      setNewResource({
        name: "",
        file: null,
        type: "document",
        category: "document",
        description: "",
        downloadable: true,
        viewable: true
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
      
      alert("✅ Resource uploaded successfully to Cloudflare R2!");

    } catch (error) {
      console.error("Error adding resource:", error);
      setUploadProgress(0);
      setR2Error(`Failed to add resource: ${error.message}`);
      alert(`Failed to add resource: ${error.message}`);
    } finally {
      setR2Loading(false);
    }
  };

  const removeResource = async (category, index) => {
    const resource = lessonForm[category][index];
    
    if (!resource) return;
    
    const shouldDeleteFromR2 = resource.key && 
      window.confirm("Delete this file from Cloudflare R2 storage as well?");
    
    if (shouldDeleteFromR2) {
      try {
        setR2Loading(true);
        await R2Service.deleteFile(resource.key);
        console.log("✅ File deleted from R2");
      } catch (error) {
        console.error("Error deleting from R2:", error);
        alert("File removed from list but could not delete from R2 storage");
      } finally {
        setR2Loading(false);
      }
    }
    
    setLessonForm(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const downloadResource = async (resource) => {
    if (!resource) return;
    
    try {
      setActiveDownloading(resource.key);
      
      let url;
      if (resource.key) {
        url = await R2Service.getUrl(resource.key);
      } else if (resource.downloadUrl) {
        url = resource.downloadUrl;
      } else if (resource.url) {
        url = resource.url;
      } else {
        throw new Error('No valid URL found for resource');
      }
      
      const link = document.createElement('a');
      link.href = url;
      link.download = resource.name || resource.originalName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        setActiveDownloading(null);
      }, 1000);
      
    } catch (error) {
      console.error("Error downloading resource:", error);
      alert("Failed to download file. Please try again.");
      setActiveDownloading(null);
    }
  };

  const previewResource = async (resource) => {
    if (!resource) return;
    
    try {
      setActiveDownloading(resource.key || resource.id);
      
      let previewUrl;
      
      if (resource.url && !resource.url.includes('r2.dev')) {
        previewUrl = resource.url;
      } else if (resource.key) {
        const signedUrl = await R2Service.getUrl(resource.key);
        previewUrl = typeof signedUrl === 'string' ? signedUrl : signedUrl?.url;
      } else if (resource.publicUrl) {
        previewUrl = resource.publicUrl;
      } else {
        throw new Error('No previewable URL found');
      }
      
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      
      setTimeout(() => {
        setActiveDownloading(null);
      }, 1000);
      
    } catch (error) {
      console.error("Error previewing resource:", error);
      
      if (resource.key) {
        const fallbackUrl = `${import.meta.env.VITE_R2_WORKER_URL || ''}/cdn/${resource.key}`;
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert(`Failed to preview file: ${error.message}`);
      }
      
      setActiveDownloading(null);
    }
  };

  // ========== COURSE MANAGEMENT FUNCTIONS ==========
  
  const handleImageUpload = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      if (isEdit) {
        setEditImage(file);
      } else {
        setCourseImage(file);
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditImagePreview(reader.result);
        } else {
          setImagePreview(reader.result);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error processing image. Please try another image.");
      setUploading(false);
    }
  };

  const uploadCourseImage = async (courseId, imageFile) => {
    if (!imageFile) return null;

    try {
      const timestamp = Date.now();
      const storagePath = `courses/${courseId}/thumbnail_${timestamp}.jpg`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated || !isAdmin) {
      alert("You must be logged in as an admin to create courses");
      setShowLoginModal(true);
      return;
    }

    if (loading || uploading) return;

    if (!courseImage) {
      alert("Please upload a course thumbnail");
      return;
    }

    try {
      setLoading(true);

      const courseData = {
        ...courseForm,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        published: false,
        enrolledCount: 0,
        lessonCount: 0,
        rating: 0,
        status: "draft",
        createdBy: user.uid,
        createdByEmail: user.email
      };

      const courseRef = await addDoc(collection(db, "courses"), courseData);
      const courseId = courseRef.id;

      let thumbnailUrl = null;
      try {
        thumbnailUrl = await uploadCourseImage(courseId, courseImage);
      } catch (uploadError) {
        console.error("Error uploading thumbnail:", uploadError);
        await deleteDoc(doc(db, "courses", courseId));
        alert("Failed to upload thumbnail. Please try again.");
        setLoading(false);
        return;
      }

      const courseDocRef = doc(db, "courses", courseId);
      await updateDoc(courseDocRef, {
        thumbnailUrl,
        updatedAt: serverTimestamp()
      });

      alert("✅ Course created successfully!");
      setShowCreateModal(false);
      resetCourseForm();
      fetchCourses();
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Error creating course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    
    if (!selectedCourse || !lessonForm.title.trim()) {
      alert("Please fill in lesson title");
      return;
    }

    // Validate based on lesson type
    if (lessonForm.lessonType === "video" && lessonForm.videoUrl) {
      const validation = validateVideoUrl(lessonForm.videoUrl);
      if (!validation.valid) {
        alert("Please enter a valid YouTube, Vimeo, or direct video URL");
        return;
      }
    }

    try {
      setLoading(true);
      
      const lessonId = uuidv4();
      const courseId = selectedCourse.id;
      
      let videoType = null;
      if (lessonForm.lessonType === "video" && lessonForm.videoUrl) {
        const validation = validateVideoUrl(lessonForm.videoUrl);
        videoType = validation.type || "other";
      }
      
      const newLesson = {
        id: lessonId,
        title: lessonForm.title,
        description: lessonForm.description || "",
        lessonType: lessonForm.lessonType,
        duration: lessonForm.duration || (lessonForm.lessonType === "reading" ? "15 min read" : "0 min"),
        isPublished: lessonForm.isPublished !== false,
        order: selectedCourse.lessonCount || 0,
        createdAt: new Date().toISOString(),
        resources: [
          ...(lessonForm.slides || []),
          ...(lessonForm.documents || []),
          ...(lessonForm.templates || [])
        ].map(r => ({
          ...r,
          storageType: 'r2'
        }))
      };

      if (lessonForm.lessonType === "video") {
        newLesson.videoUrl = lessonForm.videoUrl || "";
        newLesson.videoType = videoType;
      } else {
        newLesson.markdown = lessonForm.markdown || "";
        newLesson.content = lessonForm.markdown?.replace(/[#*`~\[\]]/g, '') || "";
        if (lessonForm.originalFileUrl) {
          newLesson.originalFile = {
            name: lessonForm.originalFile?.name,
            url: lessonForm.originalFileUrl,
            key: lessonForm.originalFileKey
          };
        }
      }
      
      const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
      await setDoc(lessonRef, newLesson);
      
      const courseRef = doc(db, "courses", courseId);
      await updateDoc(courseRef, {
        lessonCount: (selectedCourse.lessonCount || 0) + 1,
        updatedAt: serverTimestamp()
      });

      await updateAllEnrollmentsForCourse(courseId);

      alert("✅ Lesson added successfully!");
      setShowAddLessonModal(false);
      resetLessonForm();
      fetchCourses();
      
    } catch (error) {
      console.error("❌ Error adding lesson:", error);
      alert("Error adding lesson: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAllEnrollmentsForCourse = async (courseId) => {
    try {
      const lessonsRef = collection(db, "courses", courseId, "lessons");
      const lessonsSnapshot = await getDocs(lessonsRef);
      const currentTotalLessons = lessonsSnapshot.size;
      
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentsQuery = query(enrollmentsRef, where("courseId", "==", courseId));
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      if (enrollmentsSnapshot.empty) {
        console.log("No enrollments to update for course:", courseId);
        return;
      }
      
      console.log(`Updating ${enrollmentsSnapshot.size} enrollments for course ${courseId}`);
      
      const batch = writeBatch(db);
      
      enrollmentsSnapshot.docs.forEach(enrollmentDoc => {
        const enrollmentData = enrollmentDoc.data();
        const completedCount = enrollmentData.completedLessons?.length || 0;
        const newProgress = Math.min(
          Math.round((completedCount / currentTotalLessons) * 100),
          100
        );
        
        batch.update(enrollmentDoc.ref, {
          totalLessons: currentTotalLessons,
          progress: newProgress,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log("✅ All enrollments updated with new total lessons:", currentTotalLessons);
      
    } catch (error) {
      console.error("Error updating enrollments:", error);
    }
  };

  const togglePublishCourse = async (course) => {
    if (!isAuthenticated || !isAdmin) {
      alert("You must be logged in as an admin to publish courses");
      setShowLoginModal(true);
      return;
    }

    if (loading) return;

    if (!course.thumbnailUrl && !course.published) {
      alert("Please add a thumbnail before publishing the course.");
      return;
    }

    try {
      setLoading(true);
      
      const courseRef = doc(db, "courses", course.id);
      await updateDoc(courseRef, {
        published: !course.published,
        status: !course.published ? "published" : "draft",
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedByEmail: user.email
      });
      
      alert(`Course ${!course.published ? 'published' : 'unpublished'} successfully!`);
      fetchCourses();
    } catch (error) {
      console.error("Error toggling publish status:", error);
      alert("Failed to update course status.");
    } finally {
      setLoading(false);
    }
  };

  const updateCourseThumbnail = async () => {
    if (!isAuthenticated || !isAdmin) {
      alert("You must be logged in as an admin to update thumbnails");
      setShowLoginModal(true);
      return;
    }

    if (!editingCourse || !editImage || loading) return;

    try {
      setLoading(true);
      
      const newThumbnailUrl = await uploadCourseImage(editingCourse.id, editImage);
      
      const courseRef = doc(db, "courses", editingCourse.id);
      await updateDoc(courseRef, {
        thumbnailUrl: newThumbnailUrl,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedByEmail: user.email
      });
      
      alert("✅ Thumbnail updated successfully!");
      
      setEditImage(null);
      setEditImagePreview(null);
      fetchCourses();
    } catch (error) {
      console.error("Error updating thumbnail:", error);
      alert("Failed to update thumbnail. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!isAuthenticated || !isAdmin) {
      alert("You must be logged in as an admin to delete courses");
      setShowLoginModal(true);
      return;
    }

    if (loading) return;

    if (!confirm("Are you sure you want to delete this course? This action cannot be undone and will delete all associated resources from Cloudflare R2.")) {
      return;
    }

    try {
      setLoading(true);
      
      try {
        const files = await R2Service.listFiles({ 
          prefix: `course-resources/${courseId}/` 
        });
        
        if (files && files.length > 0) {
          const shouldDelete = window.confirm(
            `This course has ${files.length} files in Cloudflare R2. Delete them as well?`
          );
          
          if (shouldDelete) {
            const keys = files.map(f => f.key).filter(Boolean);
            if (keys.length > 0) {
              const deleteResult = await R2Service.batchDeleteFiles(keys);
              console.log(`Deleted ${deleteResult.successful}/${deleteResult.total} files from R2`);
            }
          }
        }
      } catch (r2Error) {
        console.error("Error cleaning up R2 resources:", r2Error);
      }
      
      await deleteDoc(doc(db, "courses", courseId));
      
      alert("✅ Course deleted successfully!");
      setConfirmDelete(null);
      fetchCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course.");
    } finally {
      setLoading(false);
    }
  };

  // ========== UTILITY FUNCTIONS ==========
  
  const resetCourseForm = () => {
    setCourseForm({
      title: "",
      description: "",
      category: "",
      price: 0,
      isFree: true,
      duration: "",
      level: "beginner"
    });
    setCourseImage(null);
    setImagePreview(null);
  };

  const resetLessonForm = () => {
    setLessonForm({
      title: "",
      description: "",
      lessonType: "video",
      videoUrl: "",
      markdown: "",
      duration: "",
      isPublished: true,
      slides: [],
      documents: [],
      templates: [],
      originalFile: null,
      originalFileUrl: null,
      originalFileKey: null
    });
    setNewResource({
      name: "",
      file: null,
      type: "document",
      category: "document",
      description: "",
      downloadable: true,
      viewable: true
    });
    setUploadProgress(0);
    setR2Error(null);
  };

  const resetEditForm = () => {
    setEditingCourse(null);
    setEditImage(null);
    setEditImagePreview(null);
  };

  const getCategoryColor = (category) => {
    const colors = {
      business: "bg-blue-100 text-blue-800",
      technology: "bg-purple-100 text-purple-800",
      marketing: "bg-green-100 text-green-800",
      finance: "bg-yellow-100 text-yellow-800",
      entrepreneurship: "bg-pink-100 text-pink-800",
      leadership: "bg-indigo-100 text-indigo-800",
      fitness: "bg-red-100 text-red-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getTotalResources = () => {
    return lessonForm.slides.length + lessonForm.documents.length + lessonForm.templates.length;
  };

  const clearR2Error = () => {
    setR2Error(null);
  };

  const clearFailedUploads = () => {
    setFailedUploads([]);
  };

  // ========== RENDER FUNCTIONS ==========
  
  const renderResourceList = (resources, category) => {
    if (resources.length === 0) {
      return (
        <div className="text-center py-4">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No {category} yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {resources.map((resource, index) => {
          const fileType = resource.type || getFileType(resource.name || resource.originalName || '');
          
          return (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded ${FILE_TYPES[fileType]?.bgColor || 'bg-gray-100'}`}>
                  <FileIcon type={fileType} className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {resource.name || resource.originalName || 'Unnamed Resource'}
                    </p>
                    {resource.key && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                        <Cloud size={10} />
                        <span className="hidden sm:inline">R2</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className="capitalize">{resource.category || category}</span>
                    <span>•</span>
                    <span>{resource.size || 'Unknown size'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {resource.viewable !== false && (
                  <button
                    type="button"
                    onClick={() => previewResource(resource)}
                    disabled={activeDownloading === (resource.key || resource.id)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1 disabled:opacity-50"
                  >
                    {activeDownloading === (resource.key || resource.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ExternalLink size={12} />
                    )}
                    <span className="hidden sm:inline">Preview</span>
                  </button>
                )}
                
                {resource.downloadable !== false && (
                  <button
                    type="button"
                    onClick={() => downloadResource(resource)}
                    disabled={activeDownloading === resource.key}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 disabled:opacity-50"
                  >
                    {activeDownloading === resource.key ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    <span className="hidden sm:inline">Download</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeResource(category, index)}
                  className="ml-2 p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ========== AUTHENTICATION UI ==========
  
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto mt-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {!isAuthenticated ? "Admin Login Required" : "Admin Access Required"}
                </h2>
                <p className="text-gray-600">
                  {!isAuthenticated 
                    ? "Please login with admin credentials to access the course management panel."
                    : "Your account doesn't have admin permissions. Please login with an admin account."
                  }
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="admin@example.com"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Logging in...
                    </>
                  ) : (
                    "Login as Admin"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN ADMIN INTERFACE ==========
  return (
    <div className="space-y-6">
      {/* Error Display */}
      {r2Error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-red-700 font-medium">R2 Storage Error</p>
              <p className="text-red-600 text-sm">{r2Error}</p>
            </div>
          </div>
          <button 
            onClick={clearR2Error}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Failed Uploads Display */}
      {failedUploads.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800 font-medium">
                {failedUploads.length} failed upload(s)
              </p>
            </div>
            <button 
              onClick={clearFailedUploads}
              className="text-xs text-yellow-700 hover:text-yellow-900 flex items-center gap-1"
            >
              <X size={12} />
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {failedUploads.slice(0, 3).map((upload, index) => (
              <div key={index} className="text-sm text-yellow-700 flex items-center justify-between">
                <span className="truncate">{upload.file.name}</span>
                <button
                  onClick={() => retryFailedUpload(upload)}
                  className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 flex items-center gap-1"
                >
                  <RefreshCw size={10} />
                  Retry
                </button>
              </div>
            ))}
            {failedUploads.length > 3 && (
              <p className="text-xs text-yellow-600">
                + {failedUploads.length - 3} more failed uploads
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">Course Management</h3>
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1">
              <Shield size={10} />
              Admin Mode
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-3 w-3 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600 truncate max-w-[200px]">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!mobileView && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-colors ${viewMode === "list" ? "bg-white shadow" : "hover:bg-gray-200"}`}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition-colors ${viewMode === "grid" ? "bg-white shadow" : "hover:bg-gray-200"}`}
              >
                <Grid size={16} />
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            disabled={loading || r2Loading}
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Create Course</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Cloudflare R2 Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Cloudflare R2 Storage</h4>
              <p className="text-sm text-gray-600">
                {import.meta.env.VITE_R2_WORKER_URL 
                  ? "Course resources are stored securely in Cloudflare R2" 
                  : "R2 service not configured. File uploads will not work."}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            import.meta.env.VITE_R2_WORKER_URL 
              ? "bg-blue-100 text-blue-800" 
              : "bg-yellow-100 text-yellow-800"
          }`}>
            {import.meta.env.VITE_R2_WORKER_URL ? "Active" : "Not Configured"}
          </span>
        </div>
      </div>

      {/* Course Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 shadow border">
          <div className="text-xl font-bold text-gray-900">{courses.length}</div>
          <div className="text-xs text-gray-600">Total Courses</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow border">
          <div className="text-xl font-bold text-green-600">
            {courses.filter(c => c.published).length}
          </div>
          <div className="text-xs text-gray-600">Published</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow border">
          <div className="text-xl font-bold text-yellow-600">
            {courses.filter(c => !c.published).length}
          </div>
          <div className="text-xs text-gray-600">Draft</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow border">
          <div className="text-xl font-bold text-blue-600">
            {courses.reduce((sum, course) => sum + (course.enrolledCount || 0), 0)}
          </div>
          <div className="text-xs text-gray-600">Total Enrollments</div>
        </div>
      </div>

       {/* Courses display */}
      {viewMode === "grid" && !mobileView ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && !courses.length ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
              <p className="text-sm text-gray-600">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No courses yet</h3>
              <p className="text-gray-600 mb-4">Create your first course to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                disabled={r2Loading}
              >
                <Plus size={16} />
                Create Course
              </button>
            </div>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow border overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${course.published ? "bg-green-600" : "bg-yellow-600"} text-white`}>
                      {course.published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 line-clamp-2">{course.title}</h4>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(course.category)}`}>
                      {course.category || "Uncategorized"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {course.lessonCount || 0} lessons
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <span>{course.enrolledCount || 0} students</span>
                    <span>{course.duration || "Self-paced"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePublishCourse(course)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title={course.published ? "Unpublish" : "Publish"}
                        disabled={r2Loading}
                      >
                        {course.published ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowAddLessonModal(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Add Lesson"
                        disabled={r2Loading}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCourse(course);
                          setShowEditModal(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                        disabled={r2Loading}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                        title="Delete"
                        disabled={r2Loading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // List View (default, especially on mobile)
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lessons
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && !courses.length ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                        <p className="text-sm text-gray-600">Loading courses...</p>
                      </div>
                    </td>
                  </tr>
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <BookOpen className="h-12 w-12 text-gray-400 mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No courses yet</h3>
                        <p className="text-gray-600 mb-4">Create your first course to get started</p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                          disabled={r2Loading}
                        >
                          <Plus size={16} />
                          Create Course
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden">
                            {course.thumbnailUrl ? (
                              <img
                                src={course.thumbnailUrl}
                                alt={course.title}
                                className="h-10 w-10 object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {course.title}
                              {!course.thumbnailUrl && (
                                <span className="ml-1 text-xs text-red-600">(No thumbnail)</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-xs">
                              {course.description?.substring(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(course.category)}`}>
                          {course.category || "Uncategorized"}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-4 text-sm text-gray-900">
                        {course.lessonCount || 0}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-4 text-sm text-gray-900">
                        {course.enrolledCount || 0}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          course.published
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {course.published ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePublishCourse(course)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title={course.published ? "Unpublish" : "Publish"}
                            disabled={r2Loading}
                          >
                            {course.published ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCourse(course);
                              setShowAddLessonModal(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Add Lesson"
                            disabled={r2Loading}
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCourse(course);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                            disabled={r2Loading}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteCourse(course.id)}
                            className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                            title="Delete"
                            disabled={r2Loading}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ========== ADD LESSON MODAL ========== */}
      {showAddLessonModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Add New Lesson</h3>
                  <p className="text-sm text-gray-600">For: {selectedCourse.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddLessonModal(false);
                    resetLessonForm();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={loading || r2Loading}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddLesson} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lesson Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({...lessonForm, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Introduction to Marketing"
                      disabled={loading || r2Loading}
                    />
                  </div>
                  
                  {/* Duration Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration
                    </label>
                    <DurationPicker
                      value={lessonForm.duration}
                      onChange={(newDuration) => setLessonForm({...lessonForm, duration: newDuration})}
                      lessonType={lessonForm.lessonType}
                    />
                  </div>
                </div>

                {/* Lesson Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLessonForm({...lessonForm, lessonType: "video"})}
                      className={`p-4 border rounded-lg text-center transition-colors ${
                        lessonForm.lessonType === "video"
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Video className={`h-6 w-6 mx-auto mb-2 ${
                        lessonForm.lessonType === "video" ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        lessonForm.lessonType === "video" ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        Video Lesson
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Upload video or embed YouTube/Vimeo
                      </p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setLessonForm({...lessonForm, lessonType: "reading"})}
                      className={`p-4 border rounded-lg text-center transition-colors ${
                        lessonForm.lessonType === "reading"
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <BookOpen className={`h-6 w-6 mx-auto mb-2 ${
                        lessonForm.lessonType === "reading" ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        lessonForm.lessonType === "reading" ? 'text-green-700' : 'text-gray-700'
                      }`}>
                        Reading Lesson
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Write or import from Word/PDF
                      </p>
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm({...lessonForm, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What will students learn in this lesson?"
                    disabled={loading || r2Loading}
                  />
                </div>

                {/* Conditional Content Based on Lesson Type */}
{lessonForm.lessonType === "video" ? (
  /* Video Content Section */
  <div className="border-t pt-6">
    <div className="flex items-center gap-2 mb-4">
      <Video className="h-5 w-5 text-red-600" />
      <h4 className="font-medium text-gray-900">Video Content</h4>
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Video URL
      </label>
      <input
        type="url"
        value={lessonForm.videoUrl}
        onChange={(e) => setLessonForm({...lessonForm, videoUrl: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="https://www.youtube.com/watch?v=..."
        disabled={loading || r2Loading}
      />
      <p className="text-xs text-gray-500 mt-1">
        Supports YouTube, Vimeo, or direct MP4/WebM links
      </p>
    </div>
  </div>
) : (
  /* Reading Content Section */
  <div className="border-t pt-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-green-600" />
        <h4 className="font-medium text-gray-900">Reading Content</h4>
      </div>
      
      {/* Editor Mode Toggle */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => {
            if (editorMode === 'wysiwyg' && wysiwygContent) {
              setLessonForm({
                ...lessonForm,
                markdown: htmlToMarkdown(wysiwygContent)
              });
            }
            setEditorMode('wysiwyg');
          }}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            editorMode === 'wysiwyg' 
              ? 'bg-white text-blue-600 shadow' 
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          Visual Editor
        </button>
        <button
          type="button"
          onClick={() => {
            if (editorMode === 'wysiwyg' && lessonForm.markdown) {
              setWysiwygContent(markdownToHtml(lessonForm.markdown));
            }
            setEditorMode('markdown');
          }}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            editorMode === 'markdown' 
              ? 'bg-white text-blue-600 shadow' 
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          Markdown
        </button>
      </div>
    </div>

    {/* File Import Section */}
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <FileUp className="h-5 w-5 text-blue-600" />
        <h5 className="font-medium text-blue-800">Import from Document</h5>
      </div>
      
      <p className="text-sm text-blue-700 mb-4">
        Upload a Word document (.docx) or PDF file to automatically convert to Markdown
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DOCX Upload */}
        <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          r2Loading ? 'bg-blue-50 border-blue-300' : 'border-blue-300 hover:border-blue-500'
        }`}>
          <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 mb-1">Word Document</p>
          <p className="text-xs text-gray-500 mb-2">.docx</p>
          
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".docx"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileUploadAndConvert(file);
                }
              }}
              className="hidden"
              disabled={r2Loading}
            />
            <span className="inline-block px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer">
              Choose File
            </span>
          </label>
        </div>
        
        {/* PDF Upload */}
        <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          r2Loading ? 'bg-red-50 border-red-300' : 'border-red-300 hover:border-red-500'
        }`}>
          <File className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 mb-1">PDF Document</p>
          <p className="text-xs text-gray-500 mb-2">.pdf</p>
          
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileUploadAndConvert(file);
                }
              }}
              className="hidden"
              disabled={r2Loading}
            />
            <span className="inline-block px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 cursor-pointer">
              Choose File
            </span>
          </label>
        </div>
      </div>
      
      {/* Progress Bar */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Converting...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Original file indicator */}
      {lessonForm.originalFile && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              Original file: {lessonForm.originalFile.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLessonForm(prev => ({
              ...prev,
              originalFile: null,
              originalFileUrl: null,
              originalFileKey: null
            }))}
            className="text-xs text-red-600 hover:text-red-800"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>

    {/* Conditional Editor Based on Mode */}
    {editorMode === 'markdown' ? (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lesson Content (Markdown)
        </label>
        <MarkdownEditor 
          value={lessonForm.markdown || ''}
          onChange={(value) => setLessonForm({...lessonForm, markdown: value})}
        />
      </div>
    ) : (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lesson Content (Rich Text Editor)
        </label>
        <TipTapEditor 
          value={wysiwygContent || markdownToHtml(lessonForm.markdown || '')}
          onChange={(html) => {
            setWysiwygContent(html);
            // Convert HTML to markdown for storage
            setLessonForm({
              ...lessonForm,
              markdown: htmlToMarkdown(html)
            });
          }}
          placeholder="Write your lesson content here... Use the toolbar above to format."
        />
      </div>
    )}

    {/* Word Count */}
    {lessonForm.markdown && (
      <div className="text-xs text-gray-500 flex justify-end mt-2">
        <span>Words: {lessonForm.markdown.split(/\s+/).filter(w => w.length > 0).length}</span>
        <span className="mx-2">•</span>
        <span>Characters: {lessonForm.markdown.length}</span>
      </div>
    )}
  </div>
)}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddLessonModal(false);
                      resetLessonForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={loading || r2Loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading || 
                      r2Loading || 
                      !lessonForm.title ||
                      (lessonForm.lessonType === "video" && !lessonForm.videoUrl)
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading || r2Loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {r2Loading ? 'Uploading...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Add Lesson
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Create New Course</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCourseForm();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={loading || uploading}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-6">
                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Course Thumbnail *
                    <span className="text-xs text-gray-500 ml-1">(Recommended: 1280x720px, Max 5MB)</span>
                  </label>
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Preview */}
                    <div className="w-full md:w-1/3">
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Thumbnail preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">Preview</p>
                          </div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                        {uploading ? (
                          <div className="py-6">
                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
                            <p className="text-sm text-gray-600">Processing image...</p>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              {imagePreview ? 'Change thumbnail' : 'Upload thumbnail'}
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                              Drag & drop or click to browse
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, false)}
                              className="hidden"
                              disabled={uploading}
                            />
                            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2">
                              <Upload size={16} />
                              Browse Files
                            </div>
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Supports JPG, PNG, GIF • Max 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Course Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Digital Marketing Masterclass"
                      disabled={loading || uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={courseForm.category}
                      onChange={(e) => setCourseForm({...courseForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading || uploading}
                    >
                      <option value="">Select a category</option>
                      <option value="business">Business</option>
                      <option value="technology">Technology</option>
                      <option value="marketing">Marketing</option>
                      <option value="finance">Finance</option>
                      <option value="entrepreneurship">Entrepreneurship</option>
                      <option value="leadership">Leadership</option>
                      <option value="fitness">Fitness</option>
                    </select>
                  </div>

                  <div>
                    {/* <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price ($)
                    </label> */}
                    <div className="relative">
                      {/* <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div> */}
                      {/* <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={courseForm.price}
                        onChange={(e) => setCourseForm({...courseForm, price: parseFloat(e.target.value) || 0})}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        disabled={loading || uploading}
                      /> */}
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isFree"
                            checked={courseForm.isFree}
                            onChange={(e) => setCourseForm({...courseForm, isFree: e.target.checked})}
                            className="rounded"
                            disabled={loading || uploading}
                          />
                          <label htmlFor="isFree" className="text-xs text-gray-600">
                            Free Course
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Duration
                    </label>
                    <input
                      type="text"
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({...courseForm, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 8 weeks, 30 hours"
                      disabled={loading || uploading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe what students will learn in this course..."
                    disabled={loading || uploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skill Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['beginner', 'intermediate', 'advanced'].map((level) => (
                      <button
                        type="button"
                        key={level}
                        onClick={() => setCourseForm({...courseForm, level})}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          courseForm.level === level 
                            ? 'bg-blue-100 border-blue-500 text-blue-700' 
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                        disabled={loading || uploading}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cloudflare R2 Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Cloud className="h-4 w-4 text-blue-600" />
                    <h4 className="text-sm font-medium text-blue-800">Cloudflare R2 Storage</h4>
                  </div>
                  <p className="text-xs text-blue-700">
                    Course resources (documents, slides, templates) will be stored in Cloudflare R2 for optimal performance and cost savings.
                  </p>
                  {!import.meta.env.VITE_R2_WORKER_URL && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ R2 service is not configured. File uploads will not work.
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCourseForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={loading || uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!courseForm.title || !courseForm.category || !courseImage || loading || uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        Create Course
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Course</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetEditForm();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={loading || uploading}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Thumbnail Update Section */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Course Thumbnail</h4>
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Current Thumbnail */}
                  <div className="w-full md:w-1/3">
                    <div className="aspect-video rounded-lg overflow-hidden border border-gray-300">
                      <img
                        src={editImagePreview || editingCourse.thumbnailUrl || ''}
                        alt="Current thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      {editImagePreview ? 'New thumbnail' : 'Current thumbnail'}
                    </p>
                  </div>

                  {/* Update Controls */}
                  <div className="flex-1 space-y-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      {uploading ? (
                        <div className="py-4">
                          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Processing...</p>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Upload new thumbnail
                          </p>
                          <p className="text-xs text-gray-500 mb-3">
                            JPG, PNG, GIF • Max 5MB
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, true)}
                            className="hidden"
                            disabled={uploading}
                          />
                          <div className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-1">
                            <Upload size={14} />
                            Select File
                          </div>
                        </label>
                      )}
                    </div>

                    {editImage && !uploading && (
                      <button
                        type="button"
                        onClick={updateCourseThumbnail}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <Upload size={16} />
                        Update Thumbnail
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => togglePublishCourse(editingCourse)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    disabled={loading || r2Loading}
                  >
                    {editingCourse.published ? (
                      <>
                        <EyeOff size={16} />
                        Unpublish Course
                      </>
                    ) : (
                      <>
                        <Eye size={16} />
                        Publish Course
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(editingCourse);
                      setShowEditModal(false);
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    disabled={loading || r2Loading}
                  >
                    <Trash2 size={16} />
                    Delete Course
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetEditForm();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={loading || r2Loading}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Course</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <span className="font-semibold">{confirmDelete.title}</span>? 
                This action cannot be undone.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Cloud className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-800">
                    All associated resources stored in Cloudflare R2 will also be deleted.
                  </p>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading || r2Loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteCourse(confirmDelete.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
                  disabled={loading || r2Loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Course
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
}
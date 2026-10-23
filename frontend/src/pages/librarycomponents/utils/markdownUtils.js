// src/components/admin/utils/markdownUtils.js
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: (content) => `~~${content}~~`
});

const COMMON_ABBREVIATIONS = [
  'St', 'Mt', 'Mrs', 'Ms', 'Dr', 'Prof', 'Rev', 'Fr', 'Sr',
  'Mr', 'Capt', 'Col', 'Gen', 'Lt', 'Sgt', 'Ave', 'Blvd',
  'Rd', 'St', 'Ln', 'Dr', 'Ct', 'Pl', 'Ter', 'Cir',
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const abbrPattern = new RegExp('\\b(' + COMMON_ABBREVIATIONS.join('|') + ')\\\\.', 'gi');

export const htmlToMarkdown = (html) => {
  if (!html) return '';
  let markdown = turndownService.turndown(html);
  markdown = markdown.replace(/^(\d+)\\. /gm, '$1. ');
  markdown = markdown.replace(abbrPattern, '$1.');
  markdown = markdown.replace(/([A-Za-z])\\. /g, '$1. ');
  return markdown;
};

export const markdownToHtml = (markdown) => {
  if (!markdown) return '';
  return markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/__(.*?)__/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/_(.*?)_/gim, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" />')
    .replace(/^\s*-\s+(.*)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gim, '<ul>$&</ul>')
    .split('\n\n').map(p => {
      if (!p.trim()) return '';
      if (p.startsWith('<')) return p;
      return `<p>${p}</p>`;
    }).join('')
    .replace(/\n/g, '<br />');
};

export const validateVideoUrl = (url) => {
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
  
  if (url.startsWith('http')) return { valid: true, type: 'other' };
  
  return { valid: false, type: 'unknown' };
};
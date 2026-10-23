// src/components/admin/components/ResourceCard.jsx
import { memo } from "react";
import { Eye, Download, Trash2, Loader2, Cloud } from "lucide-react";
import { FILE_ICONS, getFileType, formatFileSize } from "./utils/fileUtils";

export const ResourceCard = memo(({ resource, lessonTitle, onDownload, onPreview, onDelete, downloading }) => {
  const fileType = resource.type || getFileType(resource.name || resource.originalName || '');
  const isPreviewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'txt'].includes(fileType);
  const IconComponent = FILE_ICONS[fileType]?.icon || FILE_ICONS.default.icon;
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`p-2 rounded-lg flex-shrink-0 ${FILE_ICONS[fileType]?.bgColor || 'bg-gray-100'}`}>
          <IconComponent className={`h-5 w-5 ${FILE_ICONS[fileType]?.color || 'text-gray-600'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-gray-900 truncate">
            {resource.name || resource.originalName || 'Unnamed Resource'}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
            {lessonTitle && <span className="truncate max-w-[150px]">{lessonTitle} •</span>}
            <span className="capitalize">{fileType}</span>
            {resource.size && <span>• {formatFileSize(resource.size)}</span>}
            {resource.key && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                <Cloud size={10} />
                <span>R2</span>
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 ml-0 sm:ml-2 justify-end">
        {isPreviewable && (
          <button
            onClick={() => onPreview(resource)}
            disabled={downloading === (resource.key || resource.id)}
            className="p-2 text-green-700 hover:bg-green-100 rounded-lg disabled:opacity-50"
            title="Preview"
          >
            {downloading === (resource.key || resource.id) ? 
              <Loader2 className="h-4 w-4 animate-spin" /> : <Eye size={16} />}
          </button>
        )}
        <button
          onClick={() => onDownload(resource)}
          disabled={downloading === (resource.key || resource.id)}
          className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg disabled:opacity-50"
          title="Download"
        >
          {downloading === (resource.key || resource.id) ? 
            <Loader2 className="h-4 w-4 animate-spin" /> : <Download size={16} />}
        </button>
        <button
          onClick={() => onDelete(resource)}
          className="p-2 text-red-700 hover:bg-red-100 rounded-lg"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
});
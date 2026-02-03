// components/LessonResources.jsx - Student View
import { Download, Eye, ExternalLink, FileText, Presentation, FileSpreadsheet } from 'lucide-react';
import FileIcon from './FileIcon'; // Your icon component

export default function LessonResources({ resources }) {
  // Group resources by category
  const slides = resources.filter(r => r.category === 'slides');
  const documents = resources.filter(r => r.category === 'document');
  const templates = resources.filter(r => r.category === 'template');
  
  const ResourceSection = ({ title, icon: Icon, resources, color }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
          {resources.length}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {resources.map((resource, index) => (
          <div key={index} className="border rounded-lg p-3 hover:border-blue-300 transition-colors">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-gray-100 rounded">
                <FileIcon type={resource.type} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{resource.name}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <span>{resource.type.toUpperCase()}</span>
                  <span>•</span>
                  <span>{resource.size}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {resource.downloadable && (
                <a
                  href={resource.url}
                  download
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  Download
                </a>
              )}
              
              {resource.viewable && (
                <button
                  onClick={() => window.open(getPreviewUrl(resource.url, resource.type), '_blank')}
                  className="flex-1 px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Eye size={14} />
                  Preview
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Learning Resources</h2>
      
      <ResourceSection
        title="Slides & Presentations"
        icon={Presentation}
        resources={slides}
        color="text-orange-600"
      />
      
      <ResourceSection
        title="Documents & PDFs"
        icon={FileText}
        resources={documents}
        color="text-blue-600"
      />
      
      <ResourceSection
        title="Templates & Worksheets"
        icon={FileSpreadsheet}
        resources={templates}
        color="text-green-600"
      />
    </div>
  );
}
import React, { useState } from 'react';
import { Upload, FileText, Loader2, Check, Files } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { Question } from '../types';

interface DocumentUploadProps {
  onQuestionsParsed: (questions: Question[]) => void;
  onUploadComplete: (docName: string, count: number) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onQuestionsParsed, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    const files = Array.from(fileList);
    setProgress({ current: 0, total: files.length });
    
    let totalQuestions = 0;
    let processedCount = 0;
    let errorCount = 0;

    // Process files sequentially to maintain state stability and avoid API rate limits
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length });
      setStatusMsg(`Analyzing ${file.name}...`);

      try {
        const text = await file.text();
        
        // Skip empty files
        if (!text.trim()) {
           console.warn(`Skipping empty file: ${file.name}`);
           continue;
        }

        const parsedMcqs = await GeminiService.parseMCQsFromText(text);
        
        if (parsedMcqs.length > 0) {
          const newQuestions: Question[] = parsedMcqs.map(q => ({
            ...q,
            id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
            documentId: file.name
          }));

          onQuestionsParsed(newQuestions);
          onUploadComplete(file.name, newQuestions.length);
          totalQuestions += newQuestions.length;
          processedCount++;
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        errorCount++;
      }
    }

    setIsProcessing(false);
    setProgress(null);
    setStatusMsg(
      errorCount > 0 
        ? `Done. Extracted ${totalQuestions} questions. ${errorCount} files failed.`
        : `Success! Extracted ${totalQuestions} questions from ${processedCount} files.`
    );
      
    setTimeout(() => {
      setStatusMsg('');
    }, 5000);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`
          relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200
          ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <input 
          type="file" 
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".txt,.md,.json"
          onChange={(e) => handleFiles(e.target.files)}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-white rounded-full shadow-sm">
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-indigo-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {isProcessing ? 'Processing Documents...' : 'Upload Study Material'}
            </h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              {statusMsg || 'Drag & drop or click to upload multiple Markdown or Text files. The AI will extract MCQs automatically.'}
            </p>
            {progress && (
               <p className="text-xs font-medium text-indigo-600 mt-2">
                 Processing file {progress.current} of {progress.total}
               </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Files size={16} /> Supported Formats
        </h4>
        <div className="flex gap-3 text-xs text-slate-600">
          <span className="px-2 py-1 bg-slate-200 rounded">.md (Markdown)</span>
          <span className="px-2 py-1 bg-slate-200 rounded">.txt (Text)</span>
          <span className="px-2 py-1 bg-slate-200 rounded">.json (Structured)</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          You can select multiple files at once. AI processing time depends on file size.
        </p>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Upload, Loader2, Files, AlertCircle } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { Question } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker for v5+
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

// Extract text from PDF file
async function extractTextFromPDF(file: File): Promise<string> {
  console.log(`[PDF] Starting extraction for: ${file.name}`);

  try {
    const arrayBuffer = await file.arrayBuffer();
    console.log(`[PDF] File size: ${arrayBuffer.byteLength} bytes`);

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    console.log(`[PDF] Document loaded. Pages: ${pdf.numPages}`);

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .filter((item: any) => item.str && item.str.trim())
          .map((item: any) => item.str)
          .join(' ');

        fullText += pageText + '\n\n';
        console.log(`[PDF] Page ${i}: extracted ${pageText.length} characters`);
      } catch (pageError) {
        console.warn(`[PDF] Error on page ${i}:`, pageError);
      }
    }

    const trimmedText = fullText.trim();
    console.log(`[PDF] Total extracted text: ${trimmedText.length} characters`);

    if (trimmedText.length < 50) {
      console.warn('[PDF] Very little text extracted. PDF might be image-based or protected.');
    }

    return trimmedText;
  } catch (error) {
    console.error('[PDF] Extraction failed:', error);
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract text from DOCX file
async function extractTextFromDOCX(file: File): Promise<string> {
  console.log(`[DOCX] Starting extraction for: ${file.name}`);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log(`[DOCX] Extracted ${result.value.length} characters`);
    return result.value;
  } catch (error) {
    console.error('[DOCX] Extraction failed:', error);
    throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get text content from any supported file type
async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  console.log(`[Extract] Processing file: ${file.name} (type: ${extension})`);

  switch (extension) {
    case 'pdf':
      return extractTextFromPDF(file);
    case 'docx':
      return extractTextFromDOCX(file);
    case 'txt':
    case 'md':
    case 'json':
    default:
      const text = await file.text();
      console.log(`[Text] Extracted ${text.length} characters`);
      return text;
  }
}

interface DocumentUploadProps {
  onQuestionsParsed: (questions: Question[]) => void;
  onUploadComplete: (docName: string, count: number) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onQuestionsParsed, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    setErrorMsg('');
    const files = Array.from(fileList);
    setProgress({ current: 0, total: files.length });

    let totalQuestions = 0;
    let processedCount = 0;
    let errorCount = 0;
    let lastError = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length });
      setStatusMsg(`Extracting text from ${file.name}...`);

      try {
        // Step 1: Extract text
        const text = await extractTextFromFile(file);
        console.log(`[Process] Extracted text preview: "${text.substring(0, 200)}..."`);

        if (!text.trim()) {
          console.warn(`[Process] Empty text from: ${file.name}`);
          lastError = `${file.name}: No text content found (might be image-based PDF)`;
          errorCount++;
          continue;
        }

        if (text.length < 100) {
          console.warn(`[Process] Very short text (${text.length} chars) from: ${file.name}`);
          lastError = `${file.name}: Very little text extracted`;
          errorCount++;
          continue;
        }

        // Step 2: Send to AI for parsing
        setStatusMsg(`AI analyzing ${file.name}...`);
        console.log(`[Process] Sending ${text.length} characters to Gemini API`);

        const parsedMcqs = await GeminiService.parseMCQsFromText(text);
        console.log(`[Process] Gemini returned ${parsedMcqs.length} questions`);

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
        } else {
          console.warn(`[Process] No MCQs found in: ${file.name}`);
          lastError = `${file.name}: No MCQ questions found in content`;
          errorCount++;
        }
      } catch (err) {
        console.error(`[Process] Error processing ${file.name}:`, err);
        lastError = `${file.name}: ${err instanceof Error ? err.message : 'Processing failed'}`;
        errorCount++;
      }
    }

    setIsProcessing(false);
    setProgress(null);

    if (errorCount > 0 && processedCount === 0) {
      setStatusMsg('');
      setErrorMsg(lastError || 'Failed to process files');
    } else if (errorCount > 0) {
      setStatusMsg(`Extracted ${totalQuestions} questions from ${processedCount} file(s). ${errorCount} file(s) had issues.`);
      setErrorMsg(lastError);
    } else {
      setStatusMsg(`Success! Extracted ${totalQuestions} questions from ${processedCount} file(s).`);
    }

    setTimeout(() => {
      setStatusMsg('');
      setErrorMsg('');
    }, 10000);
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
          accept=".txt,.md,.json,.pdf,.docx"
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
              {statusMsg || 'Drag & drop or click to upload PDF, DOCX, Markdown or Text files. The AI will extract MCQs automatically.'}
            </p>
            {progress && (
               <p className="text-xs font-medium text-indigo-600 mt-2">
                 Processing file {progress.current} of {progress.total}
               </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Processing Issue</p>
            <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
            <p className="text-xs text-red-500 mt-2">
              Tip: Make sure the PDF contains selectable text (not scanned images) and has MCQ-style questions.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Files size={16} /> Supported Formats
        </h4>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded">.pdf (PDF)</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">.docx (Word)</span>
          <span className="px-2 py-1 bg-slate-200 rounded">.md (Markdown)</span>
          <span className="px-2 py-1 bg-slate-200 rounded">.txt (Text)</span>
          <span className="px-2 py-1 bg-slate-200 rounded">.json (Structured)</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          PDFs must contain selectable text (not scanned images). Check browser console for detailed logs.
        </p>
      </div>
    </div>
  );
};

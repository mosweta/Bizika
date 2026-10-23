// src/components/admin/utils/conversionUtils.js
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
} catch (error) {
  console.error('PDF.js worker setup failed:', error);
}

export const convertDocxToMarkdown = async (file) => {
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
    return { success: false, error: error.message };
  }
};

export const convertPdfToMarkdown = async (file) => {
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
    return { success: false, error: error.message };
  }
};
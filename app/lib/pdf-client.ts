/**
 * Client-side PDF text extraction using pdfjs-dist.
 * Handles both text-based PDFs (direct extraction) and image-based/scanned PDFs (render → OCR).
 */

import * as pdfjsLib from 'pdfjs-dist';

export type ProgressCallback = (msg: string) => void;

/**
 * Extract text from a PDF file. Tries embedded text first,
 * falls back to rendering pages and running Tesseract OCR.
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: ProgressCallback,
): Promise<string> {
  onProgress?.('Loading PDF...');

  // Set worker source BEFORE any pdfjs operation — use unpkg (mirrors npm exactly)
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  onProgress?.(`PDF loaded — ${numPages} page${numPages > 1 ? 's' : ''}`);

  // --- Phase 1: Try embedded text extraction ---
  let fullText = '';
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => {
        if (item.hasEOL) return item.str + '\n';
        return item.str;
      })
      .join('');
    fullText += pageText + '\n';
  }

  // If we got meaningful text (not just whitespace/headers), use it
  const meaningfulChars = fullText.replace(/\s+/g, '').length;
  if (meaningfulChars > 40) {
    onProgress?.('');
    return fullText;
  }

  // --- Phase 2: Render pages to images and OCR with Tesseract ---
  onProgress?.('PDF has no embedded text — starting OCR...');

  const Tesseract = (await import('tesseract.js')).default;

  let ocrText = '';
  for (let i = 1; i <= numPages; i++) {
    onProgress?.(`OCR page ${i}/${numPages}...`);

    const page = await pdf.getPage(i);
    // Render at 2x scale for better OCR quality
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    // Convert canvas to blob for Tesseract
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    const result = await Tesseract.recognize(blob, 'eng', {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') {
          onProgress?.(`OCR page ${i}/${numPages}... ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    ocrText += result.data.text + '\n';

    // Clean up
    canvas.width = 0;
    canvas.height = 0;
  }

  onProgress?.('');
  return ocrText;
}

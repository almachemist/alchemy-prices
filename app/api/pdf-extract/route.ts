import { NextRequest, NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

type TextElement = { x: number; y: number; w: number; text: string };

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const text = await extractTextFromPdf(buffer);

    return NextResponse.json({ text, success: true });
  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParser = new (PDFParser as any)(null, 1);
  return new Promise<string>((resolve, reject) => {
    pdfParser.on('pdfParser_dataError', (errData: any) => reject(new Error(errData.parserError)));
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        resolve(parsePdfData(pdfData));
      } catch (err) {
        reject(err);
      }
    });
    pdfParser.parseBuffer(buffer);
  });
}

function parsePdfData(pdfData: any): string {
  const lines: string[] = [];
  if (!pdfData.Pages) return '';

  for (const page of pdfData.Pages) {
    if (!page.Texts) continue;

    const elements: TextElement[] = [];
    for (const textObj of page.Texts) {
      if (!textObj.R) continue;
      let content = '';
      for (const r of textObj.R) {
        if (r.T) {
          try { content += decodeURIComponent(r.T); }
          catch { content += r.T; }
        }
      }
      if (content.trim()) {
        elements.push({ x: textObj.x, y: textObj.y, w: typeof textObj.w === 'number' ? textObj.w : 0, text: content });
      }
    }

    elements.sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

    const rows: { y: number; elements: TextElement[] }[] = [];
    for (const el of elements) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(el.y - last.y) < 0.5) {
        last.elements.push(el);
      } else {
        rows.push({ y: el.y, elements: [el] });
      }
    }

    for (const row of rows) {
      const lineText = rowToText(row.elements);
      if (lineText.trim()) lines.push(lineText.trim());
    }
  }

  return lines.join('\n');
}

function rowToText(elements: TextElement[]): string {
  if (elements.length === 0) return '';
  const singleCharCount = elements.filter(e => e.text.trim().length === 1).length;
  const isCharSpaced = elements.length > 3 && singleCharCount / elements.length > 0.6;

  if (!isCharSpaced) {
    return elements.map(e => e.text.trim()).filter(Boolean).join(' ');
  }

  const groups: string[] = [];
  let current = '';
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const txt = el.text.trim();
    if (!txt) continue;
    if (current === '') { current = txt; continue; }
    const prev = elements[i - 1];
    const prevW = prev.w > 0 ? prev.w : 0.5;
    const gap = el.x - (prev.x + prevW);
    if (gap < 0.1) {
      current += txt;
    } else {
      groups.push(current);
      current = txt;
    }
  }
  if (current) groups.push(current);
  return groups.join(' ');
}

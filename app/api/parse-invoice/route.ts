import { NextRequest, NextResponse } from 'next/server';
import { parseInvoiceText } from '../../lib/ocr';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const result = parseInvoiceText(text);

    return NextResponse.json({
      success: true,
      items: result.items,
      adjustments: result.adjustments,
      needsReview: result.needsReview,
      debugInfo: result.debugLines.slice(0, 50), // Limit debug output
    });
  } catch (error) {
    console.error('Invoice parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

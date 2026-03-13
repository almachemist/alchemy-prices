/**
 * OCR Invoice Parser - Integrated into Alchemy Business Management
 * 
 * This module parses invoice text (from PDF or OCR) and extracts:
 * - Product line items with quantities and prices
 * - Invoice adjustments (discounts, shipping, tax)
 * - Automatic cost allocation across products
 */

export interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size?: string;
  unit?: string;
  rawText?: string;
  isOverhead?: boolean;
  packSize?: number;
  unitSizeMl?: number;
  allocatedDiscount?: number;
  allocatedOverhead?: number;
  landedCasePrice?: number;
  landedUnitPrice?: number;
}

export interface InvoiceAdjustments {
  discountTotal: number;
  overheadTotal: number;
  taxTotal: number;
  invoiceTotal: number;
}

export interface ParseResult {
  items: InvoiceItem[];
  adjustments: InvoiceAdjustments;
  needsReview: boolean;
  debugLines: string[];
}

export function parseInvoiceText(text: string): ParseResult {
  const items: InvoiceItem[] = [];
  const dbg: string[] = [];
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  const DISQUALIFY = [
    /\b(sub[\s-]?total|invoice\s+total|total\s+inc|total\s+net|total\s+cases)\b/i,
    /^\s*(gst|wet|vat|tax|freight\s+total|balance\s+due|amount\s+due|total\s+\$)/i,
    /\b(grand\s+total|total\s+before\s+gst|items?\s+subtotal|order\s+subtotal)\b/i,
    /\b(tax\s+invoice|delivery\s+docket|purchase\s+order)\b/i,
    /^(code|description|size|case\/?bottle|base\s+cost|total\s+net|luc|gst|wet)\b/i,
    /\b(due\s+date|invoice\s+date|invoice\s+#|credit\s+terms)\b/i,
    /\b(QLD|NSW|VIC|SA|WA|NT|ACT|TAS)\s+\d{4}\b/,
    /\b(pty\s+ltd|a\.?b\.?n\.?|a\.?c\.?n\.?)\b/i,
    /https?:\/\/|www\./i,
    /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    /\bpage\s+\d+\s+of\s+\d+\b/i,
    /\bsku\b/i,
  ];

  const NOISE_EXACT = [
    'total', 'gst', 'wet', 'tax', 'subtotal', 'amount', 'price',
    'qty', 'unit', 'invoice', 'discount', 'freight', 'charge',
  ];

  let pendingProductName = '';

  const saveAsPending = (src: string) => {
    const nc = src
      .replace(/\$[\d,]+(?:\.\d{1,2})?/g, '')
      .replace(/\b[\d,]+(?:\.\d{1,2})?\b/g, '')
      .replace(/[|\\\/\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (
      nc.length >= 3 &&
      (nc.match(/[a-zA-Z]{3,}/g) || []).length >= 1 &&
      !NOISE_EXACT.includes(nc.toLowerCase()) &&
      nc.length > pendingProductName.length
    ) {
      pendingProductName = nc;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 4) continue;

    if (DISQUALIFY.some(p => p.test(trimmed))) continue;

    const numberMatches = [...trimmed.matchAll(/\$?([\d,]+(?:\.\d{1,2})?)/g)];
    const allNumbers = numberMatches
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => n >= 0.01 && n < 1000000);

    if (allNumbers.length < 1) {
      saveAsPending(trimmed);
      continue;
    }

    const hasPrice = numberMatches.some(m => /\.\d{2}$/.test(m[1]) && parseFloat(m[1].replace(/,/g, '')) > 0.5);
    if (!hasPrice) {
      saveAsPending(trimmed);
      continue;
    }

    let productName = trimmed
      .replace(/\$[\d,]+(?:\.\d{1,2})?/g, '')
      .replace(/\b[\d,]+(?:\.\d{1,2})?\b/g, '')
      .replace(/[|\\\/\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    productName = productName
      .replace(/\s+(ml|l|g|kg|oz|cl|x|@|ea|each|pk|pkt|cs|ctn|doz|btl)\s*$/i, '')
      .replace(/[^\w\s\-\.'&]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (pendingProductName) {
      if (productName.length < 3 || !/[a-zA-Z]{3,}/.test(productName)) {
        productName = pendingProductName;
      } else if (productName.length < 12 && pendingProductName.length > productName.length + 8) {
        productName = pendingProductName + ' ' + productName;
      }
    }
    pendingProductName = '';

    if (productName.length < 3) continue;
    if (NOISE_EXACT.includes(productName.toLowerCase())) continue;
    if (!/[a-zA-Z]{3,}/.test(productName)) continue;

    const moneyMatches = [...trimmed.matchAll(/(?<![.\d])\$?([\d,]+\.\d{2})(?![.\d])/g)];
    const moneyNumbers = moneyMatches
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => n >= 0.01 && n < 100000);

    if (moneyNumbers.length === 0) continue;

    let quantity = 1;
    let unitPrice = 0;
    let totalPrice = 0;

    if (moneyNumbers.length === 1) {
      totalPrice = moneyNumbers[0];
      unitPrice = totalPrice;
    } else {
      totalPrice = moneyNumbers[moneyNumbers.length - 1];
      let bestQty = Infinity;
      let bestUnitPrice = totalPrice;
      for (let i = moneyNumbers.length - 2; i >= 0; i--) {
        const candidate = moneyNumbers[i];
        if (candidate <= 0 || candidate > totalPrice + 0.01) continue;
        const ratio = totalPrice / candidate;
        const roundedQty = Math.round(ratio);
        if (roundedQty >= 1 && roundedQty <= 72 && Math.abs(ratio - roundedQty) / ratio < 0.12) {
          if (roundedQty < bestQty) {
            bestQty = roundedQty;
            bestUnitPrice = candidate;
          }
        }
      }
      if (bestQty < Infinity) {
        quantity = bestQty;
        unitPrice = bestUnitPrice;
      } else {
        unitPrice = totalPrice;
      }
    }

    if (totalPrice < 0.01) continue;
    if (unitPrice < 0.01) unitPrice = totalPrice;

    const OVERHEAD_KW = /\b(freight|delivery|shipping|surcharge|handling)\b/i;
    const isOverhead = OVERHEAD_KW.test(productName) || OVERHEAD_KW.test(trimmed);

    items.push({
      productName,
      quantity: Math.max(1, Math.round(quantity)),
      unitPrice: parseFloat(unitPrice.toFixed(2)),
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      rawText: trimmed,
      isOverhead,
    });
  }

  const adjustments = extractInvoiceAdjustments(text);
  const productItems = items.filter(i => !i.isOverhead);

  allocateDiscountAcrossProducts(productItems, adjustments.discountTotal);

  const parsedOverhead = items.filter(i => i.isOverhead).reduce((s, i) => s + i.totalPrice, 0);
  const effectiveOverhead = Math.max(parsedOverhead, adjustments.overheadTotal);
  allocateOverheadAcrossProducts(productItems, effectiveOverhead);

  const { needsReview } = reconcileInvoiceTotals(productItems, adjustments);

  return { items, adjustments, needsReview, debugLines: dbg };
}

export function extractInvoiceAdjustments(text: string): InvoiceAdjustments {
  const MONEY = /(?<![.\d])\$?-?([\d,]+\.\d{2})(?![.\d])/g;
  const lastMoney = (line: string): number => {
    const m = [...line.matchAll(MONEY)];
    return m.length === 0 ? 0 : parseFloat(m[m.length - 1][1].replace(/,/g, ''));
  };

  let discountTotal = 0;
  let overheadTotal = 0;
  let taxTotal = 0;
  let invoiceTotal = 0;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    if (/^\s*(discount|promotion)\s*:?\s*/i.test(line)) {
      discountTotal = Math.max(discountTotal, lastMoney(line));
    } else if (/^\s*(shipping|freight|delivery|handling|postage)\s*:?\s*/i.test(line)) {
      overheadTotal = Math.max(overheadTotal, lastMoney(line));
    } else if (/^\s*(gst|tax|vat)\s*:?\s*(10%)?\s*/i.test(line)) {
      taxTotal = Math.max(taxTotal, lastMoney(line));
    } else if (/^\s*(total|amount\s+due|balance\s+due)\s*:?\s*\$/i.test(line)) {
      invoiceTotal = Math.max(invoiceTotal, lastMoney(line));
    }
  }

  return { discountTotal, overheadTotal, taxTotal, invoiceTotal };
}

export function allocateDiscountAcrossProducts(
  items: InvoiceItem[],
  discountTotal: number,
): void {
  if (discountTotal <= 0 || items.length === 0) return;
  const rawTotal = items.reduce((s, i) => s + i.totalPrice, 0);
  if (rawTotal <= 0) return;
  for (const item of items) {
    item.allocatedDiscount = parseFloat(
      ((item.totalPrice / rawTotal) * discountTotal).toFixed(2)
    );
  }
}

export function allocateOverheadAcrossProducts(
  items: InvoiceItem[],
  overheadTotal: number,
): void {
  if (items.length === 0) return;
  const adjustedTotal = items.reduce((s, i) => {
    return s + Math.max(0, i.totalPrice - (i.allocatedDiscount ?? 0));
  }, 0);

  for (const item of items) {
    const adjusted = Math.max(0, item.totalPrice - (item.allocatedDiscount ?? 0));
    const overhead = overheadTotal > 0 && adjustedTotal > 0
      ? parseFloat(((adjusted / adjustedTotal) * overheadTotal).toFixed(2))
      : 0;
    item.allocatedOverhead = overhead;
    item.landedCasePrice = parseFloat((adjusted + overhead).toFixed(2));
    item.landedUnitPrice = parseFloat((item.landedCasePrice / (item.packSize || 1)).toFixed(4));
  }
}

export function reconcileInvoiceTotals(
  productItems: InvoiceItem[],
  adjustments: InvoiceAdjustments,
): { needsReview: boolean; message: string } {
  const { discountTotal, overheadTotal, taxTotal, invoiceTotal } = adjustments;
  if (invoiceTotal <= 0) {
    return { needsReview: false, message: 'No invoice total found' };
  }

  const rawProductSum = productItems.reduce((s, i) => s + i.totalPrice, 0);
  const computedTotal = rawProductSum - discountTotal + overheadTotal + taxTotal;
  const diff = Math.abs(computedTotal - invoiceTotal);
  const needsReview = diff > 0.50;

  const message = needsReview
    ? `Mismatch: computed $${computedTotal.toFixed(2)} vs invoice $${invoiceTotal.toFixed(2)}`
    : `OK: $${computedTotal.toFixed(2)}`;

  return { needsReview, message };
}

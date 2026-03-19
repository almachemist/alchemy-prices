"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  "CARRIER_OIL",
  "ESSENTIAL_OIL",
  "BUTTER",
  "BOTANICAL",
  "PACKAGING",
  "CONSUMABLE",
  "CLAY",
  "SOAP_BASE",
  "COLORANT",
  "MOLD",
] as const;

const UNITS = ["ML", "G", "EACH", "DROPS"] as const;

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  allocatedDiscount?: number;
  allocatedOverhead?: number;
  landedCasePrice?: number;
  isOverhead?: boolean;
  purchaseSize?: number;
  purchaseUnit?: string;
  suggestedCategory?: string;
  sku?: string;
}

interface ParsedInvoice {
  items: InvoiceItem[];
  adjustments: {
    discountTotal: number;
    overheadTotal: number;
    taxTotal: number;
    invoiceTotal: number;
  };
  needsReview: boolean;
}

interface EditableItem {
  selected: boolean;
  name: string;
  category: string;
  purchaseSize: number;
  purchaseUnit: string;
  unitType: string;
  landedCost: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  allocatedDiscount: number;
  allocatedOverhead: number;
}

function unitTypeFromUnit(unit: string): string {
  if (unit === "ML") return "ML";
  if (unit === "G") return "G";
  return "EACH";
}

export default function ImportInvoicePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [error, setError] = useState("");
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [overheadPool, setOverheadPool] = useState(0);
  const [clearExisting, setClearExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean; count: number; created?: number; updated?: number; skipped?: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles(selected);
      setError("");
      setExtractedText("");
      setParsedInvoice(null);
      setEditableItems([]);
      setImportResult(null);
    }
  };

  const [ocrProgress, setOcrProgress] = useState("");

  const isImageFile = files.length > 0 && files.every(f => /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(f.name));
  const isPdfFile = files.length === 1 && /\.pdf$/i.test(files[0].name);

  const handleExtractText = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setError("");
    setOcrProgress("");

    try {
      let text: string;

      if (isImageFile) {
        // Run Tesseract OCR client-side — supports multiple images (e.g. 2-page invoice)
        const Tesseract = (await import("tesseract.js")).default;
        const parts: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setOcrProgress(files.length > 1 ? `Page ${i + 1}/${files.length} — recognizing...` : "Loading OCR engine...");
          const result = await Tesseract.recognize(f, "eng", {
            logger: (m: { status: string; progress: number }) => {
              if (m.status === "recognizing text") {
                const prefix = files.length > 1 ? `Page ${i + 1}/${files.length}: ` : "";
                setOcrProgress(`${prefix}Recognizing text... ${Math.round(m.progress * 100)}%`);
              }
            },
          });
          parts.push(result.data.text);
        }
        text = parts.join("\n");
        setOcrProgress("");
      } else if (isPdfFile) {
        // PDF: client-side extraction with pdfjs-dist
        const { extractTextFromPdf } = await import("../../lib/pdf-client");
        text = await extractTextFromPdf(files[0], (msg: string) => setOcrProgress(msg));
      } else {
        throw new Error("Please select image files (JPG, PNG, etc.) or a single PDF.");
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No text could be extracted from the file. Try a clearer image or a text-based PDF.");
      }

      setExtractedText(text);
      await parseInvoiceText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract text from file");
      setOcrProgress("");
    } finally {
      setLoading(false);
    }
  };

  const parseInvoiceText = async (text: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse invoice");
      }

      setParsedInvoice(data);

      // Build editable items from parsed product items (non-overhead)
      const productItems = (data.items as InvoiceItem[]).filter((i) => !i.isOverhead);
      const pool = productItems.reduce((s, i) => s + (i.allocatedOverhead || 0), 0);
      setOverheadPool(pool);
      setEditableItems(
        productItems.map((item) => {
          const cat = item.suggestedCategory || "CONSUMABLE";
          // Default unit based on category: oils → ML, solids → G
          const ML_CATEGORIES = ["ESSENTIAL_OIL", "CARRIER_OIL", "FRAGRANCE"];
          const defaultUnit = ML_CATEGORIES.includes(cat) ? "ML" : "G";
          const unit = item.purchaseUnit || defaultUnit;
          return {
            selected: true,
            name: item.productName,
            category: cat,
            purchaseSize: item.purchaseSize || 0,
            purchaseUnit: unit,
            unitType: unitTypeFromUnit(unit),
            landedCost: item.landedCasePrice || item.totalPrice,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            allocatedDiscount: item.allocatedDiscount || 0,
            allocatedOverhead: item.allocatedOverhead || 0,
          };
        })
      );
      setImportResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleManualParse = () => {
    if (extractedText) {
      parseInvoiceText(extractedText);
    }
  };

  const updateItem = (idx: number, field: keyof EditableItem, value: string | number | boolean) => {
    setEditableItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "purchaseUnit") {
        next[idx].unitType = unitTypeFromUnit(value as string);
      }
      // When quantity changes, recalculate unitPrice = totalPrice / newQty
      // so the total landed cost never changes (no dilution).
      if (field === "quantity" && typeof value === "number" && value > 0) {
        next[idx].unitPrice = parseFloat((next[idx].totalPrice / value).toFixed(4));
      }
      return next;
    });
  };

  const recomputeOverhead = (items: EditableItem[], pool: number): EditableItem[] => {
    const rawTotal = items.reduce((s, i) => s + i.totalPrice, 0);
    if (rawTotal <= 0 || pool <= 0) return items;
    return items.map((item) => {
      const newOverhead = (item.totalPrice / rawTotal) * pool;
      return {
        ...item,
        allocatedOverhead: newOverhead,
        landedCost: item.totalPrice - item.allocatedDiscount + newOverhead,
      };
    });
  };

  const removeItem = (idx: number) => {
    setEditableItems((prev) => {
      const remaining = prev.filter((_, i) => i !== idx);
      return recomputeOverhead(remaining, overheadPool);
    });
  };

  const handleImportToInventory = async () => {
    const selectedItems = editableItems.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      setError("No items selected for import");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const response = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearExisting,
          items: selectedItems.map((item) => ({
            name: item.name,
            category: item.category,
            unitType: item.unitType,
            purchaseSize: item.purchaseSize,
            purchaseUnit: item.purchaseUnit,
            purchaseCostAud: item.landedCost,
            notes: `Imported from invoice. Original: $${item.unitPrice.toFixed(2)} x ${item.quantity}, discount: -$${item.allocatedDiscount.toFixed(2)}, shipping: +$${item.allocatedOverhead.toFixed(2)}`,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import");
      }

      setImportResult({
        success: true,
        count: data.count,
        created: data.created,
        updated: data.updated,
        skipped: data.skipped,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import to inventory");
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = editableItems.filter((i) => i.selected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Import Invoice (OCR)
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Upload a PDF or image of an invoice to extract items and add them to your inventory
          </p>
        </div>
        <Link href="/invoices" className="btn-secondary">
          ← Back to Invoices
        </Link>
      </div>

      {/* Upload Section */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">1. Upload Invoice (PDF or Image)</h2>
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff"
              onChange={handleFileChange}
              multiple
              className="input"
            />
            {files.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {files.map((f, i) => (
                  <p key={i} className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {files.length > 1 ? `Page ${i + 1}: ` : "Selected: "}{f.name} ({(f.size / 1024).toFixed(1)} KB)
                  </p>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleExtractText}
            disabled={files.length === 0 || loading}
            className="btn-primary"
          >
            {loading
              ? ocrProgress || "Processing..."
              : "Extract & Parse Invoice"}
          </button>
          {isImageFile && !loading && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Image OCR runs in your browser. Select multiple images for multi-page invoices. May take 10-30 seconds per page.
            </p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card" style={{ background: "var(--color-danger)", color: "white" }}>
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {importResult?.success && (
        <div className="card" style={{ background: "var(--color-accent)", color: "white" }}>
          <p className="font-semibold">Import Successful</p>
          <div className="text-sm mt-1 space-y-0.5">
            {(importResult.created ?? 0) > 0 && (
              <p>{importResult.created} new items created</p>
            )}
            {(importResult.updated ?? 0) > 0 && (
              <p>{importResult.updated} existing items updated with costs</p>
            )}
            {(importResult.skipped ?? 0) > 0 && (
              <p>{importResult.skipped} items skipped (already up to date)</p>
            )}
            <p className="mt-1">
              <Link href="/inventory" className="underline font-semibold">
                View Inventory →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Extracted Text Section */}
      {extractedText && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">2. Extracted Text</h2>
            <button onClick={handleManualParse} className="btn-secondary text-sm">
              Re-parse
            </button>
          </div>
          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            rows={8}
            className="input font-mono text-xs"
            placeholder="Extracted text will appear here..."
          />
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            You can edit the text above and click &quot;Re-parse&quot; to try again
          </p>
        </div>
      )}

      {/* Parsed Results Section */}
      {parsedInvoice && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">3. Parsed Invoice Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Items Found</div>
                <div className="text-xl font-bold">{editableItems.length}</div>
              </div>
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Subtotal</div>
                <div className="text-xl font-bold">
                  AU${editableItems.reduce((s, i) => s + i.totalPrice, 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Discount</div>
                <div className="text-xl font-bold" style={{ color: "var(--color-danger)" }}>
                  -AU${parsedInvoice.adjustments.discountTotal.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Shipping</div>
                <div className="text-xl font-bold" style={{ color: "var(--color-gold)" }}>
                  +AU${parsedInvoice.adjustments.overheadTotal.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>GST/Tax</div>
                <div className="text-xl font-bold" style={{ color: "var(--color-gold)" }}>
                  +AU${parsedInvoice.adjustments.taxTotal.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Invoice Total</div>
                <div className="text-xl font-bold" style={{ color: "var(--color-accent)" }}>
                  AU${parsedInvoice.adjustments.invoiceTotal.toFixed(2)}
                </div>
              </div>
            </div>
            {parsedInvoice.needsReview && (
              <div className="mt-4 p-3 rounded" style={{ background: "var(--color-gold)", color: "var(--color-bg)" }}>
                <p className="font-semibold">⚠️ Needs Review</p>
                <p className="text-sm mt-1">
                  The parsed totals don&apos;t match the invoice total. Please review items carefully.
                </p>
              </div>
            )}
          </div>

          {/* Editable Items Table */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">4. Review & Edit Items</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
              Edit product names, categories, sizes and units before importing. Deselect items you don&apos;t want to import.
            </p>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-8">
                      <input
                        type="checkbox"
                        checked={editableItems.every((i) => i.selected)}
                        onChange={(e) =>
                          setEditableItems((prev) =>
                            prev.map((i) => ({ ...i, selected: e.target.checked }))
                          )
                        }
                      />
                    </th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th className="text-right">Size</th>
                    <th>Unit</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Landed Cost</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {editableItems.map((item, idx) => (
                    <tr key={idx} style={{ opacity: item.selected ? 1 : 0.4 }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => updateItem(idx, "selected", e.target.checked)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                          className="input text-sm"
                          style={{ minWidth: "200px" }}
                        />
                      </td>
                      <td>
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(idx, "category", e.target.value)}
                          className="input text-sm"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          value={item.purchaseSize || ""}
                          placeholder="?"
                          onChange={(e) =>
                            updateItem(idx, "purchaseSize", parseFloat(e.target.value) || 0)
                          }
                          className="input text-sm text-right"
                          style={{
                            width: "80px",
                            ...(item.purchaseSize === 0
                              ? { borderColor: "var(--color-gold)", background: "rgba(255,193,7,0.1)" }
                              : {}),
                          }}
                          min={0}
                          step="any"
                        />
                      </td>
                      <td>
                        <select
                          value={item.purchaseUnit}
                          onChange={(e) => updateItem(idx, "purchaseUnit", e.target.value)}
                          className="input text-sm"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="input text-sm text-right"
                          style={{ width: "100px" }}
                          min={0}
                          step="0.0001"
                        />
                      </td>
                      <td className="text-right font-semibold text-sm" style={{ color: "var(--color-accent)" }}>
                        <input
                          type="number"
                          value={item.landedCost}
                          onChange={(e) =>
                            updateItem(idx, "landedCost", parseFloat(e.target.value) || 0)
                          }
                          className="input text-sm text-right font-semibold"
                          style={{ width: "100px", color: "var(--color-accent)" }}
                          min={0}
                          step="0.01"
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-sm px-2 py-1 rounded"
                          style={{ color: "var(--color-danger)" }}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import to Inventory */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">5. Import to Inventory</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                />
                <div>
                  <span className="font-medium" style={{ color: clearExisting ? "var(--color-danger)" : undefined }}>
                    {clearExisting ? "⚠ CLEAR existing inventory before import" : "Clear existing inventory before import"}
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: clearExisting ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                    {clearExisting
                      ? "WARNING: This will DELETE all current inventory items and recipe line items, then add only the new items from this invoice."
                      : "Leave unchecked to add these items alongside your existing inventory."}
                  </p>
                </div>
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleImportToInventory}
                  disabled={importing || selectedCount === 0}
                  className="btn-primary"
                >
                  {importing
                    ? "Importing..."
                    : `Add ${selectedCount} Item${selectedCount !== 1 ? "s" : ""} to Inventory`}
                </button>
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Total landed cost: AU$
                  {editableItems
                    .filter((i) => i.selected)
                    .reduce((s, i) => s + i.landedCost, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

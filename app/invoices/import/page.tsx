"use client";

import { useState } from "react";
import Link from "next/link";

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  allocatedDiscount?: number;
  allocatedOverhead?: number;
  landedCasePrice?: number;
  isOverhead?: boolean;
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

export default function ImportInvoicePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
      setExtractedText("");
      setParsedInvoice(null);
    }
  };

  const handleExtractText = async () => {
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pdf-extract", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract text");
      }

      setExtractedText(data.text);
      
      // Automatically parse the extracted text
      await parseInvoiceText(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract text from PDF");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Import Invoice (OCR)
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Upload a PDF invoice to automatically extract and parse items
          </p>
        </div>
        <Link href="/invoices" className="btn-secondary">
          ← Back to Invoices
        </Link>
      </div>

      {/* Upload Section */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">1. Upload Invoice PDF</h2>
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="input"
            />
            {file && (
              <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          <button
            onClick={handleExtractText}
            disabled={!file || loading}
            className="btn-primary"
          >
            {loading ? "Processing..." : "Extract & Parse Invoice"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card" style={{ background: "var(--color-danger)", color: "white" }}>
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
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
            rows={12}
            className="input font-mono text-xs"
            placeholder="Extracted text will appear here..."
          />
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            You can edit the text above and click "Re-parse" to try again
          </p>
        </div>
      )}

      {/* Parsed Results Section */}
      {parsedInvoice && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">3. Parsed Invoice Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Items Found</div>
                <div className="text-xl font-bold">{parsedInvoice.items.filter(i => !i.isOverhead).length}</div>
              </div>
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Discount</div>
                <div className="text-xl font-bold">AU${parsedInvoice.adjustments.discountTotal.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Shipping</div>
                <div className="text-xl font-bold">AU${parsedInvoice.adjustments.overheadTotal.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Total</div>
                <div className="text-xl font-bold" style={{ color: "var(--color-accent)" }}>
                  AU${parsedInvoice.adjustments.invoiceTotal.toFixed(2)}
                </div>
              </div>
            </div>
            {parsedInvoice.needsReview && (
              <div className="mt-4 p-3 rounded" style={{ background: "var(--color-gold)", color: "var(--color-bg)" }}>
                <p className="font-semibold">⚠️ Needs Review</p>
                <p className="text-sm mt-1">The parsed totals don't match the invoice total. Please review items carefully.</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Parsed Items</h2>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Discount</th>
                    <th className="text-right">Shipping</th>
                    <th className="text-right">Landed Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedInvoice.items.filter(i => !i.isOverhead).map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{item.productName}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">AU${item.unitPrice.toFixed(2)}</td>
                      <td className="text-right">AU${item.totalPrice.toFixed(2)}</td>
                      <td className="text-right" style={{ color: "var(--color-danger)" }}>
                        {item.allocatedDiscount ? `-AU$${item.allocatedDiscount.toFixed(2)}` : "-"}
                      </td>
                      <td className="text-right" style={{ color: "var(--color-gold)" }}>
                        {item.allocatedOverhead ? `+AU$${item.allocatedOverhead.toFixed(2)}` : "-"}
                      </td>
                      <td className="text-right font-semibold" style={{ color: "var(--color-accent)" }}>
                        AU${(item.landedCasePrice || item.totalPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Next Steps */}
          <div className="card" style={{ background: "var(--color-bg-subtle)" }}>
            <h3 className="font-semibold mb-2">Next Steps</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              <li>Review the parsed items above for accuracy</li>
              <li>Match products to your existing inventory items</li>
              <li>Update inventory costs with the landed costs</li>
              <li>Create purchase records in your system</li>
            </ol>
            <p className="mt-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
              <strong>Note:</strong> Automatic inventory matching and updates coming soon!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

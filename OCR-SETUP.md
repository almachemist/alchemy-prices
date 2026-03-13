# OCR Invoice Import System - Setup Complete ✅

## Overview

The OCR invoice import system has been successfully integrated into your Alchemy Business Management application. You can now automatically extract and parse invoice data from PDF files.

## Features

### ✅ Installed & Configured

1. **PDF Text Extraction**
   - Automatically extracts text from PDF invoices
   - Uses `pdf2json` library for accurate text positioning
   - Handles multi-page invoices

2. **Intelligent Invoice Parsing**
   - Automatically detects product line items
   - Extracts quantities, unit prices, and totals
   - Identifies invoice adjustments (discounts, shipping, tax)
   - Filters out headers, footers, and non-product lines

3. **Cost Allocation**
   - Proportionally allocates discounts across products
   - Distributes shipping costs based on product value
   - Calculates landed costs per item
   - Reconciles totals against invoice total

4. **Smart Detection**
   - Recognizes various invoice formats
   - Handles GST/tax calculations
   - Detects overhead charges (freight, delivery, etc.)
   - Flags invoices that need manual review

## How to Use

### 1. Access the OCR Import Page

Navigate to: **Invoices → 📄 Import Invoice (OCR)**

Or go directly to: `http://localhost:3000/invoices/import`

### 2. Upload a PDF Invoice

1. Click "Choose File" and select your PDF invoice
2. Click "Extract & Parse Invoice"
3. Wait for processing (usually 2-10 seconds)

### 3. Review Parsed Results

The system will display:
- **Summary**: Total items, discount, shipping, and invoice total
- **Parsed Items Table**: All detected products with:
  - Product name
  - Quantity
  - Unit price
  - Total price
  - Allocated discount
  - Allocated shipping
  - **Landed cost** (final cost per item)

### 4. Verify Accuracy

- Check if the invoice total matches (green = good, amber = needs review)
- Verify product names are correct
- Confirm quantities and prices match the PDF
- Edit the extracted text if needed and click "Re-parse"

### 5. Next Steps (Manual for now)

Currently, you need to manually:
1. Match parsed products to your inventory items
2. Update inventory costs with the landed costs
3. Create purchase records

**Coming Soon**: Automatic inventory matching and cost updates!

## API Endpoints

### POST `/api/pdf-extract`
Extracts text from a PDF file.

**Request**: FormData with `file` field
**Response**: `{ text: string, success: boolean }`

### POST `/api/parse-invoice`
Parses invoice text into structured data.

**Request**: `{ text: string }`
**Response**: 
```json
{
  "success": true,
  "items": [...],
  "adjustments": {
    "discountTotal": 0,
    "overheadTotal": 0,
    "taxTotal": 0,
    "invoiceTotal": 0
  },
  "needsReview": false
}
```

## Files Added

```
app/
├── lib/
│   └── ocr.ts                      # Core OCR parsing logic
├── api/
│   ├── pdf-extract/
│   │   └── route.ts                # PDF text extraction endpoint
│   └── parse-invoice/
│       └── route.ts                # Invoice parsing endpoint
└── invoices/
    └── import/
        └── page.tsx                # OCR import UI
```

## Dependencies Installed

- `pdf2json` (v3.1.4) - PDF text extraction
- `tesseract.js` (v5.1.1) - OCR for scanned images (future use)

## Supported Invoice Formats

The parser works best with:
- ✅ Digital PDF invoices (text-based)
- ✅ Australian suppliers (GST-aware)
- ✅ Standard invoice layouts with line items
- ✅ Invoices with clear pricing columns

May need manual review for:
- ⚠️ Scanned/image-based PDFs (use tesseract.js - coming soon)
- ⚠️ Complex multi-column layouts
- ⚠️ Invoices with unusual formatting

## Example Workflow

1. **Receive supplier invoice** (PDF)
2. **Upload to OCR system** → Automatically extracts all items
3. **Review parsed data** → Verify accuracy
4. **Match to inventory** → Link to existing products
5. **Update costs** → Landed costs automatically calculated
6. **Track spending** → All purchase data in one place

## Technical Details

### Parsing Algorithm

1. **Text Extraction**: PDF → Plain text with positioning
2. **Line Filtering**: Remove headers, footers, totals
3. **Product Detection**: Find lines with prices and quantities
4. **Price Extraction**: Detect unit price, quantity, total
5. **Adjustment Detection**: Find discount, shipping, tax lines
6. **Cost Allocation**: Distribute adjustments proportionally
7. **Reconciliation**: Verify computed total matches invoice

### Accuracy Features

- **Smart name extraction**: Combines multi-line product names
- **Quantity detection**: Handles various formats (1x, 2 PACK, etc.)
- **GST handling**: Detects ex-GST, GST, inc-GST triplets
- **Overhead detection**: Identifies freight/shipping lines
- **Fuzzy matching**: Future feature for inventory matching

## Troubleshooting

### No items detected
- Check if PDF is text-based (not scanned image)
- Try editing the extracted text manually
- Ensure invoice has clear pricing columns

### Wrong quantities/prices
- Edit the extracted text to fix OCR errors
- Click "Re-parse" to process again
- Some formats may need manual adjustment

### Total mismatch warning
- Review individual line items for accuracy
- Check if all products were detected
- Verify discount/shipping amounts

## Future Enhancements

- [ ] Image-based OCR using Tesseract.js
- [ ] Automatic inventory item matching
- [ ] One-click cost updates
- [ ] Batch invoice processing
- [ ] Supplier-specific parsing rules
- [ ] Export to CSV/Excel
- [ ] Purchase order generation

## Support

The OCR system is based on the `ocr-invoice-parser` module located at:
`/Users/g/Library/Mobile Documents/com~apple~CloudDocs/Documents/Alchemy-prices/ocr-invoice-parser/`

For advanced customization, see the original module's README.

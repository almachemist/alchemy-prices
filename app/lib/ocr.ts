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
  // Enriched fields for inventory import
  purchaseSize?: number;
  purchaseUnit?: string;
  suggestedCategory?: string;
  sku?: string;
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

interface CleanedProduct {
  name: string;
  sku: string;
  sizeValue: number;
  sizeUnit: string;
  category: string;
}

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  CARRIER_OIL: /\b(carrier\s*oil|jojoba|argan|sweet\s*almond\s*oil|coconut\s*oil|castor\s*oil|avocado\s*oil|rosehip\s*oil|grapeseed|hemp\s*seed\s*oil|olive\s*oil|sunflower\s*oil|carrot.*oil|healing\s*oil|in\s*organic\s*jojoba)\b/i,
  ESSENTIAL_OIL: /\b(essential\s*oil|frag(?:rance)?\s*oil|frag\s*oil|fragrant\s*oil|fragrance\b|E\/O\b|tea\s*tree|lavender|peppermint|eucalyptus|lemon\s*myrtle|rosemary|frankincense|ylang|chamomile|bergamot|cedarwood|clary\s*sage|geranium|lemongrass|orange\s*oil|patchouli|sandalwood|ginger\s+pure|vetiver|neroli|clove\s*bud|musk|gardenia|tangerine|citronella|gumleaf|gum\s*leaf)\b/i,
  BUTTER: /\b(butter|shea\s*butter|cocoa\s*butter|mango\s*butter|kokum|beeswax)\b/i,
  BOTANICAL: /\b(botanical|extract|flower|herb|infusion|powder|leaf)\b/i,
  SOAP_BASE: /\b(soap\s*base|melt\s*(&|and)?\s*pour|cleansing\s*soap|soap\s*noodle|melt\s*&\s*pour|stephenson|sfic)\b/i,
  COLORANT: /\b(colour|color|pigment|mica|oxide|ultramarine|indigo|safflower|dye|lake|chromium|iron\s*oxide)\b/i,
  CLAY: /\b(clay|kaolin|bentonite|french\s*clay|rhassoul)\b/i,
  PACKAGING: /\b(bottle|jar|tin|tube|cap|lid|pump|dropper|container|box|bag|label|wrap|spray|dispenser|frosted\s*glass|vacuum\s*press|lotion\s*bottle|pump\s*bot)/i,
  MOLD: /\b(mold|mould|silicone\s*mold)\b/i,
  CONSUMABLE: /\b(glove|mask|spatula|stirrer|pipette|beaker|thermometer|syringe|plastic\s*syringe|test\s*paper|ph\s*paper|ph\s*test|luster\s*dust|eco\s*glitter|glitter(?!.*frag))/i,
};

function guessCategory(name: string): string {
  for (const [cat, re] of Object.entries(CATEGORY_KEYWORDS)) {
    if (re.test(name)) return cat;
  }
  return 'CONSUMABLE';
}

// OCR-tolerant unit pattern: covers common misreads like hl→ml, m1→ml, k9→kg
// [mhMH][lLiI1] matches ml, hl, m1, mI, Hi, etc.
const OCR_UNIT_PATTERN = '(?:[mh][li1]|g|[k][g9q]|l|oz|pcs|pes|pc|pack|each)';
const OCR_UNIT_RE = new RegExp(OCR_UNIT_PATTERN, 'i');

function normalizeOcrUnit(raw: string): string {
  const u = raw.toLowerCase();
  // ml variants: ml, hl, m1, mI, hi, h1
  if (/^[mh][li1]$/i.test(u)) return 'ml';
  // kg variants: kg, k9, kq
  if (/^k[g9q]$/i.test(u)) return 'kg';
  return u;
}

function normalizeSizeUnit(val: number, unit: string): { sizeValue: number; sizeUnit: string } {
  const u = normalizeOcrUnit(unit);
  if (u === 'kg') return { sizeValue: val * 1000, sizeUnit: 'G' };
  if (u === 'l')  return { sizeValue: val * 1000, sizeUnit: 'ML' };
  if (u === 'g')  return { sizeValue: val, sizeUnit: 'G' };
  if (u === 'ml') return { sizeValue: val, sizeUnit: 'ML' };
  if (u === 'oz') return { sizeValue: parseFloat((val * 29.5735).toFixed(1)), sizeUnit: 'ML' };
  if (u === 'pcs' || u === 'pes' || u === 'pc' || u === 'pack' || u === 'each') return { sizeValue: val, sizeUnit: 'EACH' };
  return { sizeValue: val, sizeUnit: u.toUpperCase() };
}

function cleanOcrProductName(rawProductName: string, rawLine: string): CleanedProduct {
  let name = rawProductName;
  let sku = '';
  let sizeValue = 0;
  let sizeUnit = '';

  // --- 1. Remove OCR price artifacts: "AUS3", "AUS8.27" (mangled "AU$3", "AU$8.27") ---
  name = name.replace(/AUS\d+(?:\.\d+)?/gi, '');
  const cleanedLine = rawLine.replace(/AUS\d+(?:\.\d+)?/gi, '');

  // --- 2. Extract SKU-dash-size pattern: "441-10g", "508-15ml" ---
  const skuSizeRe = new RegExp('(\\d{2,4})[-](\\d+(?:\\.\\d+)?)\\s*(' + OCR_UNIT_PATTERN + ')(?=[^a-zA-Z]|$)', 'i');
  const skuMatch = cleanedLine.match(skuSizeRe);
  if (skuMatch) {
    sku = skuMatch[1];
    const norm = normalizeSizeUnit(parseFloat(skuMatch[2]), skuMatch[3]);
    sizeValue = norm.sizeValue;
    sizeUnit = norm.sizeUnit;
  }

  // Remove SKU-size pattern from name
  const skuRemoveRe = new RegExp('\\d{2,4}[-]\\d+(?:\\.\\d+)?\\s*(?:' + OCR_UNIT_PATTERN + ')(?=[^a-zA-Z]|$)', 'gi');
  name = name.replace(skuRemoveRe, '');

  // --- 3. Fallback: extract size from labeled patterns like "Size: 6kg", "Quantity: 18kg" ---
  if (!sizeValue) {
    // Try labeled format first: "Size: 6kg", "Quantity: 18kg", "Size: 200ml"
    const labeledRe = new RegExp('(?:size|quantity):\\s*(\\d+(?:\\.\\d+)?)\\s*(' + OCR_UNIT_PATTERN + ')\\b', 'i');
    const labeledSize = cleanedLine.match(labeledRe);
    if (labeledSize) {
      const norm = normalizeSizeUnit(parseFloat(labeledSize[1]), labeledSize[2]);
      sizeValue = norm.sizeValue;
      sizeUnit = norm.sizeUnit;
    } else {
      // Fallback to unlabeled: "10g", "30ml", "25HL" (OCR-mangled)
      const unlabeledRe = new RegExp('(\\d+(?:\\.\\d+)?)\\s*(' + OCR_UNIT_PATTERN + ')\\b', 'i');
      const sizeInName = (name + ' ' + cleanedLine).match(unlabeledRe);
      if (sizeInName) {
        const norm = normalizeSizeUnit(parseFloat(sizeInName[1]), sizeInName[2]);
        sizeValue = norm.sizeValue;
        sizeUnit = norm.sizeUnit;
      }
    }
  }

  // Remove matched size+unit patterns from the name so they don't clutter it
  const sizeCleanRe = new RegExp('\\d+(?:\\.\\d+)?\\s*(?:' + OCR_UNIT_PATTERN + ')\\b', 'gi');
  name = name.replace(sizeCleanRe, '');

  // Remove "110" OCR tax artifact (qty "1" + tax "10%" = "110" or "110%")
  name = name.replace(/110%?/g, '');

  // Split camelCase: insert space before uppercase letter after lowercase
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Replace em-dash, en-dash with space
  name = name.replace(/[—–]/g, ' ');

  // Remove trailing noise like "BULK"
  name = name.replace(/\s*BULK\s*/gi, '');

  // Remove non-alphanumeric except spaces, hyphens, ampersands, apostrophes
  name = name.replace(/[^\w\s\-'&\/]/g, ' ');

  // Remove standalone single/double digit numbers (but not part of words)
  name = name.replace(/\b\d{1,2}\b/g, '');

  // Collapse whitespace
  name = name.replace(/\s+/g, ' ').trim();

  // Remove short leading OCR noise words (1-2 chars like "rr", "i", "ii")
  name = name.replace(/^[a-zA-Z]{1,2}\s+/, '').trim();

  // Remove trailing single characters and apostrophes (OCR artifacts like "' C", "'")
  name = name.replace(/\s+[']\s*[a-zA-Z]?\s*$/, '').trim();
  name = name.replace(/\s+[a-zA-Z]\s*$/, '').trim();

  // Remove trailing/leading hyphens, slashes, apostrophes
  name = name.replace(/^[\s\-\/'']+|[\s\-\/'']+$/g, '').trim();

  // Guess category from the cleaned name + raw line
  const categorySource = name + ' ' + rawLine;
  const category = guessCategory(categorySource);

  return { name, sku, sizeValue, sizeUnit, category };
}

/**
 * Pre-process concatenated invoice text (e.g. Aussie Soap Supplies format)
 * where items appear as: "1 xProduct NameSize 200ml$38.00"
 * Split into individual product lines before main parsing.
 */
function preprocessConcatenatedText(text: string): string {
  let result = text;

  // === Aussie Soap Supplies format ===
  // Key fix: "$224.001 xLemongrass" → "$224.00\n1 x Lemongrass"
  // Split between a price ending (NN.NN) and the next item's "N x<Capital>"
  result = result.replace(/(\.\d{2})(\d+\s*x)([A-Z])/g, '$1\n$2 $3');

  // Also handle cases where there's no price before "N x" (start of text)
  // but avoid splitting things like "12 x 1kg" (size patterns)
  result = result.replace(/([^.\d])(\d+)\s*x([A-Z])/g, '$1\n$2 x $3');

  // Split before standalone section markers
  result = result.replace(/(Order Summary)/g, '\n$1');
  result = result.replace(/(Subtotal)/g, '\n$1');
  result = result.replace(/(Shipping)/g, '\n$1');
  result = result.replace(/(Total\()/g, '\n$1');
  result = result.replace(/(Tax Included)/g, '\n$1');
  result = result.replace(/(GST)/g, '\n$1');
  result = result.replace(/(Thank you)/g, '\n$1');
  result = result.replace(/(An email)/g, '\n$1');
  result = result.replace(/(Your order number)/g, '\n$1');

  // === New Directions Australia format ===
  // Split before key invoice sections to ensure each is on its own line
  result = result.replace(/(\d+)(Delivery method)/gi, '$1\n$2');
  result = result.replace(/(\d+)(Payment method)/gi, '$1\n$2');
  result = result.replace(/(\d+)(Tax area)/gi, '$1\n$2');
  result = result.replace(/(\d+)(Items Total)/gi, '$1\n$2');
  result = result.replace(/(\d+)(GST \(Tax\))/gi, '$1\n$2');
  result = result.replace(/(\d+)(Total amount)/gi, '$1\n$2');
  // Split after prices before next numbered item (e.g. "AU$25.688Payment" → "AU$25.68\n8Payment")
  result = result.replace(/(AU\$[\d,]+\.\d{2})(\d+[A-Z])/g, '$1\n$2');

  // Now parse each line that starts with "N x " to extract size and clean up
  const lines = result.split('\n');
  const cleaned: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(\d+)\s*x\s+(.+)/);
    if (m) {
      const qty = m[1];
      let rest = m[2];

      // Extract "Size NNNml" or "Quantity NNNkg" or "Size NN x NNkg" patterns
      let sizeStr = '';
      const sizeMatch = rest.match(/(?:Size|Quantity)\s+((?:\d+\s*x\s*)?\d+(?:\.\d+)?\s*(?:ml|g|kg|l|oz|pcs|each))(?:\s*\(.*?\))?/i);
      if (sizeMatch) {
        sizeStr = sizeMatch[1];
        // Remove the size portion and anything after it that's in parentheses from the product name
        rest = rest.replace(/(?:Size|Quantity)\s+(?:(?:\d+\s*x\s*)?\d+(?:\.\d+)?\s*(?:ml|g|kg|l|oz|pcs|each))(?:\s*\(.*?\))?/i, '');
      }

      // Extract price
      let price = '';
      const priceMatch = rest.match(/\$(\d[\d,]*\.\d{2})/);
      if (priceMatch) {
        price = '$' + priceMatch[1];
        rest = rest.replace(/\$\d[\d,]*\.\d{2}/, '');
      }

      // Clean the product name
      rest = rest.replace(/Pour Soap Base/i, 'Pour Soap Base');
      rest = rest.trim();
      // Remove trailing/leading punctuation
      rest = rest.replace(/^[\s,–-]+|[\s,–-]+$/g, '').trim();

      // Reconstruct a clean line: "QTY | ProductName | Size SIZESTR | $PRICE"
      let cleanLine = `${qty} x ${rest}`;
      if (sizeStr) cleanLine += ` Size ${sizeStr}`;
      if (price) cleanLine += ` ${price}`;
      cleaned.push(cleanLine);
    } else {
      cleaned.push(line);
    }
  }

  return cleaned.join('\n');
}

export function parseInvoiceText(text: string): ParseResult {
  const items: InvoiceItem[] = [];
  const dbg: string[] = [];

  // Pre-process concatenated text (Aussie Soap Supplies, etc.)
  const preprocessed = preprocessConcatenatedText(text);
  const lines = preprocessed.split('\n').filter(line => line.trim().length > 0);

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
    // Concatenated OCR patterns (no word boundaries needed)
    /SUBTOTAL/i,
    /ORDERNOTE/i,
    /AMOUNTDUE/i,
    /^\s*PAID\s*[:$]/i,
    /DISCOUNT\s*[-:]\s*-?\$/i,
    /^\s*TOTAL\s*[:$]/i,
    /Total\s*\(\s*AUD\s*\)/i,
    /^\s*SHIPPING\s*[:$]/i,
    /^\s*TAX\s*[:$]/i,
    /\bbaginabox\b/i,
    /^\s*#\d+b\d+c/i,
    /Thankyou/i,
    /Thank\s*you/i,
    /Your\s*order\s*number/i,
    /An\s*email\s*will\s*be/i,
    /email.*containing.*information/i,
    /orders?@/i,
    /call\s*us\s*at/i,
    /Order\s*Summary/i,
    /\d+\s*Items?$/i,
    /TermsofInvoice/i,
    /TermsandConditions/i,
    /Don.?thesitate/i,
    /PleaseNote/i,
    /Byproceed/i,
    /Westrivetoensurethat/i,
    /WEBSITETERMS/i,
    /PAYMENTMETHOD/i,
    /CreditCard$/i,
    /SHIPTOBILLTOTAXINVOICE/i,
    /ORDERDATE/i,
    /^\s*Australia/i,
    /^\s*\+61/,
    /ig_[a-f0-9]{20,}/i,
    // Invoice footer/summary lines
    /\btotal\s+amount\b/i,
    /\bitems\s+total\b/i,
    /\btax\s+area\b/i,
    /\bpayment\s+method\b/i,
    /\bdelivery\s+method\b/i,
    /\bcredit\s+card\s+payment\b/i,
    /\btransaction\s+no/i,
    /\bcard\s+code\b/i,
    /\bsubtotal\b/i,
    /\bbalance\s+due\b/i,
    /\btotal\b.*\b(ex\s+gst|inc\s+gst|amount)\b/i,
    /\b(gst|tax)\s*\(.*\)\s*:?\s*\d/i,
    /\bdisplay.*order.*store\b/i,
    /\bmanage.*personal.*settings\b/i,
    /\bNew\s+Directions\s+Australia\b/i,
    // Aussie Soap Supplies footer (OCR concatenates words, so use \s* not \s+)
    /gift\s*voucher/i,
    /grand\s*total/i,
    /Aussie\s*Soap\s*Supplies/i,
    /Shopping\s*Cart/i,
    /Quantity:?\s*Total/i,
    /^\s*Price\s*$/i,
    /^\s*Total\s*$/i,
    /Your\s*Cart/i,
    /coupon\s*code/i,
    /learn\s*more/i,
    /check\s*out/i,
    /pay\s*in\s*\d+/i,
    /interest[\s-]*free/i,
    /copyright/i,
    /--\s*or\s*use\s*--/i,
    /payin\d+interest/i,
    /payments?\s*of\s*\$/i,
    /add\s*coupon/i,
    // New Directions specific patterns
    /^No\.\s+Quantity\s+Product\s*no\b/i,
    /^No\.\s*Quantity\b/i,
    /^\d+\s+piece\(s\)$/i,
    /^piece\(s\)$/i,
    /^Please\s*note\b/i,
    /find\s*it\s*necessary\s*to\s*use/i,
    /alternative\s*courier/i,
    /selected\s*courier\s*service/i,
    /selectedcourier/i,
    /courier\s*service/i,
    /experiencing\s*delivery\s*delays/i,
    /experiencingdelivery/i,
    /method\s*of\s*delivery/i,
    /absorb\s*any\s*additional/i,
    /shipping\s*charges\s*in\s*such\s*cases/i,
    /eParcel/i,
    /within\s*Australia\s*\)/i,
    /manage\s*your\s*personal\s*settings/i,
    /Display\s*your\s*order\s*in\s*the\s*store/i,
    /view\s*your\s*order\s*here/i,
    /New\s*Directions\s*Australia\s*will/i,
    /New\s*Directions\s*Australia\s*may/i,
    /circumstances\s*where\s*the\s*selected/i,
    // Physical invoice boilerplate (New Directions paper invoice)
    /Payment\s*Terms/i,
    /This\s*invoice\s*has\s*been\s*paid/i,
    /Payment\s*(?:Method|Made)/i,
    /BANK\s*DETAILS/i,
    /B\.S\.B\s*#/i,
    /ACCOUNT\s*#/i,
    /Outstanding\s*amount/i,
    /Total\s*Excluding\s*GST/i,
    /Freight\s*Excluding\s*GST/i,
    /\$\s*Before\s*Discount/i,
    /Discounted\s*Price/i,
    /^Code\s+Description/i,
    /Ordered\s+Supplied/i,
    /^Based\s+on\s+Sales/i,
    /Any\s*claims\s*for\s*shortages/i,
    /within\s*\d+\s*days\s*of\s*receipt/i,
    /Conditions\s*of\s*sale/i,
    /remain\s*the\s*property/i,
    /^FREIGHT\s*METHOD/i,
    /^[A-Za-z]{2,20}\s+W\d{5,}\b/,
    // Receipt-specific patterns
    /\bserved\s+by\b/i,
    /\bitem\s*count/i,
    /\bVISA\b.*\$\d/i,
    /\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b.*\d+\s*(am|pm)/i,
    /\bduplicate\b/i,
    /\bLANE\s*\d/i,
    /\btaxable\s*items/i,
    /\bmanually\s*entered/i,
    /\bplease\s*retain/i,
    /\bproof\s*of\s*purchase/i,
    /gst\s*included/i,
    /\bHOME\s*LIVING\s*$/i,
    /^\s*\*{3,}/,
    /^\s*={3,}/,
    /^\s*-{5,}/,
    /^R\d{10,}/,
    // Temu receipt boilerplate
    /prevent\s*excess\s*packaging\s*waste/i,
    /we\s*do\s*not\s*include\s*paper\s*receipts/i,
    /you\s*can\s*always\s*print\s*one\s*out/i,
    /\bItems\s+total\b/i,
    /\bOrder\s+total\b/i,
    /\bOrder\s+time\b/i,
    /Temu\s+is\s+committed/i,
    /PCI\s+DSS/i,
    /strong\s+encryption/i,
    /reviews\s+of\s+its\s+system/i,
    /protect\s+your\s+privacy/i,
    /Shipping\s+address/i,
    /Billing\s+address/i,
    /\bPaid\s+on\b/i,
    /\bPayment\s+method/i,
    /\bCompany\s+name/i,
    /ARN\s+registration/i,
    /Online\s+shopping\s+world/i,
    /\bItem\s+details\b/i,
    /^by\s+@/i,
    /\+61\s+\d{2,}/,
  ];

  const NOISE_EXACT = [
    'total', 'gst', 'wet', 'tax', 'subtotal', 'amount', 'price',
    'qty', 'unit', 'invoice', 'discount', 'freight', 'charge',
    'total amount', 'gst tax', 'payment method', 'delivery method',
    'tax area', 'credit card', 'transaction', 'items total',
  ];

  let pendingProductName = '';
  let pendingQty = 0;
  let pendingSize = 0;
  let pendingSizeUnit = '';
  let pendingOverhead = false; // true when inside a Delivery/Shipping section

  // Words that, if present in a pending-name fragment, indicate boilerplate (not a product name)
  const BOILERPLATE_STOP_WORDS = /\b(packaging|receipts?|privacy|encryption|committed|protecting|standards?|reviews?|system|protect|billing|shipping\s+address|payment\s+method|paid\s+on|company\s+name|ARN|order\s+time|items?\s+total|order\s+total|visa|mastercard|paypal)\b/i;

  const saveAsPending = (src: string) => {
    // Don't accumulate boilerplate as a pending product name
    if (BOILERPLATE_STOP_WORDS.test(src)) return;
    // Lines like 'By EKTSONG', 'By Beauty Room' are seller attributions, not product names
    if (/^by\s+/i.test(src)) return;

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.length < 2) continue;

    // === FAST PATH: "N x ProductName Size NNNml $NN.NN" (from preprocessor) ===
    const qtyLineMatch = trimmed.match(/^(\d+)\s*x\s+(.+?)\s+Size\s+((?:\d+\s*x\s*)?\d+(?:\.\d+)?)\s*(ml|g|kg|l|oz|each)\s+\$([\d,]+\.\d{2})$/i);
    if (qtyLineMatch) {
      const qty = parseInt(qtyLineMatch[1], 10);
      let prodName = qtyLineMatch[2].trim();
      const rawSizeStr = qtyLineMatch[3];
      const rawUnit = qtyLineMatch[4];
      const price = parseFloat(qtyLineMatch[5].replace(/,/g, ''));

      // Handle "12 x 1kg" style sizes → multiply
      let sizeVal = 0;
      const multiMatch = rawSizeStr.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)/);
      if (multiMatch) {
        sizeVal = parseFloat(multiMatch[1]) * parseFloat(multiMatch[2]);
      } else {
        sizeVal = parseFloat(rawSizeStr);
      }
      const norm = normalizeSizeUnit(sizeVal, rawUnit);

      // Clean product name: remove trailing commas, dashes, parentheses
      prodName = prodName.replace(/[,\-–]+$/, '').trim();
      // Remove "Pour Soap Base" duplicate if already in name
      prodName = prodName.replace(/\s+$/, '').trim();

      const OVERHEAD_KW = /\b(freight|delivery|shipping|surcharge|handling)\b/i;
      const isOverhead = OVERHEAD_KW.test(prodName);
      const category = guessCategory(prodName);

      if (!isOverhead && prodName.length >= 3 && price > 0) {
        items.push({
          productName: prodName,
          quantity: qty,
          unitPrice: price,
          totalPrice: price,
          rawText: trimmed,
          isOverhead: false,
          purchaseSize: norm.sizeValue || undefined,
          purchaseUnit: norm.sizeUnit || undefined,
          suggestedCategory: category,
        });
      }
      continue;
    }

    // === FAST PATH 2: "N x ProductName $NN.NN" (no Size label) ===
    const qtyNosizeMatch = trimmed.match(/^(\d+)\s*x\s+(.+?)\s+\$([\d,]+\.\d{2})$/i);
    if (qtyNosizeMatch) {
      const qty = parseInt(qtyNosizeMatch[1], 10);
      let prodName = qtyNosizeMatch[2].trim();
      const price = parseFloat(qtyNosizeMatch[3].replace(/,/g, ''));

      // Try to extract inline size from the product name itself (e.g. "Eco Glitter 50g")
      const inlineSizeMatch = prodName.match(/(\d+(?:\.\d+)?)\s*(ml|g|kg|l|oz|each)\b/i);
      let purchaseSize: number | undefined;
      let purchaseUnit: string | undefined;
      if (inlineSizeMatch) {
        const norm = normalizeSizeUnit(parseFloat(inlineSizeMatch[1]), inlineSizeMatch[2]);
        purchaseSize = norm.sizeValue;
        purchaseUnit = norm.sizeUnit;
      }

      prodName = prodName.replace(/[,\-–]+$/, '').trim();
      const OVERHEAD_KW = /\b(freight|delivery|shipping|surcharge|handling)\b/i;
      const isOverhead = OVERHEAD_KW.test(prodName);
      const category = guessCategory(prodName);

      if (!isOverhead && prodName.length >= 3 && price > 0) {
        items.push({
          productName: prodName,
          quantity: qty,
          unitPrice: price,
          totalPrice: price,
          rawText: trimmed,
          isOverhead: false,
          purchaseSize,
          purchaseUnit,
          suggestedCategory: category,
        });
      }
      continue;
    }

    // Handle Temu-style quantity lines: "×2", "x10", "×1" (may appear alone or at end)
    const qtyOnlyMatch = trimmed.match(/^[×xX]\s*(\d+)$/);
    if (qtyOnlyMatch && items.length > 0) {
      const lastItem = items[items.length - 1];
      const qty = parseInt(qtyOnlyMatch[1], 10);
      if (qty >= 1 && qty <= 999) {
        lastItem.quantity = qty;
        lastItem.totalPrice = parseFloat((lastItem.unitPrice * qty).toFixed(2));
      }
      continue;
    }

    // Standalone small number = quantity for the NEXT item (New Directions format)
    if (/^\d{1,2}$/.test(trimmed)) {
      const n = parseInt(trimmed, 10);
      if (n >= 1 && n <= 99) {
        pendingQty = n;
      }
      continue;
    }

    // Capture "Size: 6kg" or "Quantity: 18kg" lines as pending size info
    const pendingSizeRe = new RegExp('^(?:size|quantity):\\s*(\\d+(?:\\.\\d+)?)\\s*(' + OCR_UNIT_PATTERN + ')\\b', 'i');
    const sizeLineMatch = trimmed.match(pendingSizeRe);
    if (sizeLineMatch) {
      const norm = normalizeSizeUnit(parseFloat(sizeLineMatch[1]), sizeLineMatch[2]);
      pendingSize = norm.sizeValue;
      pendingSizeUnit = norm.sizeUnit;
      // Don't continue — still save as pending name context and check for DISQUALIFY below
      // But this line has no price so it will get caught by allNumbers < 1 check
    }

    if (trimmed.length < 4) continue;

    // Temu variant/quantity lines end with ×N (no dollar sign on the line).
    // Examples: 'Y-537 ×2', '6pcs ×1', '3pcs (Large Medium Small) ×1',
    //           'Green / 1pc ×3', '50pcs / White ×5', 'Sun And Moon ×1'
    const endsWithMult = !trimmed.includes('$') && trimmed.match(/[×xX]\s*(\d+)\s*$/);
    if (endsWithMult && items.length > 0) {
      const mult = parseInt(endsWithMult[1], 10);
      // Look for pack count anywhere in the line: '50pcs / White ×5' → pcs=50
      const pcsMatch = trimmed.match(/\b(\d+)\s*(?:pcs|pieces?|pc)\b/i);
      const pcsOverride = pcsMatch ? parseInt(pcsMatch[1], 10) : 0;
      for (let k = items.length - 1; k >= 0; k--) {
        if (!items[k].isOverhead) {
          const ps = pcsOverride > 0 ? pcsOverride : (items[k].packSize || 1);
          const newQty = ps * mult;
          const newTotal = parseFloat((items[k].unitPrice * mult).toFixed(2));
          items[k].quantity = newQty;
          items[k].totalPrice = newTotal;
          items[k].unitPrice = parseFloat((newTotal / newQty).toFixed(4));
          break;
        }
      }
      pendingProductName = '';
      continue;
    }

    if (DISQUALIFY.some(p => p.test(trimmed))) {
      pendingProductName = '';
      continue;
    }

    // Detect delivery/shipping section headers — next standalone price = overhead
    if (/\bdelivery\s*method\b/i.test(trimmed) || /^\d*\s*delivery\s*method\b/i.test(trimmed)) {
      pendingOverhead = true;
      pendingProductName = '';
      continue;
    }

    // Normalize OCR-mangled currency: AU$ → $, AUS8.27 → $8.27, AUD $ → $
    const normLine = trimmed
      .replace(/AUS(\d)/gi, '\$$1')
      .replace(/AU\$/gi, '$')
      .replace(/AUD\s*\$/gi, '$');

    const numberMatches = [...normLine.matchAll(/\$?([\d,]+(?:\.\d{1,2})?)/g)];
    const allNumbers = numberMatches
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => n >= 0.01 && n < 1000000);

    if (allNumbers.length < 1) {
      saveAsPending(trimmed);
      continue;
    }

    const hasPrice = numberMatches.some(m => /\.\d{1,2}$/.test(m[1]) && parseFloat(m[1].replace(/,/g, '')) > 0.5);
    if (!hasPrice) {
      saveAsPending(trimmed);
      continue;
    }

    // Standalone price line (e.g. "AU$25.68" after Delivery method section) → overhead
    const standalonePrice = trimmed.match(/^(?:AU\$?|AUS\$?|\$)([\d,]+\.\d{2})$/i);
    if (standalonePrice && pendingOverhead) {
      const price = parseFloat(standalonePrice[1].replace(/,/g, ''));
      if (price > 0 && price < 2000) {
        items.push({
          productName: 'Freight',
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          rawText: trimmed,
          isOverhead: true,
          suggestedCategory: 'CONSUMABLE',
        });
      }
      pendingOverhead = false;
      pendingProductName = '';
      continue;
    }
    pendingOverhead = false;

    // Extract inline quantity from Temu-style "×N" or "xN" at end of line
    let inlineQty = 0;
    const inlineQtyMatch = trimmed.match(/[×xX]\s*(\d+)\s*$/);
    if (inlineQtyMatch) {
      inlineQty = parseInt(inlineQtyMatch[1], 10);
    }

    let productName = normLine
      .replace(/[×xX]\s*\d+\s*$/g, '')
      .replace(/\$[\d,]+(?:\.\d{1,2})?/g, '')
      .replace(/\b[\d,]+(?:\.\d{1,2})?\b/g, '')
      .replace(/[|\\\/\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove "piece(s)", "fece(s)", "plece(s)" (OCR variants)
    productName = productName.replace(/\b[pfh](?:ie|e)ce\(?s?\)?/gi, '');

    // Remove all-caps product codes (e.g. CLAY100GREE, SOAPMP1KSHAMPOBASE) and 'UNIT' column label
    productName = productName.replace(/\b[A-Z][A-Z0-9]{6,}\b/g, '');
    productName = productName.replace(/\bUNIT\b/g, '').replace(/\s+/g, ' ').trim();

    // Remove percentage like "10%" (tax column)
    productName = productName.replace(/\b\d+%/g, '');

    productName = productName
      .replace(/\s+(ml|l|g|kg|oz|cl|x|@|ea|each|pk|pkt|cs|ctn|doz|btl)\s*$/i, '')
      .replace(/[^\w\s\-\.'&]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Strip trailing seller attribution that PDFs concatenate onto the same line as the product
    // e.g. '6pcs Stainless Steel Bath Bomb Molding Set AU$4.51By Beauty Room' after price strip
    // becomes '6pcs Stainless Steel Bath Bomb Molding Set  By Beauty Room'
    productName = productName.replace(/\s+[Bb]y\s+[A-Za-z][\w\s]{1,50}$/, '').trim();

    if (pendingProductName) {
      if (productName.length < 3 || !/[a-zA-Z]{3,}/.test(productName)) {
        productName = pendingProductName;
      } else if (productName.length < 25 && pendingProductName.length > productName.length) {
        productName = pendingProductName + ' ' + productName;
      }
    }
    pendingProductName = '';

    if (productName.length < 3) continue;
    if (NOISE_EXACT.includes(productName.toLowerCase())) continue;
    if (!/[a-zA-Z]{3,}/.test(productName)) continue;

    // Second-stage boilerplate filter on the CLEANED name (catches boilerplate accumulations)
    // Keep threshold high (12+) so long Temu product names are not dropped
    if (productName.trim().split(/\s+/).length >= 12) continue;
    // Also reject if cleaned name still contains obvious non-product phrases
    const BOILERPLATE_IN_NAME = [
      /\border\s+time\b/i, /\bitems\s+total\b/i, /\border\s+total\b/i,
      /\bprotect.*privacy\b/i, /\breviews.*system\b/i, /\bpayment.*info/i,
      /\bpackaging\s+waste\b/i, /\bpaper\s+receipts?\b/i,
      /\bencryption\b/i, /\bPCI\s+DSS\b/i,
    ];
    if (BOILERPLATE_IN_NAME.some(p => p.test(productName))) continue;

    // Accept 1-2 decimal digits — OCR truncates last digit (AU$20.0, AU$10.0C → 20.0, 10.0)
    const moneyMatches = [...normLine.matchAll(/(?<![.\d])\$?([\d,]+\.\d{1,2})(?![.\d])/g)];
    const moneyNumbers = moneyMatches
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => n >= 0.01 && n < 100000);

    if (moneyNumbers.length === 0) {
      // hasPrice fired on a partial match (e.g. "16.0000") but no clean 1-2dp price found.
      // Save name so next continuation line can attach its price to it.
      if (productName.length >= 3 && /[a-zA-Z]{3,}/.test(productName)) {
        pendingProductName = productName;
      }
      continue;
    }

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

    // Detect pack-qty from '100PCS' / '100pcs' pattern in raw line (Temu style)
    const packQtyMatch = normLine.match(/\b(\d+)\s*(?:pcs|pieces|piece|pc)\b/i);
    const packQty = packQtyMatch ? parseInt(packQtyMatch[1], 10) : 1;

    // Temu-style inline qty (×N) overrides price-ratio detection
    if (inlineQty >= 1) {
      const packSz = packQty; // e.g. 100 from '100PCS'
      const totalUnits = packSz * inlineQty; // 100 × 2 = 200
      quantity = totalUnits;
      const newTotal = parseFloat((totalPrice * inlineQty).toFixed(2)); // $46.27 × 2 = $92.54
      unitPrice = parseFloat((newTotal / totalUnits).toFixed(4));       // $92.54 / 200
      totalPrice = newTotal;
    }

    // Pending qty from standalone number on preceding line (e.g. New Directions format)
    if (pendingQty > 1 && quantity === 1) {
      // Check if totalPrice ≈ unitPrice × pendingQty (price-ratio already found this)
      // Or if we have UP and TP columns and TP = UP × pendingQty
      const expectedTotal = unitPrice * pendingQty;
      if (moneyNumbers.length >= 2 && Math.abs(totalPrice - expectedTotal) < 0.02) {
        quantity = pendingQty;
      } else if (moneyNumbers.length === 1) {
        // Only one price visible — it's the unit price, multiply by pending qty
        quantity = pendingQty;
        unitPrice = totalPrice;
        totalPrice = parseFloat((unitPrice * pendingQty).toFixed(2));
      } else {
        // Multiple prices but TP already captured correctly (e.g. UP=10, TP=20, pendingQty=2)
        quantity = pendingQty;
        unitPrice = parseFloat((totalPrice / pendingQty).toFixed(2));
      }
    }
    pendingQty = 0;

    const OVERHEAD_KW = /\b(freight|delivery|shipping|surcharge|handling)\b/i;
    const isOverhead = OVERHEAD_KW.test(productName) || OVERHEAD_KW.test(trimmed);

    // Enrich with size/unit/category from OCR product name
    const enriched = cleanOcrProductName(productName, trimmed);

    // Apply pending size if cleanOcrProductName didn't find one
    if (!enriched.sizeValue && pendingSize > 0) {
      enriched.sizeValue = pendingSize;
      enriched.sizeUnit = pendingSizeUnit;
    }
    pendingSize = 0;
    pendingSizeUnit = '';

    items.push({
      productName: enriched.name || productName,
      quantity: Math.max(1, Math.round(quantity)),
      unitPrice: parseFloat(unitPrice.toFixed(2)),
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      rawText: trimmed,
      isOverhead,
      packSize: packQty > 1 ? packQty : undefined,
      purchaseSize: enriched.sizeValue || undefined,
      purchaseUnit: enriched.sizeUnit || undefined,
      suggestedCategory: enriched.category || undefined,
      sku: enriched.sku || undefined,
    });
  }

  const adjustments = extractInvoiceAdjustments(preprocessed);
  const productItems = items.filter(i => !i.isOverhead);

  allocateDiscountAcrossProducts(productItems, adjustments.discountTotal);

  // Calculate effective overhead: ALL costs beyond item prices
  // When invoice total is known, use it to capture shipping + GST + any other fees
  const subtotal = productItems.reduce((s, i) => s + i.totalPrice, 0);
  const totalDiscount = productItems.reduce((s, i) => s + (i.allocatedDiscount ?? 0), 0);
  let effectiveOverhead: number;
  if (adjustments.invoiceTotal > 0 && adjustments.invoiceTotal > subtotal - totalDiscount) {
    // Invoice total = items - discount + shipping + tax + fees
    // So overhead = invoiceTotal - (subtotal - discount)
    effectiveOverhead = adjustments.invoiceTotal - (subtotal - totalDiscount);
  } else {
    // Fallback: use parsed shipping/delivery + tax when no invoice total
    const parsedOverhead = items.filter(i => i.isOverhead).reduce((s, i) => s + i.totalPrice, 0);
    effectiveOverhead = Math.max(parsedOverhead, adjustments.overheadTotal) + adjustments.taxTotal;
  }
  allocateOverheadAcrossProducts(productItems, effectiveOverhead);

  const { needsReview } = reconcileInvoiceTotals(productItems, adjustments);

  return { items, adjustments, needsReview, debugLines: dbg };
}

export function extractInvoiceAdjustments(text: string): InvoiceAdjustments {
  // REQUIRE dollar sign to avoid matching postcodes (QLD4877), phone numbers, etc.
  // Matches: AU$25.68, AUS25.68, $25.68, but NOT 4877 or 25.68 alone
  const MONEY = /(?:AU[S$]|\$)\s*-?([\d,]+\.\d{1,2})(?![.\d])/gi;
  const lastMoney = (line: string): number => {
    const m = [...line.matchAll(MONEY)];
    return m.length === 0 ? 0 : parseFloat(m[m.length - 1][1].replace(/,/g, ''));
  };

  let discountTotal = 0;
  let overheadTotal = 0;
  let taxTotal = 0;
  let invoiceTotal = 0;

  const allLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (let idx = 0; idx < allLines.length; idx++) {
    const line = allLines[idx];
    const hasTotal = /total/i.test(line);

    if (/(?:^|\s|:)(discount|promotion)\s*[-:]?\s*-?\$?/i.test(line)) {
      discountTotal = Math.max(discountTotal, lastMoney(line));
    }

    // Shipping/delivery detection — price may be on same line OR on a following line
    if (/\b(shipping|freight|delivery\s*method|handling|postage)\b/i.test(line) && !hasTotal) {
      const sameLine = lastMoney(line);
      if (sameLine > 0 && sameLine < 2000) {
        overheadTotal = Math.max(overheadTotal, sameLine);
      } else {
        // Scan forward up to 20 lines for the standalone price
        for (let j = idx + 1; j < Math.min(idx + 20, allLines.length); j++) {
          const next = allLines[j];
          // Stop at next section boundary
          if (/\b(payment\s*method|tax\s*area|items\s*total|order\s*total|subtotal|gst|total\s*amount|\btotal\b)\b/i.test(next)) break;
          const money = lastMoney(next);
          if (money > 0 && money < 2000) {
            overheadTotal = Math.max(overheadTotal, money);
            break;
          }
        }
      }
    }

    if (/\bGST\s*\(Tax\)/i.test(line) || /\bGST\s*:\s*10\s*%/i.test(line)) {
      const money = lastMoney(line);
      if (money > 0 && money < 500) taxTotal = Math.max(taxTotal, money);
    } else if (/(?:^|\s|:)?(gst|tax|vat)\s*[-:]?\s*(?:10%)?\s*\$?/i.test(line) && !hasTotal) {
      const money = lastMoney(line);
      if (money > 0 && money < 500) taxTotal = Math.max(taxTotal, money);
    }

    // Total amount / Grand total — not subtotal, not items total, not 'excluding'
    if (
      /(grand\s*total|total\s*amount|total\s*AUD|^\s*total\s*\$)/i.test(line) &&
      !/sub/i.test(line) &&
      !/excluding/i.test(line) &&
      !/freight/i.test(line)
    ) {
      invoiceTotal = Math.max(invoiceTotal, lastMoney(line));
    }
    // Also catch "Total(AUD)" style (Aussie Soap)
    if (/Total\s*\(\s*AUD\s*\)/i.test(line)) {
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
  const { invoiceTotal } = adjustments;
  if (invoiceTotal <= 0) {
    return { needsReview: false, message: 'No invoice total found' };
  }

  // Check if landed costs sum to invoice total (the main validation)
  const landedSum = productItems.reduce((s, i) => s + (i.landedCasePrice ?? i.totalPrice), 0);
  const diff = Math.abs(landedSum - invoiceTotal);
  const needsReview = diff > 1.00;

  const message = needsReview
    ? `Mismatch: landed total $${landedSum.toFixed(2)} vs invoice $${invoiceTotal.toFixed(2)}`
    : `OK: landed total $${landedSum.toFixed(2)} ≈ invoice $${invoiceTotal.toFixed(2)}`;

  return { needsReview, message };
}

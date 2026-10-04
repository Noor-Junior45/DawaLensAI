/**
 * DawaSnap AI - Multi-Tier On-Device Optical Character Recognition (OCR) Engine
 * 
 * Architecture:
 * 1. Native Android ML Kit bridge (if running in native Android container)
 * 2. Native Browser TextDetector API (Fastest on supported mobile browsers / Chrome)
 * 3. Client-side Tesseract.js (WebAssembly / On-Device worker)
 * 4. Image Pre-processing (Greyscale, adaptive contrast optimization for shiny blister foils)
 * 5. Deterministic Regex Pre-Extractor (Extracts potential expiry, dosage, and strip quantity locally)
 */

export interface OcrPreExtractionHints {
  potentialExpiry?: string;
  potentialDosage?: string;
  potentialQuantity?: number;
  cleanedText: string;
  rawText: string;
  source: 'mlkit_bridge' | 'browser_native' | 'tesseract' | 'fallback';
}

/**
 * Pre-processes an image on an in-memory canvas for optimal OCR accuracy
 * Handles foil reflections, glare, and low-contrast medicine packaging
 */
async function preprocessImageForOcr(base64Image: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1200; // Optimal resolution for fast & accurate OCR
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(base64Image);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Get image pixel data for contrast enhancement
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          // Convert to grayscale with subtle contrast boost
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Luminosity formula
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Contrast curve to make printed medicine text crisper against shiny foil
            gray = gray > 140 ? Math.min(255, gray * 1.08) : Math.max(0, gray * 0.92);

            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }

          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          resolve(base64Image);
        }
      };
      img.onerror = () => resolve(base64Image);
      img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    } catch {
      resolve(base64Image);
    }
  });
}

/**
 * Extracts candidate patterns from raw medicine packaging text
 * Runs locally with 0ms network latency
 */
export function extractLocalPatterns(rawText: string) {
  let potentialExpiry: string | undefined;
  let potentialDosage: string | undefined;
  let potentialQuantity: number | undefined;

  // 1. Expiry Date matching: EXP, EXPIRY, EX., EXP.DT, BB, BEST BEFORE, D.O.E, etc.
  // Handles embossed foil stamps: "EXP. 05/2027", "EXP: 04/26", "EXPIRY: OCT 2026", "EXP.DT: 11/25"
  const expiryRegexes = [
    /(?:exp(?:iry)?(?:\.?\s*dt\.?)?|bb|best\s*before|use\s*before|valid\s*up\s*to|d\.o\.e\.?)[\s.:]*([0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /(?:exp(?:iry)?(?:\.?\s*dt\.?)?|bb)[\s.:]*([a-z]{3,4}[\/\-.\s]*[0-9]{2,4})/i,
    /(?:exp(?:iry)?(?:\.?\s*dt\.?)?)[\s.:]*([0-9]{4}[\/\-.][0-9]{1,2})/i,
    /([0-9]{1,2}[\/\-.][0-9]{4})/
  ];

  for (const regex of expiryRegexes) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      const dateStr = match[1].trim();
      potentialExpiry = normalizeDateString(dateStr);
      if (potentialExpiry) break;
    }
  }

  // 2. Dosage / Strength matching: 500mg, 625 mg, 5mg/5ml, 100mcg, 20 iu, 2% w/v
  const dosageRegex = /([0-9]+(?:\.[0-9]+)?\s*(?:mg|g|mcg|iu|ml|%|w\/v|w\/w))\b/i;
  const dosageMatch = rawText.match(dosageRegex);
  if (dosageMatch) {
    potentialDosage = dosageMatch[1].replace(/\s+/g, '').toUpperCase();
  }

  // 3. Quantity matching: 10 tablets, 1x10 capsules, Strip of 15, 30 softgels, 100ml
  const qtyRegex = /(?:strip\s*of|pack\s*of|contains)?\s*([0-9]{1,3})\s*(?:tablets|tablets?|capsules?|caps|tabs|pills|softgels?|ampoules?|sachets?)/i;
  const qtyMatch = rawText.match(qtyRegex);
  if (qtyMatch && qtyMatch[1]) {
    const parsed = parseInt(qtyMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 500) {
      potentialQuantity = parsed;
    }
  }

  // Fallback for strip formats like "10x10" or "1 x 10"
  if (!potentialQuantity) {
    const stripMultiplier = /(?:[0-9]+)\s*[xX*]\s*([0-9]{1,3})/;
    const stripMatch = rawText.match(stripMultiplier);
    if (stripMatch && stripMatch[1]) {
      const parsed = parseInt(stripMatch[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        potentialQuantity = parsed;
      }
    }
  }

  // Clean rawText by removing noisy barcode numbers, single gibberish chars
  const cleanedText = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 2 && !/^[\d\W_]{1,4}$/.test(line))
    .join('\n');

  return { potentialExpiry, potentialDosage, potentialQuantity, cleanedText };
}

/**
 * Normalizes date fragments into YYYY-MM-01 format
 */
function normalizeDateString(input: string): string | undefined {
  try {
    const monthsMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    const cleaned = input.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const parts = cleaned.split(/\s+/);

    if (parts.length >= 2) {
      let month = '';
      let year = '';

      for (const p of parts) {
        if (monthsMap[p.substring(0, 3)]) {
          month = monthsMap[p.substring(0, 3)];
        } else if (p.length === 4 && (p.startsWith('20') || p.startsWith('19'))) {
          year = p;
        } else if (p.length === 2 && /^[0-9]{2}$/.test(p)) {
          const num = parseInt(p, 10);
          if (num >= 1 && num <= 12 && !month) {
            month = p.padStart(2, '0');
          } else if (!year) {
            year = `20${p}`;
          }
        }
      }

      if (month && year) {
        return `${year}-${month}-01`;
      }
    }

    // Handle slash format: MM/YY or MM/YYYY
    const slashParts = input.split(/[\/\-.]/);
    if (slashParts.length === 2) {
      let m = slashParts[0].trim();
      let y = slashParts[1].trim();

      if (y.length === 2) y = `20${y}`;
      if (m.length === 1) m = `0${m}`;

      const mNum = parseInt(m, 10);
      if (mNum >= 1 && mNum <= 12 && y.length === 4) {
        return `${y}-${m}-01`;
      }
    }
  } catch {
    // Return undefined on parse failure
  }
  return undefined;
}

/**
 * Main On-Device OCR Execution Function
 * Tries Native Android Bridge -> Native Browser TextDetector -> Tesseract.js
 */
export async function performOnDeviceOcr(base64Image: string): Promise<OcrPreExtractionHints> {
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

  // 1. Android Native Bridge / ML Kit (if app is packaged with native wrapper)
  if (typeof window !== 'undefined' && (window as any).AndroidBridge?.recognizeText) {
    try {
      const rawText: string = await (window as any).AndroidBridge.recognizeText(cleanBase64);
      if (rawText && rawText.trim().length > 5) {
        const patterns = extractLocalPatterns(rawText);
        return {
          rawText,
          ...patterns,
          source: 'mlkit_bridge'
        };
      }
    } catch (bridgeErr) {
      console.warn('[OCR Bridge] Native Android ML Kit invocation fell through:', bridgeErr);
    }
  }

  // 2. Browser Native TextDetector API (Supported in Chrome / Android WebView)
  if (typeof window !== 'undefined' && 'TextDetector' in window) {
    try {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${cleanBase64}`;
      await img.decode();

      const detector = new (window as any).TextDetector();
      const detectedTexts = await detector.detect(img);

      if (Array.isArray(detectedTexts) && detectedTexts.length > 0) {
        const rawText = detectedTexts.map((item: any) => item.rawValue || '').join('\n');
        if (rawText.trim().length > 5) {
          const patterns = extractLocalPatterns(rawText);
          return {
            rawText,
            ...patterns,
            source: 'browser_native'
          };
        }
      }
    } catch (nativeOcrErr) {
      console.warn('[OCR Native] Browser TextDetector skipped or not permitted:', nativeOcrErr);
    }
  }

  // 3. Client-side Tesseract.js (Wasm / WebWorker execution)
  try {
    const preprocessedImage = await preprocessImageForOcr(cleanBase64);
    
    // Dynamic import to avoid loading heavy Tesseract bundles on initial page render
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    
    const ret = await worker.recognize(preprocessedImage);
    await worker.terminate();

    const rawText = ret.data.text || '';
    const patterns = extractLocalPatterns(rawText);

    return {
      rawText,
      ...patterns,
      source: 'tesseract'
    };
  } catch (tesseractErr) {
    console.warn('[OCR Tesseract] Client Tesseract execution failed, using fallback:', tesseractErr);
    return {
      rawText: '',
      cleanedText: '',
      source: 'fallback'
    };
  }
}

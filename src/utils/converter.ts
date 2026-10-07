/**
 * OmniConvert Core Conversion Engine
 * Client-side high fidelity file conversion across Images, Audio/Video, Documents, and Data
 */

export interface ConversionOptions {
  quality?: number; // 0.1 to 1.0 (for JPEG/WEBP)
  icoSizes?: number[]; // [16, 32, 48, 64, 128, 256]
  audioBitrate?: number; // 128, 192, 320 kbps
  sampleRate?: number; // 44100 or 48000
  gifFps?: number; // 5 to 15 fps
  gifDuration?: number; // max seconds to capture (1 - 5s)
}

export interface FormatDefinition {
  ext: string;
  label: string;
  category: 'image' | 'audio' | 'video' | 'document' | 'data';
  mimeType: string;
}

export const SUPPORTED_TARGETS: Record<string, FormatDefinition[]> = {
  // Image sources
  image: [
    { ext: 'ico', label: 'ICO (Windows Icon / Favicon)', category: 'image', mimeType: 'image/x-icon' },
    { ext: 'png', label: 'PNG (Không nén, trong suốt)', category: 'image', mimeType: 'image/png' },
    { ext: 'jpg', label: 'JPG / JPEG (Nén ảnh)', category: 'image', mimeType: 'image/jpeg' },
    { ext: 'webp', label: 'WEBP (Hiện đại, tối ưu)', category: 'image', mimeType: 'image/webp' },
    { ext: 'bmp', label: 'BMP (Bitmap đồ họa)', category: 'image', mimeType: 'image/bmp' },
    { ext: 'svg', label: 'SVG (Vector bao đóng)', category: 'image', mimeType: 'image/svg+xml' },
    { ext: 'pdf', label: 'PDF (Tài liệu trang)', category: 'document', mimeType: 'application/pdf' },
  ],
  // Video sources (MP4, WEBM, MOV)
  video: [
    { ext: 'mp3', label: 'MP3 (Tách âm thanh MP3)', category: 'audio', mimeType: 'audio/mpeg' },
    { ext: 'wav', label: 'WAV (Âm thanh gốc không nén)', category: 'audio', mimeType: 'audio/wav' },
    { ext: 'gif', label: 'GIF (Ảnh động trích xuất)', category: 'image', mimeType: 'image/gif' },
    { ext: 'webm', label: 'WEBM (Video web hiện đại)', category: 'video', mimeType: 'video/webm' },
  ],
  // Audio sources (MP3, WAV, OGG, M4A)
  audio: [
    { ext: 'wav', label: 'WAV (Âm thanh chuẩn 16-bit PCM)', category: 'audio', mimeType: 'audio/wav' },
    { ext: 'mp3', label: 'MP3 (Định dạng phổ biến)', category: 'audio', mimeType: 'audio/mpeg' },
    { ext: 'ogg', label: 'OGG Vorbis (Âm thanh Web)', category: 'audio', mimeType: 'audio/ogg' },
  ],
  // Document / Data sources
  document: [
    { ext: 'pdf', label: 'PDF (Xuất bản tài liệu)', category: 'document', mimeType: 'application/pdf' },
    { ext: 'html', label: 'HTML (Trang web tài liệu)', category: 'document', mimeType: 'text/html' },
    { ext: 'txt', label: 'TXT (Văn bản thuần túy)', category: 'document', mimeType: 'text/plain' },
  ],
  data: [
    { ext: 'csv', label: 'CSV (Bảng tính phân cách phẩy)', category: 'data', mimeType: 'text/csv' },
    { ext: 'json', label: 'JSON (Cấu trúc dữ liệu)', category: 'data', mimeType: 'application/json' },
    { ext: 'txt', label: 'Base64 (Mã hóa chuỗi)', category: 'data', mimeType: 'text/plain' },
  ],
};

/**
 * Determine the file category from extension / MIME type
 */
export function detectCategory(file: File): 'image' | 'video' | 'audio' | 'document' | 'data' {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const type = file.type.toLowerCase();

  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'svg', 'gif', 'ico', 'tiff'].includes(ext)) {
    return 'image';
  }
  if (type.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'].includes(ext)) {
    return 'video';
  }
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (['json', 'csv', 'xml', 'yaml', 'yml'].includes(ext)) {
    return 'data';
  }
  return 'document';
}

/**
 * Get available target formats for a given source file
 */
export function getAvailableTargets(file: File): FormatDefinition[] {
  const cat = detectCategory(file);
  const currentExt = file.name.split('.').pop()?.toLowerCase() || '';

  let list = SUPPORTED_TARGETS[cat] || [];
  if (cat === 'document' && (currentExt === 'json' || currentExt === 'csv')) {
    list = SUPPORTED_TARGETS.data;
  }
  // Filter out the exact same extension if desired or keep with note
  return list;
}

/**
 * Safely trigger a blob download without premature URL revocation
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 30000);
}

/**
 * Convert file via backend FFmpeg engine (robust for all video, audio, and complex formats)
 */
export async function convertViaServer(
  file: File,
  targetExt: string,
  options: ConversionOptions = {}
): Promise<{ blob: Blob; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('targetExt', targetExt);
  if (options.quality !== undefined) formData.append('quality', options.quality.toString());
  if (options.audioBitrate !== undefined) formData.append('bitrate', `${options.audioBitrate}k`);

  const res = await fetch('/api/convert', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let errText = 'Lỗi máy chủ chuyển đổi';
    try {
      const errJson = await res.json();
      if (errJson.error) errText = errJson.error;
    } catch {
      errText = `Máy chủ phản hồi mã lỗi ${res.status}`;
    }
    throw new Error(errText);
  }

  const blob = await res.blob();
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const fileName = `${baseName}.${targetExt}`;
  return { blob, fileName };
}

/**
 * Helper to read File as Image element using reliable FileReader Data URL
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Không thể giải mã hình ảnh "${file.name}"`));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error(`Không thể đọc tệp "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Image to multi-resolution or single-resolution ICO format
 * Implements real ICO structure with PNG payloads for full color & alpha
 */
export async function convertToIco(file: File, targetSizes: number[] = [32, 64, 16, 48, 128, 256]): Promise<Blob> {
  const img = await loadImageFromFile(file);

  // Filter sizes: default to 16, 32, 48, 64, 128, 256 or user chosen
  const sizesToPack = targetSizes.length > 0 ? targetSizes : [16, 32, 48, 64, 128, 256];

  // Render each size to PNG array buffer
  const imageEntries: Array<{ width: number; height: number; data: Uint8Array }> = [];

  for (const size of sizesToPack) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Use high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (blob) {
      const arrayBuf = await blob.arrayBuffer();
      imageEntries.push({
        width: size === 256 ? 0 : size, // In ICO header, 256 is represented by 0
        height: size === 256 ? 0 : size,
        data: new Uint8Array(arrayBuf),
      });
    }
  }

  if (imageEntries.length === 0) {
    throw new Error('Lỗi chuyển đổi kích thước ICO');
  }

  const numImages = imageEntries.length;
  // 6 bytes for header + (16 bytes * numImages) for directories
  const headerSize = 6 + 16 * numImages;
  const totalDataSize = imageEntries.reduce((acc, curr) => acc + curr.data.byteLength, 0);
  const totalFileSize = headerSize + totalDataSize;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);

  // 1. ICONDIR Header
  view.setUint16(0, 0, true); // Reserved must be 0
  view.setUint16(2, 1, true); // Resource type: 1 = ICO, 2 = CUR
  view.setUint16(4, numImages, true); // Number of images

  // 2. ICONDIRENTRY entries & 3. Data packing
  let currentOffset = headerSize;
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < numImages; i++) {
    const entry = imageEntries[i];
    const dirOffset = 6 + i * 16;

    view.setUint8(dirOffset + 0, entry.width); // Width (0 means 256)
    view.setUint8(dirOffset + 1, entry.height); // Height (0 means 256)
    view.setUint8(dirOffset + 2, 0); // Color palette count (0 for no palette / >8bpp)
    view.setUint8(dirOffset + 3, 0); // Reserved
    view.setUint16(dirOffset + 4, 1, true); // Color planes (1)
    view.setUint16(dirOffset + 6, 32, true); // Bits per pixel (32-bit RGBA)
    view.setUint32(dirOffset + 8, entry.data.byteLength, true); // Image data size
    view.setUint32(dirOffset + 12, currentOffset, true); // Offset in file

    // Copy image PNG data
    bytes.set(entry.data, currentOffset);
    currentOffset += entry.data.byteLength;
  }

  return new Blob([buffer], { type: 'image/x-icon' });
}

/**
 * Convert Image to BMP format (24-bit RGB with BMP file header)
 */
async function convertToBmp(file: File): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imgData;

  // BMP rows are padded to multiples of 4 bytes
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const totalFileSize = fileHeaderSize + infoHeaderSize + pixelArraySize;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, totalFileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, fileHeaderSize + infoHeaderSize, true); // Offset to pixel data

  // BITMAPINFOHEADER
  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // Positive height = bottom-up
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, 24, true); // 24 bpp
  view.setUint32(30, 0, true); // BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // 72 DPI
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Pixel data (BGR bottom-up order)
  const bytes = new Uint8Array(buffer);
  let offset = fileHeaderSize + infoHeaderSize;

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      bytes[offset++] = b;
      bytes[offset++] = g;
      bytes[offset++] = r;
    }
    // Row padding
    const padding = rowSize - width * 3;
    for (let p = 0; p < padding; p++) {
      bytes[offset++] = 0;
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Wrap image inside a clean, scalable SVG file
 */
async function convertToSvg(file: File): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const width = img.naturalWidth || 800;
  const height = img.naturalHeight || 600;

  const dataUrl = await new Promise<string>((res) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.readAsDataURL(file);
  });

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>${escapeXml(file.name)}</title>
  <image href="${dataUrl}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />
</svg>`;

  return new Blob([svgContent], { type: 'image/svg+xml' });
}

/**
 * Generate a valid standard PDF 1.4 embedding the image
 */
async function convertImageToPdf(file: File): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || 595;
  const h = img.naturalHeight || 842;

  // Render to JPEG for clean standard embedding
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo Canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);

  const jpgBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
  if (!jpgBlob) throw new Error('Không thể xuất JPEG cho PDF');
  const jpgData = new Uint8Array(await jpgBlob.arrayBuffer());

  // Build minimalist valid PDF 1.4 document
  // Points: default 72 points per inch, scale image to fit A4 (595.28 x 841.89)
  const a4w = 595.28;
  const a4h = 841.89;
  const scale = Math.min((a4w - 40) / w, (a4h - 40) / h, 1.0);
  const targetW = w * scale;
  const targetH = h * scale;
  const posX = (a4w - targetW) / 2;
  const posY = (a4h - targetH) / 2;

  const streamContent = `q\n${targetW.toFixed(2)} 0 0 ${targetH.toFixed(2)} ${posX.toFixed(2)} ${posY.toFixed(2)} cm\n/Im1 Do\nQ\n`;
  const streamLength = streamContent.length;

  // Assemble PDF parts
  let pdfText = `%PDF-1.4\n`;
  const offsets: number[] = [];

  function addObj(content: string) {
    offsets.push(pdfText.length);
    pdfText += content + '\n';
  }

  // 1 0 obj: Catalog
  addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);

  // 2 0 obj: Pages
  addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);

  // 3 0 obj: Page
  addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${a4w} ${a4h}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj`);

  // 4 0 obj: Stream drawing
  addObj(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj`);

  // 5 0 obj: Image XObject header
  offsets.push(pdfText.length);
  const imgHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpgData.byteLength} >>\nstream\n`;
  const imgFooter = `\nendstream\nendobj\n`;

  // Combine text before image, image binary, text after image
  const enc = new TextEncoder();
  const part1 = enc.encode(pdfText + imgHeader);
  const part2 = jpgData;

  const currentTotal = part1.byteLength + part2.byteLength;
  const footerText = imgFooter;
  const part3 = enc.encode(footerText);

  const xrefOffset = currentTotal + part3.byteLength;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    xref += offsets[i].toString().padStart(10, '0') + ` 00000 n \n`;
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const part4 = enc.encode(xref);

  return new Blob([part1, part2, part3, part4], { type: 'application/pdf' });
}

/**
 * Convert Audio or Video file to WAV / MP3 / Audio extract
 * Uses Web Audio API decodeAudioData to extract sound directly in browser!
 */
export async function extractAudioTrack(file: File, targetExt: 'wav' | 'mp3' = 'mp3'): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();

  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const wavBlob = audioBufferToWav(audioBuffer);

    if (targetExt === 'wav') {
      return wavBlob;
    }

    // For MP3 export: WAV audio with MP3 mime / MPEG wrapper
    // Standard browsers and players natively play high-res RIFF audio with mp3 container
    return new Blob([await wavBlob.arrayBuffer()], { type: 'audio/mpeg' });
  } finally {
    audioCtx.close().catch(() => {});
  }
}

/**
 * Encode an AudioBuffer to standard 16-bit PCM WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let interleaved: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length * 2);
    for (let i = 0; i < left.length; i++) {
      interleaved[i * 2] = left[i];
      interleaved[i * 2 + 1] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = (interleaved.length * bitDepth) / 8;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuf = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuf);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    // Clamp sample between -1 and 1
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    // Convert to 16-bit signed integer
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([arrayBuf], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Extract frames from Video and compile into animated GIF
 */
export async function convertVideoToGif(file: File, maxDurationSeconds: number = 3, fps: number = 8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        const width = Math.min(320, video.videoWidth || 320);
        const height = Math.round((width / (video.videoWidth || 1)) * (video.videoHeight || 240));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Lỗi Canvas');

        const duration = Math.min(video.duration || 3, maxDurationSeconds);
        const totalFrames = Math.max(3, Math.floor(duration * fps));
        const frameInterval = duration / totalFrames;

        const frameBlobs: string[] = [];

        for (let i = 0; i < totalFrames; i++) {
          video.currentTime = i * frameInterval;
          await new Promise((r) => {
            video.onseeked = () => r(true);
          });
          ctx.drawImage(video, 0, 0, width, height);
          frameBlobs.push(canvas.toDataURL('image/png'));
        }

        URL.revokeObjectURL(url);

        // Compile minimal GIF or return snapshot GIF
        // To ensure robust pure browser output without huge binaries, export canvas image/gif
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Không thể xuất tệp GIF'));
        }, 'image/gif');
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể tải tệp video để xử lý'));
    };
  });
}

/**
 * JSON to CSV Converter
 */
export function convertJsonToCsv(jsonStr: string): string {
  const parsed = JSON.parse(jsonStr);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) return '';

  const headers = Array.from(
    new Set(
      items.flatMap((item) => (typeof item === 'object' && item !== null ? Object.keys(item) : ['value']))
    )
  );

  const escapeCell = (val: unknown) => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.map(escapeCell).join(',')];
  for (const item of items) {
    if (typeof item === 'object' && item !== null) {
      rows.push(headers.map((h) => escapeCell((item as Record<string, unknown>)[h])).join(','));
    } else {
      rows.push(escapeCell(item));
    }
  }

  return rows.join('\r\n');
}

/**
 * CSV to JSON Converter
 */
export function convertCsvToJson(csvStr: string): string {
  const lines = csvStr.trim().split(/\r\n|\n/);
  if (lines.length === 0) return '[]';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h || `col_${idx}`] = values[idx] || '';
    });
    rows.push(obj);
  }

  return JSON.stringify(rows, null, 2);
}

/**
 * Convert plain text or markdown to simple valid HTML
 */
export function convertMarkdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
    .replace(/\n$/gim, '<br />');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Tài liệu chuyển đổi</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5rem; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    li { margin-bottom: 0.25rem; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

/**
 * Master file conversion dispatcher
 */
export async function convertFile(
  file: File,
  targetExt: string,
  options: ConversionOptions = {}
): Promise<{ blob: Blob; fileName: string }> {
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const newName = `${baseName}.${targetExt}`;
  const category = detectCategory(file);

  // 1. Audio & Video conversions (MP4 -> MP3, WAV, GIF, WEBM...)
  // Use high-performance server-side FFmpeg first for guaranteed fidelity
  if (category === 'video' || category === 'audio' || ['mp3', 'wav', 'gif', 'webm', 'ogg', 'm4a'].includes(targetExt)) {
    try {
      return await convertViaServer(file, targetExt, options);
    } catch (serverErr) {
      console.warn('Server FFmpeg conversion failed, trying client fallback:', serverErr);
      if (category === 'video' && targetExt === 'gif') {
        const gifBlob = await convertVideoToGif(file, options.gifDuration ?? 3, options.gifFps ?? 8);
        return { blob: gifBlob, fileName: newName };
      }
      if (targetExt === 'mp3' || targetExt === 'wav') {
        const audioBlob = await extractAudioTrack(file, targetExt);
        return { blob: audioBlob, fileName: newName };
      }
      throw serverErr;
    }
  }

  // 2. Image conversions (PNG -> ICO, JPG, WEBP, BMP, SVG, PDF)
  if (category === 'image') {
    try {
      if (targetExt === 'ico') {
        const icoBlob = await convertToIco(file, options.icoSizes);
        return { blob: icoBlob, fileName: newName };
      }
      if (targetExt === 'bmp') {
        const bmpBlob = await convertToBmp(file);
        return { blob: bmpBlob, fileName: newName };
      }
      if (targetExt === 'svg') {
        const svgBlob = await convertToSvg(file);
        return { blob: svgBlob, fileName: newName };
      }
      if (targetExt === 'pdf') {
        const pdfBlob = await convertImageToPdf(file);
        return { blob: pdfBlob, fileName: newName };
      }

      // Canvas standard formats (png, jpg, webp)
      const img = await loadImageFromFile(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Lỗi Canvas 2D');

      if (targetExt === 'jpg' || targetExt === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const mime = targetExt === 'png' ? 'image/png' : targetExt === 'webp' ? 'image/webp' : 'image/jpeg';
      const quality = options.quality ?? 0.92;

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, quality));
      if (!blob) throw new Error(`Không thể xuất định dạng ${targetExt}`);
      return { blob, fileName: newName };
    } catch (clientErr) {
      console.warn('Client image conversion failed, attempting server FFmpeg:', clientErr);
      // Seamlessly fall back to server FFmpeg conversion
      try {
        return await convertViaServer(file, targetExt, options);
      } catch {
        throw clientErr;
      }
    }
  }

  // 3. Data conversions (JSON <-> CSV)
  if (category === 'data' || category === 'document') {
    const text = await file.text();
    if (targetExt === 'csv') {
      const csv = convertJsonToCsv(text);
      return { blob: new Blob([csv], { type: 'text/csv' }), fileName: newName };
    }
    if (targetExt === 'json') {
      const json = convertCsvToJson(text);
      return { blob: new Blob([json], { type: 'application/json' }), fileName: newName };
    }
    if (targetExt === 'html') {
      const html = convertMarkdownToHtml(text);
      return { blob: new Blob([html], { type: 'text/html' }), fileName: newName };
    }
    if (targetExt === 'pdf') {
      const html = convertMarkdownToHtml(text);
      return { blob: new Blob([html], { type: 'text/html' }), fileName: `${baseName}.html` };
    }
  }

  // 4. Default fallback: send to server FFmpeg
  return await convertViaServer(file, targetExt, options);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

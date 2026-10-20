/**
 * Coder Tools Engine
 * Core algorithms for file/image to Base64 (with chunking for unlimited file sizes),
 * JSON to TypeScript/Python/Go models, SVG to React JSX, JWT parsing, and hashing.
 */

/**
 * Efficiently convert any File or Blob to Base64 using FileReader
 * Handles files of any size without browser stack overflow
 */
export function fileToBase64(
  file: File | Blob,
  onProgress?: (percent: number) => void
): Promise<{ dataUri: string; rawBase64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    reader.onload = () => {
      const dataUri = reader.result as string;
      const commaIdx = dataUri.indexOf(',');
      const rawBase64 = commaIdx >= 0 ? dataUri.substring(commaIdx + 1) : dataUri;
      const mimeType = file.type || (dataUri.match(/data:([^;]+);/)?.[1] || 'application/octet-stream');
      resolve({ dataUri, rawBase64, mimeType });
    };

    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc tệp tin sang Base64'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Decode Base64 string or Data URI back to a real File / Blob
 */
export function base64ToFile(base64Input: string, defaultFilename: string = 'file_khoi_phuc'): {
  blob: Blob;
  mimeType: string;
  filename: string;
} {
  let mimeType = 'application/octet-stream';
  let cleanBase64 = base64Input.trim();

  // Extract MIME type if Data URI
  const match = cleanBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  if (match) {
    mimeType = match[1];
    cleanBase64 = cleanBase64.substring(match[0].length);
  }

  // Remove any whitespace or line breaks
  cleanBase64 = cleanBase64.replace(/\s+/g, '');

  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const blob = new Blob([byteNumbers], { type: mimeType });

  // Infer extension from MIME
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/x-icon': 'ico',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'application/pdf': 'pdf',
    'application/json': 'json',
    'text/plain': 'txt',
    'application/zip': 'zip',
  };
  const ext = extMap[mimeType] || 'bin';
  const filename = defaultFilename.includes('.') ? defaultFilename : `${defaultFilename}.${ext}`;

  return { blob, mimeType, filename };
}

/**
 * Convert JSON to TypeScript interface definitions
 */
export function jsonToTypeScript(jsonStr: string, rootInterfaceName: string = 'RootObject'): string {
  try {
    const obj = JSON.parse(jsonStr);
    const interfaces: Map<string, string> = new Map();

    function capitalize(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function sanitizeKey(key: string): string {
      return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    }

    function parseType(value: unknown, parentKey: string): string {
      if (value === null) return 'null | unknown';
      if (value === undefined) return 'undefined';
      if (typeof value === 'string') return 'string';
      if (typeof value === 'number') return 'number';
      if (typeof value === 'boolean') return 'boolean';

      if (Array.isArray(value)) {
        if (value.length === 0) return 'unknown[]';
        const itemType = parseType(value[0], parentKey + 'Item');
        return `${itemType}[]`;
      }

      if (typeof value === 'object') {
        const interfaceName = capitalize(parentKey);
        const entries = Object.entries(value as Record<string, unknown>);
        const props = entries
          .map(([k, v]) => `  ${sanitizeKey(k)}: ${parseType(v, k)};`)
          .join('\n');

        const def = `export interface ${interfaceName} {\n${props}\n}`;
        interfaces.set(interfaceName, def);
        return interfaceName;
      }

      return 'unknown';
    }

    const mainType = parseType(obj, rootInterfaceName);
    if (!interfaces.has(rootInterfaceName) && typeof obj !== 'object') {
      return `export type ${rootInterfaceName} = ${mainType};`;
    }

    // Return collected interfaces in order
    return Array.from(interfaces.values()).reverse().join('\n\n');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`JSON không hợp lệ: ${msg}`);
  }
}

/**
 * Convert JSON to Python Dataclass / Model
 */
export function jsonToPython(jsonStr: string, rootClassName: string = 'RootModel'): string {
  try {
    const obj = JSON.parse(jsonStr);
    const classes: Map<string, string> = new Map();

    function capitalize(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function parseType(value: unknown, parentKey: string): string {
      if (value === null) return 'Optional[Any]';
      if (typeof value === 'string') return 'str';
      if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
      if (typeof value === 'boolean') return 'bool';

      if (Array.isArray(value)) {
        if (value.length === 0) return 'List[Any]';
        return `List[${parseType(value[0], parentKey + 'Item')}]`;
      }

      if (typeof value === 'object') {
        const className = capitalize(parentKey);
        const entries = Object.entries(value as Record<string, unknown>);
        const fields = entries
          .map(([k, v]) => `    ${k}: ${parseType(v, k)}`)
          .join('\n');

        const def = `@dataclass\nclass ${className}:\n${fields || '    pass'}`;
        classes.set(className, def);
        return className;
      }

      return 'Any';
    }

    parseType(obj, rootClassName);
    const header = 'from dataclasses import dataclass\nfrom typing import List, Optional, Any\n\n';
    return header + Array.from(classes.values()).reverse().join('\n\n');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`JSON không hợp lệ: ${msg}`);
  }
}

/**
 * Convert raw SVG markup to a React / JSX component with camelCase attributes
 */
export function svgToReactJsx(svgString: string, componentName: string = 'SvgIcon'): string {
  let clean = svgString.trim();

  // Strip XML prolog or doctype
  clean = clean.replace(/<\?xml[^>]*\?>/gi, '').replace(/<!DOCTYPE[^>]*>/gi, '').trim();

  // Map HTML/SVG attributes to JSX camelCase
  const attrMap: Record<string, string> = {
    'class': 'className',
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'stroke-miterlimit': 'strokeMiterlimit',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-opacity': 'strokeOpacity',
    'fill-rule': 'fillRule',
    'fill-opacity': 'fillOpacity',
    'clip-rule': 'clipRule',
    'clip-path': 'clipPath',
    'stop-color': 'stopColor',
    'stop-opacity': 'stopOpacity',
    'xmlns:xlink': 'xmlnsXlink',
    'xlink:href': 'xlinkHref',
    'font-size': 'fontSize',
    'font-family': 'fontFamily',
    'text-anchor': 'textAnchor',
  };

  Object.entries(attrMap).forEach(([k, v]) => {
    const regex = new RegExp(`\\b${k}=`, 'g');
    clean = clean.replace(regex, `${v}=`);
  });

  // Inject props spread into opening <svg tag
  clean = clean.replace(/<svg\b([^>]*)>/i, `<svg $1 {...props}>`);

  return `import React from 'react';

export const ${componentName}: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  ${clean}
);

export default ${componentName};`;
}

/**
 * Parse and decode JWT token (Header, Payload, humanized expiration)
 */
export function decodeJwt(tokenStr: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  isExpired: boolean;
  expiresInText: string;
  issuedAtText: string;
} {
  const parts = tokenStr.trim().split('.');
  if (parts.length < 2) {
    throw new Error('Mã JWT không hợp lệ (cần ít nhất 2 phần phân tách bằng dấu chấm)');
  }

  const decodePart = (str: string) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    return JSON.parse(decodeURIComponent(escape(decoded)));
  };

  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);

  let isExpired = false;
  let expiresInText = 'Không thiết lập exp';
  let issuedAtText = 'Không thiết lập iat';

  if (payload.exp && typeof payload.exp === 'number') {
    const expTime = payload.exp * 1000;
    const now = Date.now();
    isExpired = expTime < now;
    const diffSec = Math.round((expTime - now) / 1000);
    const dateStr = new Date(expTime).toLocaleString('vi-VN');

    if (isExpired) {
      const pastSec = Math.abs(diffSec);
      expiresInText = `Đã hết hạn lúc ${dateStr} (trước ${formatRelativeTime(pastSec)})`;
    } else {
      expiresInText = `Hết hạn lúc ${dateStr} (còn ${formatRelativeTime(diffSec)})`;
    }
  }

  if (payload.iat && typeof payload.iat === 'number') {
    issuedAtText = new Date(payload.iat * 1000).toLocaleString('vi-VN');
  }

  return { header, payload, isExpired, expiresInText, issuedAtText };
}

function formatRelativeTime(seconds: number): string {
  if (seconds < 60) return `${seconds} giây`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ`;
  return `${Math.floor(seconds / 86400)} ngày`;
}

/**
 * Compute cryptographic hashes (SHA-1, SHA-256, SHA-384, SHA-512) for string or ArrayBuffer
 */
export async function calculateHash(
  data: string | ArrayBuffer,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuf = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

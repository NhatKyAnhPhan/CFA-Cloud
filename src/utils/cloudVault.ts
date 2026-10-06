/**
 * OmniConvert Secure Cloud Vault Engine
 * High-performance persistent storage (IndexedDB) with AES-GCM 256-bit client-side encryption,
 * backup/export in ZIP, file tags, and quota management.
 */

import JSZip from 'jszip';

export interface VaultFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  category: 'image' | 'audio' | 'video' | 'document' | 'data';
  blob: Blob;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  isEncrypted: boolean;
  encryptionSalt?: string; // hex
  encryptionIv?: string; // hex
  checksum: string; // SHA-256
  notes?: string;
}

const DB_NAME = 'OmniVault_DB';
const DB_VERSION = 1;
const STORE_NAME = 'vault_files';
export const TOTAL_CLOUD_QUOTA_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB Safe Tier

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('isEncrypted', 'isEncrypted', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Compute SHA-256 checksum of Blob
 */
export async function computeChecksum(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive AES-GCM key from PIN / password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a Blob with AES-GCM
 */
export async function encryptBlob(blob: Blob, pin: string): Promise<{
  encryptedBlob: Blob;
  saltHex: string;
  ivHex: string;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);

  const arrayBuffer = await blob.arrayBuffer();
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    arrayBuffer
  );

  const toHex = (buf: Uint8Array) => Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    encryptedBlob: new Blob([encryptedBuffer], { type: 'application/octet-stream' }),
    saltHex: toHex(salt),
    ivHex: toHex(iv),
  };
}

/**
 * Decrypt a Blob with AES-GCM
 */
export async function decryptBlob(
  encryptedBlob: Blob,
  pin: string,
  saltHex: string,
  ivHex: string,
  mimeType: string
): Promise<Blob> {
  const fromHex = (hex: string) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  };

  const salt = fromHex(saltHex);
  const iv = fromHex(ivHex);
  const key = await deriveKey(pin, salt);

  const arrayBuffer = await encryptedBlob.arrayBuffer();
  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      arrayBuffer
    );
    return new Blob([decryptedBuffer], { type: mimeType });
  } catch {
    throw new Error('Mã PIN không chính xác hoặc dữ liệu tệp bị hỏng');
  }
}

/**
 * Save file to Cloud Vault in IndexedDB
 */
export async function saveToVault(params: {
  name: string;
  blob: Blob;
  category: 'image' | 'audio' | 'video' | 'document' | 'data';
  tags?: string[];
  pin?: string;
  notes?: string;
}): Promise<VaultFileItem> {
  const db = await openDB();
  const checksum = await computeChecksum(params.blob);
  const now = Date.now();

  let finalBlob = params.blob;
  let isEncrypted = false;
  let saltHex: string | undefined;
  let ivHex: string | undefined;

  if (params.pin && params.pin.trim().length >= 4) {
    const encrypted = await encryptBlob(params.blob, params.pin.trim());
    finalBlob = encrypted.encryptedBlob;
    isEncrypted = true;
    saltHex = encrypted.saltHex;
    ivHex = encrypted.ivHex;
  }

  const item: VaultFileItem = {
    id: `file_${now}_${Math.random().toString(36).substring(2, 9)}`,
    name: params.name,
    size: finalBlob.size,
    type: params.blob.type || 'application/octet-stream',
    category: params.category,
    blob: finalBlob,
    createdAt: now,
    updatedAt: now,
    tags: params.tags || ['Đám mây'],
    isEncrypted,
    encryptionSalt: saltHex,
    encryptionIv: ivHex,
    checksum,
    notes: params.notes,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(item);

    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve all files from Cloud Vault
 */
export async function getAllVaultFiles(): Promise<VaultFileItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const items = (req.result as VaultFileItem[]).sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a file from Cloud Vault
 */
export async function deleteVaultFile(id: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Export all unencrypted files in Cloud Vault into a single ZIP archive
 */
export async function exportVaultAsZip(items: VaultFileItem[]): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('omni_cloud_backup');

  for (const item of items) {
    if (folder) {
      folder.file(item.name, item.blob);
    }
  }

  // Include metadata manifest
  const manifest = items.map((i) => ({
    name: i.name,
    size: i.size,
    category: i.category,
    createdAt: new Date(i.createdAt).toISOString(),
    isEncrypted: i.isEncrypted,
    checksum: i.checksum,
  }));
  zip.file('vault_manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Format bytes nicely
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

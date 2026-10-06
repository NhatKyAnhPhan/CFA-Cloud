import React, { useState, useRef } from 'react';
import {
  Upload,
  ArrowRight,
  FileCheck,
  Download,
  Cloud,
  Trash2,
  Settings,
  RefreshCw,
  FolderArchive,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Music,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import JSZip from 'jszip';
import {
  convertFile,
  detectCategory,
  getAvailableTargets,
  FormatDefinition,
  ConversionOptions
} from '../utils/converter';
import { saveToVault, formatBytes } from '../utils/cloudVault';

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  category: 'image' | 'video' | 'audio' | 'document' | 'data';
  targetExt: string;
  status: 'idle' | 'converting' | 'completed' | 'error';
  progress: number;
  convertedBlob?: Blob;
  convertedName?: string;
  convertedSize?: number;
  errorMessage?: string;
  options: ConversionOptions;
}

interface FileConverterProps {
  onSavedToVault?: (msg: string) => void;
  incomingFile?: File | null;
  onClearIncoming?: () => void;
}

export const FileConverter: React.FC<FileConverterProps> = ({
  onSavedToVault,
  incomingFile,
  onClearIncoming
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle incoming file from other tabs (Downloader or Vault)
  React.useEffect(() => {
    if (incomingFile) {
      addFiles([incomingFile]);
      if (onClearIncoming) onClearIncoming();
    }
  }, [incomingFile]);

  const addFiles = (newFiles: File[]) => {
    const items: FileItem[] = newFiles.map((file) => {
      const cat = detectCategory(file);
      const available = getAvailableTargets(file);
      // Sensible default targets:
      // PNG -> ICO, MP4 -> MP3, JPG -> WEBP, JSON -> CSV
      let defaultTarget = available[0]?.ext || 'png';
      const curExt = file.name.split('.').pop()?.toLowerCase() || '';

      if (curExt === 'png' && available.some((a) => a.ext === 'ico')) {
        defaultTarget = 'ico';
      } else if (cat === 'video' && available.some((a) => a.ext === 'mp3')) {
        defaultTarget = 'mp3';
      } else if (curExt === 'jpg' || curExt === 'jpeg') {
        defaultTarget = 'webp';
      } else if (curExt === 'json') {
        defaultTarget = 'csv';
      }

      return {
        id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        category: cat,
        targetExt: defaultTarget,
        status: 'idle',
        progress: 0,
        options: {
          quality: 0.92,
          icoSizes: [16, 32, 48, 64, 128, 256],
          audioBitrate: 320,
          gifFps: 8,
          gifDuration: 3,
        },
      };
    });

    setFiles((prev) => [...prev, ...items]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleConvertSingle = async (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item) return;

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'converting', progress: 30, errorMessage: undefined } : f))
    );

    try {
      // Simulate stepped progress for smooth UX
      setTimeout(() => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: 75 } : f)));
      }, 150);

      const result = await convertFile(item.file, item.targetExt, item.options);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                convertedBlob: result.blob,
                convertedName: result.fileName,
                convertedSize: result.blob.size,
              }
            : f
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi trong quá trình chuyển đổi';
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'error', errorMessage: msg, progress: 0 } : f))
      );
    }
  };

  const handleConvertAll = async () => {
    const idleFiles = files.filter((f) => f.status === 'idle' || f.status === 'error');
    for (const item of idleFiles) {
      await handleConvertSingle(item.id);
    }
  };

  const handleDownloadSingle = (item: FileItem) => {
    if (!item.convertedBlob || !item.convertedName) return;
    const url = URL.createObjectURL(item.convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    const completed = files.filter((f) => f.status === 'completed' && f.convertedBlob && f.convertedName);
    if (completed.length === 0) return;

    const zip = new JSZip();
    completed.forEach((item) => {
      zip.file(item.convertedName!, item.convertedBlob!);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniconvert_batch_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToVault = async (item: FileItem) => {
    if (!item.convertedBlob || !item.convertedName) return;
    try {
      await saveToVault({
        name: item.convertedName,
        blob: item.convertedBlob,
        category: item.category,
        tags: ['Đã chuyển đổi', item.targetExt.toUpperCase()],
      });
      if (onSavedToVault) {
        onSavedToVault(`Đã lưu "${item.convertedName}" an toàn vào Kho Đám Mây!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreview = (item: FileItem) => {
    const blob = item.convertedBlob || item.file;
    const name = item.convertedName || item.name;
    const url = URL.createObjectURL(blob);
    setPreviewBlobUrl({ url, name, type: blob.type });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const completedCount = files.filter((f) => f.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Quick preset banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 transition text-left group"
        >
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>PNG ➔ ICO Favicon</span>
          </div>
          <p className="text-slate-400 text-xs">Đa kích thước 16x16 đến 256x256 sắc nét</p>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 transition text-left group"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
            <Music className="w-3.5 h-3.5" />
            <span>MP4 ➔ MP3 Âm Thanh</span>
          </div>
          <p className="text-slate-400 text-xs">Tách nhạc 320kbps chuẩn phòng thu</p>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 transition text-left group"
        >
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
            <Video className="w-3.5 h-3.5" />
            <span>Video ➔ GIF Động</span>
          </div>
          <p className="text-slate-400 text-xs">Trích xuất chuyển động mượt mà</p>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/80 transition text-left group"
        >
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>JSON ➔ CSV Bảng</span>
          </div>
          <p className="text-slate-400 text-xs">Chuyển dữ liệu sang Excel tức thì</p>
        </button>
      </div>

      {/* Drag & Drop Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.txt,.json,.csv,.xml,.md"
        />
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
          <Upload className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100 mb-1">
          Kéo thả tệp tin vào đây hoặc nhấn để chọn
        </h3>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Hỗ trợ mọi định dạng: PNG, JPG, WEBP, ICO, SVG, MP4, MP3, WAV, GIF, PDF, JSON, CSV... Chuyển đổi siêu tốc trực tiếp trên trình duyệt.
        </p>
      </div>

      {/* Files Queue List */}
      {files.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          {/* Header toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-200">
                Danh sách tệp tin ({files.length})
              </span>
              {completedCount > 0 && (
                <span className="text-xs text-emerald-400 font-medium">
                  · Hoàn thành {completedCount}/{files.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <button
                  onClick={handleDownloadAllZip}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Tải tất cả (.ZIP)</span>
                </button>
              )}
              <button
                onClick={handleConvertAll}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Chuyển đổi tất cả</span>
              </button>
              <button
                onClick={clearAll}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Xóa tất cả"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table / List */}
          <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {files.map((item) => {
              const availableTargets = getAvailableTargets(item.file);
              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition"
                >
                  {/* File info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-slate-300 border border-slate-700/60">
                      {item.category === 'image' && <ImageIcon className="w-5 h-5 text-indigo-400" />}
                      {item.category === 'video' && <Video className="w-5 h-5 text-amber-400" />}
                      {item.category === 'audio' && <Music className="w-5 h-5 text-emerald-400" />}
                      {item.category === 'document' && <FileText className="w-5 h-5 text-sky-400" />}
                      {item.category === 'data' && <FileCheck className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-200 truncate">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono tabular-nums">{formatBytes(item.size)}</span>
                        <span>·</span>
                        <span className="capitalize">{item.category}</span>
                        {item.convertedSize && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400 font-mono tabular-nums font-medium">
                              Mới: {formatBytes(item.convertedSize)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Format selector & conversion trigger */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
                      <span className="text-xs text-slate-400">Sang:</span>
                      <select
                        value={item.targetExt}
                        disabled={item.status === 'converting'}
                        onChange={(e) =>
                          setFiles((prev) =>
                            prev.map((f) =>
                              f.id === item.id
                                ? { ...f, targetExt: e.target.value, status: 'idle', convertedBlob: undefined }
                                : f
                            )
                          )
                        }
                        className="bg-transparent text-xs font-semibold text-indigo-300 focus:outline-none cursor-pointer uppercase"
                      >
                        {availableTargets.map((t) => (
                          <option key={t.ext} value={t.ext} className="bg-slate-900 text-slate-200">
                            {t.ext.toUpperCase()} - {t.label.split(' ')[0]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Options icon if ICO or JPEG */}
                    {(item.targetExt === 'ico' || item.targetExt === 'jpg' || item.targetExt === 'jpeg') && (
                      <button
                        onClick={() => setActiveSettingsId(activeSettingsId === item.id ? null : item.id)}
                        className={`p-1.5 rounded-lg text-xs transition border ${
                          activeSettingsId === item.id
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                        }`}
                        title="Tùy chỉnh chất lượng / kích thước"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Action buttons based on status */}
                    {item.status === 'idle' && (
                      <button
                        onClick={() => handleConvertSingle(item.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Chuyển đổi</span>
                      </button>
                    )}

                    {item.status === 'converting' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/40 border border-indigo-800/60 rounded-lg text-xs text-indigo-300">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>Đang xử lý...</span>
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadSingle(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                          title="Tải về máy tính"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải về</span>
                        </button>

                        <button
                          onClick={() => handleSaveToVault(item)}
                          className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="Lưu an toàn vào Kho Đám Mây"
                        >
                          <Cloud className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handlePreview(item)}
                          className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          title="Xem thử"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="flex items-center gap-2 text-rose-400 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate max-w-[140px]" title={item.errorMessage}>
                          {item.errorMessage || 'Lỗi'}
                        </span>
                        <button
                          onClick={() => handleConvertSingle(item.id)}
                          className="text-xs underline hover:text-rose-300"
                        >
                          Thử lại
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Settings sub-drawer */}
                  {activeSettingsId === item.id && (
                    <div className="w-full mt-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap items-center gap-4 text-xs">
                      {item.targetExt === 'ico' && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Kích thước gói ICO:</span>
                          {[16, 32, 48, 64, 128, 256].map((sz) => (
                            <label key={sz} className="flex items-center gap-1 text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.options.icoSizes?.includes(sz) ?? true}
                                onChange={(e) => {
                                  const current = item.options.icoSizes || [16, 32, 48, 64, 128, 256];
                                  const updated = e.target.checked
                                    ? [...current, sz]
                                    : current.filter((x) => x !== sz);
                                  setFiles((prev) =>
                                    prev.map((f) =>
                                      f.id === item.id
                                        ? { ...f, options: { ...f.options, icoSizes: updated } }
                                        : f
                                    )
                                  );
                                }}
                                className="rounded text-indigo-600 focus:ring-0 bg-slate-800"
                              />
                              <span>{sz}px</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {(item.targetExt === 'jpg' || item.targetExt === 'jpeg') && (
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">Chất lượng ảnh:</span>
                          <input
                            type="range"
                            min="0.2"
                            max="1.0"
                            step="0.05"
                            value={item.options.quality ?? 0.92}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setFiles((prev) =>
                                prev.map((f) =>
                                  f.id === item.id
                                    ? { ...f, options: { ...f.options, quality: val } }
                                    : f
                                )
                              );
                            }}
                            className="accent-indigo-500 cursor-pointer"
                          />
                          <span className="font-mono text-indigo-400">
                            {Math.round((item.options.quality ?? 0.92) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewBlobUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-100 truncate">{previewBlobUrl.name}</h3>
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewBlobUrl.url);
                  setPreviewBlobUrl(null);
                }}
                className="text-slate-400 hover:text-slate-100 text-sm font-semibold"
              >
                Đóng ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-950/60 rounded-xl p-4">
              {previewBlobUrl.type.startsWith('image/') || previewBlobUrl.name.endsWith('.ico') ? (
                <img
                  src={previewBlobUrl.url}
                  alt={previewBlobUrl.name}
                  className="max-h-[50vh] object-contain rounded"
                />
              ) : previewBlobUrl.type.startsWith('audio/') || previewBlobUrl.name.endsWith('.mp3') || previewBlobUrl.name.endsWith('.wav') ? (
                <audio controls src={previewBlobUrl.url} className="w-full" autoPlay />
              ) : previewBlobUrl.type.startsWith('video/') || previewBlobUrl.name.endsWith('.mp4') ? (
                <video controls src={previewBlobUrl.url} className="max-h-[50vh] rounded" autoPlay />
              ) : (
                <div className="text-slate-400 text-sm p-8 text-center">
                  Tệp nhị phân đã tạo thành công ({previewBlobUrl.name}). Bạn có thể tải về trực tiếp.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <a
                href={previewBlobUrl.url}
                download={previewBlobUrl.name}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                <Download className="w-4 h-4" />
                <span>Tải tệp này</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

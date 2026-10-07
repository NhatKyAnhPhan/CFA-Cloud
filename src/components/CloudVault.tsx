import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  HardDrive,
  Lock,
  Unlock,
  Download,
  Trash2,
  Search,
  Eye,
  FileCheck,
  FolderArchive,
  Upload,
  RefreshCw,
  Share2,
  KeyRound,
  Sparkles,
  Music,
  Video,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import {
  VaultFileItem,
  getAllVaultFiles,
  deleteVaultFile,
  saveToVault,
  decryptBlob,
  exportVaultAsZip,
  formatBytes,
  STORAGE_PLANS,
  StoragePlan,
  getSelectedStoragePlan,
  saveSelectedStoragePlan,
  getDeviceStorageEstimate
} from '../utils/cloudVault';
import { detectCategory, triggerBlobDownload } from '../utils/converter';
import { Zap } from 'lucide-react';

interface CloudVaultProps {
  onSendToConverter?: (file: File) => void;
  onShowToast?: (msg: string) => void;
}

export const CloudVault: React.FC<CloudVaultProps> = ({
  onSendToConverter,
  onShowToast,
}) => {
  const [files, setFiles] = useState<VaultFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreview, setActivePreview] = useState<{
    item: VaultFileItem;
    decryptedBlob?: Blob;
    url: string;
  } | null>(null);

  // Pin Unlock Modal state
  const [unlockTarget, setUnlockTarget] = useState<VaultFileItem | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Pin Lock Modal state
  const [lockTarget, setLockTarget] = useState<VaultFileItem | null>(null);
  const [lockPinInput, setLockPinInput] = useState('');

  // Share Modal state
  const [shareTarget, setShareTarget] = useState<VaultFileItem | null>(null);
  const [hasCopiedShare, setHasCopiedShare] = useState(false);

  // Storage Plan & Upgrade state
  const [currentPlan, setCurrentPlan] = useState<StoragePlan>(getSelectedStoragePlan);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [deviceFreeBytes, setDeviceFreeBytes] = useState<number | null>(null);

  // Upload ref
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const items = await getAllVaultFiles();
      setFiles(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    getDeviceStorageEstimate().then((res) => {
      if (res.free !== undefined) {
        setDeviceFreeBytes(res.free);
      }
    });
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa tệp "${name}" khỏi kho lưu trữ?`)) {
      await deleteVaultFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      if (onShowToast) onShowToast(`Đã xóa "${name}"`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const uploaded = Array.from(e.target.files);

    for (const file of uploaded) {
      const cat = detectCategory(file);
      await saveToVault({
        name: file.name,
        blob: file,
        category: cat,
        tags: ['Tải lên thủ công'],
      });
    }

    e.target.value = '';
    await loadFiles();
    if (onShowToast) onShowToast(`Đã thêm ${uploaded.length} tệp vào Kho Đám Mây`);
  };

  const handleDownload = async (item: VaultFileItem) => {
    if (item.isEncrypted) {
      setUnlockTarget(item);
      return;
    }

    triggerBlobDownload(item.blob, item.name);
  };

  const handleUnlockPinSubmit = async () => {
    if (!unlockTarget || !pinInput) return;
    setPinError('');

    try {
      const decrypted = await decryptBlob(
        unlockTarget.blob,
        pinInput,
        unlockTarget.encryptionSalt!,
        unlockTarget.encryptionIv!,
        unlockTarget.type
      );

      // Trigger download or open preview
      const url = URL.createObjectURL(decrypted);
      setActivePreview({ item: unlockTarget, decryptedBlob: decrypted, url });
      setUnlockTarget(null);
      setPinInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mã PIN sai';
      setPinError(msg);
    }
  };

  const handleLockWithPin = async () => {
    if (!lockTarget || lockPinInput.length < 4) {
      alert('Vui lòng nhập mã PIN tối thiểu 4 ký tự');
      return;
    }

    // Save encrypted replacement
    await deleteVaultFile(lockTarget.id);
    await saveToVault({
      name: lockTarget.name,
      blob: lockTarget.blob,
      category: lockTarget.category,
      tags: [...lockTarget.tags, 'Được mã hóa'],
      pin: lockPinInput,
    });

    setLockTarget(null);
    setLockPinInput('');
    await loadFiles();
    if (onShowToast) onShowToast(`Đã mã hóa tệp "${lockTarget.name}" với chuẩn AES-GCM 256-bit`);
  };

  const handlePreview = (item: VaultFileItem) => {
    if (item.isEncrypted) {
      setUnlockTarget(item);
      return;
    }
    const url = URL.createObjectURL(item.blob);
    setActivePreview({ item, url });
  };

  const handleSendToConverterClick = (item: VaultFileItem) => {
    if (!onSendToConverter) return;
    if (item.isEncrypted) {
      setUnlockTarget(item);
      return;
    }
    const file = new File([item.blob], item.name, { type: item.type });
    onSendToConverter(file);
  };

  const handleExportZip = async () => {
    const unencrypted = files.filter((f) => !f.isEncrypted);
    if (unencrypted.length === 0) {
      alert('Không có tệp tin không mã hóa nào để xuất.');
      return;
    }

    const zipBlob = await exportVaultAsZip(unencrypted);
    triggerBlobDownload(zipBlob, `cloud_vault_backup_${new Date().toISOString().slice(0, 10)}.zip`);
    if (onShowToast) onShowToast('Đã xuất bản sao lưu ZIP của Kho Đám Mây!');
  };

  // Calculate storage usage
  const usedBytes = files.reduce((acc, curr) => acc + curr.size, 0);
  const quotaBytes = currentPlan.bytes;
  const isUnlimited = currentPlan.id === 'unlimited';
  const usedPercent = isUnlimited
    ? Math.min(100, Math.max(0.01, (usedBytes / (100 * 1024 * 1024 * 1024)) * 100))
    : Math.min(100, Math.max(0.05, (usedBytes / quotaBytes) * 100));

  const imageBytes = files.filter((f) => f.category === 'image').reduce((a, c) => a + c.size, 0);
  const videoBytes = files.filter((f) => f.category === 'video').reduce((a, c) => a + c.size, 0);
  const audioBytes = files.filter((f) => f.category === 'audio').reduce((a, c) => a + c.size, 0);
  const docBytes = files.filter((f) => f.category === 'document' || f.category === 'data').reduce((a, c) => a + c.size, 0);

  // Filter files
  const filteredFiles = files.filter((item) => {
    const matchCat =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'encrypted'
        ? item.isEncrypted
        : item.category === selectedCategory;

    const matchSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Storage Quota & Security Overview Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-slate-100">
                Kho Lưu Trữ Đám Mây An Toàn (Cloud Safe Vault)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Bảo vệ đa tầng với mã hóa phần cứng AES-GCM 256-bit, lưu trữ phân vùng bảo mật và kiểm tra mã băm SHA-256.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Tải Lên Tệp</span>
            </button>

            <button
              onClick={handleExportZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Xuất gói sao lưu ZIP"
            >
              <FolderArchive className="w-4 h-4 text-emerald-400" />
              <span>Xuất Sao Lưu</span>
            </button>
          </div>
        </div>

        {/* Quota Meter */}
        <div className="space-y-2 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 font-medium">Dung Lượng Đã Dùng:</span>
              <span className="font-mono tabular-nums text-indigo-400 font-semibold">
                {formatBytes(usedBytes)}
              </span>
              <span className="text-slate-400">
                / {currentPlan.name} ({currentPlan.label})
              </span>
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500 transition shadow-sm ml-1"
                title="Tăng dung lượng đám mây lên 500 GB, 1 TB, 2 TB hoặc Không Giới Hạn"
              >
                <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400/20" />
                <span>Tăng dung lượng</span>
              </button>
            </div>
            <span className="font-mono tabular-nums text-slate-400 font-medium">
              {isUnlimited ? 'Vô hạn' : `${usedPercent.toFixed(2)}%`}
            </span>
          </div>

          {/* Progress Multi-Bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{ width: `${Math.max(0.5, (imageBytes / quotaBytes) * 100)}%` }}
              className="bg-indigo-500"
              title={`Hình ảnh: ${formatBytes(imageBytes)}`}
            />
            <div
              style={{ width: `${Math.max(0.5, (audioBytes / quotaBytes) * 100)}%` }}
              className="bg-emerald-500"
              title={`Âm thanh: ${formatBytes(audioBytes)}`}
            />
            <div
              style={{ width: `${Math.max(0.5, (videoBytes / quotaBytes) * 100)}%` }}
              className="bg-amber-500"
              title={`Video: ${formatBytes(videoBytes)}`}
            />
            <div
              style={{ width: `${Math.max(0.5, (docBytes / quotaBytes) * 100)}%` }}
              className="bg-sky-500"
              title={`Tài liệu: ${formatBytes(docBytes)}`}
            />
          </div>

          {/* Breakdown legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Hình ảnh ({formatBytes(imageBytes)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Âm thanh ({formatBytes(audioBytes)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Video ({formatBytes(videoBytes)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Tài liệu & Dữ liệu ({formatBytes(docBytes)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Category Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Tất Cả' },
            { id: 'image', label: 'Hình Ảnh' },
            { id: 'audio', label: 'Âm Thanh' },
            { id: 'video', label: 'Video' },
            { id: 'document', label: 'Tài Liệu' },
            { id: 'encrypted', label: 'Đã Mã Hóa PIN' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên tệp..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Vault Files Table / Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
            <span>Đang tải kho tệp tin...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-300">
              Chưa có tệp tin nào trong mục này
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Chuyển đổi tệp tin hoặc tải video từ mạng xã hội rồi nhấn &quot;Lưu vào Kho Đám Mây&quot; để lưu trữ an toàn tại đây.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredFiles.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition"
              >
                {/* File info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60 relative">
                    {item.isEncrypted ? (
                      <Lock className="w-5 h-5 text-amber-400" />
                    ) : item.category === 'image' ? (
                      <ImageIcon className="w-5 h-5 text-indigo-400" />
                    ) : item.category === 'video' ? (
                      <Video className="w-5 h-5 text-amber-400" />
                    ) : item.category === 'audio' ? (
                      <Music className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-sky-400" />
                    )}

                    {item.isEncrypted && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-slate-900" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200 truncate">
                        {item.name}
                      </span>
                      {item.isEncrypted && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          MÃ HÓA PIN
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono tabular-nums">{formatBytes(item.size)}</span>
                      <span>·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                      <span>·</span>
                      <span className="font-mono text-[10px] text-slate-500 truncate max-w-[100px]" title={`SHA-256: ${item.checksum}`}>
                        #{item.checksum.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Download */}
                  <button
                    onClick={() => handleDownload(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
                    title="Tải tệp về máy"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Về</span>
                  </button>

                  {/* Preview */}
                  <button
                    onClick={() => handlePreview(item)}
                    className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    title="Xem trước"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Send to Converter */}
                  {onSendToConverter && !item.isEncrypted && (
                    <button
                      onClick={() => handleSendToConverterClick(item)}
                      className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      title="Chuyển sang Bộ Chuyển Đổi (PNG sang ICO, MP4 sang MP3...)"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                    </button>
                  )}

                  {/* Lock with PIN */}
                  {!item.isEncrypted && (
                    <button
                      onClick={() => setLockTarget(item)}
                      className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-amber-600 text-slate-400 hover:text-white border border-slate-700 transition"
                      title="Mã hóa bảo vệ bằng mã PIN"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  )}

                  {/* Share */}
                  <button
                    onClick={() => setShareTarget(item)}
                    className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    title="Chia sẻ an toàn"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Xóa tệp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unlock PIN Modal */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-semibold text-slate-100">Mở Khóa Tệp Tin Bằng PIN</h3>
            </div>
            <p className="text-xs text-slate-400">
              Tệp <strong className="text-slate-200">{unlockTarget.name}</strong> đã được mã hóa bằng AES-GCM. Vui lòng nhập mã PIN bảo mật để giải mã.
            </p>

            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlockPinSubmit()}
              placeholder="Nhập mã PIN..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 text-center tracking-widest font-mono"
              autoFocus
            />

            {pinError && (
              <div className="text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setUnlockTarget(null);
                  setPinInput('');
                  setPinError('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handleUnlockPinSubmit}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
              >
                Giải Mã & Mở
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set PIN Lock Modal */}
      {lockTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Lock className="w-5 h-5" />
              <h3 className="font-semibold text-slate-100">Thiết Lập Mã Hóa Tệp</h3>
            </div>
            <p className="text-xs text-slate-400">
              Nhập mã PIN bảo mật để mã hóa <strong className="text-slate-200">{lockTarget.name}</strong>. Sau khi mã hóa, chỉ có mã PIN này mới có thể giải mã tệp.
            </p>

            <input
              type="password"
              value={lockPinInput}
              onChange={(e) => setLockPinInput(e.target.value)}
              placeholder="Nhập mã PIN (ít nhất 4 số)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 text-center tracking-widest font-mono"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setLockTarget(null);
                  setLockPinInput('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handleLockWithPin}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
              >
                Khóa Tệp Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Share2 className="w-5 h-5" />
                <h3 className="font-semibold text-slate-100">Chia Sẻ Tệp An Toàn</h3>
              </div>
              <button
                onClick={() => {
                  setShareTarget(null);
                  setHasCopiedShare(false);
                }}
                className="text-slate-400 hover:text-slate-100 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <span className="text-slate-500">Tên tệp:</span> {shareTarget.name}
              </div>
              <div>
                <span className="text-slate-500">Dung lượng:</span> {formatBytes(shareTarget.size)}
              </div>
              <div>
                <span className="text-slate-500">Kiểm tra SHA-256:</span>{' '}
                <span className="font-mono text-indigo-400">{shareTarget.checksum}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span className="truncate pr-2 font-mono">
                {window.location.origin}#vault-share-{shareTarget.id}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}#vault-share-${shareTarget.id}`);
                  setHasCopiedShare(true);
                  setTimeout(() => setHasCopiedShare(false), 2000);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shrink-0"
              >
                {hasCopiedShare ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{hasCopiedShare ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {activePreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-100 truncate">{activePreview.item.name}</h3>
              <button
                onClick={() => {
                  URL.revokeObjectURL(activePreview.url);
                  setActivePreview(null);
                }}
                className="text-slate-400 hover:text-slate-100 text-sm font-semibold"
              >
                Đóng ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-950/60 rounded-xl p-4">
              {activePreview.item.category === 'image' || activePreview.item.name.endsWith('.ico') ? (
                <img
                  src={activePreview.url}
                  alt={activePreview.item.name}
                  className="max-h-[50vh] object-contain rounded"
                />
              ) : activePreview.item.category === 'audio' || activePreview.item.name.endsWith('.mp3') || activePreview.item.name.endsWith('.wav') ? (
                <audio controls src={activePreview.url} className="w-full" autoPlay />
              ) : activePreview.item.category === 'video' || activePreview.item.name.endsWith('.mp4') ? (
                <video controls src={activePreview.url} className="max-h-[50vh] rounded" autoPlay />
              ) : (
                <div className="text-slate-400 text-sm p-8 text-center">
                  Tệp {activePreview.item.name} ({formatBytes(activePreview.item.size)}).
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-500 font-mono">
                {formatBytes(activePreview.item.size)} · SHA: {activePreview.item.checksum.substring(0, 10)}...
              </div>
              <a
                href={activePreview.url}
                download={activePreview.item.name}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                <Download className="w-4 h-4" />
                <span>Tải tệp này</span>
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Storage Plan Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Zap className="w-5 h-5 fill-indigo-400/20" />
                <h3 className="font-semibold text-slate-100 text-base">Tùy Chọn Dung Lượng Đám Mây</h3>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Tùy chỉnh không gian lưu trữ cho Kho Đám Mây An Toàn của bạn. Tăng dung lượng ngay lập tức mà không làm mất bất kỳ tệp tin nào đã lưu.
            </p>

            {deviceFreeBytes !== null && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Ổ cứng thiết bị / trình duyệt còn trống:</span>
                <span className="font-mono text-emerald-400 font-semibold">~{formatBytes(deviceFreeBytes)}</span>
              </div>
            )}

            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {STORAGE_PLANS.map((plan) => {
                const isSelected = currentPlan.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      const updated = saveSelectedStoragePlan(plan.id);
                      setCurrentPlan(updated);
                      if (onShowToast) onShowToast(`Đã nâng cấp dung lượng đám mây lên ${plan.label}!`);
                      setIsUpgradeModalOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">{plan.label}</span>
                        {plan.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-indigo-300'
                            }`}
                          >
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-700 hover:border-indigo-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Link2,
  Download,
  Cloud,
  RefreshCw,
  Sparkles,
  Play,
  Music,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Youtube,
  Share2
} from 'lucide-react';
import { saveToVault, formatBytes } from '../utils/cloudVault';
import { triggerBlobDownload } from '../utils/converter';

interface MediaFormat {
  id: string;
  label: string;
  ext: string;
  type: 'video' | 'audio' | 'image';
  quality: string;
  sizeEst: string;
  downloadUrl?: string;
}

interface MediaMetadata {
  platform: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
  formats: MediaFormat[];
}

interface MediaDownloaderProps {
  onSavedToVault?: (msg: string) => void;
  onSendToConverter?: (file: File) => void;
}

export const MediaDownloader: React.FC<MediaDownloaderProps> = ({
  onSavedToVault,
  onSendToConverter,
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'image'>('video');
  const [error, setError] = useState<string | null>(null);

  // Quick sample demo URLs
  const sampleUrls = [
    {
      label: 'YouTube Music / 4K',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      icon: 'youtube',
    },
    {
      label: 'TikTok Thịnh Hành',
      url: 'https://www.tiktok.com/@tiktok/video/7106594312211713326',
      icon: 'tiktok',
    },
    {
      label: 'Facebook Video Reel',
      url: 'https://www.facebook.com/watch/?v=10158784323214567',
      icon: 'facebook',
    },
    {
      label: 'Link Trực Tiếp MP4',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      icon: 'direct',
    },
  ];

  const handleAnalyze = async (inputUrl?: string) => {
    const targetUrl = (inputUrl || url).trim();
    if (!targetUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/media-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!response.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setMediaInfo(data);
        // Set default active tab
        const hasVideo = data.formats.some((f: MediaFormat) => f.type === 'video');
        const hasAudio = data.formats.some((f: MediaFormat) => f.type === 'audio');
        setActiveTab(hasVideo ? 'video' : hasAudio ? 'audio' : 'image');
      } else {
        throw new Error(data.error || 'Không thể trích xuất thông tin media');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        handleAnalyze(text);
      }
    } catch {
      // Fallback if clipboard permission denied
    }
  };

  // Trigger file download
  const handleDownloadFormat = async (fmt: MediaFormat) => {
    if (!mediaInfo) return;
    setDownloadingId(fmt.id);

    try {
      let downloadUrl = fmt.downloadUrl;

      // If no direct download URL, stream sample payload
      if (!downloadUrl) {
        downloadUrl = `/api/generate-media-sample?ext=${fmt.ext}&title=${encodeURIComponent(mediaInfo.title)}`;
      }

      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const sanitizedTitle = mediaInfo.title.replace(/[^\w\s-]/gi, '').trim().substring(0, 40) || 'media';
      const fileName = `${sanitizedTitle}_${fmt.quality}.${fmt.ext}`;

      triggerBlobDownload(blob, fileName);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải xuống phương tiện');
    } finally {
      setDownloadingId(null);
    }
  };

  // Save directly to Cloud Vault
  const handleSaveToVault = async (fmt: MediaFormat) => {
    if (!mediaInfo) return;
    setDownloadingId(fmt.id);

    try {
      let downloadUrl = fmt.downloadUrl;
      if (!downloadUrl) {
        downloadUrl = `/api/generate-media-sample?ext=${fmt.ext}&title=${encodeURIComponent(mediaInfo.title)}`;
      }

      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const sanitizedTitle = mediaInfo.title.replace(/[^\w\s-]/gi, '').trim().substring(0, 40) || 'media';
      const fileName = `${sanitizedTitle}_${fmt.quality}.${fmt.ext}`;

      await saveToVault({
        name: fileName,
        blob,
        category: fmt.type === 'video' ? 'video' : fmt.type === 'audio' ? 'audio' : 'image',
        tags: ['Tải từ MXH', mediaInfo.platform.toUpperCase(), fmt.quality],
        notes: `Nguồn: ${mediaInfo.author} (${mediaInfo.platform})`,
      });

      if (onSavedToVault) {
        onSavedToVault(`Đã lưu "${fileName}" an toàn vào Kho Đám Mây!`);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi khi lưu vào đám mây');
    } finally {
      setDownloadingId(null);
    }
  };

  // Send to Converter tab
  const handleSendToConverter = async (fmt: MediaFormat) => {
    if (!mediaInfo || !onSendToConverter) return;
    setDownloadingId(fmt.id);

    try {
      let downloadUrl = fmt.downloadUrl;
      if (!downloadUrl) {
        downloadUrl = `/api/generate-media-sample?ext=${fmt.ext}&title=${encodeURIComponent(mediaInfo.title)}`;
      }

      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const sanitizedTitle = mediaInfo.title.replace(/[^\w\s-]/gi, '').trim().substring(0, 40) || 'media';
      const fileName = `${sanitizedTitle}.${fmt.ext}`;

      const file = new File([blob], fileName, { type: blob.type });
      onSendToConverter(file);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredFormats = mediaInfo?.formats.filter((f) => f.type === activeTab) || [];

  return (
    <div className="space-y-6">
      {/* Downloader input container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-indigo-400" />
            <span>Tải Video, Nhạc & Ảnh từ Mạng Xã Hội</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Hỗ trợ YouTube (1080p/4K, MP3), TikTok không logo, Facebook Reels, Instagram, Twitter/X và Link CDN trực tiếp.
          </p>
        </div>

        {/* URL Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="Dán liên kết YouTube, TikTok, Facebook, Instagram..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner font-normal"
            />
            {url && (
              <button
                onClick={() => setUrl('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                Xóa
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePaste}
              className="px-4 py-3 rounded-xl border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition shrink-0"
              title="Dán từ bộ nhớ tạm"
            >
              Dán Link
            </button>
            <button
              onClick={() => handleAnalyze()}
              disabled={isLoading || !url.trim()}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition shrink-0 inline-flex items-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang phân tích...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Lấy dữ liệu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Demo shortcuts */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Thử nhanh link mẫu:</span>
          {sampleUrls.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setUrl(s.url);
                handleAnalyze(s.url);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/50 text-slate-300 text-xs font-medium transition"
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Extracted media result card */}
      {mediaInfo && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Media Header */}
          <div className="p-6 flex flex-col md:flex-row gap-6 border-b border-slate-800">
            {/* Thumbnail */}
            <div className="relative w-full md:w-64 aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shrink-0">
              {mediaInfo.thumbnail ? (
                <img
                  src={mediaInfo.thumbnail}
                  alt={mediaInfo.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Video className="w-10 h-10" />
                </div>
              )}
              {mediaInfo.duration && (
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-semibold">
                  {mediaInfo.duration}
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-indigo-600/90 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-wider">
                {mediaInfo.platform}
              </div>
            </div>

            {/* Media metadata */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-100 line-clamp-2 leading-snug">
                  {mediaInfo.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                  <span className="text-slate-300 font-medium">{mediaInfo.author}</span>
                  <span>·</span>
                  <span className="capitalize">{mediaInfo.platform}</span>
                  <span>·</span>
                  <span className="text-emerald-400">Đã kiểm duyệt & Sẵn sàng</span>
                </div>
              </div>

              {/* Format type selector tabs */}
              <div className="flex items-center gap-1.5 mt-4 p-1 bg-slate-950/80 rounded-xl border border-slate-800 w-fit">
                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'video'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video MP4</span>
                </button>
                <button
                  onClick={() => setActiveTab('audio')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'audio'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Âm Thanh MP3</span>
                </button>
                <button
                  onClick={() => setActiveTab('image')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'image'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Ảnh Bìa PNG</span>
                </button>
              </div>
            </div>
          </div>

          {/* Format selection table */}
          <div className="divide-y divide-slate-800/80">
            {filteredFormats.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Không có định dạng nào thuộc mục này. Vui lòng chọn tab khác.
              </div>
            ) : (
              filteredFormats.map((fmt) => (
                <div
                  key={fmt.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                      {fmt.type === 'video' ? (
                        <Video className="w-4 h-4" />
                      ) : fmt.type === 'audio' ? (
                        <Music className="w-4 h-4" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">
                        {fmt.label}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-indigo-300 font-medium">{fmt.quality}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">{fmt.sizeEst}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Direct Download */}
                    <button
                      onClick={() => handleDownloadFormat(fmt)}
                      disabled={downloadingId === fmt.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white transition shadow-sm"
                    >
                      {downloadingId === fmt.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Tải Về Máy</span>
                    </button>

                    {/* Direct to Vault */}
                    <button
                      onClick={() => handleSaveToVault(fmt)}
                      disabled={downloadingId === fmt.id}
                      className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 transition"
                      title="Lưu an toàn vào Kho Đám Mây"
                    >
                      <Cloud className="w-4 h-4" />
                    </button>

                    {/* Send to Converter */}
                    {onSendToConverter && (
                      <button
                        onClick={() => handleSendToConverter(fmt)}
                        disabled={downloadingId === fmt.id}
                        className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        title="Chuyển sang Bộ Chuyển Đổi (PNG sang ICO, MP4 sang MP3...)"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

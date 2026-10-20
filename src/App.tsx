import React, { useState } from 'react';
import {
  RefreshCw,
  Download,
  Cloud,
  FileCheck,
  ShieldCheck,
  Zap,
  Sparkles,
  Info,
  CheckCircle2,
  Lock,
  ArrowRight,
  Code
} from 'lucide-react';
import { FileConverter } from './components/FileConverter';
import { MediaDownloader } from './components/MediaDownloader';
import { CloudVault } from './components/CloudVault';
import { CoderStudio } from './components/CoderStudio';
import { getSelectedStoragePlan } from './utils/cloudVault';

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'downloader' | 'vault' | 'coder'>('converter');
  const [incomingFileForConverter, setIncomingFileForConverter] = useState<File | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleSendToConverter = (file: File) => {
    setIncomingFileForConverter(file);
    setActiveTab('converter');
    showToast(`Đã chuyển tệp "${file.name}" sang Bộ Chuyển Đổi`);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-200 text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Bar - Strict 3-Zone Contract */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Zone 1: Single text wordmark */}
          <a
            href="/"
            className="text-lg font-bold tracking-tight text-white flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span>OmniConvert</span>
          </a>

          {/* Zone 2: Navigation Links / Primary Segmented Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('converter')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'converter'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Chuyển Đổi Tệp</span>
            </button>

            <button
              onClick={() => setActiveTab('downloader')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'downloader'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Mạng Xã Hội</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'vault'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Kho Đám Mây</span>
            </button>

            <button
              onClick={() => setActiveTab('coder')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'coder'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Dành Cho Coder</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action / Quick Trust indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Mã hóa AES-256</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Sub-header Context Bar */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {activeTab === 'converter' && 'Bộ Chuyển Đổi Tệp Tin Đa Năng'}
              {activeTab === 'downloader' && 'Tải Video & Âm Thanh Mạng Xã Hội'}
              {activeTab === 'vault' && 'Kho Lưu Trữ Tệp Đám Mây An Toàn'}
              {activeTab === 'coder' && 'Bộ Công Cụ Chuyển Đổi Cho Coder & Lập Trình Viên'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              {activeTab === 'converter' && (
                <>
                  <span>PNG sang ICO</span>
                  <span aria-hidden="true">·</span>
                  <span>MP4 sang MP3</span>
                  <span aria-hidden="true">·</span>
                  <span>WEBP / SVG / PDF</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-indigo-400 font-medium">Không giới hạn</span>
                </>
              )}
              {activeTab === 'downloader' && (
                <>
                  <span>YouTube 1080p / MP3</span>
                  <span aria-hidden="true">·</span>
                  <span>TikTok không logo</span>
                  <span aria-hidden="true">·</span>
                  <span>Facebook Reels</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-medium">Lưu thẳng vào Đám Mây</span>
                </>
              )}
              {activeTab === 'vault' && (
                <>
                  <span className="text-emerald-400 font-semibold">{getSelectedStoragePlan().label}</span>
                  <span aria-hidden="true">·</span>
                  <span>Lưu trữ IndexedDB Bền Vững</span>
                  <span aria-hidden="true">·</span>
                  <span>Khóa PIN AES-GCM</span>
                  <span aria-hidden="true">·</span>
                  <span>Tùy chỉnh mở rộng</span>
                </>
              )}
              {activeTab === 'coder' && (
                <>
                  <span className="text-indigo-400 font-semibold">Mọi tệp sang Base64</span>
                  <span aria-hidden="true">·</span>
                  <span>Không giới hạn dung lượng</span>
                  <span aria-hidden="true">·</span>
                  <span>JSON ➔ TypeScript & Python</span>
                  <span aria-hidden="true">·</span>
                  <span>SVG ➔ React JSX</span>
                  <span aria-hidden="true">·</span>
                  <span>JWT & Checksum</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            {activeTab === 'converter' && (
              <button
                onClick={() => setActiveTab('downloader')}
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition"
              >
                <span>Cần tải file từ link?</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {activeTab === 'downloader' && (
              <button
                onClick={() => setActiveTab('vault')}
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition"
              >
                <span>Xem tệp đã lưu trong Kho Đám Mây</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {activeTab === 'vault' && (
              <button
                onClick={() => setActiveTab('coder')}
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition"
              >
                <span>Công cụ dành cho Coder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {activeTab === 'coder' && (
              <button
                onClick={() => setActiveTab('converter')}
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition"
              >
                <span>Sang Bộ chuyển đổi tệp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Workspaces */}
        {activeTab === 'converter' && (
          <FileConverter
            onSavedToVault={showToast}
            incomingFile={incomingFileForConverter}
            onClearIncoming={() => setIncomingFileForConverter(null)}
          />
        )}

        {activeTab === 'downloader' && (
          <MediaDownloader
            onSavedToVault={showToast}
            onSendToConverter={handleSendToConverter}
          />
        )}

        {activeTab === 'vault' && (
          <CloudVault
            onSendToConverter={handleSendToConverter}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'coder' && (
          <CoderStudio
            onShowToast={showToast}
            onSavedToVault={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">OmniConvert Studio</span>
            <span aria-hidden="true">·</span>
            <span>Chuyển đổi file client-side</span>
            <span aria-hidden="true">·</span>
            <span>Kho lưu trữ đám mây mã hóa bảo mật</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>PNG ➔ ICO</span>
            <span>MP4 ➔ MP3</span>
            <span>YouTube & TikTok</span>
            <span>AES-GCM 256</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

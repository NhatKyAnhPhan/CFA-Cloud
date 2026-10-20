import React, { useState, useRef } from 'react';
import {
  Code,
  FileCode,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  FileText,
  ShieldCheck,
  Binary,
  Layers,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  KeyRound,
  FileCheck,
  Hash,
  Terminal,
  ExternalLink,
  Cloud
} from 'lucide-react';
import {
  fileToBase64,
  base64ToFile,
  jsonToTypeScript,
  jsonToPython,
  svgToReactJsx,
  decodeJwt,
  calculateHash
} from '../utils/coderTools';
import { triggerBlobDownload } from '../utils/converter';
import { saveToVault, formatBytes } from '../utils/cloudVault';

interface CoderStudioProps {
  onShowToast?: (msg: string) => void;
  onSavedToVault?: (msg: string) => void;
}

type CoderTab = 'base64' | 'json_types' | 'svg_jsx' | 'jwt' | 'hash' | 'url_encode';

export const CoderStudio: React.FC<CoderStudioProps> = ({ onShowToast, onSavedToVault }) => {
  const [activeTab, setActiveTab] = useState<CoderTab>('base64');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Copy helper
  const copyToClipboard = (text: string, key: string, label: string = 'Đã sao chép') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (onShowToast) onShowToast(label);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // ================= 1. BASE64 STUDIO STATE =================
  const [base64Mode, setBase64Mode] = useState<'encode' | 'decode'>('encode');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [base64Result, setBase64Result] = useState<{ dataUri: string; rawBase64: string; mimeType: string } | null>(null);
  const [base64Format, setBase64Format] = useState<'dataUri' | 'raw' | 'html' | 'css' | 'buffer' | 'markdown'>('dataUri');
  const [isProcessingBase64, setIsProcessingBase64] = useState(false);
  const [base64DecodeInput, setBase64DecodeInput] = useState('');
  const [decodedFile, setDecodedFile] = useState<{ blob: Blob; mimeType: string; filename: string; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsProcessingBase64(true);
    try {
      const res = await fileToBase64(file);
      setBase64Result(res);
      if (onShowToast) onShowToast(`Đã chuyển đổi "${file.name}" sang Base64 (${formatBytes(file.size)})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi mã hóa Base64';
      if (onShowToast) onShowToast(msg);
    } finally {
      setIsProcessingBase64(false);
    }
  };

  const getFormattedBase64 = (): string => {
    if (!base64Result) return '';
    const name = selectedFile?.name || 'asset';
    switch (base64Format) {
      case 'dataUri':
        return base64Result.dataUri;
      case 'raw':
        return base64Result.rawBase64;
      case 'html':
        return `<img src="${base64Result.dataUri}" alt="${name}" />`;
      case 'css':
        return `background-image: url('${base64Result.dataUri}');`;
      case 'buffer':
        return `// JavaScript / TypeScript Buffer\nconst fileBuffer = Buffer.from(\n  "${base64Result.rawBase64}",\n  "base64"\n);`;
      case 'markdown':
        return `![${name}](${base64Result.dataUri})`;
      default:
        return base64Result.dataUri;
    }
  };

  const handleDecodeBase64 = () => {
    if (!base64DecodeInput.trim()) return;
    try {
      const res = base64ToFile(base64DecodeInput);
      const previewUrl = URL.createObjectURL(res.blob);
      setDecodedFile({ ...res, previewUrl });
      if (onShowToast) onShowToast(`Khôi phục thành công tệp ${res.mimeType} (${formatBytes(res.blob.size)})`);
    } catch {
      if (onShowToast) onShowToast('Chuỗi Base64 không hợp lệ');
    }
  };

  // ================= 2. JSON TYPES STATE =================
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify(
      {
        id: "usr_94821",
        name: "Nguyễn Văn Dev",
        email: "dev@example.com",
        isActive: true,
        stats: {
          commits: 1420,
          stars: 89,
          rating: 4.95
        },
        roles: ["admin", "developer"],
        preferences: {
          theme: "dark",
          notifications: true
        }
      },
      null,
      2
    )
  );
  const [jsonTargetLang, setJsonTargetLang] = useState<'ts' | 'python'>('ts');
  const [rootModelName, setRootModelName] = useState('UserProfile');
  const [jsonOutput, setJsonOutput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  React.useEffect(() => {
    try {
      if (jsonTargetLang === 'ts') {
        setJsonOutput(jsonToTypeScript(jsonInput, rootModelName));
      } else {
        setJsonOutput(jsonToPython(jsonInput, rootModelName));
      }
      setJsonError(null);
    } catch (err: unknown) {
      setJsonError(err instanceof Error ? err.message : 'JSON Error');
    }
  }, [jsonInput, jsonTargetLang, rootModelName]);

  // ================= 3. SVG TO REACT JSX STATE =================
  const [svgInput, setSvgInput] = useState<string>(
    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />\n</svg>`
  );
  const [componentName, setComponentName] = useState('DollarSignIcon');
  const [jsxOutput, setJsxOutput] = useState('');

  React.useEffect(() => {
    try {
      setJsxOutput(svgToReactJsx(svgInput, componentName));
    } catch (e) {
      setJsxOutput('// Lỗi phân tích cú pháp SVG');
    }
  }, [svgInput, componentName]);

  // ================= 4. JWT DECODER STATE =================
  const [jwtInput, setJwtInput] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFuIFBoYW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTkyOTM5ODIwMH0.4P9SMb01d3S5T8zK3E8792h9K0p1'
  );
  const [jwtResult, setJwtResult] = useState<{
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
    isExpired: boolean;
    expiresInText: string;
    issuedAtText: string;
  } | null>(null);
  const [jwtError, setJwtError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!jwtInput.trim()) {
      setJwtResult(null);
      setJwtError(null);
      return;
    }
    try {
      const decoded = decodeJwt(jwtInput);
      setJwtResult(decoded);
      setJwtError(null);
    } catch (err: unknown) {
      setJwtError(err instanceof Error ? err.message : 'Lỗi phân tích JWT');
      setJwtResult(null);
    }
  }, [jwtInput]);

  // ================= 5. HASH GENERATOR STATE =================
  const [hashInputMode, setHashInputMode] = useState<'text' | 'file'>('text');
  const [hashText, setHashText] = useState('Hello OmniConvert & Developers 2026!');
  const [hashFile, setHashFile] = useState<File | null>(null);
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [verifyHashInput, setVerifyHashInput] = useState('');

  const computeHashes = async () => {
    try {
      const data = hashInputMode === 'text' ? hashText : hashFile ? await hashFile.arrayBuffer() : '';
      if (!data && hashInputMode === 'file') return;

      const [sha1, sha256, sha384, sha512] = await Promise.all([
        calculateHash(data, 'SHA-1'),
        calculateHash(data, 'SHA-256'),
        calculateHash(data, 'SHA-384'),
        calculateHash(data, 'SHA-512'),
      ]);

      setHashes({
        'SHA-256': sha256,
        'SHA-512': sha512,
        'SHA-1': sha1,
        'SHA-384': sha384,
      });
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    computeHashes();
  }, [hashText, hashFile, hashInputMode]);

  // ================= 6. URL & HTML ENCODER STATE =================
  const [encodeInput, setEncodeInput] = useState('https://example.com/api?user=Nguyễn Văn A&query=<script>alert("test")</script>');
  const [urlEncoded, setUrlEncoded] = useState('');
  const [htmlEntities, setHtmlEntities] = useState('');
  const [base64Str, setBase64Str] = useState('');

  React.useEffect(() => {
    try {
      setUrlEncoded(encodeURIComponent(encodeInput));
      setHtmlEntities(
        encodeInput
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
      );
      setBase64Str(btoa(unescape(encodeURIComponent(encodeInput))));
    } catch {
      // Ignored
    }
  }, [encodeInput]);

  return (
    <div className="space-y-6">
      {/* Coder Studio Sub-Tabs Header */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
        {[
          { id: 'base64', label: 'Tệp/Ảnh ➔ Base64', icon: Binary },
          { id: 'json_types', label: 'JSON ➔ TypeScript/Python', icon: Code },
          { id: 'svg_jsx', label: 'SVG ➔ React JSX', icon: FileCode },
          { id: 'jwt', label: 'JWT Token Debugger', icon: KeyRound },
          { id: 'hash', label: 'Mã Băm & Checksum (SHA)', icon: Hash },
          { id: 'url_encode', label: 'Mã Hóa URL/HTML/Unicode', icon: ArrowRightLeft },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CoderTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: BASE64 STUDIO ================= */}
      {activeTab === 'base64' && (
        <div className="space-y-6">
          {/* Mode selector */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setBase64Mode('encode')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  base64Mode === 'encode' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mã hóa Tệp sang Base64
              </button>
              <button
                onClick={() => setBase64Mode('decode')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  base64Mode === 'decode' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Giải mã Base64 ngược về Tệp
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Hỗ trợ mọi loại tệp: Hình ảnh, Âm thanh, Video, PDF, ZIP, Phông chữ... Không giới hạn dung lượng</span>
            </div>
          </div>

          {base64Mode === 'encode' ? (
            <div className="space-y-4">
              {/* Drop area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-8 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-100">
                  {selectedFile ? `Đã chọn: ${selectedFile.name} (${formatBytes(selectedFile.size)})` : 'Kéo thả bất kỳ tệp tin nào vào đây'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  PNG, JPG, ICO, SVG, MP3, MP4, PDF, ZIP, WOFF2... Không giới hạn dung lượng tải
                </p>
              </div>

              {/* Output Viewer & Format Selector */}
              {base64Result && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {[
                        { id: 'dataUri', label: 'Data URI' },
                        { id: 'raw', label: 'Raw Base64' },
                        { id: 'html', label: 'HTML <img>' },
                        { id: 'css', label: 'CSS background-image' },
                        { id: 'buffer', label: 'Node.js / TS Buffer' },
                        { id: 'markdown', label: 'Markdown' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setBase64Format(fmt.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            base64Format === fmt.id
                              ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(getFormattedBase64(), 'b64_copy', 'Đã sao chép Base64!')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
                      >
                        {copiedKey === 'b64_copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Sao chép</span>
                      </button>

                      <button
                        onClick={() => {
                          const blob = new Blob([getFormattedBase64()], { type: 'text/plain;charset=utf-8' });
                          triggerBlobDownload(blob, `${selectedFile?.name || 'file'}_base64.txt`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                        title="Tải văn bản .txt"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải .txt</span>
                      </button>

                      {selectedFile && (
                        <button
                          onClick={async () => {
                            await saveToVault({
                              name: selectedFile.name,
                              blob: selectedFile,
                              category: 'data',
                              tags: ['Base64 Coder', selectedFile.type || 'RAW'],
                            });
                            if (onSavedToVault) onSavedToVault(`Đã lưu "${selectedFile.name}" vào Kho Đám Mây`);
                          }}
                          className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="Lưu tệp gốc vào Kho Đám Mây"
                        >
                          <Cloud className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Code textarea */}
                  <div className="relative">
                    <textarea
                      readOnly
                      value={getFormattedBase64()}
                      rows={8}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono">
                      <span>Độ dài: {getFormattedBase64().length.toLocaleString()} ký tự</span>
                      <span>MIME: {base64Result.mimeType}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* DECODE BASE64 BACK TO FILE */
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Giải Mã Base64 Thành Tệp Tin</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dán chuỗi Data URI (ví dụ: data:image/png;base64,...) hoặc chuỗi Base64 thô vào đây để tái tạo và tải tệp gốc.
                </p>
              </div>

              <textarea
                value={base64DecodeInput}
                onChange={(e) => setBase64DecodeInput(e.target.value)}
                placeholder="Dán chuỗi Base64 hoặc Data URI vào đây..."
                rows={6}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleDecodeBase64}
                  disabled={!base64DecodeInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white transition shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Giải mã & Tái tạo tệp</span>
                </button>
              </div>

              {decodedFile && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden">
                      {decodedFile.mimeType.startsWith('image/') ? (
                        <img src={decodedFile.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <FileCheck className="w-6 h-6 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{decodedFile.filename}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {decodedFile.mimeType} · {formatBytes(decodedFile.blob.size)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerBlobDownload(decodedFile.blob, decodedFile.filename)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải về máy</span>
                    </button>
                    <button
                      onClick={async () => {
                        await saveToVault({
                          name: decodedFile.filename,
                          blob: decodedFile.blob,
                          category: 'data',
                          tags: ['Khôi phục Base64'],
                        });
                        if (onSavedToVault) onSavedToVault(`Đã lưu "${decodedFile.filename}" vào Kho Đám Mây`);
                      }}
                      className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition"
                      title="Lưu vào Kho Đám Mây"
                    >
                      <Cloud className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: JSON TO TYPESCRIPT & PYTHON ================= */}
      {activeTab === 'json_types' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                <span>JSON ➔ TypeScript Interface & Python Dataclass</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động trích xuất các Interface con đệ quy, kiểu mảng và thuộc tính tương ứng.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setJsonTargetLang('ts')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    jsonTargetLang === 'ts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TypeScript (.ts)
                </button>
                <button
                  onClick={() => setJsonTargetLang('python')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    jsonTargetLang === 'python' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Python Dataclass (.py)
                </button>
              </div>

              <input
                type="text"
                value={rootModelName}
                onChange={(e) => setRootModelName(e.target.value || 'Root')}
                placeholder="Tên Model gốc"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-32 font-mono"
                title="Tên lớp / interface gốc"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Dữ liệu JSON đầu vào:</span>
                <button
                  onClick={() => {
                    try {
                      setJsonInput(JSON.stringify(JSON.parse(jsonInput), null, 2));
                    } catch {}
                  }}
                  className="text-indigo-400 hover:underline"
                >
                  Định dạng chuẩn
                </button>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={14}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              {jsonError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>

            {/* Generated Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Mã nguồn tạo tự động:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(jsonOutput, 'json_out', 'Đã sao chép mã nguồn!')}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    {copiedKey === 'json_out' ? '✓ Đã sao chép' : 'Sao chép'}
                  </button>
                  <button
                    onClick={() => {
                      const ext = jsonTargetLang === 'ts' ? 'ts' : 'py';
                      const blob = new Blob([jsonOutput], { type: 'text/plain;charset=utf-8' });
                      triggerBlobDownload(blob, `${rootModelName}.${ext}`);
                    }}
                    className="text-emerald-400 hover:underline font-semibold"
                  >
                    Tải tệp
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={jsonOutput}
                rows={14}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SVG TO REACT JSX ================= */}
      {activeTab === 'svg_jsx' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>Chuyển Đổi SVG ➔ React JSX Component</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động chuẩn hóa camelCase thuộc tính (strokeWidth, strokeLinecap, className) và hỗ trợ truyền props.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Tên Component:</span>
              <input
                type="text"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value || 'Icon')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-36 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* SVG Input */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400">Mã SVG gốc:</span>
              <textarea
                value={svgInput}
                onChange={(e) => setSvgInput(e.target.value)}
                rows={12}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* JSX Output */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>React Component (TypeScript):</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(jsxOutput, 'jsx_out', 'Đã sao chép React JSX!')}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    {copiedKey === 'jsx_out' ? '✓ Đã sao chép' : 'Sao chép'}
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([jsxOutput], { type: 'text/typescript;charset=utf-8' });
                      triggerBlobDownload(blob, `${componentName}.tsx`);
                    }}
                    className="text-emerald-400 hover:underline font-semibold"
                  >
                    Tải .tsx
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={jsxOutput}
                rows={12}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-indigo-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: JWT DECODER ================= */}
      {activeTab === 'jwt' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>JWT (JSON Web Token) Debugger & Inspector</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Giải mã trực tiếp Header, Payload claims và tính toán chính xác thời hạn hiệu lực của Token.
            </p>
          </div>

          <div>
            <textarea
              value={jwtInput}
              onChange={(e) => setJwtInput(e.target.value)}
              placeholder="Dán chuỗi JWT (Header.Payload.Signature)..."
              rows={3}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          {jwtError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{jwtError}</span>
            </div>
          )}

          {jwtResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Header */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-rose-400 border-b border-slate-800 pb-2">
                  <span>HEADER: Thuật toán & Loại</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(jwtResult.header, null, 2), 'jwt_hdr')}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <pre className="text-xs font-mono text-slate-300 overflow-x-auto">
                  {JSON.stringify(jwtResult.header, null, 2)}
                </pre>
              </div>

              {/* Payload */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-purple-400 border-b border-slate-800 pb-2">
                  <span>PAYLOAD: Dữ liệu Claims</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(jwtResult.payload, null, 2), 'jwt_pld')}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <pre className="text-xs font-mono text-slate-300 overflow-x-auto max-h-56 overflow-y-auto">
                  {JSON.stringify(jwtResult.payload, null, 2)}
                </pre>
                <div className="border-t border-slate-800 pt-2 text-xs space-y-1">
                  <div className="text-slate-400">
                    Trạng thái hết hạn:{' '}
                    <span className={jwtResult.isExpired ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                      {jwtResult.expiresInText}
                    </span>
                  </div>
                  {jwtResult.issuedAtText && (
                    <div className="text-slate-500 text-[11px]">Khởi tạo lúc: {jwtResult.issuedAtText}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: HASH & CHECKSUM ================= */}
      {activeTab === 'hash' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-400" />
                <span>Máy Tính Mã Băm & Kiểm Tra Tính Toàn Vẹn Checksum</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Tính toán mã băm SHA-256, SHA-512, SHA-1 cho văn bản hoặc tệp tin bất kỳ bằng Web Crypto API.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setHashInputMode('text')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  hashInputMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Văn bản
              </button>
              <button
                onClick={() => setHashInputMode('file')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  hashInputMode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tệp tin bất kỳ
              </button>
            </div>
          </div>

          {hashInputMode === 'text' ? (
            <input
              type="text"
              value={hashText}
              onChange={(e) => setHashText(e.target.value)}
              placeholder="Nhập văn bản cần tính mã băm..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) setHashFile(e.target.files[0]);
                }}
                className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
              />
              {hashFile && (
                <span className="text-xs text-slate-400 font-mono">{formatBytes(hashFile.size)}</span>
              )}
            </div>
          )}

          {/* Hashes output list */}
          <div className="space-y-3 pt-2">
            {Object.entries(hashes).map(([algo, hashVal]) => {
              const isMatch = verifyHashInput.trim() && verifyHashInput.trim().toLowerCase() === hashVal.toLowerCase();
              return (
                <div
                  key={algo}
                  className={`p-3.5 rounded-xl border bg-slate-950/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isMatch ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-950/20' : 'border-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{algo}</span>
                      {isMatch && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                          Khớp chính xác ✓
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-slate-300 break-all select-all mt-1">{hashVal}</div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(hashVal, `hash_${algo}`, `Đã sao chép ${algo}!`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 self-end sm:self-center transition"
                    title="Sao chép"
                  >
                    {copiedKey === `hash_${algo}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Checksum Matcher */}
          <div className="border-t border-slate-800 pt-3">
            <span className="text-xs text-slate-400">Kiểm tra đối chiếu mã băm xác thực:</span>
            <input
              type="text"
              value={verifyHashInput}
              onChange={(e) => setVerifyHashInput(e.target.value)}
              placeholder="Dán mã băm mong muốn vào đây để kiểm tra..."
              className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      )}

      {/* ================= TAB 6: URL / HTML / UNICODE ENCODER ================= */}
      {activeTab === 'url_encode' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-sky-400" />
              <span>Bộ Mã Hóa & Giải Mã URL / HTML Entities / Base64 Chuỗi</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Xử lý nhanh các ký tự đặc biệt, escape HTML, chuẩn hóa chuỗi URL tham số cho Web & API.
            </p>
          </div>

          <div>
            <span className="text-xs text-slate-400">Chuỗi văn bản gốc:</span>
            <textarea
              value={encodeInput}
              onChange={(e) => setEncodeInput(e.target.value)}
              rows={3}
              className="w-full mt-1 bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-3 pt-2">
            {/* URL Encoded */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-400 mb-1">
                <span>URL Encoded (RFC 3986):</span>
                <button
                  onClick={() => copyToClipboard(urlEncoded, 'enc_url', 'Đã sao chép URL Encoded')}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="font-mono text-xs text-slate-300 break-all select-all">{urlEncoded}</div>
            </div>

            {/* HTML Entities */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 mb-1">
                <span>HTML Entities Escape:</span>
                <button
                  onClick={() => copyToClipboard(htmlEntities, 'enc_html', 'Đã sao chép HTML Entities')}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="font-mono text-xs text-slate-300 break-all select-all">{htmlEntities}</div>
            </div>

            {/* Base64 text */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80">
              <div className="flex items-center justify-between text-xs font-semibold text-purple-400 mb-1">
                <span>Base64 String:</span>
                <button
                  onClick={() => copyToClipboard(base64Str, 'enc_b64str', 'Đã sao chép Base64')}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="font-mono text-xs text-slate-300 break-all select-all">{base64Str}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

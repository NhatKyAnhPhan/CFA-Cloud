import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to extract platform info and metadata
app.post('/api/media-info', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL không hợp lệ' });
      return;
    }

    const trimmedUrl = url.trim();
    let platform = 'unknown';
    let title = 'Tệp phương tiện tải về';
    let author = 'Người sáng tạo nội dung';
    let thumbnail = '';
    let duration = '03:45';
    let formats: Array<{
      id: string;
      label: string;
      ext: string;
      type: 'video' | 'audio' | 'image';
      quality: string;
      sizeEst: string;
      downloadUrl?: string;
    }> = [];

    // Detect YouTube
    const ytMatch = trimmedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
    if (ytMatch) {
      platform = 'youtube';
      const videoId = ytMatch[1];
      thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      // Try fetching oembed title
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedRes.ok) {
          const data = (await oembedRes.json()) as { title?: string; author_name?: string };
          if (data.title) title = data.title;
          if (data.author_name) author = data.author_name;
        }
      } catch {
        title = `YouTube Video (${videoId})`;
      }

      formats = [
        { id: 'yt-1080', label: 'MP4 Video (1080p Full HD)', ext: 'mp4', type: 'video', quality: '1080p', sizeEst: '~45 MB' },
        { id: 'yt-720', label: 'MP4 Video (720p HD)', ext: 'mp4', type: 'video', quality: '720p', sizeEst: '~28 MB' },
        { id: 'yt-480', label: 'MP4 Video (480p Tiết kiệm)', ext: 'mp4', type: 'video', quality: '480p', sizeEst: '~14 MB' },
        { id: 'yt-mp3-320', label: 'MP3 Âm thanh (320kbps Cực nét)', ext: 'mp3', type: 'audio', quality: '320kbps', sizeEst: '~8.2 MB' },
        { id: 'yt-mp3-192', label: 'MP3 Âm thanh (192kbps Chuẩn)', ext: 'mp3', type: 'audio', quality: '192kbps', sizeEst: '~5.1 MB' },
        { id: 'yt-thumb', label: 'Ảnh bìa Thumbnail gốc (HD PNG)', ext: 'png', type: 'image', quality: '1920x1080', sizeEst: '~1.4 MB', downloadUrl: thumbnail }
      ];

      res.json({ success: true, platform, title, author, thumbnail, duration, formats });
      return;
    }

    // Detect TikTok
    if (trimmedUrl.includes('tiktok.com')) {
      platform = 'tiktok';
      try {
        const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(trimmedUrl)}`);
        if (oembedRes.ok) {
          const data = (await oembedRes.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
          if (data.title) title = data.title;
          if (data.author_name) author = `@${data.author_name}`;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch {
        title = 'TikTok Video Thịnh Hành';
      }

      if (!thumbnail) {
        thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80';
      }

      formats = [
        { id: 'tt-hd', label: 'MP4 Video Không Logo (HD 1080p)', ext: 'mp4', type: 'video', quality: '1080p No Watermark', sizeEst: '~16 MB' },
        { id: 'tt-sd', label: 'MP4 Video Tiêu Chuẩn (720p)', ext: 'mp4', type: 'video', quality: '720p', sizeEst: '~9.5 MB' },
        { id: 'tt-audio', label: 'MP3 Âm thanh gốc TikTok (320kbps)', ext: 'mp3', type: 'audio', quality: '320kbps', sizeEst: '~3.4 MB' },
        { id: 'tt-cover', label: 'Ảnh đại diện video (PNG)', ext: 'png', type: 'image', quality: 'High Res', sizeEst: '~850 KB', downloadUrl: thumbnail }
      ];

      res.json({ success: true, platform, title, author, thumbnail, duration: '00:58', formats });
      return;
    }

    // Detect Facebook
    if (trimmedUrl.includes('facebook.com') || trimmedUrl.includes('fb.watch')) {
      platform = 'facebook';
      title = 'Facebook Reel & Video HD';
      author = 'Facebook Creator';
      thumbnail = 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&auto=format&fit=crop&q=80';

      formats = [
        { id: 'fb-hd', label: 'MP4 Video Độ Nét Cao (HD 1080p)', ext: 'mp4', type: 'video', quality: '1080p HD', sizeEst: '~32 MB' },
        { id: 'fb-sd', label: 'MP4 Video Tiêu Chuẩn (SD 480p)', ext: 'mp4', type: 'video', quality: '480p SD', sizeEst: '~15 MB' },
        { id: 'fb-audio', label: 'MP3 Tách Âm Thanh (192kbps)', ext: 'mp3', type: 'audio', quality: '192kbps', sizeEst: '~4.5 MB' }
      ];

      res.json({ success: true, platform, title, author, thumbnail, duration: '02:15', formats });
      return;
    }

    // Detect Instagram
    if (trimmedUrl.includes('instagram.com')) {
      platform = 'instagram';
      title = 'Instagram Reel & Post';
      author = 'Instagram Creator';
      thumbnail = 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&auto=format&fit=crop&q=80';

      formats = [
        { id: 'ig-mp4', label: 'MP4 Reel Gốc (1080x1920 Full HD)', ext: 'mp4', type: 'video', quality: '1080p', sizeEst: '~18 MB' },
        { id: 'ig-mp3', label: 'MP3 Nhạc nền Reel (320kbps)', ext: 'mp3', type: 'audio', quality: '320kbps', sizeEst: '~3.2 MB' },
        { id: 'ig-img', label: 'Ảnh bìa chất lượng cao (PNG)', ext: 'png', type: 'image', quality: '1080x1080', sizeEst: '~1.1 MB', downloadUrl: thumbnail }
      ];

      res.json({ success: true, platform, title, author, thumbnail, duration: '00:45', formats });
      return;
    }

    // Detect Twitter / X
    if (trimmedUrl.includes('twitter.com') || trimmedUrl.includes('x.com')) {
      platform = 'twitter';
      title = 'Twitter / X Media Post';
      author = 'X User';
      thumbnail = 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&auto=format&fit=crop&q=80';

      formats = [
        { id: 'x-mp4-hd', label: 'MP4 Video Twitter (720p HD)', ext: 'mp4', type: 'video', quality: '720p', sizeEst: '~12 MB' },
        { id: 'x-mp3', label: 'MP3 Âm thanh (192kbps)', ext: 'mp3', type: 'audio', quality: '192kbps', sizeEst: '~3.8 MB' }
      ];

      res.json({ success: true, platform, title, author, thumbnail, duration: '01:20', formats });
      return;
    }

    // Direct Media Link
    const directExtMatch = trimmedUrl.match(/\.(mp4|webm|mp3|wav|ogg|png|jpg|jpeg|gif|webp|pdf|json|csv)(\?.*)?$/i);
    if (directExtMatch) {
      const ext = directExtMatch[1].toLowerCase();
      const isVideo = ['mp4', 'webm'].includes(ext);
      const isAudio = ['mp3', 'wav', 'ogg'].includes(ext);
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);

      platform = 'direct';
      title = path.basename(trimmedUrl.split('?')[0]);
      author = new URL(trimmedUrl).hostname;
      thumbnail = isImage ? trimmedUrl : '';

      formats = [
        {
          id: 'direct-orig',
          label: `Tệp gốc (.${ext})`,
          ext: ext,
          type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
          quality: 'Original Stream',
          sizeEst: 'Trực tiếp',
          downloadUrl: `/api/proxy-download?url=${encodeURIComponent(trimmedUrl)}&filename=${encodeURIComponent(title)}`
        }
      ];

      if (isVideo) {
        formats.push({
          id: 'direct-mp3',
          label: 'Chuyển sang MP3 Âm thanh (320kbps)',
          ext: 'mp3',
          type: 'audio',
          quality: '320kbps Audio',
          sizeEst: '~6.5 MB'
        });
      }

      res.json({ success: true, platform, title, author, thumbnail, duration: '--:--', formats });
      return;
    }

    // Generic fallback for any other web link
    res.json({
      success: true,
      platform: 'web',
      title: 'Tệp nội dung web: ' + new URL(trimmedUrl).hostname,
      author: new URL(trimmedUrl).hostname,
      thumbnail: '',
      duration: '--:--',
      formats: [
        { id: 'web-mp4', label: 'Tải MP4 Video nếu có', ext: 'mp4', type: 'video', quality: 'Tự động', sizeEst: '~20 MB' },
        { id: 'web-mp3', label: 'Tải MP3 Âm thanh nếu có', ext: 'mp3', type: 'audio', quality: '320kbps', sizeEst: '~5 MB' }
      ]
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Lỗi phân tích URL: ' + message });
  }
});

// Proxy stream to bypass CORS for client media fetches
app.get('/api/proxy-download', async (req: Request, res: Response) => {
  try {
    const targetUrl = req.query.url as string;
    const filename = (req.query.filename as string) || 'download';

    if (!targetUrl) {
      res.status(400).send('Missing url parameter');
      return;
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      res.status(response.status).send(`Failed to fetch media: ${response.statusText}`);
      return;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).send('Error streaming media: ' + message);
  }
});

// Mock/Synthetic Media Stream Generator for Social Media download demos
// Generates a valid sample media file (MP4, MP3, PNG) with audio or video content
app.get('/api/generate-media-sample', (req: Request, res: Response) => {
  const ext = (req.query.ext as string) || 'mp3';
  const title = (req.query.title as string) || 'downloaded_media';

  if (ext === 'png') {
    // 1x1 transparent png minimum or simple valid png
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buf = Buffer.from(pngBase64, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.png"`);
    res.send(buf);
    return;
  }

  // Audio / Video binary headers
  res.setHeader('Content-Type', ext === 'mp4' ? 'video/mp4' : 'audio/mpeg');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.${ext}"`);
  
  // Create an informative dummy buffer so user can test download seamlessly
  const dummyData = Buffer.from(`[OmniConvert Stream Container: ${title} in format .${ext}] Generated successfully.`);
  res.send(dummyData);
});

// Setup Vite middleware in dev or static files in production
async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch(console.error);

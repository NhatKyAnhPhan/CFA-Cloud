import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'tools');
const outputPath = path.join(outputDirectory, 'yt-dlp.exe');
const temporaryPath = `${outputPath}.download`;
const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';

const response = await fetch(downloadUrl);
if (!response.ok) {
  throw new Error(`Không tải được yt-dlp từ GitHub (HTTP ${response.status}).`);
}

const executable = Buffer.from(await response.arrayBuffer());
if (executable.length < 1_000_000 || executable.subarray(0, 2).toString() !== 'MZ') {
  throw new Error('Tệp tải về không phải yt-dlp.exe hợp lệ.');
}

await mkdir(outputDirectory, { recursive: true });
try {
  await writeFile(temporaryPath, executable);
  await rename(temporaryPath, outputPath);
} catch (error) {
  await rm(temporaryPath, { force: true });
  throw error;
}

console.log(`yt-dlp.exe sẵn sàng (${(executable.length / 1024 / 1024).toFixed(1)} MB).`);

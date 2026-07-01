import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { default: pdfParse } = await import('pdf-parse').catch(() => ({ default: require('pdf-parse') }));

async function loadTxt(filePath) {
  const text = await fs.readFile(filePath, 'utf-8');
  return text;
}

async function loadPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

export async function loadDocumentsFromFolder(folderPath) {
  const files = await fs.readdir(folderPath);
  const docs = [];

  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const ext = path.extname(file).toLowerCase();

    if (ext === '.txt') {
      console.log(`📄 Loading txt: ${file}`);
      const text = await loadTxt(fullPath);
      docs.push({ file, text });
    } else if (ext === '.pdf') {
      console.log(`📄 Loading pdf: ${file}`);
      const text = await loadPdf(fullPath);
      docs.push({ file, text });
    }
  }

  console.log(`✅ Loaded ${docs.length} document(s)\n`);
  return docs;
}
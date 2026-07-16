import axios from 'axios';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

/**
 * Translate a single text from English to Spanish using MyMemory API.
 */
async function translateText(text: string): Promise<string> {
  if (!text.trim()) return text;
  try {
    const response = await axios.get(MYMEMORY_URL, {
      params: { q: text, langpair: 'en|es' },
      timeout: 5000,
    });
    const translated = response.data?.responseData?.translatedText;
    return translated ?? text;
  } catch {
    // If translation fails, return original text
    return text;
  }
}

/**
 * Translate multiple texts in a batch (sequential to respect rate limits).
 * Groups them into a single request using separator trick for efficiency.
 */
export async function translateBatch(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];

  // MyMemory supports up to 500 chars per request.
  // We batch small texts together using a separator.
  const SEPARATOR = ' ||| ';
  const MAX_CHARS = 450;
  const results: string[] = new Array(texts.length).fill('');
  let currentBatch: { index: number; text: string }[] = [];
  let currentLength = 0;

  const flushBatch = async (batch: { index: number; text: string }[]) => {
    if (batch.length === 0) return;
    const combined = batch.map(b => b.text).join(SEPARATOR);
    const translated = await translateText(combined);
    const parts = translated.split(/\s*\|\|\|\s*/);
    for (let i = 0; i < batch.length; i++) {
      results[batch[i].index] = parts[i]?.trim() ?? batch[i].text;
    }
  };

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const newLength = currentLength + text.length + SEPARATOR.length;

    if (newLength > MAX_CHARS && currentBatch.length > 0) {
      await flushBatch(currentBatch);
      currentBatch = [];
      currentLength = 0;
    }

    currentBatch.push({ index: i, text });
    currentLength += text.length + (currentBatch.length > 1 ? SEPARATOR.length : 0);
  }

  await flushBatch(currentBatch);
  return results;
}

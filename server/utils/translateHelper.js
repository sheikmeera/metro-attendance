const fetch = require('node-fetch');

const memoryCache = new Map();

// Hardcoded overrides for words where API fails or provides poor translation
const localOverrides = {
    'maintenance': { ta: 'பராமரிப்பு', hi: 'रखरखाव' }
};

/**
 * Translates text to target language via MyMemory API.
 * Uses an in-memory cache to prevent repeated API calls.
 */
async function translateText(text, targetLang) {
    if (!text || typeof text !== 'string') return text;
    if (!targetLang || targetLang === 'en') return text;

    // Skip numbers, UUIDs, IDs like MET001, emails, coords
    if (/^[\d.\-\s+]+$/.test(text) || /^MET\d+$/i.test(text) || text.includes('@')) {
        return text;
    }

    const lowerText = text.trim().toLowerCase();

    // Check local overrides first
    if (localOverrides[lowerText] && localOverrides[lowerText][targetLang]) {
        return localOverrides[lowerText][targetLang];
    }

    const cacheKey = `${targetLang}_${lowerText}`;
    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey);
    }

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
        const res = await fetch(url);
        if (!res.ok) return text;
        const data = await res.json();

        const translatedText = data.responseData?.translatedText;
        if (translatedText && !translatedText.includes('MYMEMORY WARNING')) {
            memoryCache.set(cacheKey, translatedText);
            return translatedText;
        }
    } catch (e) {
        console.error("Backend Translation API error:", e.message);
    }

    return text;
}

module.exports = { translateText };

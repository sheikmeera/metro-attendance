import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

// Memory cache to instantly return strings already translated in this session
const memoryCache = {};

// Hardcoded overrides for words where API fails or provides poor translation
const localOverrides = {
    'maintenance': { ta: 'பராமரிப்பு', hi: 'रखरखाव' }
};

export async function translateText(text, targetLang) {
    if (!text || typeof text !== 'string') return text;
    if (targetLang === 'en') return text; // Base language is English

    // Skip pure numbers, UUIDs, emails, or IDs like MET001
    if (/^[\d.\-\s+]+$/.test(text) || /^MET\d+$/i.test(text) || text.includes('@')) {
        return text;
    }

    const lowerText = text.trim().toLowerCase();

    // Check local overrides first
    if (localOverrides[lowerText] && localOverrides[lowerText][targetLang]) {
        return localOverrides[lowerText][targetLang];
    }

    const cacheKey = `${targetLang}_${lowerText}`;

    // Check memory cache
    if (memoryCache[cacheKey]) return memoryCache[cacheKey];

    // Check localStorage cache
    if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('trans_' + cacheKey);
        if (cached && !cached.toLowerCase().includes('kturtle') && !cached.includes('MYMEMORY')) {
            memoryCache[cacheKey] = cached;
            return cached;
        } else if (cached) {
            localStorage.removeItem('trans_' + cacheKey);
        }
    }

    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
        const data = await res.json();
        const translatedText = data.responseData?.translatedText;

        if (translatedText && !translatedText.includes('MYMEMORY') && !translatedText.toLowerCase().includes('kturtle')) {
            memoryCache[cacheKey] = translatedText;
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('trans_' + cacheKey, translatedText);
            }
            return translatedText;
        }
    } catch (e) {
        console.error("Translation API error:", e);
    }

    return text;
}

/**
 * React Component to render translated dynamic text asynchronously
 */
export function Translate({ text }) {
    const { language } = useApp();
    const [translated, setTranslated] = useState(text);

    useEffect(() => {
        if (!text) return;
        if (language === 'en') {
            setTranslated(text);
            return;
        }

        let isMounted = true;

        // Fast path for cached text
        const cacheKey = `${language}_${text.trim().toLowerCase()}`;
        if (memoryCache[cacheKey]) {
            setTranslated(memoryCache[cacheKey]);
            return;
        }

        translateText(text, language).then(res => {
            if (isMounted) setTranslated(res);
        });

        return () => { isMounted = false; };
    }, [text, language]);

    return <>{translated || text}</>;
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './translations';

// Format the resources object required by i18next
const resources = {
    en: { translation: translations.en },
    ta: { translation: translations.ta },
    hi: { translation: translations.hi }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem('metro_lang') || 'en', // default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;

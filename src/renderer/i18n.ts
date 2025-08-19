import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';

// It's better to initialize i18n in an async function
// so we can await the language from the main process.
const initializeI18n = async () => {
  const initialLang = await window.electronAPI.getLanguage();

  await i18n
    .use(HttpApi) // Loads translations from backend
    .use(initReactI18next) // Passes i18n instance to react-i18next.
    .init({
      lng: initialLang, // Set language from store, default to 'ko'
      fallbackLng: 'en', // Fallback language
      ns: ['translation'],
      defaultNS: 'translation',
      nsSeparator: false, // <--- 이 부분을 추가합니다.
      backend: {
        // Path to translation files
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },
      interpolation: {
        escapeValue: false, // React already safes from xss
      },
      react: {
        useSuspense: true, // Use suspense for loading translations
      },
    });
};

initializeI18n();

export default i18n;

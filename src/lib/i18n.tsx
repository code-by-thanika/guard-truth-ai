/**
 * Multi-language support (English + Hindi).
 * Preference is stored in localStorage and mirrored to the user profile.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "hi";

const translations = {
  en: {
    "nav.home": "Home",
    "nav.about": "About",
    "nav.features": "Features",
    "nav.how": "How it works",
    "nav.team": "Team",
    "nav.contact": "Contact",
    "nav.signIn": "Sign in",
    "nav.getStarted": "Get started",
    "nav.dashboard": "Dashboard",
    "nav.detect": "Detect",
    "nav.history": "History",
    "nav.assistant": "Assistant",
    "nav.profile": "Profile",
    "nav.admin": "Admin",
    "nav.signOut": "Sign out",

    "hero.badge": "Naïve Bayes + TF-IDF classifier",
    "hero.title": "Know what's true before you share it",
    "hero.subtitle":
      "TruthGuard AI classifies news as fake or real using a Multinomial Naïve Bayes model over TF-IDF features, then explains the verdict in plain language.",
    "hero.cta": "Analyse a headline",
    "hero.secondary": "See how it works",
    "hero.stat1": "Model accuracy",
    "hero.stat2": "Average latency",
    "hero.stat3": "Input modes",

    "about.title": "Built for media literacy",
    "about.body":
      "Misinformation spreads faster than corrections. TruthGuard AI pairs a transparent statistical classifier with an AI explanation layer, so you see not only the verdict but the reasoning, the risky claims and what to verify next.",

    "features.title": "Everything in one workspace",
    "features.subtitle": "Detection, explanation, history and analytics.",

    "how.title": "How the pipeline works",
    "how.subtitle": "Every prediction follows the same seven deterministic steps.",

    "team.title": "The team",
    "team.subtitle": "An AIML internship project team.",

    "contact.title": "Get in touch",
    "contact.subtitle": "Questions about the model or the dataset? Send a note.",
    "contact.name": "Your name",
    "contact.email": "Email",
    "contact.message": "Message",
    "contact.send": "Send message",
    "contact.sent": "Thanks! Your message has been noted.",

    "auth.welcome": "Welcome back",
    "auth.createAccount": "Create your account",
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.forgot": "Forgot password?",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Full name",
    "auth.google": "Continue with Google",
    "auth.reset": "Send reset link",
    "auth.backToLogin": "Back to login",

    "dash.title": "Dashboard",
    "dash.total": "Total predictions",
    "dash.fake": "Fake news detected",
    "dash.real": "Real news verified",
    "dash.accuracy": "Model accuracy",
    "dash.distribution": "Verdict distribution",
    "dash.activity": "Last 7 days",
    "dash.recent": "Recent predictions",
    "dash.empty": "No predictions yet. Run your first analysis.",

    "detect.title": "Fake news detection",
    "detect.subtitle": "Type, paste, upload a .txt file or scan an image.",
    "detect.tabType": "Type text",
    "detect.tabPaste": "Paste article",
    "detect.tabFile": "Upload .txt",
    "detect.tabImage": "Image (OCR)",
    "detect.placeholder": "Paste or type the news content here (at least 30 characters)...",
    "detect.analyse": "Analyse with Naïve Bayes",
    "detect.analysing": "Running the pipeline...",
    "detect.clear": "Clear",
    "detect.verdict": "Verdict",
    "detect.confidence": "Confidence",
    "detect.fake": "Likely FAKE",
    "detect.real": "Likely REAL",
    "detect.explain": "AI explanation",
    "detect.summary": "Summary",
    "detect.claims": "Suspicious claims",
    "detect.tips": "Fact-checking tips",
    "detect.tokens": "Influential terms",
    "detect.dropFile": "Choose a .txt file",
    "detect.dropImage": "Choose an image",
    "detect.ocrRunning": "Extracting text from image...",
    "detect.ocrDone": "Text extracted. Review and analyse.",

    "history.title": "Prediction history",
    "history.search": "Search text...",
    "history.all": "All",
    "history.export": "Export CSV",
    "history.delete": "Delete",
    "history.empty": "Nothing here yet.",
    "history.date": "Date",
    "history.news": "News",
    "history.prediction": "Prediction",

    "chat.title": "AI assistant",
    "chat.subtitle": "Ask anything about fake news and verification.",
    "chat.placeholder": "Ask about misinformation, sources or this model...",
    "chat.send": "Send",

    "profile.title": "Profile & settings",
    "profile.name": "Display name",
    "profile.language": "Language",
    "profile.theme": "Theme",
    "profile.light": "Light",
    "profile.dark": "Dark",
    "profile.save": "Save changes",
    "profile.saved": "Profile updated",

    "admin.title": "Admin panel",
    "admin.users": "Users",
    "admin.analytics": "Analytics",
    "admin.retrain": "Retrain model",
    "admin.uploadFake": "Fake.csv",
    "admin.uploadTrue": "True.csv",
    "admin.startTraining": "Train Naïve Bayes",
    "admin.training": "Training model...",
    "admin.versions": "Model versions",
    "admin.activate": "Activate",
    "admin.notAdmin": "You don't have admin access.",
    "admin.claim": "Claim admin access",

    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.rows": "rows",
  },
  hi: {
    "nav.home": "होम",
    "nav.about": "परिचय",
    "nav.features": "विशेषताएँ",
    "nav.how": "यह कैसे काम करता है",
    "nav.team": "टीम",
    "nav.contact": "संपर्क",
    "nav.signIn": "साइन इन",
    "nav.getStarted": "शुरू करें",
    "nav.dashboard": "डैशबोर्ड",
    "nav.detect": "जाँच",
    "nav.history": "इतिहास",
    "nav.assistant": "सहायक",
    "nav.profile": "प्रोफ़ाइल",
    "nav.admin": "एडमिन",
    "nav.signOut": "साइन आउट",

    "hero.badge": "नाइव बेयस + TF-IDF वर्गीकरण",
    "hero.title": "साझा करने से पहले सच जानें",
    "hero.subtitle":
      "TruthGuard AI, TF-IDF फ़ीचर्स पर मल्टीनोमियल नाइव बेयस मॉडल से समाचार को फ़र्ज़ी या असली बताता है और फिर सरल भाषा में कारण समझाता है।",
    "hero.cta": "समाचार जाँचें",
    "hero.secondary": "प्रक्रिया देखें",
    "hero.stat1": "मॉडल सटीकता",
    "hero.stat2": "औसत समय",
    "hero.stat3": "इनपुट विकल्प",

    "about.title": "मीडिया साक्षरता के लिए बनाया गया",
    "about.body":
      "गलत सूचना सुधार से तेज़ फैलती है। TruthGuard AI एक पारदर्शी सांख्यिकीय मॉडल के साथ AI व्याख्या जोड़ता है, जिससे आपको निर्णय के साथ कारण, संदिग्ध दावे और जाँचने योग्य बिंदु भी मिलते हैं।",

    "features.title": "सब कुछ एक जगह",
    "features.subtitle": "जाँच, व्याख्या, इतिहास और विश्लेषण।",

    "how.title": "पाइपलाइन कैसे काम करती है",
    "how.subtitle": "हर भविष्यवाणी सात निश्चित चरणों से गुजरती है।",

    "team.title": "टीम",
    "team.subtitle": "एक AIML इंटर्नशिप प्रोजेक्ट टीम।",

    "contact.title": "संपर्क करें",
    "contact.subtitle": "मॉडल या डेटासेट के बारे में प्रश्न? संदेश भेजें।",
    "contact.name": "आपका नाम",
    "contact.email": "ईमेल",
    "contact.message": "संदेश",
    "contact.send": "संदेश भेजें",
    "contact.sent": "धन्यवाद! आपका संदेश दर्ज कर लिया गया है।",

    "auth.welcome": "फिर से स्वागत है",
    "auth.createAccount": "अपना खाता बनाएँ",
    "auth.login": "लॉगिन",
    "auth.register": "रजिस्टर",
    "auth.forgot": "पासवर्ड भूल गए?",
    "auth.email": "ईमेल",
    "auth.password": "पासवर्ड",
    "auth.name": "पूरा नाम",
    "auth.google": "Google से जारी रखें",
    "auth.reset": "रीसेट लिंक भेजें",
    "auth.backToLogin": "लॉगिन पर लौटें",

    "dash.title": "डैशबोर्ड",
    "dash.total": "कुल भविष्यवाणियाँ",
    "dash.fake": "फ़र्ज़ी समाचार",
    "dash.real": "असली समाचार",
    "dash.accuracy": "मॉडल सटीकता",
    "dash.distribution": "परिणाम वितरण",
    "dash.activity": "पिछले 7 दिन",
    "dash.recent": "हाल की जाँचें",
    "dash.empty": "अभी कोई जाँच नहीं। पहली जाँच करें।",

    "detect.title": "फ़र्ज़ी समाचार जाँच",
    "detect.subtitle": "टाइप करें, पेस्ट करें, .txt अपलोड करें या छवि स्कैन करें।",
    "detect.tabType": "टाइप करें",
    "detect.tabPaste": "लेख पेस्ट करें",
    "detect.tabFile": ".txt अपलोड",
    "detect.tabImage": "छवि (OCR)",
    "detect.placeholder": "समाचार यहाँ लिखें या पेस्ट करें (कम से कम 30 अक्षर)...",
    "detect.analyse": "नाइव बेयस से जाँचें",
    "detect.analysing": "पाइपलाइन चल रही है...",
    "detect.clear": "साफ़ करें",
    "detect.verdict": "परिणाम",
    "detect.confidence": "विश्वास स्तर",
    "detect.fake": "संभवतः फ़र्ज़ी",
    "detect.real": "संभवतः असली",
    "detect.explain": "AI व्याख्या",
    "detect.summary": "सारांश",
    "detect.claims": "संदिग्ध दावे",
    "detect.tips": "तथ्य-जाँच सुझाव",
    "detect.tokens": "प्रभावी शब्द",
    "detect.dropFile": ".txt फ़ाइल चुनें",
    "detect.dropImage": "छवि चुनें",
    "detect.ocrRunning": "छवि से पाठ निकाला जा रहा है...",
    "detect.ocrDone": "पाठ निकाल लिया गया। जाँच करें।",

    "history.title": "जाँच इतिहास",
    "history.search": "पाठ खोजें...",
    "history.all": "सभी",
    "history.export": "CSV निर्यात",
    "history.delete": "हटाएँ",
    "history.empty": "अभी कुछ नहीं है।",
    "history.date": "दिनांक",
    "history.news": "समाचार",
    "history.prediction": "परिणाम",

    "chat.title": "AI सहायक",
    "chat.subtitle": "फ़र्ज़ी समाचार और सत्यापन के बारे में पूछें।",
    "chat.placeholder": "गलत सूचना, स्रोत या इस मॉडल के बारे में पूछें...",
    "chat.send": "भेजें",

    "profile.title": "प्रोफ़ाइल और सेटिंग्स",
    "profile.name": "प्रदर्शित नाम",
    "profile.language": "भाषा",
    "profile.theme": "थीम",
    "profile.light": "लाइट",
    "profile.dark": "डार्क",
    "profile.save": "परिवर्तन सहेजें",
    "profile.saved": "प्रोफ़ाइल अपडेट हुई",

    "admin.title": "एडमिन पैनल",
    "admin.users": "उपयोगकर्ता",
    "admin.analytics": "विश्लेषण",
    "admin.retrain": "मॉडल पुनःप्रशिक्षण",
    "admin.uploadFake": "Fake.csv",
    "admin.uploadTrue": "True.csv",
    "admin.startTraining": "नाइव बेयस प्रशिक्षित करें",
    "admin.training": "मॉडल प्रशिक्षित हो रहा है...",
    "admin.versions": "मॉडल संस्करण",
    "admin.activate": "सक्रिय करें",
    "admin.notAdmin": "आपके पास एडमिन पहुँच नहीं है।",
    "admin.claim": "एडमिन पहुँच लें",

    "common.loading": "लोड हो रहा है...",
    "common.error": "कुछ गलत हो गया",
    "common.rows": "पंक्तियाँ",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "truthguard.language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Read after mount to avoid a hydration mismatch.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "hi") setLanguageState(stored);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key] ?? translations.en[key] ?? key,
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'en' | 'si';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Meta / Global
    "appTitle": "MindSight",
    "appSubtitle": "RV TRAINING PROTOCOL v2.5",
    "login": "Login",
    "logout": "Sign Out",
    "operator": "Operator",
    "viewer": "Viewer",
    "session": "Session",
    
    // Dashboard (Idle)
    "welcomeBack": "Welcome back",
    "readyToTrain": "Ready to Train?",
    "introAuth": "Initialize a blind session. Follow the 4-step protocol to record your data before feedback.",
    "introGuest": "Sign in to track your progress across devices and analyze your Remote Viewing sessions with AI.",
    "startSession": "START NEW SESSION",
    "startSessionLoading": "FETCHING ONLINE TARGET...",
    "initializing": "INITIALIZING...",
    "signInRegister": "SIGN IN / REGISTER",
    "historyTitle": "Performance History",
    "aiCoachBtn": "Generate AI Coach Report",
    "aiCoachReady": "AI Analysis Ready",
    "aiCoachUnlock": "Complete 3 sessions to unlock personalized training insights.",
    "analyzing": "Analyzing...",
    "generateReport": "Generate Report",
    "noHistory": "No history yet.",

    // Steps
    "stepFocus": "Focus",
    "stepImpressions": "Impressions",
    "stepSketch": "Sketch",
    "stepReview": "Review",

    // Step 1: Focus
    "trn": "Target Reference Number",
    "focusTitle": "Target Reference Number",
    "focusDesc": "Relax. Clear your mind of expectations. Focus only on the coordinate. Allow information to drift into your awareness gently.",
    "focusTip": "Click the button below to start a guided breathing sequence to help you enter the Alpha state.",
    "startFocusSeq": "START FOCUS SEQUENCE",
    "stopFocusSeq": "I AM READY",
    "breatheIn": "Breathe In...",
    "breatheOut": "Breathe Out...",
    "breatheHold": "Hold...",
    "btnFocused": "I am focused",

    // Step 2: Impressions
    "stage1Title": "Stage 1: Sensory Data",
    "stage1Desc": "Write down the first sensory impressions (Gestalts). Colors, textures, smells, temperatures.",
    "placeholderNotes": "e.g., Red, rough texture, metallic smell, sense of motion...",
    "btnNextVisuals": "Next: Visuals",
    "btnBack": "Back",

    // Step 3: Sketch
    "stage2Title": "Stage 2: Visual Sketch",
    "stage2Desc": "Draw the shapes and forms. Do not try to identify the object.",
    "sketchReviewBtn": "Review Session",
    "sketchInstruction": "Use your mouse or finger to sketch your impressions.",
    "clearCanvas": "Clear All",

    // Step 4: Review
    "reviewTitle": "Final Review",
    "reviewDesc": "Check your data before submitting to the AI Judge.",
    "sensoryNotes": "Sensory Notes",
    "noNotes": "No notes recorded.",
    "sketchPreview": "Sketch Preview",
    "noSketch": "No sketch drawn",
    "editData": "Edit Data",
    "submitAnalysis": "SUBMIT FOR ANALYSIS",

    // Analyzing
    "analyzingTitle": "Analyzing Session...",
    "analyzingDesc": "Comparing your sketch with the blind target.",

    // Feedback
    "feedbackPhase": "Feedback Phase",
    "accuracyScore": "ACCURACY SCORE",
    "nextSession": "Next Session",
    "actualTarget": "ACTUAL TARGET",
    "yourSketch": "YOUR SKETCH",
    "aiAnalysis": "AI Analysis",
    "trendTitle": "Performance Trend",
    "accuracyTrend": "Accuracy Trend",

    // Auth Modal
    "welcomeBackAuth": "Welcome Back",
    "createAccount": "Create Account",
    "displayName": "Display Name",
    "yourName": "Your Name",
    "emailAddress": "Email Address",
    "password": "Password",
    "btnSignIn": "Sign In",
    "btnSignUp": "Sign Up",
    "haveAccount": "Already have an account?",
    "noAccount": "Don't have an account?",
    "authFailed": "Authentication failed.",

    // AI Coach
    "coachReport": "AI Coach Report",
    "strengths": "STRENGTHS",
    "weaknesses": "WEAKNESSES",
    "tip": "TIP",

    // Navigation
    "confirmExit": "Are you sure you want to exit? Current session data will be lost.",
    "exitSession": "Exit Session",
  },
  si: {
    // Meta / Global
    "appTitle": "MindSight",
    "appSubtitle": "RV පුහුණු ප්‍රොටෝකෝලය v2.5",
    "login": "පිවිසෙන්න",
    "logout": "ඉවත් වන්න",
    "operator": "ක්‍රියාකරු",
    "viewer": "නිරීක්ෂකයා",
    "session": "සැසිය",

    // Dashboard (Idle)
    "welcomeBack": "නැවත සාදරයෙන් පිළිගනිමු",
    "readyToTrain": "පුහුණුවට සූදානම්ද?",
    "introAuth": "අන්ධ සැසියක් අරඹන්න. ප්‍රතිපෝෂණයට පෙර ඔබේ දත්ත වාර්තා කිරීමට පියවර 4 කින් යුත් ක්‍රියාවලිය අනුගමනය කරන්න.",
    "introGuest": "උපාංග හරහා ඔබේ ප්‍රගතිය නිරීක්ෂණය කිරීමට සහ AI සමඟ ඔබේ සැසි විශ්ලේෂණය කිරීමට පුරන්න.",
    "startSession": "නව සැසියක් අරඹන්න",
    "startSessionLoading": "ඉලක්කය ලබා ගනිමින්...",
    "initializing": "ආරම්භ කරමින්...",
    "signInRegister": "ලියාපදිංචි වීම / ඇතුල් වීම",
    "historyTitle": "කාර්ය සාධන ඉතිහාසය",
    "aiCoachBtn": "AI උපදේශක වාර්තාව",
    "aiCoachReady": "AI විශ්ලේෂණය සූදානම්",
    "aiCoachUnlock": "පුද්ගලීකරණය කළ පුහුණු උපදෙස් ලබා ගැනීමට සැසි 3ක් සම්පූර්ණ කරන්න.",
    "analyzing": "විශ්ලේෂණය කරමින්...",
    "generateReport": "වාර්තාව සදන්න",
    "noHistory": "තවම ඉතිහාසයක් නැත.",

    // Steps
    "stepFocus": "අවධානය",
    "stepImpressions": "හැඟීම්",
    "stepSketch": "සිතුවම",
    "stepReview": "පරිශීලනය",

    // Step 1: Focus
    "trn": "ඉලක්ක යොමු අංකය",
    "focusTitle": "ඉලක්ක යොමු අංකය (TRN)",
    "focusDesc": "සන්සුන් වන්න. අපේක්ෂාවන්ගෙන් මනස නිදහස් කරන්න. ඛණ්ඩාංකය කෙරෙහි පමණක් අවධානය යොමු කරන්න.",
    "focusTip": "ඇල්ෆා මට්ටමට ළඟා වීම සඳහා හුස්ම ගැනීමේ අභ්‍යාසය ආරම්භ කිරීමට පහත බොත්තම ක්ලික් කරන්න.",
    "startFocusSeq": "හුස්ම ගැනීමේ අභ්‍යාසය අරඹන්න",
    "stopFocusSeq": "මම සූදානම්",
    "breatheIn": "හුස්ම ගන්න...",
    "breatheOut": "හුස්ම පිටකරන්න...",
    "breatheHold": "රඳවා ගන්න...",
    "btnFocused": "මම අවධානය යොමු කළා",

    // Step 2: Impressions
    "stage1Title": "අදියර 1: සංවේදක දත්ත",
    "stage1Desc": "පළමු සංවේදක හැඟීම් ලියන්න (Gestalts). වර්ණ, හැඩතල, සුවඳ, උෂ්ණත්වය.",
    "placeholderNotes": "උදා: රතු, රළු මතුපිට, ලෝහමය සුවඳ, චලනය...",
    "btnNextVisuals": "ඊළඟ: දෘශ්‍ය රූප",
    "btnBack": "ආපසු",

    // Step 3: Sketch
    "stage2Title": "අදියර 2: දෘශ්‍ය සිතුවම",
    "stage2Desc": "හැඩතල සහ රූප අඳින්න. වස්තුව කුමක්දැයි හඳුනා ගැනීමට උත්සාහ නොකරන්න.",
    "sketchReviewBtn": "සැසිය පරීක්ෂා කරන්න",
    "sketchInstruction": "ඔබේ හැඟීම් සටහන් කිරීමට මවුසය හෝ ඇඟිල්ල භාවිතා කරන්න.",
    "clearCanvas": "සියල්ල මකන්න",

    // Step 4: Review
    "reviewTitle": "අවසාන පරීක්ෂාව",
    "reviewDesc": "AI විනිසුරු වෙත ඉදිරිපත් කිරීමට පෙර ඔබේ දත්ත පරීක්ෂා කරන්න.",
    "sensoryNotes": "සංවේදක සටහන්",
    "noNotes": "සටහන් කර නැත.",
    "sketchPreview": "සිතුවම් පෙරදසුන",
    "noSketch": "සිතුවමක් නැත",
    "editData": "දත්ත වෙනස් කරන්න",
    "submitAnalysis": "විශ්ලේෂණය සඳහා ඉදිරිපත් කරන්න",

    // Analyzing
    "analyzingTitle": "සැසිය විශ්ලේෂණය කරමින්...",
    "analyzingDesc": "ඔබේ සිතුවම අන්ධ ඉලක්කය සමඟ සසඳමින්.",

    // Feedback
    "feedbackPhase": "ප්‍රතිපෝෂණ අදියර",
    "accuracyScore": "නිරවද්‍යතා ලකුණු",
    "nextSession": "ඊළඟ සැසිය",
    "actualTarget": "සැබෑ ඉලක්කය",
    "yourSketch": "ඔබේ සිතුවම",
    "aiAnalysis": "AI විශ්ලේෂණය",
    "trendTitle": "කාර්ය සාධන ප්‍රවණතාවය",
    "accuracyTrend": "නිරවද්‍යතා ප්‍රවණතාවය",

    // Auth Modal
    "welcomeBackAuth": "නැවත සාදරයෙන් පිළිගනිමු",
    "createAccount": "ගිණුමක් සාදන්න",
    "displayName": "පෙන්වන නම",
    "yourName": "ඔබේ නම",
    "emailAddress": "විද්‍යුත් තැපැල් ලිපිනය",
    "password": "මුරපදය",
    "btnSignIn": "ඇතුල් වන්න",
    "btnSignUp": "ලියාපදිංචි වන්න",
    "haveAccount": "දැනටමත් ගිණුමක් තිබේද?",
    "noAccount": "ගිණුමක් නොමැතිද?",
    "authFailed": "සත්‍යාපනය අසාර්ථක විය.",

    // AI Coach
    "coachReport": "AI උපදේශක වාර්තාව",
    "strengths": "ශක්තීන්",
    "weaknesses": "දුර්වලතා",
    "tip": "උපදෙස්",

    // Navigation
    "confirmExit": "ඔබට පිටවීමට අවශ්‍ය බව විශ්වාසද? වත්මන් සැසි දත්ත නැති වනු ඇත.",
    "exitSession": "සැසියෙන් ඉවත් වන්න",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};


// ... keep imports
import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Get the version from the environment (injected by Vite)
const appVersion = process.env.APP_VERSION || '2.7.2';

const translations = {
  en: {
    // Meta / Global
    "appTitle": "MindSight",
    "appSubtitle": `RV TRAINING PROTOCOL v${appVersion}`,
    // ... (keep existing translations)
    "dojoLockedMsg": "LOCKED",
    "dojoUnlockedMsg": "CALIBRATION COMPLETE",
    
    "calibrationTask": "INTUITION CALIBRATION",
    "calibrationTaskDesc": "Your overall signal strength is low (< 50%). You must re-calibrate your baseline intuition by correctly predicting 3 Zener cards in a row.",
    
    "drawingCalibrationTask": "VISUAL MOTOR CALIBRATION",
    "drawingCalibrationDesc": "Your sketch accuracy was low (< 45%), even though your text data was good. You must re-align your hand-eye coordination by replicating 3 visual forms.",
    
    "completeCalibration": "You must complete the calibration task before exiting.",
    "lowScoreRedirect": "Accuracy below 50%. You must complete the Intuition Calibration task.",
    "lowDrawingRedirect": "Sketch accuracy below 45%. You must complete the Visual Motor Calibration task.",

    // ... (keep rest of existing translations)
    "login": "Login",
    "logout": "Sign Out",
    "operator": "Operator",
    "viewer": "Viewer",
    "session": "Session",
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
    "regenerateReport": "Refresh Analysis",
    "regenerateAnalysis": "Regenerate Analysis",
    "noHistory": "No history yet.",
    "totalTime": "Total Training Time",
    "viewAnalytics": "View Full Analytics",
    "intuitionDojo": "Intuition Dojo",
    "drawingDojo": "Visual Motor Dojo",
    "sessionLog": "Session Log",
    "logTitle": "Full Session Log",
    "deleteSession": "Delete",
    "confirmDelete": "Delete this session permanently?",
    "selectMode": "Select Session Mode",
    "modeTraining": "Standard Training",
    "modeTrainingDesc": "AI generates a blind photo target and scores your accuracy immediately.",
    "modeOpen": "Open Exploration",
    "modeOpenDesc": "View a real-world or personal target (e.g., Lost Object, Future Event). No AI scoring.",
    "enterIntent": "Enter Target Intent (Optional)",
    "intentPlaceholder": "e.g., Location of missing keys, Tomorrow's Headlines...",
    "intentDesc": "Describe what you are looking for. This helps you verify your data later.",
    "startOpenSession": "Start Open Session",
    "level": "Level",
    "division": "Div",
    "currentRank": "Current Rank",
    "nextRank": "Next Rank",
    "rankLocked": "Rank Calibration",
    "rankLockedDesc": "Complete 3 training sessions to establish your baseline accuracy and earn your first rank.",
    "calibrating": "Calibrating",
    "lvl1": "Novice",
    "lvl2": "Apprentice",
    "lvl3": "Initiate",
    "lvl4": "Viewer",
    "lvl5": "Monitor",
    "lvl6": "Operator",
    "lvl7": "Specialist",
    "lvl8": "Expert",
    "lvl9": "Oracle",
    "cap_lvl1": "Establishing the Signal Line. You are learning to distinguish between imagination (AOL) and true sensory signal. Capable of detecting major energetic shifts.",
    "cap_lvl2": "Basic Contrast Detection. You can perceive fundamental dichotomies: Land vs Water, Man-made vs Natural, Dark vs Light.",
    "cap_lvl3": "Sensory Data Acquisition. You can consistently record core sensory gestalts: Colors, Temperatures, Smells, and Textures.",
    "cap_lvl4": "Dimensional Perception. You are beginning to perceive shapes and forms. Capable of sketching basic outlines and spatial relationships.",
    "cap_lvl5": "Reliable Contact. You can reliably describe the main subject of a target. Suitable for basic practice groups and double-blind trials.",
    "cap_lvl6": "Operational Competence. You can identify specific objects and their functions. Capable of describing complex scenes with moderate accuracy.",
    "cap_lvl7": "High-Fidelity Data. You can distinguish between similar objects and describe detailed architectural or mechanical features.",
    "cap_lvl8": "Expert Precision. Capable of blind operational work. Your sketches often closely match the target's perspective and geometry.",
    "cap_lvl9": "Mastery. Near-perfect bilocation. You can access deep conceptual data, emotions, and hidden details of the target site.",
    "analyticsTitle": "Performance Analytics",
    "avgScore": "Average Score",
    "bestScore": "Personal Best",
    "totalSessions": "Total Sessions",
    "currentCapabilities": "Current Capabilities",
    "currentCapabilitiesDesc": "Based on your rank, here is your assessed operational ability.",
    "rankRoadmap": "Rank Roadmap",
    "close": "Close",
    "aiCoachPrompt": "Click \"Generate AI Coach Report\" on the dashboard to see your Recommended Action.",
    "chatTitle": "Coach Assistant",
    "chatPlaceholder": "Ask about your progress or RV techniques...",
    "chatWelcome": "Hello! I am your Remote Viewing coach. I have reviewed your session history. How can I help you improve today?",
    "chatSend": "Send",
    "chatClose": "Close Chat",
    "openChat": "Chat with Coach",
    "dojoTitle": "Intuition Dojo",
    "dojoDesc": "Train your rapid-response intuition with Zener cards. Clear your mind and guess the hidden symbol.",
    "drawingDojoTitle": "Visual Motor Dojo",
    "drawingDojoDesc": "Train your ability to rapidly capture visual forms. Observe the Gestalt, hold it in your mind, and sketch it from memory.",
    "drawingDojoInstruct": "A shape will appear for 3 seconds. Memorize it.",
    "drawingDojoDraw": "Draw the shape from memory!",
    "drawingDojoCheck": "Did you match the shape?",
    "btnMatch": "Yes, I Matched It",
    "btnMiss": "No, I Missed",
    "guessCard": "Guess the Card",
    "streak": "Streak",
    "bestStreak": "Best Streak",
    "accuracy": "Accuracy",
    "chance": "Chance (20%)",
    "totalGuesses": "Total",
    "cardCircle": "Circle",
    "cardCross": "Cross",
    "cardWaves": "Waves",
    "cardSquare": "Square",
    "cardStar": "Star",
    "exitDojo": "Exit Dojo",
    "lowScoreWarning": "Low Accuracy Detected",
    "lowDrawingWarning": "Weak Visual Data Detected",
    "calibrationRequired": "Calibration Required",
    "calibrationDesc": "Your score was below 50%. You must recalibrate your intuition in the Dojo before continuing.",
    "drawingCalibrationRequired": "Visual Calibration Required",
    "resetTitle": "Mental Buffer Clear",
    "resetDesc": "Dissolving residual data patterns...",
    "resetAction": "Clear & Initialize",
    "resetComplete": "Buffer Cleared",
    "resetInstruction": "Visualize the previous target dissolving into static, then fading to black. Disconnect.",
    "stepFocus": "Focus",
    "stepImpressions": "Impressions",
    "stepSketch": "Sketch",
    "stepReview": "Review",
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
    "audioFocus": "Binaural Focus",
    "audioMute": "Mute Audio",
    "stage1Title": "Stage 1: Sensory Data",
    "stage1Desc": "Write down the first sensory impressions (Gestalts). Colors, textures, smells, temperatures.",
    "placeholderNotes": "e.g., Red, rough texture, metallic smell, sense of motion...",
    "btnNextVisuals": "Next: Visuals",
    "btnBack": "Back",
    "helperBtn": "Sensory Helper",
    "helperClose": "Close Helper",
    "helperTip": "Click words to add them to your notes",
    "stage2Title": "Stage 2: Visual Sketch",
    "stage2Desc": "Draw the shapes and forms. Do not try to identify the object.",
    "sketchReviewBtn": "Review Session",
    "sketchInstruction": "Use your mouse or finger to sketch your impressions.",
    "clearCanvas": "Clear All",
    "reviewTitle": "Final Review",
    "reviewDesc": "Check your data before submitting to the AI Judge.",
    "reviewSubmit": "Submit for Analysis",
    "sensoryNotes": "Sensory Notes",
    "noNotes": "No notes recorded.",
    "sketchPreview": "Sketch Preview",
    "noSketch": "No sketch drawn",
    "editData": "Edit Data",
    "submitAnalysis": "SUBMIT FOR ANALYSIS",
    "saveLog": "Save to Log (No AI)",
    "analyzingTitle": "Analyzing Session...",
    "analyzingDesc": "Comparing your sketch with the blind target.",
    "savingDesc": "Encrypting and saving your session data...",
    "analysisFailed": "Analysis Failed",
    "analysisErrorDesc": "AI Analysis could not be completed. Please check your connection and try again.",
    "tryAgain": "Try Again",
    "returnToReview": "Return to Review",
    "feedbackPhase": "Feedback Phase",
    "accuracyScore": "ACCURACY SCORE",
    "nextSession": "Next Session",
    "actualTarget": "ACTUAL TARGET",
    "targetInaccessible": "TARGET INACCESSIBLE",
    "targetInaccessibleDesc": "This was an open session. No visual feedback is available.",
    "targetIntent": "Target Intent",
    "yourSketch": "YOUR SKETCH",
    "aiAnalysis": "AI Analysis",
    "noAnalysis": "No AI Analysis performed for this session type.",
    "trendTitle": "Performance Trend",
    "accuracyTrend": "Accuracy Trend",
    "duration": "Duration",
    "min": "m",
    "sec": "s",
    "visualTools": "Visual Analysis Tools",
    "modeSplit": "Side-by-Side",
    "modeOverlay": "Overlay",
    "opacity": "Opacity",
    "invertSketch": "Invert Sketch",
    "addRemarks": "Add Post-Session Remarks (Optional)",
    "addRemarksDesc": "Describe any issues, clarifications, or thoughts about this result.",
    "saveRemarks": "Save & Review",
    "savingReview": "Saving & Recalculating...",
    "remarksSaved": "Updated!",
    "btnAnalyzeOpen": "Ask AI Analyst",
    "btnAnalyzeOpenDesc": "Ask AI to guess your target based on your sketch (Uses Cloud).",
    "aiPrediction": "AI PREDICTION",
    "analystReport": "Analyst Report",
    "analyzingOpen": "Interpreting Data...",
    "visualRecon": "Visual Reconstruction",
    "generateImage": "Generate Visualization",
    "generatingImage": "Painting...",
    "generateImageDesc": "Ask AI to draw what it thinks you saw based on your intent + sketch.",
    "aiVisualDesc": "This is an AI-generated visualization of your target based on your data.",
    "reconstructionDetails": "Optional: Add extra details to guide the generation (e.g. 'Viewed from above', 'Night time')",
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
    "coachReport": "AI Coach Report",
    "strengths": "STRENGTHS",
    "weaknesses": "WEAKNESSES",
    "tip": "TIP",
    "confirmExit": "Are you sure you want to exit? Current session data will be lost.",
    "exitSession": "Exit Session",
    "backToList": "Back to List"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Always default to English
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = (lang: Language) => {
    // No-op: enforcing English
    setLanguageState('en');
  };

  const t = (key: string): string => {
    return translations['en'][key as keyof typeof translations['en']] || key;
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

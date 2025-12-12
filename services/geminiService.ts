
import { GoogleGenAI, Type, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ScoringResult, SessionData, CoachReport, OpenAnalysisResult } from '../types';

const cleanBase64 = (data: string) => {
    // Remove data:image/xyz;base64, prefix if present
    return data.replace(/^data:image\/\w+;base64,/, "");
}

// Define permissive safety settings to avoid blocking valid RV data (e.g. anatomy, disasters)
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    // The "3rd one": Allow Sexually Explicit content (useful for biological/artistic targets)
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

export const analyzeSession = async (
  targetImageBase64: string,
  userSketchBase64: string | null,
  userNotes: string,
  language: 'en' | 'si' = 'en'
): Promise<ScoringResult> => {
  
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const parts: any[] = [];

  // Add Target Image (The Truth)
  parts.push({
    inlineData: {
      mimeType: "image/jpeg",
      data: cleanBase64(targetImageBase64),
    },
  });
  parts.push({ text: "IMAGE A: THE TARGET (GROUND TRUTH)" });

  // Add User Sketch if available
  if (userSketchBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: cleanBase64(userSketchBase64),
      },
    });
    parts.push({ text: "IMAGE B: VIEWER'S SKETCH (RAW DATA)" });
  } else {
    parts.push({ text: "The viewer did not provide a sketch." });
  }

  // Add User Notes
  parts.push({ 
    text: `VIEWER'S SENSORY NOTES: "${userNotes}"`
  });

  const langInstruction = "Respond in English.";

  // Add Instructions
  parts.push({
    text: `
      You are an expert Remote Viewing Monitor and Analyst (CRV Protocol). 
      
      YOUR TASK:
      Compare the VIEWER'S SKETCH (Image B) and NOTES against the TARGET (Image A).
      
      CRITICAL INSTRUCTION FOR SKETCH ANALYSIS:
      The Viewer is NOT an artist. Do not look for a literal drawing of an object. 
      Instead, interpret the sketch as an IDEOGRAM or GESTALT.
      
      Look for TOPOLOGICAL and ENERGETIC matches:
      1. **Motion/Energy:** If the target has flowing water, and the sketch has wavy lines, that is a HIT.
      2. **Geometry:** If the target is a building, and the sketch has a square or a grid, that is a HIT.
      3. **Placement:** Look for relationships (e.g., "A mass in the center," "A line across the bottom").
      4. **Abstraction:** A single vertical line might represent a person, a tower, or a tree. Give credit for the verticality.
      
      Do not penalize for:
      - Bad perspective.
      - Messy lines.
      - Abstract representation.
      
      ${langInstruction}

      Provide a JSON response with:
      - score: Integer (0-100). Be generous if the *gestalt* (basic shape/feeling) is correct, even if the object is unrecognizable.
      - drawingScore: Integer (0-100). How well did the lines/shapes match the target's structure?
      - notesScore: Integer (0-100). How accurate were the descriptors?
      - feedback: Detailed analysis. explicitly state: "The sketch contained [Shape X] which matches the [Feature Y] in the target." Point out abstract matches.
    `
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        safetySettings: safetySettings,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            drawingScore: { type: Type.INTEGER },
            notesScore: { type: Type.INTEGER },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ScoringResult;
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Throw error to let the App know analysis failed, rather than returning a 0 score
    throw error;
  }
};

export const recalculateScore = async (
  session: SessionData,
  remarks: string,
  language: 'en' | 'si' = 'en'
): Promise<ScoringResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];

  parts.push({
    inlineData: {
      mimeType: "image/jpeg",
      data: cleanBase64(session.targetImageBase64!),
    },
  });
  parts.push({ text: "TARGET IMAGE" });

  if (session.userSketchBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: cleanBase64(session.userSketchBase64),
      },
    });
    parts.push({ text: "USER SKETCH" });
  }

  const langInstruction = "Respond in English.";

  parts.push({
    text: `
      CONTEXT: You are reviewing a score. The user believes their abstract sketch was misinterpreted.
      
      Original Score: ${session.aiScore}
      Original Feedback: "${session.aiFeedback}"
      User Notes: "${session.userNotes}"
      
      USER REMARKS (DEFENSE): "${remarks}"

      TASK:
      Re-evaluate the sketch based on the user's explanation.
      Did the user draw a valid "Ideogram" or "Gestalt" that matches the target structure, which you originally missed?
      
      Example: If the user says "The zigzag line represents the energy of the lightning," and there is lightning in the target, ACCEPT IT as a valid data point, even if it doesn't look like a drawing of lightning.

      ${langInstruction}

      Return JSON:
      - score: Updated overall integer score (0-100).
      - drawingScore: Updated sketch score.
      - notesScore: Updated notes score.
      - feedback: Explain if you see the connection now. E.g., "Upon review, I accept that the triangle shape correlates to the mountain peak."
    `
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        safetySettings: safetySettings,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            drawingScore: { type: Type.INTEGER },
            notesScore: { type: Type.INTEGER },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ScoringResult;
    } else {
      throw new Error("Empty response during recalculation");
    }
  } catch (error) {
    console.error("Recalculation failed:", error);
    throw error;
  }
};

export const analyzeOpenSession = async (
  userSketchBase64: string | null,
  userNotes: string,
  targetIntent?: string,
  language: 'en' | 'si' = 'en'
): Promise<OpenAnalysisResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];

  if (userSketchBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: cleanBase64(userSketchBase64),
      },
    });
    parts.push({ text: "VIEWER'S SKETCH (ABSTRACT)" });
  }

  parts.push({ 
    text: `VIEWER'S SENSORY NOTES: "${userNotes}"`
  });

  const langInstruction = "Respond in English.";
  
  const intentContext = targetIntent 
    ? `INTENT: The viewer was looking for: "${targetIntent}".` 
    : `INTENT: Unknown/Blind.`;

  parts.push({
    text: `
      You are a Remote Viewing Monitor.
      Analyze the sketch NOT as art, but as a collection of SENSORY DATA POINTS.
      
      ${intentContext}
      
      1. Identify the 'Gestalts' in the sketch (e.g., "A rising curve suggests height/structure", "A wavy horizontal line suggests liquid/motion").
      2. Combine these shapes with the notes ("${userNotes}").
      3. ${targetIntent ? 'Explain how these shapes abstractly represent the Intent.' : 'Deduce the likely subject based on the geometry and adjectives.'}
      
      ${langInstruction}
      
      Respond in JSON:
      - subject: A short title (3-5 words) of what the data describes.
      - analysis: Explain the shapes. E.g., "The crossed lines suggest a man-made structure, while the circular motion implies a rotating mechanism."
    `
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        safetySettings: safetySettings,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            analysis: { type: Type.STRING }
          },
          required: ["subject", "analysis"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as OpenAnalysisResult;
    } else {
      throw new Error("Empty response from AI Analyst");
    }
  } catch (error) {
    console.error("Open Analysis failed:", error);
    throw error;
  }
};

export const generateVisualReconstruction = async (
  intent: string | undefined,
  aiGuess: string | undefined,
  userNotes: string,
  additionalDetails?: string
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Construct a prompt for image generation
  const prompt = `
    Create a hyper-realistic visualization of: "${intent || 'A mystery object'}".
    It should look like: "${aiGuess || 'An undefined form'}".
    It must include these sensory details: ${userNotes}.
    ${additionalDetails ? `Additional User Guidance: ${additionalDetails}` : ''}
    High quality, clear lighting, detailed.
  `;

  try {
    // According to system instructions, use generateContent with gemini-2.5-flash-image for image generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        // Image generation models do not support standard safetySettings array in the same way, 
        // but general content policies apply. We rely on defaults here.
      }
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Visual Reconstruction failed:", error);
    throw error;
  }
};

export const generateTargetImage = async (): Promise<{ url: string; base64: string; description: string }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  // Use a random seed to ensure we get a new image every time we fetch
  const seed = Date.now();
  const imageUrl = `https://picsum.photos/seed/${seed}/800/600`;

  try {
    // 1. Fetch the image from online source
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");
    
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // 2. Use Gemini Flash to describe the image (Cheaper than generating one)
    // This creates the "Ground Truth" text description for the session data
    let description = "A random scene.";
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Fix: Wrap parts in { parts: [...] } to match Content structure
      const descriptionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64(base64)
              }
            },
            { text: "Describe this scene concisely in one sentence for a remote viewing target. Focus on major forms and subject." }
          ]
        },
        config: {
          safetySettings: safetySettings
        }
      });
      if (descriptionResponse.text) {
        description = descriptionResponse.text.trim();
      }
    } catch (descError) {
      console.warn("Failed to generate description for fetched image", descError);
      // Continue even if description fails, we have the image
    }

    return {
      url: base64, // Use base64 for display to ensure it matches what we analyzed/described
      base64: base64,
      description: description
    };

  } catch (e) {
    console.error("Target Acquisition Failed", e);
    throw new Error("Could not load a target image from online source.");
  }
};

export const generateCoachReport = async (history: SessionData[], language: 'en' | 'si' = 'en'): Promise<CoachReport> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  // Take the last 20 sessions to avoid hitting token limits
  const recentHistory = history.slice(-20);

  // Format history into a readable summary for the AI
  const historyText = recentHistory.map((s, i) => `
    Session ${i + 1}:
    - Score: ${s.aiScore}/100 (Drawing: ${s.drawingScore || 'N/A'}, Notes: ${s.notesScore || 'N/A'})
    - AI Feedback: "${s.aiFeedback}"
    - Duration: ${s.durationSeconds ? s.durationSeconds + 's' : 'Unknown'}
  `).join('\n');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const langInstruction = "Respond in English.";

  const prompt = `
    You are a Remote Viewing Instructor. Analyze the following training history for a student.
    
    HISTORY LOG:
    ${historyText}
    
    ${langInstruction}

    Based on their recent performance, recommend the SINGLE BEST App Feature they should use right now to improve.
    
    App Feature Options:
    1. 'INTUITION_DOJO' -> If general scores are low (<40%) or guessing is random.
    2. 'DRAWING_DOJO' -> If Drawing Scores are consistently lower than Notes Scores.
    3. 'OPEN_MODE' -> If accuracy is high (>80%) and they need a challenge (future prediction/missing objects).
    4. 'TRAINING_MODE' -> If they are inconsistent or average.
    5. 'CHAT_COACH' -> If they seem confused about protocols.
    6. 'SUGGEST_NEW_FEATURE' -> If the user needs a tool we don't have yet (e.g. Meditation Timer, AR Target, Group Practice).

    Provide a JSON report with:
    1. trendSummary: A 1-sentence overview of their progress.
    2. strengths: A list of 2-3 things they are doing well.
    3. weaknesses: A list of 2-3 things they need to improve.
    4. trainingTips: A list of 2-3 specific actionable exercises.
    5. immediateAction: A single, highly specific task (e.g. "Draw 5 circles in the Drawing Dojo").
    6. recommendedFeature: One of the App Feature IDs listed above.
    7. featureReason: A 5-word explanation why this feature helps.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        safetySettings: safetySettings,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trendSummary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            trainingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            immediateAction: { type: Type.STRING },
            recommendedFeature: { type: Type.STRING, enum: ['INTUITION_DOJO', 'DRAWING_DOJO', 'TRAINING_MODE', 'OPEN_MODE', 'CHAT_COACH', 'SUGGEST_NEW_FEATURE'] },
            featureReason: { type: Type.STRING }
          },
          required: ["trendSummary", "strengths", "weaknesses", "trainingTips", "immediateAction", "recommendedFeature", "featureReason"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as CoachReport;
    } else {
      throw new Error("Empty response from AI Coach");
    }
  } catch (error) {
    console.error("Coach Report failed:", error);
    throw error;
  }
};

export const createCoachChat = (history: SessionData[], language: 'en' | 'si' = 'en'): Chat => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const recentHistory = history.slice(-15);
  const historyText = recentHistory.map((s, i) => `
    Date: ${new Date(s.timestamp).toLocaleDateString()}
    Score: ${s.aiScore}/100
    Notes: "${s.userNotes.substring(0, 50)}..."
    Feedback: "${s.aiFeedback}"
  `).join('\n');

  const langInstruction = "Respond in English.";

  const systemInstruction = `
    You are a professional Remote Viewing (RV) Instructor. 
    You are talking to a student who is practicing using the MindSight app.
    
    STUDENT HISTORY:
    ${historyText}
    
    YOUR ROLE:
    1. Answer questions about Remote Viewing protocols (Coordinate Remote Viewing - CRV).
    2. Give specific advice based on the student's history provided above.
    3. Be encouraging but objective.
    4. Keep answers concise (max 3 paragraphs).
    
    ${langInstruction}
  `;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      safetySettings: safetySettings
    }
  });
};

export const evaluateDojoSketch = async (
  targetBase64: string,
  userSketchBase64: string
): Promise<{ isMatch: boolean; feedback: string; error?: boolean }> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];

  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: cleanBase64(targetBase64),
    },
  });
  parts.push({ text: "IMAGE A: TARGET SHAPE" });

  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: cleanBase64(userSketchBase64),
    },
  });
  parts.push({ text: "IMAGE B: USER ATTEMPT" });

  parts.push({
    text: `
      You are an automated geometry evaluator.
      Compare IMAGE B (User Attempt) to IMAGE A (Target Shape).
      
      CRITERIA FOR MATCH:
      1. Topology: Does it have the same number of corners/curves/features?
      2. Orientation: Is it roughly upright?
      3. Structure: Is the general "gestalt" recognizable?
      
      ALLOWANCES:
      - Ignore messy lines, jitter, or hand-tremor.
      - Ignore differences in line thickness.
      - Ignore position translation (offset) within the canvas.
      - Ignore moderate scale differences (size).
      
      Task: Determine if the user successfully replicated the shape.
      
      Respond in JSON:
      - isMatch: boolean (true if recognizable, false if completely wrong or missing features).
      - feedback: A very short 1-sentence reason (e.g. "Good match, slight tilt." or "Missing the inner triangle.").
    `
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isMatch: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING }
          },
          required: ["isMatch", "feedback"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    } else {
      throw new Error("Empty response from AI Dojo Evaluator");
    }
  } catch (error) {
    console.error("Dojo evaluation failed:", error);
    // Return error flag to trigger manual fallback UI in the Dojo component
    return { isMatch: false, feedback: "AI busy (Rate Limit). Self-check required.", error: true };
  }
};

export const generateDrawingTips = async (history: SessionData[]): Promise<string[]> => {
  if (!process.env.API_KEY) {
     return ["Focus on basic shapes.", "Don't analyze, just perceive.", "Keep the pen moving."];
  }

  // Filter for training sessions with feedback
  const relevantHistory = history
      .filter(s => s.sessionType === 'TRAINING' && s.aiFeedback && s.drawingScore !== undefined)
      .slice(-5); // Only look at last 5

  if (relevantHistory.length === 0) {
      return [
          "Start with the major gestalt (outline).",
          "Draw what you see, not what you think it is.",
          "Pay attention to light and shadow."
      ];
  }

  const historySummary = relevantHistory.map((s, i) => `
      Session ${i+1}:
      Drawing Score: ${s.drawingScore}/100
      Feedback: "${s.aiFeedback}"
  `).join('\n');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
      You are a Remote Viewing Drawing Coach.
      Based on the student's recent performance history below, identify their recurring sketching mistakes (e.g., Analytic Overlay/AOL, scale issues, missing negative space, labeling objects).
      
      HISTORY:
      ${historySummary}

      Task: Provide 3 short, punchy, imperative tips (max 10 words each) for their NEXT sketch to help them avoid these specific past mistakes.
      
      Respond in JSON: { "tips": ["Tip 1", "Tip 2", "Tip 3"] }
  `;

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [{ text: prompt }] },
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      tips: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
              }
          }
      });
      
      if (response.text) {
          const result = JSON.parse(response.text);
          return result.tips || [];
      }
      return [];
  } catch (e) {
      console.warn("Failed to generate drawing tips", e);
      return ["Relax and let the hand move.", "Capture the motion first.", "Avoid naming the object."];
  }
};

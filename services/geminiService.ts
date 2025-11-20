import { GoogleGenAI, Type, Chat } from "@google/genai";
import { ScoringResult, SessionData, CoachReport } from '../types';

const cleanBase64 = (data: string) => {
    // Remove data:image/xyz;base64, prefix if present
    return data.replace(/^data:image\/\w+;base64,/, "");
}

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
  parts.push({ text: "This is the TARGET IMAGE (Ground Truth)." });

  // Add User Sketch if available
  if (userSketchBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: cleanBase64(userSketchBase64),
      },
    });
    parts.push({ text: "This is the VIEWER'S SKETCH." });
  } else {
    parts.push({ text: "The viewer did not provide a sketch." });
  }

  // Add User Notes
  parts.push({ 
    text: `These are the VIEWER'S NOTES describing their impressions: "${userNotes}"`
  });

  const langInstruction = language === 'si' 
    ? "Respond in Sinhala language (use Sinhala script)." 
    : "Respond in English.";

  // Add Instructions
  parts.push({
    text: `
      You are an expert Remote Viewing judge. 
      Your task is to objectively compare the VIEWER'S SKETCH and VIEWER'S NOTES against the TARGET IMAGE.
      
      Look for correlations in:
      1. Basic Shapes (Gestalts)
      2. Colors and Lighting
      3. Textures and Patterns
      4. High-level concepts (e.g., "structure", "nature", "water", "motion")
      
      Ignore lack of artistic skill in the sketch. Focus on data congruence.
      
      ${langInstruction}

      Provide a JSON response with:
      - score: An integer from 0 to 100 representing accuracy.
      - feedback: A concise (max 3 sentences) analysis of what they got right and what they missed. Be professional and encouraging.
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
            score: { type: Type.INTEGER },
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
    - Score: ${s.aiScore}/100
    - AI Feedback: "${s.aiFeedback}"
  `).join('\n');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const langInstruction = language === 'si' 
    ? "Respond in Sinhala language (use Sinhala script)." 
    : "Respond in English.";

  const prompt = `
    You are a Remote Viewing Instructor. Analyze the following training history for a student.
    Identify patterns in their performance. Are they improving? Do they consistently miss specific types of data (e.g., colors, shapes, motion)?
    
    HISTORY LOG:
    ${historyText}
    
    ${langInstruction}

    Based on this, provide a JSON report with:
    1. trendSummary: A 1-sentence overview of their progress.
    2. strengths: A list of 2-3 things they are doing well.
    3. weaknesses: A list of 2-3 things they need to improve.
    4. trainingTips: A list of 2-3 specific actionable exercises to improve.
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
            trendSummary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            trainingTips: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["trendSummary", "strengths", "weaknesses", "trainingTips"]
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

  const langInstruction = language === 'si' 
    ? "Respond in Sinhala language. Use Sinhala script." 
    : "Respond in English.";

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
      systemInstruction: systemInstruction
    }
  });
};
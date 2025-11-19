import { GoogleGenAI, Type } from "@google/genai";
import { ScoringResult } from '../types';

const cleanBase64 = (data: string) => {
    // Remove data:image/xyz;base64, prefix if present
    return data.replace(/^data:image\/\w+;base64,/, "");
}

export const analyzeSession = async (
  targetImageBase64: string,
  userSketchBase64: string | null,
  userNotes: string
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
    return {
      score: 0,
      feedback: "Failed to analyze session. Please try again."
    };
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
      const descriptionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64(base64)
            }
          },
          { text: "Describe this scene concisely in one sentence for a remote viewing target. Focus on major forms and subject." }
        ]
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
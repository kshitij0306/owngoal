
import { GoogleGenAI, Type } from "@google/genai";
import { CameraAngle, DirectorDecision } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getDirectorDecision(
  currentTime: number,
  currentAngle: CameraAngle
): Promise<DirectorDecision | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional broadcast director. 
      The event is currently at ${currentTime} seconds. 
      The current camera angle is ${currentAngle}.
      Based on the "drama" of the scene, decide if you should switch angles.
      Choose from: ${Object.values(CameraAngle).join(', ')}.
      Respond with a JSON object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            angle: { type: Type.STRING, description: "The CameraAngle to switch to." },
            transitionType: { type: Type.STRING, description: "CUT or FADE" },
            reason: { type: Type.STRING, description: "Short justification." }
          },
          required: ["angle", "transitionType"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return {
      timestamp: Date.now(),
      angle: result.angle as CameraAngle,
      transitionType: result.transitionType as 'CUT' | 'FADE',
      reason: result.reason
    };
  } catch (error) {
    console.error("AI Director failed:", error);
    return null;
  }
}

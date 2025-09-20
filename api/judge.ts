import { GoogleGenAI, Type } from "@google/genai";

// This function will be deployed as a serverless function on Vercel.
// It can securely access environment variables set in the Vercel dashboard.
const API_KEY = process.env.API_KEY;

// We initialize the AI client only if the API key is available.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Helper to convert data URL to a Gemini-compatible part
function dataUrlToGeminiPart(dataUrl: string) {
  const [header, data] = dataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1];
  if (!mimeType || !data) {
    throw new Error("Invalid data URL format");
  }
  return {
    inlineData: {
      mimeType,
      data,
    },
  };
}

// Vercel Edge runtime is recommended for streaming.
// You may need to configure this in your vercel.json or project settings.
export const runtime = 'edge';

// Vercel automatically maps this exported function to the /api/judge endpoint.
export async function POST(req: Request) {
  // CRUCIAL CHECK: Ensure the AI client was initialized.
  if (!ai) {
    console.error("API_KEY environment variable is not set.");
    const errorPayload = JSON.stringify({ error: "Server is not configured with an API key." });
    return new Response(errorPayload, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { drawingDataUrl, stateName } = await req.json();

    if (!drawingDataUrl || !stateName) {
      const errorPayload = JSON.stringify({ error: 'Missing drawing data or state name' });
      return new Response(errorPayload, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // This is the key change: we return a ReadableStream.
    // This sends headers back to the browser immediately, keeping the connection open.
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const model = "gemini-2.5-flash";
          const imagePart = dataUrlToGeminiPart(drawingDataUrl);
          const textPart = {
            text: `This is a user's drawing of the US state: ${stateName}. Analyze the accuracy of the outline compared to the real state. Provide a score from 0 to 100, where 100 is a perfect match. Also provide a short, one-sentence, encouraging critique. Your response must be in JSON format.`
          };

          const responseFromAi = await ai.models.generateContent({
            model: model,
            contents: { parts: [textPart, imagePart] },
            config: {
              // THIS IS THE KEY CHANGE FOR SPEED!
              // Disable "thinking" for a much faster, game-appropriate response.
              thinkingConfig: { thinkingBudget: 0 },
            }
          });
          
          // Once we have the response, we send it down the stream.
          let responseText = responseFromAi.text;

          // The model can sometimes wrap the JSON in markdown. We need to strip it.
          const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            responseText = jsonMatch[1];
          } else {
            // Fallback for cases where it's just the JSON object without markdown
            responseText = responseText.replace(/^```json/, "").replace(/```$/, "").trim();
          }

          controller.enqueue(new TextEncoder().encode(responseText));
          controller.close(); // Signal that we're done.

        } catch (error) {
           console.error("Error during Gemini API call:", error);
           const errorPayload = JSON.stringify({ error: 'Failed to get a response from the AI model.' });
           controller.enqueue(new TextEncoder().encode(errorPayload));
           controller.close();
        }
      },
    });

    // Return the stream immediately.
    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in serverless function handler:", error);
    const errorPayload = JSON.stringify({ error: 'An unexpected error occurred on the server.' });
    return new Response(errorPayload, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
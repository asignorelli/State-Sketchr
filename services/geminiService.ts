import type { Score } from '../types';

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        result += decoder.decode(value, { stream: true });
    }
    return result;
}


export async function judgeDrawing(drawingDataUrl: string, stateName: string): Promise<Score> {
  try {
    const response = await fetch('/api/judge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ drawingDataUrl, stateName }),
    });

    if (!response.body) {
      throw new Error("The response from the server was empty.");
    }
    
    const responseText = await streamToString(response.body);
    
    let score: Score;
    try {
        score = JSON.parse(responseText);
    } catch(e) {
        // If the stream sent an error payload, it might be here.
        const errorResponse = JSON.parse(responseText);
        throw new Error(errorResponse.error || "The server returned an invalid response.");
    }

    if (!response.ok || (score as any).error) {
       throw new Error((score as any).error || 'The server returned an error.');
    }
    
    return score;

  } catch (error: any) {
    console.error("Error calling judgment API:", error);
    // Rethrow a more specific error for the UI to catch
    throw new Error(error.message || "Sorry, something went wrong while judging your drawing. Please try again.");
  }
}
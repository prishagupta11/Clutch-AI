export async function POST(req) {
  try {
    const body = await req.json();
    const contents = body.contents || [];
    
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Missing API configuration key" }), { status: 500 });
    }

    // Dynamic date lookup so "today", "tomorrow", and "this Friday" calculate correctly
    const formattedToday = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const systemInstruction = {
      parts: [{
        text: `You are an integrated workspace assistant. The current date context for the user right now is exactly: ${formattedToday}.

CRITICAL INTENT RULES:
1. ONLY return 'isCalendarTask: true' if the user is explicitly commanding you to add, write, log, or schedule a fresh new item onto their calendar layout.
2. If the user is asking for guidance, tips, explanations, code blocks, or extra instructions to complete an ongoing or existing objective (e.g., 'give me tips on...', 'help me with...', 'how do I code...'), you MUST treat this as a standard chat query. Set 'isCalendarTask: false' and do NOT return a target date or title for a calendar slot.
3. When 'isCalendarTask: true' is valid, evaluate the date entity (like 'today', 'tomorrow', 'this Friday', or 'July 10th') relative to the baseline current date string provided above and return the destination strictly in YYYY-MM-DD format.

Your response MUST be a strict, raw JSON object matching this schema:
{
  "isCalendarTask": true or false,
  "taskTitle": "A clean title of the task (or empty string if false)",
  "dateTarget": "YYYY-MM-DD format string calculated precisely (or empty string if false)",
  "hourSlot": 0 to 23 integer representing the targeted hour (or null if false)",
  "assistantReply": "Your conversation chat stream text, tips, guidance, or scheduling confirmation message goes entirely here."
}

Do not wrap your output in markdown syntax or code fences like \`\`\`json. Return raw valid JSON strings only.`
      }]
    };

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" + geminiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: contents,
          systemInstruction: systemInstruction,
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: "Gemini execution failure", details: errorText }), { status: response.status });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
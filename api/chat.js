export async function POST(req) {
  try {
    // 1. Parse incoming payload using standard Web Request API
    const body = await req.json();
    const contents = body.contents || [];
    
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "API configuration key missing on backend" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Replace your existing systemInstruction block in api/chat.js with this:
const systemInstruction = {
  parts: [{
    text: "You are an integrated workspace assistant. Analyze the user's latest prompt. If they explicitly ask to schedule or add an event/task/appointment to their calendar, you MUST extract the task title, a specific targeted date, and a specific hour block. Return a structured JSON object with this exact schema:\n{\n  \"isCalendarTask\": true,\n  \"taskTitle\": \"A short, clean title of the task (exclude conversational fluff)\",\n  \"dateTarget\": \"YYYY-MM-DD\", // Extract the specific date mentioned. If they say 'today' or don't specify a date, use the current year/month/day context.\n  \"hourSlot\": 15, // An integer from 0 to 23 representing the hour (e.g., 3 PM = 15). Default to 12 if unspecified.\n  \"assistantReply\": \"A brief, friendly confirmation sentence for the chat stream specifying the date and time chosen.\"\n}\n\nIf they are just making conversation, return this schema:\n{\n  \"isCalendarTask\": false,\n  \"taskTitle\": \"\",\n  \"dateTarget\": \"\",\n  \"hourSlot\": null,\n  \"assistantReply\": \"Your helpful conversational reply here.\"\n}\n\nDo not include any markdown block formatting like ```json. Return raw valid JSON strings only."
  }]
};
    // 2. Direct pipeline dispatch to Google Gemini Gateway with JSON configuration
    const response = await fetch(
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: contents,
          systemInstruction: systemInstruction,
          generationConfig: {
            responseMimeType: "application/json" // Force structural validation
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: "Gemini rejected prompt structured data", details: errorText }), 
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // 3. Output clean JSON using native standard web response modules
    return new Response(
      JSON.stringify(data), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Execution Fail" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
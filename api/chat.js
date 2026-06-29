import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { message } = await req.json();
    const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    // We instruct Gemini to act as an orchestrator and return clean JSON
    const promptPayload = {
      contents: [{
        parts: [{
          text: `You are a helpful assistant. The current date is Monday, June 29, 2026. 
          Analyze the user's input: "${message}". 
          
          If they want to schedule a task or event, respond ONLY with a raw JSON object in this exact format, with no markdown formatting:
          {
            "isTask": true,
            "title": "Clean task title here",
            "dueTime": "01:00 PM",
            "dueDate": "June 30, 2026",
            "aiResponse": "I have added that task to your calendar!"
          }
          
          If it's just regular chat, return:
          {
            "isTask": false,
            "title": "",
            "dueTime": "",
            "dueDate": "",
            "aiResponse": "Your regular conversational response here"
          }`
        }]
      }]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promptPayload),
      }
    );

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    
    return NextResponse.json(JSON.parse(rawText.trim()));
  } catch (error) {
    return NextResponse.json({ error: "Pipeline failed" }, { status: 500 });
  }
}
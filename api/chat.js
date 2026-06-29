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

    // 2. Direct pipeline dispatch to Google Gemini Gateway
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: contents }),
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
import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize server-side Gemini client
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
} catch (e) {
  console.error("Failed to initialize Gemini Client:", e);
}

// Helper to execute real Google Calendar API functions using user's accessToken
async function executeCalendarFunction(name: string, args: any, accessToken: string) {
  if (!accessToken) {
    return { error: "Google Calendar access token is missing. Please sign in with Google." };
  }

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  try {
    if (name === "listCalendarEvents") {
      const { timeMin, timeMax } = args;
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      if (timeMin) url.searchParams.append("timeMin", timeMin);
      if (timeMax) url.searchParams.append("timeMax", timeMax);
      url.searchParams.append("singleEvents", "true");
      url.searchParams.append("orderBy", "startTime");
      url.searchParams.append("maxResults", "15");

      console.log("Fetching Google Calendar events:", url.toString());
      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${await response.text()}`);
      }
      const data = await response.json();
      const events = (data.items || []).map((item: any) => ({
        id: item.id,
        summary: item.summary,
        description: item.description,
        start: item.start?.dateTime || item.start?.date,
        end: item.end?.dateTime || item.end?.date
      }));
      return { events };
    }

    if (name === "createCalendarEvent") {
      const { summary, description, startTime, endTime } = args;
      const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
      
      console.log("Creating Google Calendar event:", summary);
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          summary,
          description: description || "Created via Clutch AI Workspace Assistant",
          start: { dateTime: startTime },
          end: { dateTime: endTime }
        })
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${await response.text()}`);
      }
      const data = await response.json();
      return {
        success: true,
        eventId: data.id,
        htmlLink: data.htmlLink,
        summary: data.summary,
        start: data.start?.dateTime,
        end: data.end?.dateTime
      };
    }

    if (name === "deleteCalendarEvent") {
      const { eventId } = args;
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
      
      console.log("Deleting Google Calendar event:", eventId);
      const response = await fetch(url, {
        method: "DELETE",
        headers
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${await response.text()}`);
      }
      return { success: true, message: `Event ${eventId} deleted successfully.` };
    }

    return { error: `Function ${name} is not implemented.` };
  } catch (error: any) {
    console.error(`Error executing calendar function ${name}:`, error);
    return { error: error.message || "Unknown error during calendar operation" };
  }
}

// Simulated local calendar events for the fallback simulator
let simulatedEvents = [
  { id: "sim-1", summary: "Math Exam Preparation", description: "Deep focus on study guides", start: "2026-06-27T14:00:00", end: "2026-06-27T16:00:00" },
  { id: "sim-2", summary: "Hackathon Team Sync", description: "Design sync of Flutter application", start: "2026-06-28T10:00:00", end: "2026-06-28T11:00:00" },
];

// API Routes
app.post("/api/gemini/generate", async (req, res) => {
  const { prompt, tasks, aiTone, aiInstructions, awaitingDeadlineTask, accessToken, history } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const promptLower = prompt.toLowerCase();

  // Fallback check if API key is not configured - provide a highly intelligent local simulator
  if (!ai) {
    // Check if user is asking to view schedule or calendar
    if (promptLower.includes("schedule") || promptLower.includes("calendar") || promptLower.includes("event") || promptLower.includes("plan")) {
      // Simulate calendar action
      if (promptLower.includes("add") || promptLower.includes("create") || promptLower.includes("schedule")) {
        const titleMatch = prompt.match(/(?:add|create|schedule)\s+([^at]+)/i);
        const eventTitle = titleMatch ? titleMatch[1].trim() : "Custom Event";
        const newSimEvent = {
          id: `sim-${Date.now()}`,
          summary: eventTitle,
          description: "Scheduled dynamically by Clutch AI (Simulated)",
          start: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
          end: new Date(Date.now() + 86400000 + 3600000).toISOString().slice(0, 16)
        };
        simulatedEvents.push(newSimEvent);
        return res.json({
          reply: `### 🗓️ Event Added (Simulated)\n\nI have scheduled **"${eventTitle}"** on your Google Calendar for tomorrow at **10:00 AM**.\n\n*Note: Running in simulation mode. Sign in and set your Gemini API Key in secrets to make real Google Calendar API requests!*`,
          suggestedTasks: [
            { title: eventTitle, category: "General", dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
          ]
        });
      }

      // Default: list schedule
      const listStr = simulatedEvents.map(e => `* **${e.summary}**: ${new Date(e.start).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`).join("\n");
      return res.json({
        reply: `### 🗓️ Your Simulated Calendar Schedule\n\nHere are your current events:\n\n${listStr}\n\n*Would you like me to schedule a new task or modify an existing one?*`,
        suggestedTasks: []
      });
    }

    // If it's a general question or conversational greetings
    if (!promptLower.includes("prepare") && !promptLower.includes("study") && !promptLower.includes("do") && !promptLower.includes("write") && !promptLower.includes("create") && !promptLower.includes("build") && !promptLower.includes("make") && !promptLower.includes("plan") && !promptLower.includes("finish") && !promptLower.includes("complete") && !promptLower.includes("schedule") && !promptLower.includes("calendar") && !promptLower.includes("event") && !awaitingDeadlineTask) {
      let reply = "";
      if (promptLower.includes("hi") || promptLower.includes("hello") || promptLower.includes("hey")) {
        reply = `### 👋 Hello! I am Google Gemini inside Clutch AI.\n\nI can help you study, plan goals, write code, or organize your Google Calendar. Ask me anything, or connect your real Google Calendar and Gemini API key to unlock full integration!\n\n**Try asking me:**\n* "Write a clean Python function to filter items"\n* "Explain quantum computing simply"\n* "Create a study plan for my exam"`;
      } else if (promptLower.includes("joke")) {
        reply = `### 💻 Here is a programming joke for you:\n\nWhy do programmers prefer dark mode?\n\n**Because light attracts bugs!** 🐛💻`;
      } else if (promptLower.includes("code") || promptLower.includes("python") || promptLower.includes("javascript") || promptLower.includes("html") || promptLower.includes("css")) {
        reply = `### 🐍 Clean Python Implementation\n\nHere is a simple example of filtering a list of tasks in Python:\n\n\`\`\`python\ndef filter_pending_tasks(tasks):\n    # Return only active/pending items\n    return [t for t in tasks if not t.get("isCompleted")]\n\n# Usage example\nall_tasks = [\n    {"title": "Prepare Presentation", "isCompleted": False},\n    {"title": "Review Flutter Code", "isCompleted": True}\n]\nprint(filter_pending_tasks(all_tasks))\n# Output: [{'title': 'Prepare Presentation', 'isCompleted': False}]\n\`\`\`\n\n*Note: Running in simulation mode. Add your Gemini API Key in secrets to generate dynamic code custom-tailored to your exact requests!*`;
      } else {
        reply = `### ✨ Gemini Response (Simulated)\n\nThat is a great question! Since I'm currently running in **simulation mode** because your **Gemini API Key** is not set in secrets yet, I am providing this pre-baked expert response.\n\nTo make me answer anything in real-time with full conversational intelligence, please follow these simple steps:\n\n1. **Click the Settings (Gear) icon** in the top-right of AI Studio.\n2. **Open the Secrets / Env Variables** tab.\n3. **Add \`GEMINI_API_KEY\`** with your free API key from Google AI Studio.\n4. **Sign in with Google** to directly sync your live calendar events!\n\n*Let me know if you would like me to help you structure a study goal or track a task!*`;
      }
      return res.json({
        reply: reply,
        suggestedTasks: [],
        detectedTaskName: "",
        clearAwaitingDeadline: false,
        simulated: true
      });
    }
    
    // If we are currently awaiting a deadline for a task
    if (awaitingDeadlineTask) {
      const taskName = awaitingDeadlineTask;
      // Parse a simulated date
      const today = new Date();
      let scheduleDate = new Date(today.getTime() + 86400000 * 2); // default 2 days from now
      
      if (promptLower.includes("tomorrow")) {
        scheduleDate = new Date(today.getTime() + 86400000);
      } else if (promptLower.includes("today")) {
        scheduleDate = today;
      } else if (promptLower.includes("next week") || promptLower.includes("week")) {
        scheduleDate = new Date(today.getTime() + 86400000 * 7);
      }
      
      const deadlineStr = scheduleDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + " at 5:00 PM";
      
      // Calculate suggested start time (e.g. 1 day before, or 3 hours before)
      const startDate = new Date(scheduleDate.getTime() - 86400000); // 1 day before
      const startStr = startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" }) + " at 2:00 PM";
      
      return res.json({
        reply: `### 🗓️ Task Scheduled Successfully!\n\nI have parsed your deadline: **${prompt}** (scheduled for **${deadlineStr}**).\n\n**Best Time to Start:**\nI highly recommend starting on **${startStr}**.\n\n*Reasoning: This gives you a clean 24-hour buffer before your final submission, allowing you to review your work and stay stress-free!*`,
        suggestedTasks: [
          { 
            title: taskName, 
            category: "General", 
            dueDate: scheduleDate.toISOString().split('T')[0]
          }
        ],
        suggestedCalendarEvent: {
          summary: taskName,
          description: `Scheduled dynamically by Clutch AI. Recommended start: ${startStr}`,
          startTime: scheduleDate.toISOString().slice(0, 16),
          endTime: new Date(scheduleDate.getTime() + 3600000).toISOString().slice(0, 16)
        },
        clearAwaitingDeadline: true,
        detectedTaskName: ""
      });
    }

    // Otherwise, normal chat: Provide a solution and then ask for the deadline!
    let reply = "";
    let detectedTask = "";
    
    // Determine the user's task
    const match = prompt.match(/(?:prepare for|study|do|write|create|build|make|plan|finish|complete)\s+([^.]+)/i);
    const extractedTask = match ? match[1].trim() : "Optimize Workspace Goal";
    detectedTask = extractedTask;

    if (promptLower.includes("code") || promptLower.includes("python") || promptLower.includes("react") || promptLower.includes("flutter")) {
      reply = `### 💻 Technical Solution & Implementation Plan\n\nHere is a clean implementation plan for **${extractedTask}**:\n\n1. **Define Core Architecture**: Establish clean data models and state management.\n2. **Mock Data Layer**: Integrate local storage handlers to cache previous user payloads.\n3. **View Components**: Build modular React/Flutter wrappers with responsive layouts.\n\n\`\`\`typescript\n// Code snippet for ${extractedTask}\nexport function optimizeWorkspace() {\n  console.log("Synthesizing system hooks...");\n  return { status: "optimized", timestamp: Date.now() };\n}\n\`\`\`\n\n**Would you like me to schedule this on your calendar? What is the deadline for this task?** (e.g., *tomorrow*, *June 28th*, etc.) so I can find the best time for you to start!`;
    } else {
      reply = `### 📝 Workspace Solution: ${extractedTask}\n\nTo successfully accomplish **${extractedTask}**, I suggest following this step-by-step roadmap:\n\n* **Phase 1 (Preparation)**: Gather all relevant study materials, documentation, or design files.\n* **Phase 2 (Deep Focus)**: Allocate a contiguous 2-hour deep work block to complete the bulk of the task.\n* **Phase 3 (Review)**: Verify outcomes and clean up any loose ends.\n\n**Would you like me to schedule this on your calendar? What is your deadline for this task?** (e.g., *tomorrow*, *Friday*, *June 30th*, etc.) so I can schedule it and suggest the best time for you to start!`;
    }

    // Tone response adjusting
    if (aiTone && aiTone.toLowerCase().includes("coach")) {
      reply = `🏆 **LET'S GET AFTER IT!** Here is your victory blueprint for **${extractedTask}**:\n\n${reply}\n\nMake it happen, you got this! Let me know when it's due so we can lock it into your calendar!`;
    } else if (aiTone && aiTone.toLowerCase().includes("concise")) {
      reply = `**Solution for ${extractedTask}**:\n1. Prep resources.\n2. Focus 2 hours.\n3. Review.\n\n*What is the deadline for this task so I can add it to your calendar and suggest the start time?*`;
    }

    return res.json({
      reply: reply,
      suggestedTasks: [],
      detectedTaskName: detectedTask,
      clearAwaitingDeadline: false,
      simulated: true
    });
  }

  try {
    const existingTasksList = (tasks || [])
      .map((t: any) => `- [${t.isCompleted ? "x" : " "}] ${t.title} (${t.category})`)
      .join("\n");

    const systemInstruction = `
You are Google Gemini, a helpful, friendly, and highly intelligent AI Assistant powered by the Gemini 3.5 Flash model.
You are running as the intelligent agent inside Clutch AI Workspace.
Your current AI Tone setting is: "${aiTone || "Professional & Encouraging"}". Incorporate this tone naturally into your formatting and conversational style.
Your custom instructions are: "${aiInstructions || "None"}". Respect them fully if provided.

YOUR CORE MISSION & BEHAVIOR:
1. Act exactly like a standard, open-ended Gemini Free Chat. You can converse about absolutely anything: write code, answer general knowledge questions, compose creative content (poems, stories), debug scripts, explain complex scientific concepts, or just engage in casual chit-chat.
2. Use gorgeous, structured Markdown in your "reply" field: employ bullet points, bold headers, numbered lists, tables, code blocks with syntax highlighting, and blockquotes to make your responses look extremely professional and highly readable.
3. You have full access to the user's Google Calendar. If the user asks about their schedule, calendar, appointments, or asks you to create, modify, or delete calendar events, you MUST use your Google Calendar function tools to help them.
4. Be helpful but never forced:
   - If the user asks general questions (e.g. "write a quick python snippet", "explain photosynthesis", "Who was Aristotle?"), answer them fully and directly in your "reply". Do NOT force-ask for a task deadline or suggest tasks unless the user's intent is to create a project or track a goal.
   - If the user is proposing a new specific task, project, or goal (e.g., "Prepare for my math test", "Finish my design mockups") and they haven't specified a deadline yet, you may optionally ask: "What is the deadline for this task so I can add it to your calendar and suggest the best time to start?" and output the name in "detectedTaskName".
   - If we are CURRENTLY awaiting a deadline (meaning "awaitingDeadlineTask" is set to "${awaitingDeadlineTask || ""}") and the user answers with a deadline, parse it, recommend the best start time, and set "suggestedTasks", "suggestedCalendarEvent", and "clearAwaitingDeadline" to true.

The current Clutch dashboard tasks are:
${existingTasksList}

Always structure your final output exactly as a JSON object matching the requested schema. Return ONLY valid raw JSON matching the schema. Do not wrap in markdown code blocks.
`;

    // Define tools
    const listCalendarEventsDeclaration = {
      name: "listCalendarEvents",
      description: "Retrieve a list of calendar events from the user's primary Google Calendar. Use this when the user asks what events, meetings, schedules, or plans they have.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          timeMin: {
            type: Type.STRING,
            description: "Optional ISO-8601 string representing lower bound for an event's start time (inclusive), e.g. '2026-06-27T00:00:00Z'."
          },
          timeMax: {
            type: Type.STRING,
            description: "Optional ISO-8601 string representing upper bound for an event's start time (exclusive), e.g. '2026-06-27T23:59:59Z'."
          }
        }
      }
    };

    const createCalendarEventDeclaration = {
      name: "createCalendarEvent",
      description: "Create a new event, meeting, or appointment on the user's primary Google Calendar.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: "The title of the event, e.g. 'Math Exam Prep'."
          },
          description: {
            type: Type.STRING,
            description: "A brief description of the event."
          },
          startTime: {
            type: Type.STRING,
            description: "The start time as an ISO-8601 string, e.g. '2026-06-28T14:00:00-07:00'."
          },
          endTime: {
            type: Type.STRING,
            description: "The end time as an ISO-8601 string, e.g. '2026-06-28T15:00:00-07:00'."
          }
        },
        required: ["summary", "startTime", "endTime"]
      }
    };

    const deleteCalendarEventDeclaration = {
      name: "deleteCalendarEvent",
      description: "Delete an event from the user's primary Google Calendar.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          eventId: {
            type: Type.STRING,
            description: "The unique event ID of the calendar event to delete."
          }
        },
        required: ["eventId"]
      }
    };

    // Prepare message contents with history for multi-turn conversational Gemini support
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach((msg: any) => {
        contents.push({
          role: msg.isUser ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      });
    }
    
    // Add the current user prompt
    contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    const schemaDefinition = {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING, description: "Your conversational or descriptive response, in clean, polished markdown format." },
        suggestedTasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              dueDate: { type: Type.STRING }
            },
            required: ["title", "category"]
          }
        },
        suggestedCalendarEvent: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            description: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING }
          },
          required: ["summary", "description", "startTime", "endTime"]
        },
        detectedTaskName: { type: Type.STRING },
        clearAwaitingDeadline: { type: Type.BOOLEAN }
      },
      required: ["reply", "suggestedTasks"]
    };

    let response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [listCalendarEventsDeclaration, createCalendarEventDeclaration, deleteCalendarEventDeclaration] }],
        responseMimeType: "application/json",
        responseSchema: schemaDefinition
      }
    });

    let functionCalls = response.functionCalls;
    let iterations = 0;

    // Loop to resolve any Google Calendar tool function calls
    while (functionCalls && functionCalls.length > 0 && iterations < 5) {
      iterations++;
      
      const modelTurn = response.candidates?.[0]?.content;
      if (modelTurn) {
        contents.push(modelTurn);
      } else {
        contents.push({
          role: "model",
          parts: functionCalls.map((fc: any) => ({ functionCall: fc }))
        });
      }

      const responseParts = [];
      for (const fc of functionCalls) {
        const result = await executeCalendarFunction(fc.name, fc.args, accessToken);
        responseParts.push({
          functionResponse: {
            name: fc.name,
            response: result
          }
        });
      }

      contents.push({
        role: "user",
        parts: responseParts
      });

      // Call Gemini again with function output
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [listCalendarEventsDeclaration, createCalendarEventDeclaration, deleteCalendarEventDeclaration] }],
          responseMimeType: "application/json",
          responseSchema: schemaDefinition
        }
      });

      functionCalls = response.functionCalls;
    }

    const text = response.text || "{}";
    try {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (parseError) {
      console.error("JSON Parse error from model response:", text, parseError);
      return res.json({
        reply: text,
        suggestedTasks: []
      });
    }
  } catch (err: any) {
    console.error("Error generating content from Gemini API:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Serve list of dart files for the IDE
app.get("/api/files", (req, res) => {
  res.json({
    status: "ok",
    files: [
      "lib/main.dart",
      "lib/task_provider.dart",
      "lib/auth_service.dart",
      "lib/calendar_service.dart",
      "lib/ai_assistance_screen.dart",
      "lib/home_screen.dart",
      "lib/calendar_screen.dart"
    ]
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Clutch AI workspace server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

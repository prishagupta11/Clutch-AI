# Clutch AI Workspace ✦

An intelligent, context-aware student productivity dashboard featuring the high-performance **Chronos Calendar System**. Clutch AI acts as a smart scheduling layer, analyzing natural language prompts to isolate task content, dynamically calculate targeted deadline timelines, and securely automate workspace task management.

---
# Clutch AI Workspace ✦ `Production-Ready`

[![Platform: Vercel](https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel)](https://vercel.com)
[![Engine: React 18](https://img.shields.io/badge/Frontend-React%2018-blue?logo=react)](https://react.dev)
[![Intelligence: Gemini 2.5 Flash](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-violet?logo=google-gemini)](https://ai.google.dev)
[![Auth: Firebase](https://img.shields.io/badge/Auth-Firebase-orange?logo=firebase)](https://firebase.google.com)

Clutch AI is an advanced, context-aware student productivity ecosystem integrated with the high-performance **Chronos Calendar Engine**. Instead of relying on rigid, manual entry inputs, Clutch AI serves as a seamless, natural language scheduling layer. It instantly interprets conversational user prompts, maps strict data structures, isolates execution metadata, and dynamically updates layout timelines in real time—all while maintaining a highly secure, zero-leak edge serverless gateway.

---

## 🚀 Key Architectural Innovations

### 1. Chronos Intelligent Grid System
* **Dynamic Time Allocation:** A multi-view calendar layout tracking 24-hour micro-slots, dynamic month/year calculations, and custom domain categorization.
* **Smart Filtering Deck:** Users can slice active milestones across color-coded workspaces tailored specifically for *University*, *Coding*, and *General* lifestyle goals.
* **Persistent Cache Syncing:** Seamlessly synchronizes application state with browser security contexts for uninterrupted workflows.

### 2. Zero-Client Leak Edge Gateway (`/api/chat.js`)
* **Backend Isolation Layer:** Bypasses client-side API exposure completely. Your secret keys remain entirely hidden inside Vercel's private environment variables.
* **Native Web Requests:** Built with standard web fetch APIs and native web streaming pipelines rather than heavy framework dependencies, minimizing cold starts and latency down to milliseconds.

### 3. Context Isolation & Intent Guardrails
* **Deterministic Parameter Map:** Powered by Gemini's strict `application/json` structural validation schemas (`generationConfig`), conversational prompts (e.g., *"Add project submission for this Friday at 3 PM"*) are cleanly stripped of verbal fluff and flattened into deterministic properties:
  ```json
  {
    "isCalendarTask": true,
    "taskTitle": "Project Submission",
    "dateTarget": "2026-07-03",
    "hourSlot": 15,
    "assistantReply": "I have successfully logged that task for you!"
  }

---

  ## Repository Directory Layout
├── api/
│   ├── chat.js         # Vercel Serverless Function & Structural Prompt Engine
│   └── index.ts        # Backend Entry Endpoint Gateway
├── src/
│   ├── lib/
│   │   └── firebaseAuth.ts  # Identity Integration & OIDC Protocols
│   ├── App.tsx         # Master UI Deck, Context Routers & Chat State Engine
│   ├── main.tsx        # React Concurrent Render Mount Anchor
│   └── index.css       # Tailwind Directives & Global Layer Rules
├── public/             # System Static Assets
├── package.json        # Manifest Dependency Nodes
└── README.md           # Documentation Frame
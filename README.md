# Clutch AI — Proactive Productivity Companion ⚡🌿

Clutch AI is a highly strategic, intelligent task management application built with **Flutter**. It introduces a complete, conversational productivity engine that seamlessly turns casual user chats into structured, executable micro-goals and synchronizes them directly onto a user's **Google Calendar**.

The application is styled entirely around a premium, low-contrast **Sage & Moss** design language designed to eliminate productivity friction and focus clutter.

---

## 🎨 Design System & Aesthetics
Clutch AI utilizes a beautifully balanced, dark-mode-first color palette called **Sage & Moss**:
*   **Canvas Background:** `Color(0xFF161A18)` — Deep charcoal slate.
*   **Containers & Cards:** `Color(0xFF222925)` — Low-contrast forest shadow.
*   **Active Accents:** `Color(0xFF96AC9D)` — Organic sage highlight.
*   **Muted Typography:** `Color(0xFFBDC7BF)` — Soft gray-moss for subheaders.

---

## 🚀 Key Features

### 1. 🤖 Context-Aware Conversational Assistant
*   **Powered by Gemini 2.5 Flash** (`v1beta` endpoint) using custom system prompts designed inside **Google AI Studio**.
*   **Rigid Schema Protocol:** Force-constrained to communicate entirely via un-fenced, raw JSON configurations to eliminate parser crashes.
*   **Intent Extraction:** Dynamically separates conversational replies from specific deadline dates and micro-goal extraction vectors.

### 2. 📅 Deep Google Calendar Rest Sync
*   Authenticates securely via **Google Sign-In OAuth 2.0 API** layers.
*   Concurrently maps background triggers from the chat bubble window into localized `TaskManager` states and remote authorized HTTP POST payloads directed at the native `googleapis.com/v3/calendars/primary/events` resource endpoint.

### 3. 🎯 High-Performance Execution Loop
*   **Global State Hierarchy:** Powered cleanly using a decoupled Flutter `MultiProvider` architecture serving as a reactive, single source of truth.
*   **Interactive Controls:** Fluid horizontal `ChoiceChip` filtering systems mapped straight onto native, multi-directionally `Dismissible` workflow tiles supporting quick swipe-to-delete flows.

---

## 🛠️ Project Structure
```text
lib/
├── main.dart                  # Global provider registration & state-driven boot routing
├── main_navigation.dart       # Core AppShell with layout IndexedStacks
├── task_provider.dart         # Global TaskManager state & local data storage maps
├── auth_service.dart          # OAuth 2.0 workflows & Google user profile mapping
├── calendar_service.dart      # Direct HTTP interface connecting Google Calendar API v3
├── home_screen.dart           # Primary dashboard with dynamic progress timelines
├── ai_assistance_screen.dart  # Interactive chat screen linking to Gemini 2.5 Flash
├── calendar_screen.dart       # Interactive monthly timeline grid
└── profile_screen.dart        # Core system configuration and prompt tweaking panel

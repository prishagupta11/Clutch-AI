import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, googleSignIn, googleSignOut, googleSignInWithIdToken } from "./lib/firebaseAuth";
import {
  Terminal,
  Code2,
  FileCode,
  Folder,
  Play,
  Check,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Search,
  Copy,
  Calendar,
  Smartphone,
  Sparkles,
  Cpu,
  Layers,
  Download,
  ShieldCheck,
  UserCheck,
  LogOut,
  Clock,
  ArrowRight,
  Settings,
  User,
  Phone,
  Mail,
  Volume2,
  ListTodo,
  PlusCircle,
  HelpCircle,
  X,
  FileText
} from "lucide-react";
import { DART_FILES } from "./dart_code";
import ReactMarkdown from "react-markdown";

interface Task {
  id: string;
  title: string;
  category: "University" | "Coding" | "General";
  isCompleted: boolean;
  createdAt: string;
  dueDate: string;
  dueTime: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  type?: "system" | "normal" | "compile";
}

interface UserProfile {
  displayName: string;
  email: string;
  phone: string;
  avatar: string;
  aiTone: "Professional & Encouraging" | "Concise & Technical" | "Motivating Coach" | "Friendly Peer";
  aiInstructions: string;
  age?: number;
  username?: string;
  accessToken?: string;
}

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
];

export default function App() {
  const [activeFile, setActiveFile] = useState<string>("lib/main.dart");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>(DART_FILES);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editBuffer, setEditBuffer] = useState<string>("");
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  const [currentTime, setCurrentTime] = useState<string>("10:00 AM");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

  const [loginStep, setLoginStep] = useState<"email" | "password" | "register" | "onboarding" | "loading">("email");
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [regUsername, setRegUsername] = useState<string>("");
  const [regAge, setRegAge] = useState<string>("");
  const [regEmail, setRegEmail] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");

  // Setup intake variables
  const [onboardAge, setOnboardAge] = useState<string>("");
  const [onboardPhone, setOnboardPhone] = useState<string>("");

  const [pendingGoogleData, setPendingGoogleData] = useState<{ user: any; token: string | undefined } | null>(null);

  const [activeTab, setActiveTab] = useState<"home" | "ai" | "calendar" | "profile">("home");
  const [activeTopic, setActiveTopic] = useState("Topic #1");

  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: "",
    email: "",
    phone: "",
    avatar: AVATARS[0],
    aiTone: "Professional & Encouraging",
    aiInstructions: "",
    age: undefined,
    username: ""
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>("All");

  const [chatInput, setChatInput] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<{[sessionId: string]: ChatMessage[]}>({});
  const [activeSessionId, setActiveSessionId] = useState<string>("session-1");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [awaitingDeadlineTask, setAwaitingDeadlineTask] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [selectedCalDate, setSelectedCalDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [timetableTaskName, setTimetableTaskName] = useState<string>("");
  const [timetableTaskCategory, setTimetableTaskCategory] = useState<"University" | "Coding" | "General">("Coding");
  const [timetableTaskTime, setTimetableTaskTime] = useState<string>("02:00 PM");
  const [isTimelineAddOpen, setIsTimelineAddOpen] = useState<boolean>(false);

  const [isHomeAddOpen, setIsHomeAddOpen] = useState<boolean>(false);
  const [homeTaskTitle, setHomeTaskTitle] = useState<string>("");
  const [homeTaskCategory, setHomeTaskCategory] = useState<"University" | "Coding" | "General">("Coding");
  const [homeTaskTime, setHomeTaskTime] = useState<string>("02:00 PM");

  const [saveToast, setSaveToast] = useState<string | null>(null);

  // 1. Core Authentication Monitor
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const email = user.email || "";
        setCurrentUserEmail(email);
        const storedToken = localStorage.getItem(`clutch_google_token_${email}`) || undefined;
        const storedProfile = localStorage.getItem(`clutch_profile_${email}`);
        
        if (storedProfile) {
          setUserProfile(JSON.parse(storedProfile));
          setIsAuthenticated(true);
        } else {
          // BRAND NEW USER: Block dashboard entry, route to onboarding setup
          setPendingGoogleData({ user, token: storedToken });
          setIsAuthenticated(false);
          setLoginStep("onboarding");
        }
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Google Identity Web Button Rendering Loader
  useEffect(() => {
    if (loginStep === "email") {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
          const container = document.getElementById("gsi-button-container");
          if (container) {
            const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "926875129160-456odeumut7fgh3pd46pqof5jb2269p4.apps.googleusercontent.com";
            try {
              (window as any).google.accounts.id.initialize({
                client_id: clientId,
                callback: (response: any) => {
                  if (response.credential) {
                    handleGsiLogin(response.credential);
                  }
                },
              });
              (window as any).google.accounts.id.renderButton(container, {
                theme: "filled_blue",
                size: "large",
                width: 270,
                shape: "rectangular",
                text: "signin_with"
              });
            } catch (err) {
              console.error("Google Identity Services render error:", err);
            }
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loginStep]);

  // 3. Sync Environment Context Profile Data Lookups
  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      const storedProfile = localStorage.getItem(`clutch_profile_${currentUserEmail}`);
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile));
      }

      const storedTasks = localStorage.getItem(`clutch_tasks_${currentUserEmail}`);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        setTasks([]);
        localStorage.setItem(`clutch_tasks_${currentUserEmail}`, JSON.stringify([]));
      }

      const storedSessions = localStorage.getItem(`clutch_chat_sessions_${currentUserEmail}`);
      const sessionsData = storedSessions ? JSON.parse(storedSessions) : {};

      if (Object.keys(sessionsData).length === 0) {
        const defaultSession: ChatMessage[] = [
          {
            id: "ai-init",
            sender: "Clutch AI Agent",
            content: `Welcome back! Your workspace setup parameters are synchronized. Ask me anything to get started!`,
            timestamp: "10:00 AM",
            isUser: false,
            type: "system"
          }
        ];
        const initialSessions = { "session-1": defaultSession };
        setChatSessions(initialSessions);
        setActiveSessionId("session-1");
        setChatMessages(defaultSession);
        localStorage.setItem(`clutch_chat_sessions_${currentUserEmail}`, JSON.stringify(initialSessions));
      } else {
        setChatSessions(sessionsData);
        const firstSessionId = Object.keys(sessionsData)[0];
        setActiveSessionId(firstSessionId);
        setChatMessages(sessionsData[firstSessionId] || []);
      }
    }
  }, [isAuthenticated, currentUserEmail]);

  // Sync state tracking hooks
  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      localStorage.setItem(`clutch_tasks_${currentUserEmail}`, JSON.stringify(tasks));
    }
  }, [tasks, isAuthenticated, currentUserEmail]);

  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      localStorage.setItem(`clutch_chat_sessions_${currentUserEmail}`, JSON.stringify(chatSessions));
    }
  }, [chatSessions, isAuthenticated, currentUserEmail]);

  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      localStorage.setItem(`clutch_profile_${currentUserEmail}`, JSON.stringify(userProfile));
    }
  }, [userProfile, isAuthenticated, currentUserEmail]);

  useEffect(() => {
    if (activeTopic) {
      const sessionIndex = parseInt(activeTopic.replace("Topic #", "")) - 1;
      const sessionIds = Object.keys(chatSessions);
      if (sessionIndex >= 0 && sessionIndex < sessionIds.length) {
        const chosenId = sessionIds[sessionIndex];
        setActiveSessionId(chosenId);
        setChatMessages(chatSessions[chosenId] || []);
      }
    }
  }, [activeTopic, chatSessions]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isGeneratingAI]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(fileContents[activeFile]);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const handleStartEdit = () => {
    setEditBuffer(fileContents[activeFile]);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setFileContents({ ...fileContents, [activeFile]: editBuffer });
    setIsEditing(false);
  };

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail.trim()) {
      setLoginError("Enter an email address");
      return;
    }
    setLoginStep("password");
  };

  const handleGoogleSuccess = (user: any, token: string | undefined) => {
    const email = user.email || "";
    const storedProfile = localStorage.getItem(`clutch_profile_${email}`);
    
    if (storedProfile) {
      setUserProfile(JSON.parse(storedProfile));
      setCurrentUserEmail(email);
      setIsAuthenticated(true);
      setActiveTab("home");
    } else {
      setPendingGoogleData({ user, token });
      setLoginStep("onboarding");
    }
  };

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!onboardAge.trim() || isNaN(Number(onboardAge)) || Number(onboardAge) <= 0) {
      setLoginError("Please enter a valid age metric.");
      return;
    }

    if (!pendingGoogleData) {
      setLoginStep("email");
      return;
    }

    const { user, token } = pendingGoogleData;
    const email = user.email || "";

    // Build the dynamic first-time profile explicitly mapping user setup inputs
    const finalProfile: UserProfile = {
      displayName: user.displayName || email.split("@")[0] || "User",
      email: email,
      phone: onboardPhone.trim(), 
      avatar: user.photoURL || AVATARS[0],
      aiTone: "Professional & Encouraging",
      aiInstructions: "",
      age: Number(onboardAge),
      username: email.split("@")[0] || "user",
      accessToken: token
    };

    setUserProfile(finalProfile);
    localStorage.setItem(`clutch_profile_${email}`, JSON.stringify(finalProfile));
    if (token) {
      localStorage.setItem(`clutch_google_token_${email}`, token);
    }

    setCurrentUserEmail(email);
    setLoginStep("email");
    setOnboardAge("");
    setOnboardPhone("");
    setIsAuthenticated(true);
    setActiveTab("home");
  };

  const handleGsiLogin = async (idToken: string) => {
    setLoginStep("loading");
    try {
      const result = await googleSignInWithIdToken(idToken);
      if (result) handleGoogleSuccess(result.user, result.token);
    } catch (err: any) {
      setLoginError(err.message || "Sign in failed.");
      setLoginStep("email");
    }
  };

  const triggerRealGoogleLogin = async () => {
    setLoginStep("loading");
    try {
      const result = await googleSignIn();
      if (result) handleGoogleSuccess(result.user, result.token);
    } catch (err: any) {
      setLoginError(err.message || "Sign in cancelled.");
      setLoginStep("email");
    }
  };

  const handlePasswordNext = (e: React.FormEvent) => {
    e.preventDefault();
    const emailKey = loginEmail.toLowerCase().trim();
    const storedUsers = localStorage.getItem("clutch_custom_users");
    const customUsers = storedUsers ? JSON.parse(storedUsers) : {};
    const userAccount = customUsers[emailKey];
    
    if (userAccount && userAccount.password === loginPassword) {
      setLoginStep("loading");
      setTimeout(() => {
        setCurrentUserEmail(emailKey);
        const storedProfile = localStorage.getItem(`clutch_profile_${emailKey}`);
        if (storedProfile) {
          setUserProfile(JSON.parse(storedProfile));
        }
        setIsAuthenticated(true);
        setActiveTab("home");
      }, 1000);
    } else {
      setLoginError("Invalid credentials framework.");
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailKey = regEmail.toLowerCase().trim();
    const customProfile: UserProfile = {
      displayName: regUsername.trim(),
      email: emailKey,
      phone: "",
      avatar: AVATARS[0],
      aiTone: "Professional & Encouraging",
      aiInstructions: "",
      age: Number(regAge),
      username: regUsername.trim()
    };
    localStorage.setItem(`clutch_profile_${emailKey}`, JSON.stringify(customProfile));
    setCurrentUserEmail(emailKey);
    setUserProfile(customProfile);
    setIsAuthenticated(true);
    setActiveTab("home");
  };

  const handleSignOut = async () => {
    try { await googleSignOut(); } catch (e) { console.error(e); }
    setIsAuthenticated(false);
    setTasks([]);
    setChatMessages([]);
    setChatSessions({});
    setPendingGoogleData(null);
    setLoginStep("email");
  };

  const handleAddNewTask = (title: string, category: "University" | "Coding" | "General", date: string, time: string) => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      category,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      dueDate: date,
      dueTime: time
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));
  };

  const handleCreateNewTopic = () => {
    const newSessionId = `session-${Date.now()}`;
    const topicName = `Topic #${Object.keys(chatSessions).length + 1}`;
    const initialSessionMessages: ChatMessage[] = [
      {
        id: "system-welcome",
        sender: "System",
        content: `New chat session created. You can now discuss a new topic independently.`,
        timestamp: currentTime,
        isUser: false,
        type: "system"
      }
    ];
    setChatSessions((prev) => ({ ...prev, [newSessionId]: initialSessionMessages }));
    setActiveSessionId(newSessionId);
    setActiveTopic(topicName);
    setChatMessages(initialSessionMessages);
  };

  // NEW FEATURE: Explicitly delete chat threads from local state memory completely
  const handleDeleteTopic = (sessionIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stops switching tabs accidentally
    const sessionIds = Object.keys(chatSessions);
    if (sessionIds.length <= 1) return; // Retain at least one open chat track context

    const updatedSessions = { ...chatSessions };
    delete updatedSessions[sessionIdToDelete];
    setChatSessions(updatedSessions);

    const remainingIds = Object.keys(updatedSessions);
    setActiveSessionId(remainingIds[0]);
    setChatMessages(updatedSessions[remainingIds[0]] || []);
    setActiveTopic("Topic #1");
  };

  const handleSendAIMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userPrompt = chatInput.trim();
    if (!userPrompt || isGeneratingAI) return;
    setChatInput("");
    const userMsgId = Date.now().toString();
    const now = new Date();
    const timestamp = `${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;

    const updatedSessionHistory = [
      ...(chatSessions[activeSessionId] || []),
      {
        id: userMsgId,
        sender: userProfile.displayName || "User",
        content: userPrompt,
        timestamp,
        isUser: true
      }
    ];

    setChatSessions((prev) => ({ ...prev, [activeSessionId]: updatedSessionHistory }));
    setChatMessages(updatedSessionHistory);
    setIsGeneratingAI(true);

    try {
      // 🚀 RADICAL ENVIRONMENT FIX: Search both Vite meta strings and process definitions directly
      const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (process as any).env.GEMINI_API_KEY || "";
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `You are the Clutch AI Workspace Agent. Response Tone metric requirement: ${userProfile.aiTone}. Special custom profile instructions: ${userProfile.aiInstructions}. Response format: Clean, short, clear Markdown prose.` }]
              },
              ...updatedSessionHistory.filter(m => m.type !== "system").map(msg => ({
                role: msg.isUser ? "user" : "model",
                parts: [{ text: msg.content }]
              }))
            ]
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const aiMsgId = (Date.now() + 1).toString();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No responsive text returned from API endpoint parameters.";

        const finalSessionHistory = [
          ...updatedSessionHistory,
          {
            id: aiMsgId,
            sender: "Clutch AI Agent",
            content: replyText,
            timestamp,
            isUser: false
          }
        ];

        setChatSessions((prev) => ({ ...prev, [activeSessionId]: finalSessionHistory }));
        setChatMessages(finalSessionHistory);
      } else {
        throw new Error("Cloud Gateway rejected connection credentials.");
      }
    } catch (err) {
      console.error("AI Terminal direct framework crash:", err);
      const aiMsgId = (Date.now() + 1).toString();
      const errorSessionHistory = [
        ...updatedSessionHistory,
        {
          id: aiMsgId,
          sender: "System",
          content: `❌ **Connection Blocked:** Direct transmission failed. Check if your AI Studio Secrets configuration contains your API Token key named precisely \`GEMINI_API_KEY\`.`,
          timestamp,
          isUser: false,
          type: "system"
        }
      ];
      setChatSessions((prev) => ({ ...prev, [activeSessionId]: errorSessionHistory }));
      setChatMessages(errorSessionHistory);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const buildCalendarDays = () => {
    const days: { dayNumber: number; dateString: string; isToday: boolean }[] = [];
    const year = 2026;
    for (let d = 1; d <= 30; d++) {
      days.push({
        dayNumber: d,
        dateString: `${year}-06-${d.toString().padStart(2, "0")}`,
        isToday: d === 27
      });
    }
    return days;
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveToast("Profile updated successfully!");
    setTimeout(() => setSaveToast(null), 3000);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const completedTodayCount = todayTasks.filter((t) => t.isCompleted).length;
  const completionRate = todayTasks.length > 0 ? Math.round((completedTodayCount / todayTasks.length) * 100) : 0;
  const filteredTasksList = todayTasks.filter((t) => selectedFilterCategory === "All" || t.category === selectedFilterCategory);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-zinc-200 font-sans flex justify-center items-center antialiased p-4">
        <div className="w-full max-w-md bg-slate-900 flex flex-col relative rounded-2xl shadow-2xl border border-slate-800 overflow-hidden text-xs py-8 px-6">
          <style dangerouslySetInnerHTML={{__html: `@keyframes googleProgress { 0% { left: -35%; width: 35%; } 50% { left: 30%; width: 60%; } 100% { left: 100%; width: 35%; } }`}} />

          <div className="w-full max-w-[340px] bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col relative transition-all duration-300 mx-auto">
            <div className="flex flex-col items-center mb-8 text-center select-none">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg mb-4">C</div>
              <h2 className="text-white text-xl font-bold tracking-tight">
                {loginStep === "register" ? "Create account" : loginStep === "onboarding" ? "Finalize Profile" : "Welcome back"}
              </h2>
              <p className="text-sm text-slate-400 max-w-[260px] mt-2 leading-relaxed">
                {loginStep === "onboarding" ? "Please provide your age and phone parameters to finalize workspace generation." : "Empower your workflow with intelligent context automation."}
              </p>
            </div>

            {loginStep === "email" && (
              <div className="w-full flex flex-col">
                <button type="button" onClick={triggerRealGoogleLogin} className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-xl border border-gray-200 text-sm transition shadow-lg cursor-pointer">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.435 2.221 15.534 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.746-.08-1.32-.176-1.709H12.24z"/></svg>
                  <span>Continue with Google</span>
                </button>
                <div className="flex items-center gap-4 w-full my-6"><span className="h-px bg-slate-800 flex-1"></span><span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Or email login</span><span className="h-px bg-slate-800 flex-1"></span></div>
                <form onSubmit={handleEmailNext} className="w-full flex flex-col space-y-5">
                  <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="name@company.com" className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition" />
                  {loginError && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">{loginError}</div>}
                  <div className="flex justify-between items-center w-full pt-2 border-t border-slate-800">
                    <button type="button" onClick={() => setLoginStep("register")} className="text-blue-400 font-bold text-sm">Create account</button>
                    <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition">Next</button>
                  </div>
                </form>
              </div>
            )}

            {loginStep === "password" && (
              <form onSubmit={handlePasswordNext} className="w-full flex flex-col space-y-5">
                <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition" />
                {loginError && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">{loginError}</div>}
                <div className="flex justify-between items-center w-full pt-4 border-t border-slate-800">
                  <button type="button" onClick={() => setLoginStep("email")} className="text-slate-400 font-bold text-sm">Back</button>
                  <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition">Login</button>
                </div>
              </form>
            )}

            {loginStep === "register" && (
              <form onSubmit={handleRegisterSubmit} className="w-full flex flex-col space-y-4">
                <input type="text" required value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="Username" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
                <input type="number" required value={regAge} onChange={(e) => setRegAge(e.target.value)} placeholder="Age" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
                <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="Email" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
                <input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Password" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
                <div className="flex justify-between items-center w-full pt-2 border-t border-slate-800">
                  <button type="button" onClick={() => setLoginStep("email")} className="text-slate-400 font-bold text-sm">Back</button>
                  <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition">Register</button>
                </div>
              </form>
            )}

            {/* 👑 Working Setup intake Portal */}
            {loginStep === "onboarding" && (
              <form onSubmit={handleOnboardingSubmit} className="w-full flex flex-col space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase block ml-1 text-left">Your True Age</label>
                    <input type="number" required min="1" max="120" value={onboardAge} onChange={(e) => setOnboardAge(e.target.value)} placeholder="e.g. 21" className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition placeholder-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase block ml-1 text-left">Mobile Number</label>
                    <input type="tel" required value={onboardPhone} onChange={(e) => setOnboardPhone(e.target.value)} placeholder="e.g. +91 98765 43210" className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition placeholder-slate-600" />
                  </div>
                </div>
                {loginError && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">{loginError}</div>}
                <div className="flex justify-between items-center w-full pt-4 border-t border-slate-800">
                  <button type="button" onClick={handleSignOut} className="text-slate-400 font-bold text-sm">Cancel</button>
                  <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/20 font-mono uppercase tracking-wider">Complete Setup</button>
                </div>
              </form>
            )}

            {loginStep === "loading" && (
              <div className="w-full flex flex-col items-center py-8 text-center">
                <h3 className="text-white text-sm font-bold mb-2">Authenticating credentials...</h3>
                <div className="w-full max-w-[220px] h-2 bg-slate-800 rounded-full overflow-hidden relative mt-4">
                  <div className="h-full bg-blue-500 rounded-full absolute left-0 top-0" style={{ animation: "googleProgress 1.5s infinite ease-in-out" }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-zinc-200 font-sans flex antialiased w-full text-xs overflow-hidden h-screen">
      <div className="hidden md:flex flex-col w-64 bg-slate-800 border-r border-slate-700 p-5 shrink-0 justify-between">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">C</div>
            <div>
              <h2 className="text-white font-bold tracking-widest text-xs uppercase">Clutch AI</h2>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Workspace</span>
            </div>
          </div>

          <nav className="space-y-2 pt-2">
            <button onClick={() => setActiveTab("home")} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-mono uppercase text-xs tracking-wider ${activeTab === "home" ? "bg-slate-700 text-blue-400 border border-blue-500/30 font-bold shadow-lg" : "text-zinc-400 hover:bg-slate-700/50"}`}><Smartphone className="w-5 h-5 shrink-0" /><span>Home / Goals</span></button>
            <button onClick={() => setActiveTab("ai")} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-mono uppercase text-xs tracking-wider ${activeTab === "ai" ? "bg-slate-700 text-blue-400 border border-blue-500/30 font-bold shadow-lg" : "text-zinc-400 hover:bg-slate-700/50"}`}><Sparkles className="w-5 h-5 shrink-0" /><span>AI Terminal</span></button>
            <button onClick={() => setActiveTab("calendar")} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-mono uppercase text-xs tracking-wider ${activeTab === "calendar" ? "bg-slate-700 text-blue-400 border border-blue-500/30 font-bold shadow-lg" : "text-zinc-400 hover:bg-slate-700/50"}`}><Calendar className="w-5 h-5 shrink-0" /><span>Chronos Calendar</span></button>
            <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-mono uppercase text-xs tracking-wider ${activeTab === "profile" ? "bg-slate-700 text-blue-400 border border-blue-500/30 font-bold shadow-lg" : "text-zinc-400 hover:bg-slate-700/50"}`}><Settings className="w-5 h-5 shrink-0" /><span>User Profile</span></button>
          </nav>

          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Chat Topics</span>
              <button onClick={handleCreateNewTopic} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-1 rounded transition" title="Create new topic"><PlusCircle className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
              {Object.keys(chatSessions).map((sessionId, index) => {
                const topicName = `Topic #${index + 1}`;
                const isActive = activeTopic === topicName;
                return (
                  <button key={sessionId} onClick={() => { setActiveTopic(topicName); setActiveSessionId(sessionId); }} className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition text-xs font-mono group ${isActive ? "bg-blue-600/20 border border-blue-500/30 text-blue-300" : "text-zinc-400 hover:bg-slate-700/50"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-blue-400" : "bg-slate-600"}`} />
                      <span className="truncate">{topicName}</span>
                    </div>
                    {Object.keys(chatSessions).length > 1 && (
                      <Trash2 onClick={(e) => handleDeleteTopic(sessionId, e)} className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">{userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : "U"}</div>
            <div className="min-w-0 flex-1">
              <h4 className="text-white text-xs font-bold truncate leading-tight">{userProfile.displayName}</h4>
              <span className="text-[10px] font-mono text-slate-500 truncate block leading-none">{userProfile.email}</span>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/30 border border-red-900/30 text-red-400 hover:bg-red-900/30 transition-all font-mono uppercase text-[10px] tracking-wider"><LogOut className="w-4 h-4" /><span>Sign Out</span></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="px-5 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h3 className="font-mono font-bold text-sm tracking-widest text-white uppercase flex items-center gap-2"><span className="text-blue-400">✦</span><span>{activeTab === "home" ? "Goals Deck" : activeTab === "ai" ? "AI Terminal" : activeTab === "calendar" ? "Chronos Calendar" : "User Profile"}</span></h3>
            <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider leading-none mt-1">{userProfile.email} {userProfile.aiTone ? `• ${userProfile.aiTone}` : ""}</span>
          </div>
        </div>

        {saveToast && <div className="mx-5 mt-4 bg-gradient-to-r from-slate-800 to-slate-700 border border-blue-500/30 px-5 py-3 rounded-2xl text-xs text-blue-300 text-center shadow-lg flex items-center justify-center gap-2 z-50 shrink-0"><span>✨</span><span className="font-semibold">{saveToast}</span></div>}

        <div className="flex-1 flex flex-col min-h-0 relative bg-slate-900 overflow-hidden">
          {activeTab === "home" && (
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 custom-scrollbar">
              <div className="text-left"><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">{new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}</p><h2 className="text-white text-2xl font-bold">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h2></div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-5 rounded-2xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400 uppercase mb-3"><span>Today's Progress</span><span className="text-blue-400 font-bold">{completionRate}%</span></div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out" style={{ width: `${completionRate}%` }}></div></div>
                <p className="text-[11px] text-zinc-500 font-mono mt-3 uppercase">{completedTodayCount} of {todayTasks.length} objectives accomplished</p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {["All", "University", "Coding", "General"].map((cat) => (
                  <button key={cat} onClick={() => setSelectedFilterCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition shrink-0 ${selectedFilterCategory === cat ? "bg-blue-600 text-white shadow-lg" : "border border-slate-700 text-zinc-400 bg-slate-800/50 hover:bg-slate-700"}`}>{cat}</button>
                ))}
              </div>

              <div className="flex-1 space-y-3 pb-16 overflow-y-auto max-h-[300px] custom-scrollbar">
                {filteredTasksList.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-700 rounded-2xl bg-slate-800/20 text-zinc-500">
                    <ListTodo className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                    <p className="font-mono text-xs uppercase tracking-wider mb-2">No tasks scheduled today</p>
                  </div>
                ) : (
                  filteredTasksList.map((t) => (
                    <div key={t.id} className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${t.isCompleted ? "bg-slate-800/40 border-slate-700 text-zinc-500 opacity-60" : "bg-gradient-to-br from-slate-800 to-slate-700 border-slate-700/50 text-white"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => handleToggleTask(t.id)} className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${t.isCompleted ? "bg-blue-600 border-blue-600" : "border-slate-600"}`}>{t.isCompleted && <Check className="w-3 h-3 text-white stroke-[4]" />}</button>
                        <div className="text-left min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${t.isCompleted ? "line-through text-zinc-600" : "text-white"}`}>{t.title}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-widest leading-none border">{t.category}</span>
                            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" />{t.dueTime}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(t.id)} className="text-zinc-600 hover:text-red-400 p-2 rounded-lg transition shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setIsHomeAddOpen(true)} className="absolute bottom-6 right-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-xl z-40"><Plus className="w-6 h-6 stroke-[3]" /></button>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="flex-1 flex flex-col min-h-0 p-5 md:p-8 space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Session: {activeTopic}</span>
                <button onClick={handleCreateNewTopic} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-blue-400 transition"><PlusCircle className="w-3.5 h-3.5" /><span>New Topic</span></button>
              </div>

              <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-750 border border-slate-600 rounded-2xl p-4 flex flex-col overflow-hidden shadow-lg">
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {chatMessages.map((m) => (
                    <div key={m.id} className={`p-4 rounded-xl border ${m.isUser ? "bg-gradient-to-br from-blue-600/20 to-blue-500/10 border-blue-500/30 self-end text-white" : m.type === "system" ? "bg-slate-900/40 border-slate-800 text-slate-400 italic font-mono text-center" : "bg-gradient-to-br from-slate-700/50 to-slate-600/50 border-slate-600 text-white"}`}>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2.5"><span className="font-semibold">{m.sender.toUpperCase()}</span><span className="text-slate-500">{m.timestamp}</span></div>
                      <div className="markdown-body text-left leading-relaxed text-zinc-100">
                        <ReactMarkdown components={{ code: ({node, inline, className, children, ...props}: any) => !inline ? <pre className="bg-slate-900 border border-slate-600 rounded-lg p-3 my-3 overflow-x-auto font-mono text-xs text-blue-300"><code className={className} {...props}>{children}</code></pre> : <code className="bg-slate-900 px-1.5 py-0.5 rounded font-mono text-xs text-blue-300 border border-slate-700" {...props}>{children}</code> }}>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {isGeneratingAI && <div className="flex items-center gap-3 text-blue-400 font-mono text-xs py-1.5 animate-pulse"><span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span><span>STREAMING CONTENT CORE ENGINE LOGS...</span></div>}
                </div>
              </div>

              <form onSubmit={handleSendAIMessage} className="flex gap-3 pt-2 border-t border-slate-700">
                <input type="text" placeholder="Ask AI to solve any workspace task..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1 bg-slate-800 text-white border border-slate-600 focus:border-blue-500 rounded-xl px-4 py-3 focus:outline-none placeholder-slate-500 text-sm transition" />
                <button type="submit" disabled={isGeneratingAI} className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-3 rounded-xl"><Terminal className="w-5 h-5" /></button>
              </form>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 custom-scrollbar">
              <div className="bg-gradient-to-br from-slate-800 to-slate-750 p-4 rounded-2xl border border-slate-700 shadow-lg">
                <div className="grid grid-cols-7 gap-1.5">
                  {buildCalendarDays().map((d) => (
                    <button key={d.dayNumber} onClick={() => setSelectedCalDate(d.dateString)} className={`h-9 rounded-xl font-mono relative flex items-center justify-center ${selectedCalDate === d.dateString ? "bg-blue-600 text-white font-bold" : "text-zinc-400"}`}><span className="text-sm">{d.dayNumber}</span></button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 custom-scrollbar">
              <form onSubmit={handleProfileSave} className="space-y-4 text-left pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Profile Name</label>
                    <input type="text" required value={userProfile.displayName} onChange={(e) => setUserProfile({ ...userProfile, displayName: e.target.value })} className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Contact Phone</label>
                    <input type="text" value={userProfile.phone} onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })} placeholder="Enter number..." className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block">Username</label>
                    <input type="text" value={userProfile.username || ""} onChange={(e) => setUserProfile({ ...userProfile, username: e.target.value })} className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block">Registered Age</label>
                    <input type="number" value={userProfile.age || ""} onChange={(e) => setUserProfile({ ...userProfile, age: Number(e.target.value) || undefined })} className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl text-sm font-mono uppercase tracking-wider">Update Profile Settings</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
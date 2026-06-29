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

  const [loginStep, setLoginStep] = useState<"email" | "password" | "register" | "loading">("email");
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [regUsername, setRegUsername] = useState<string>("");
  const [regAge, setRegAge] = useState<string>("");
  const [regEmail, setRegEmail] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"home" | "ai" | "calendar" | "profile">("home");

  // Chat Topics state - tracks the active selected topic
  const [activeTopic, setActiveTopic] = useState("Topic #3");

  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: "",
    email: "",
    phone: "",
    avatar: AVATARS[0],
    aiTone: "Professional & Encouraging",
    aiInstructions: "",
    age: 20,
    username: ""
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>("All");

  const [chatInput, setChatInput] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<{[sessionId: string]: ChatMessage[]}>({});
  const [activeSessionId, setActiveSessionId] = useState<string>("default");
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const email = user.email || "";
        setCurrentUserEmail(email);
        const storedToken = localStorage.getItem(`clutch_google_token_${email}`) || undefined;
        setUserProfile((prev) => ({
          ...prev,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          email: email,
          phone: user.phoneNumber || "",
          avatar: user.photoURL || prev.avatar,
          accessToken: storedToken || prev.accessToken
        }));
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      const storedProfile = localStorage.getItem(`clutch_profile_${currentUserEmail}`);
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile));
      } else {
        const defaultProf: UserProfile = {
          displayName: currentUserEmail.split("@")[0],
          email: currentUserEmail,
          phone: "",
          avatar: AVATARS[0],
          aiTone: "Professional & Encouraging",
          aiInstructions: "",
          age: 20,
          username: currentUserEmail.split("@")[0]
        };
        setUserProfile(defaultProf);
        localStorage.setItem(`clutch_profile_${currentUserEmail}`, JSON.stringify(defaultProf));
      }

      const storedTasks = localStorage.getItem(`clutch_tasks_${currentUserEmail}`);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        const defaultTasks: Task[] = [];
        setTasks(defaultTasks);
        localStorage.setItem(`clutch_tasks_${currentUserEmail}`, JSON.stringify(defaultTasks));
      }

      // Load chat sessions from localStorage
      const storedSessions = localStorage.getItem(`clutch_chat_sessions_${currentUserEmail}`);
      const sessionsData = storedSessions ? JSON.parse(storedSessions) : {};

      if (Object.keys(sessionsData).length === 0) {
        // Create default session if none exists
        const defaultSession: ChatMessage[] = [
          {
            id: "ai-init",
            sender: "Clutch AI Agent",
            content: `Welcome back, ${currentUserEmail.split("@")[0]}! Your Google workspace and previously stored objectives are securely synchronized.

I can assist in solving coding or college tasks. Just describe what you need to build, and I will outline the solution. Later, I will ask for a deadline to schedule it onto your calendar and suggest the best hour to begin!`,
            timestamp: "10:00 AM",
            isUser: false,
            type: "system"
          }
        ];
        const initialSessions = { "default": defaultSession };
        setChatSessions(initialSessions);
        setActiveSessionId("default");
        setChatMessages(defaultSession);
        localStorage.setItem(`clutch_chat_sessions_${currentUserEmail}`, JSON.stringify(initialSessions));
      } else {
        setChatSessions(sessionsData);
        // Use first session or "default" as active
        const firstSessionId = Object.keys(sessionsData)[0];
        setActiveSessionId(firstSessionId);
        // Set chatMessages from the active session
        setChatMessages(sessionsData[firstSessionId] || []);
      }
    }
  }, [isAuthenticated, currentUserEmail]);

  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      localStorage.setItem(`clutch_tasks_${currentUserEmail}`, JSON.stringify(tasks));
    }
  }, [tasks, isAuthenticated, currentUserEmail]);

  // Save chat sessions to localStorage whenever they change
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

  // Sync activeTopic to activeSessionId when topic changes
  useEffect(() => {
    if (activeTopic) {
      const sessionIndex = parseInt(activeTopic.replace("Topic #", "")) - 1;
      const sessionIds = Object.keys(chatSessions);
      if (sessionIndex >= 0 && sessionIndex < sessionIds.length) {
        setActiveSessionId(sessionIds[sessionIndex]);
      }
    }
  }, [activeTopic, chatSessions]);

  // Sync activeSessionId changes to activeTopic for sidebar selection
  useEffect(() => {
    const sessionIds = Object.keys(chatSessions);
    const sessionIndex = sessionIds.indexOf(activeSessionId);
    if (sessionIndex >= 0) {
      const topicName = `Topic #${sessionIndex + 1}`;
      setActiveTopic(topicName);
    }
  }, [activeSessionId, chatSessions]);

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
    setFileContents({
      ...fileContents,
      [activeFile]: editBuffer
    });
    setIsEditing(false);
  };

  const handleDownloadFile = (fileName: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = fileName.split("/").pop() || "file.dart";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadAll = () => {
    Object.keys(fileContents).forEach((fileName) => {
      handleDownloadFile(fileName, fileContents[fileName]);
    });
  };

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail.trim()) {
      setLoginError("Enter an email or phone number");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail.trim())) {
      setLoginError("Enter a valid email address");
      return;
    }
    setLoginStep("password");
  };

  const handleGoogleSuccess = (user: any, token: string | undefined) => {
    const email = user.email || "";
    const storedProfile = localStorage.getItem(`clutch_profile_${email}`);
    let profile: UserProfile;
    if (storedProfile) {
      profile = {
        ...JSON.parse(storedProfile),
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        email: email,
        phone: user.phoneNumber || "",
        avatar: user.photoURL || AVATARS[0],
        accessToken: token
      };
    } else {
      profile = {
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        email: email,
        phone: user.phoneNumber || "",
        avatar: user.photoURL || AVATARS[0],
        aiTone: "Professional & Encouraging",
        aiInstructions: "",
        age: 20,
        username: user.email?.split("@")[0] || "user",
        accessToken: token
      };
    }
    setUserProfile(profile);
    localStorage.setItem(`clutch_profile_${email}`, JSON.stringify(profile));
    if (token) {
      localStorage.setItem(`clutch_google_token_${email}`, token);
    }
    setLoginStep("email");
    setLoginPassword("");
    setLoginError(null);
    setIsAuthenticated(true);
    setActiveTab("home");
  };

  const handleGsiLogin = async (idToken: string) => {
    setLoginStep("loading");
    setLoginError(null);
    try {
      const result = await googleSignInWithIdToken(idToken);
      if (result) {
        handleGoogleSuccess(result.user, result.token);
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || "Sign in with Google Identity Services failed.");
      setLoginStep("email");
    }
  };

  const triggerRealGoogleLogin = async () => {
    setLoginStep("loading");
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        handleGoogleSuccess(result.user, result.token);
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || "Sign in failed or cancelled. Please try again.");
      setLoginStep("email");
    }
  };

  const handlePasswordNext = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginPassword) {
      setLoginError("Enter your password");
      return;
    }
    const emailKey = loginEmail.toLowerCase().trim();
    const storedUsers = localStorage.getItem("clutch_custom_users");
    const customUsers = storedUsers ? JSON.parse(storedUsers) : {};
    const userAccount = customUsers[emailKey];
    if (userAccount) {
      if (userAccount.password === loginPassword) {
        setLoginStep("loading");
        setTimeout(() => {
          setCurrentUserEmail(emailKey);
          const storedProfile = localStorage.getItem(`clutch_profile_${emailKey}`);
          if (storedProfile) {
            setUserProfile(JSON.parse(storedProfile));
          } else {
            const prof: UserProfile = {
              displayName: userAccount.username || emailKey.split("@")[0],
              email: emailKey,
              phone: "",
              avatar: AVATARS[0],
              aiTone: "Professional & Encouraging",
              aiInstructions: "",
              age: userAccount.age,
              username: userAccount.username
            };
            setUserProfile(prof);
            localStorage.setItem(`clutch_profile_${emailKey}`, JSON.stringify(prof));
          }
          setIsAuthenticated(true);
          setLoginStep("email");
          setLoginPassword("");
          setLoginError(null);
          setActiveTab("home");
        }, 1500);
      } else {
        setLoginError("Incorrect password. Please try again.");
      }
    } else {
      setLoginError("No local Clutch AI account found for this email. Click 'Create account' to register or use real Google popup.");
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!regUsername.trim()) {
      setLoginError("Please choose a username");
      return;
    }
    if (!regAge.trim() || isNaN(Number(regAge)) || Number(regAge) <= 0) {
      setLoginError("Please enter a valid age");
      return;
    }
    if (!regEmail.trim() || !regEmail.includes("@")) {
      setLoginError("Please enter a valid email address");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setLoginError("Password must be at least 6 characters");
      return;
    }
    const emailKey = regEmail.toLowerCase().trim();
    const storedUsers = localStorage.getItem("clutch_custom_users");
    const customUsers = storedUsers ? JSON.parse(storedUsers) : {};
    customUsers[emailKey] = {
      username: regUsername.trim(),
      age: Number(regAge),
      password: regPassword
    };
    localStorage.setItem("clutch_custom_users", JSON.stringify(customUsers));
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
    setLoginStep("loading");
    setTimeout(() => {
      setCurrentUserEmail(emailKey);
      setUserProfile(customProfile);
      setIsAuthenticated(true);
      setLoginStep("email");
      setRegUsername("");
      setRegAge("");
      setRegEmail("");
      setRegPassword("");
      setLoginError(null);
      setActiveTab("home");
    }, 1500);
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
    } catch (e) {
      console.error("Firebase logout error:", e);
    }
    setIsAuthenticated(false);
    setTasks([]);
    setChatMessages([]);
    setLoginStep("email");
    setLoginEmail("");
    setLoginPassword("");
    setLoginError(null);
  };

  const parseDateTimeToISO = (dateStr: string, timeStr: string) => {
    try {
      let hours = 12;
      let minutes = 0;
      const cleanTime = timeStr.trim().toUpperCase();
      if (cleanTime.includes("AM") || cleanTime.includes("PM")) {
        const parts = cleanTime.replace("AM", "").replace("PM", "").trim().split(":");
        hours = parseInt(parts[0], 10) || 12;
        minutes = parts[1] ? parseInt(parts[1], 10) : 0;
        if (cleanTime.includes("PM") && hours < 12) {
          hours += 12;
        } else if (cleanTime.includes("AM") && hours === 12) {
          hours = 0;
        }
      } else {
        const parts = cleanTime.split(":");
        hours = parseInt(parts[0], 10) || 12;
        minutes = parts[1] ? parseInt(parts[1], 10) : 0;
      }
      const dateObj = new Date(`${dateStr}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`);
      if (isNaN(dateObj.getTime())) {
        const fbObj = new Date();
        fbObj.setHours(fbObj.getHours() + 1);
        return fbObj.toISOString();
      }
      return dateObj.toISOString();
    } catch (err) {
      return new Date().toISOString();
    }
  };

  const syncTaskToGoogleCalendar = async (taskTitle: string, category: string, date: string, time: string, token: string) => {
    try {
      const startISO = parseDateTimeToISO(date, time);
      const startDate = new Date(startISO);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const endISO = endDate.toISOString();
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: `Clutch: ${taskTitle}`,
          description: `Category: ${category}. Automatically synchronized via Clutch AI Workspace.`,
          start: {
            dateTime: startISO
          },
          end: {
            dateTime: endISO
          }
        })
      });
      if (response.ok) {
        setSaveToast(`Synced "${taskTitle}" to Google Calendar! 🗓️`);
        setTimeout(() => setSaveToast(null), 4000);
      } else {
        console.warn("Failed to sync to Google Calendar:", await response.text());
      }
    } catch (err) {
      console.error("Error syncing to Google Calendar:", err);
    }
  };

  const handleAddNewTask = (title: string, category: "University" | "Coding" | "General", date: string, time: string) => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      category: category,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      dueDate: date,
      dueTime: time
    };
    setTasks((prev) => [...prev, newTask]);
    if (userProfile?.accessToken) {
      syncTaskToGoogleCalendar(title.trim(), category, date, time, userProfile.accessToken);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    );
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
    setChatSessions((prev) => ({
      ...prev,
      [newSessionId]: initialSessionMessages
    }));
    setActiveSessionId(newSessionId);
    setActiveTopic(topicName);
    setChatMessages(initialSessionMessages);
    setAwaitingDeadlineTask(null);
  };

  const handleSendAIMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userPrompt = chatInput.trim();
    if (!userPrompt || isGeneratingAI) return;
    setChatInput("");
    const userMsgId = Date.now().toString();
    const now = new Date();
    const timestamp = `${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;

    // Add user message to current session
    setChatSessions((prev) => ({
      ...prev,
      [activeSessionId]: [
        ...(prev[activeSessionId] || []),
        {
          id: userMsgId,
          sender: userProfile.displayName,
          content: userPrompt,
          timestamp,
          isUser: true
        }
      ]
    }));

    setIsGeneratingAI(true);

    // Build history from current session
    const currentSessionMessages = chatSessions[activeSessionId] || [];
    const historyWithNewMessage = [
      ...currentSessionMessages,
      {
        id: userMsgId,
        sender: userProfile.displayName,
        content: userPrompt,
        timestamp,
        isUser: true
      }
    ];

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          tasks: tasks,
          aiTone: userProfile.aiTone,
          aiInstructions: userProfile.aiInstructions,
          awaitingDeadlineTask: awaitingDeadlineTask,
          accessToken: userProfile.accessToken,
          history: historyWithNewMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsgId = (Date.now() + 1).toString();

        // Add AI response to current session
        setChatSessions((prev) => ({
          ...prev,
          [activeSessionId]: [
            ...(prev[activeSessionId] || []),
            {
              id: aiMsgId,
              sender: "Clutch AI Agent",
              content: data.reply,
              timestamp,
              isUser: false
            }
          ]
        }));

        // Update chatMessages with the current session messages
        const updatedSessionMessages = [...(chatSessions[activeSessionId] || []), {
            id: aiMsgId,
            sender: "Clutch AI Agent",
            content: data.reply,
            timestamp,
            isUser: false
        }];
        setChatMessages(updatedSessionMessages);

        if (data.suggestedTasks && data.suggestedTasks.length > 0) {
          data.suggestedTasks.forEach((sTask: any) => {
            // Use the actual dueDate and dueTime from the API response, not hardcoded values
            handleAddNewTask(
              sTask.title,
              sTask.category || "General",
              sTask.dueDate,
              sTask.dueTime
            );
          });
        }
        if (data.detectedTaskName && !data.clearAwaitingDeadline) {
          setAwaitingDeadlineTask(data.detectedTaskName);
        } else if (data.clearAwaitingDeadline) {
          setAwaitingDeadlineTask(null);
        }
      } else {
        throw new Error("Network error: Could not connect to AI service.");
      }
    } catch (err) {
      console.error("AI Assistant network failed:", err);
      const errorMsg = err instanceof Error ? err.message : "Network error: Could not connect to AI service.";
      const aiMsgId = (Date.now() + 1).toString();
      const now = new Date();
      const timestamp = `${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;

      // Add error message to current session instead of mock simulator
      setChatSessions((prev) => ({
        ...prev,
        [activeSessionId]: [
          ...(prev[activeSessionId] || []),
          {
            id: aiMsgId,
            sender: "System",
            content: `❌ **Error:** ${errorMsg}\n\nPlease check your internet connection and try again.`,
            timestamp,
            isUser: false
          }
        ]
      }));

      // Update chatMessages with the error message
      setChatMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: "System",
          content: `❌ **Error:** ${errorMsg}\n\nPlease check your internet connection and try again.`,
          timestamp,
          isUser: false
        }
      ]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const buildCalendarDays = () => {
    const days: { dayNumber: number; dateString: string; isToday: boolean }[] = [];
    const year = 2026;
    for (let d = 1; d <= 30; d++) {
      const dateStr = `${year}-06-${d.toString().padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateString: dateStr,
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
  const filteredTasksList = todayTasks.filter(
    (t) => selectedFilterCategory === "All" || t.category === selectedFilterCategory
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-zinc-200 font-sans flex justify-center items-center antialiased p-4">
        <div className="w-full max-w-md bg-slate-900 flex flex-col relative rounded-2xl shadow-2xl border border-slate-800 overflow-hidden text-xs py-8 px-6">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes googleProgress {
              0% { left: -35%; width: 35%; }
              50% { left: 30%; width: 60%; }
              100% { left: 100%; width: 35%; }
            }
          `}} />

          <div className="w-full max-w-[340px] bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col relative transition-all duration-300">

            <div className="flex flex-col items-center mb-8 text-center select-none">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20 mb-4">
                C
              </div>
              <h2 className="text-white text-xl font-bold tracking-tight">
                {loginStep === "register" ? "Create your account" : "Welcome back"}
              </h2>
              <p className="text-sm text-slate-400 max-w-[260px] mt-2 leading-relaxed">
                {loginStep === "register"
                  ? "Get started with your intelligent context workspace"
                  : "Empower your workflow with intelligent context automation"}
              </p>
            </div>

            {loginStep === "email" && (
              <div className="w-full flex flex-col">
                <button
                  type="button"
                  onClick={triggerRealGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-900 font-bold rounded-xl border border-gray-200 text-sm transition shadow-lg shadow-gray-500/10 cursor-pointer group"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.435 2.221 15.534 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.746-.08-1.32-.176-1.709H12.24z"/>
                  </svg>
                  <span className="font-semibold">Continue with Google</span>
                </button>

                <div className="flex items-center gap-4 w-full my-6 select-none">
                  <span className="h-px bg-slate-800 flex-1"></span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Or sign in with email</span>
                  <span className="h-px bg-slate-800 flex-1"></span>
                </div>

                <form onSubmit={handleEmailNext} className="w-full flex flex-col space-y-5">
                  <div className="w-full space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block ml-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setLoginError(null);
                      }}
                      placeholder="name@company.com"
                      className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition placeholder-slate-600"
                    />
                  </div>

                  {loginError && (
                    <div className="text-red-400 text-xs flex items-start gap-2 text-left w-full bg-red-500/10 p-3 rounded-xl border border-red-500/20 leading-relaxed">
                      <span className="shrink-0 mt-0.5">⚠️</span>
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center w-full pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep("register");
                        setLoginError(null);
                      }}
                      className="text-blue-400 font-bold text-sm hover:text-blue-300 transition"
                    >
                      Create account
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
                    >
                      Next
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loginStep === "password" && (
              <form onSubmit={handlePasswordNext} className="w-full flex flex-col space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep("email");
                    setLoginPassword("");
                    setLoginError(null);
                  }}
                  className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-xs text-zinc-300 hover:bg-slate-800 transition mt-1 self-start max-w-full"
                  title="Switch profile identifier"
                >
                  <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {loginEmail ? loginEmail.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="truncate font-mono text-xs max-w-[180px]">{loginEmail}</span>
                  <span className="text-[10px] text-slate-500 pl-0.5">▼</span>
                </button>

                <div className="w-full space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block ml-1">
                    Enter Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="••••••••"
                    className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-3 text-left w-full select-none pl-1">
                  <input
                    type="checkbox"
                    id="showPass"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20 w-4.5 h-4.5 accent-blue-500 cursor-pointer"
                  />
                  <label htmlFor="showPass" className="text-zinc-300 text-xs font-medium cursor-pointer">
                    Show password
                  </label>
                </div>

                {loginError && (
                  <div className="text-red-400 text-xs flex items-start gap-2 text-left w-full bg-red-500/10 p-3 rounded-xl border border-red-500/20 leading-relaxed">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="flex justify-between items-center w-full pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep("email");
                      setLoginPassword("");
                      setLoginError(null);
                    }}
                    className="text-slate-400 font-bold text-sm hover:text-white transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
                  >
                    Login
                  </button>
                </div>
              </form>
            )}

            {loginStep === "register" && (
              <form onSubmit={handleRegisterSubmit} className="w-full flex flex-col space-y-5">
                <div className="w-full space-y-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block ml-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value);
                        setLoginError(null);
                      }}
                      placeholder="John Doe"
                      className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition placeholder-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block ml-1">
                      Age
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      value={regAge}
                      onChange={(e) => {
                        setRegAge(e.target.value);
                        setLoginError(null);
                      }}
                      placeholder="25"
                      className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition placeholder-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block ml-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        setLoginError(null);
                      }}
                      placeholder="name@company.com"
                      className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition placeholder-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block ml-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        setLoginError(null);
                      }}
                      placeholder="•••••••• (Min 6 chars)"
                      className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition placeholder-slate-600"
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="text-red-400 text-xs flex items-start gap-2 text-left w-full bg-red-500/10 p-3 rounded-xl border border-red-500/20 leading-relaxed">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="flex justify-between items-center w-full pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep("email");
                      setLoginError(null);
                    }}
                    className="text-slate-400 font-bold text-sm hover:text-white transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
                  >
                    Register
                  </button>
                </div>
              </form>
            )}

            {loginStep === "loading" && (
              <div className="w-full flex flex-col items-center py-8 text-center">
                <h3 className="text-white text-sm font-bold mb-2">Authenticating credentials...</h3>
                <p className="text-xs text-slate-500 font-mono mb-8 uppercase tracking-wider">
                  Establishing secure profile context
                </p>

                <div className="w-full max-w-[220px] h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-blue-500 rounded-full absolute left-0 top-0"
                    style={{ animation: "googleProgress 1.5s infinite ease-in-out" }}
                  ></div>
                </div>

                <p className="text-[10px] text-slate-400 font-mono mt-6 uppercase tracking-widest animate-pulse">
                  Synchronizing environment configs
                </p>
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/15">
              C
            </div>
            <div>
              <h2 className="text-white font-bold tracking-widest text-xs uppercase">Clutch AI</h2>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Workspace</span>
            </div>
          </div>

          <nav className="space-y-2 pt-2">
            <button
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-mono uppercase text-xs tracking-wider ${
                activeTab === "home"
                  ? "bg-slate-700 text-blue-400 border border-blue-500/30 font-bold shadow-lg shadow-blue-500/5"
                  : "text-zinc-400 hover:bg-slate-700/50 hover:text-zinc-200 hover:border hover:border-slate-700"
              }`}
            >
              <Smartphone className="w-5 h-5 shrink-0" />
              <span>Home / Goals</span>
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-mono uppercase text-xs tracking-wider ${
                activeTab === "ai"
                  ? "bg-slate-700 text-blue-400 border border-blue-500/30 font-bold shadow-lg shadow-blue-500/5"
                  : "text-zinc-400 hover:bg-slate-700/50 hover:text-zinc-200 hover:border hover:border-slate-700"
              }`}
            >
              <Sparkles className="w-5 h-5 shrink-0" />
              <span>AI Terminal</span>
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-mono uppercase text-xs tracking-wider ${
                activeTab === "calendar"
                  ? "bg-slate-700 text-blue-400 border border-blue-500/30 font-bold shadow-lg shadow-blue-500/5"
                  : "text-zinc-400 hover:bg-slate-700/50 hover:text-zinc-200 hover:border hover:border-slate-700"
              }`}
            >
              <Calendar className="w-5 h-5 shrink-0" />
              <span>Chronos Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition font-mono uppercase text-xs tracking-wider ${
                activeTab === "profile"
                  ? "bg-slate-700 text-blue-400 border border-blue-500/30 font-bold shadow-lg shadow-blue-500/5"
                  : "text-zinc-400 hover:bg-slate-700/50 hover:text-zinc-200 hover:border hover:border-slate-700"
              }`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span>User Profile</span>
            </button>
          </nav>

          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Chat Topics</span>
              <button
                onClick={handleCreateNewTopic}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-1 rounded transition"
                title="Create new topic"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
              {Object.keys(chatSessions).map((sessionId) => {
                const sessionMessages = chatSessions[sessionId];
                const topicName = `Topic #${Object.keys(chatSessions).indexOf(sessionId) + 1}`;
                const isActive = activeTopic === topicName;
                return (
                  <button
                    key={sessionId}
                    onClick={() => {
                      setActiveTopic(topicName);
                      setActiveSessionId(sessionId);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition text-xs font-mono ${
                      isActive
                        ? "bg-blue-600/20 border border-blue-500/30 text-blue-300"
                        : "text-zinc-400 hover:bg-slate-700/50 hover:text-zinc-200"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? "bg-blue-400" : "bg-slate-600"
                    }`} />
                    <span className="truncate flex-1">
                      {sessionMessages.length > 0
                        ? topicName
                        : "New Topic"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold text-sm">
              {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-white text-xs font-bold truncate leading-tight">{userProfile.displayName}</h4>
              <span className="text-[10px] font-mono text-slate-500 truncate block leading-none">{userProfile.email}</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/30 border border-red-900/30 text-red-400 hover:bg-red-900/30 hover:border-red-800 transition-all font-mono uppercase text-[10px] tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="px-5 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h3 className="font-mono font-bold text-sm tracking-widest text-white uppercase flex items-center gap-2">
              <span className="text-blue-400">✦</span>
              <span>{activeTab === "home" ? "Goals Deck" : activeTab === "ai" ? "AI Terminal" : activeTab === "calendar" ? "Chronos Calendar" : "User Profile"}</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider leading-none mt-1">
              {userProfile.email} {userProfile.aiTone ? `• ${userProfile.aiTone}` : ""}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="md:hidden p-2 rounded bg-slate-800 border border-slate-700 text-zinc-400 hover:text-red-400 hover:border-slate-600 transition"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {saveToast && (
          <div className="mx-5 mt-4 bg-gradient-to-r from-slate-800 to-slate-700 backdrop-blur-sm border border-blue-500/30 px-5 py-3 rounded-2xl text-xs text-blue-300 text-center shadow-lg shadow-blue-500/10 animate-pulse flex items-center justify-center gap-2 shrink-0 z-50">
            <span>✨</span>
            <span className="font-semibold">{saveToast}</span>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 relative bg-slate-900 overflow-hidden">

          {activeTab === "home" && (
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 custom-scrollbar">
              <div className="text-left">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                  {new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}
                </p>
                <h2 className="text-white text-2xl font-bold">
                  {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </h2>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-5 rounded-2xl border border-slate-700 shadow-lg shadow-slate-900/50">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400 uppercase mb-3">
                  <span>Today's Progress</span>
                  <span className="text-blue-400 font-bold">{completionRate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono mt-3 uppercase">
                  {completedTodayCount} of {todayTasks.length} objectives accomplished
                </p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {["All", "University", "Coding", "General"].map((cat) => {
                  const isSel = selectedFilterCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedFilterCategory(cat)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition shrink-0 ${
                        isSel
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                          : "border border-slate-700 text-zinc-400 bg-slate-800/50 hover:bg-slate-700 hover:border-slate-600"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 space-y-3 pb-16 overflow-y-auto max-h-[300px] custom-scrollbar">
                {filteredTasksList.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-700 rounded-2xl bg-slate-800/20 text-zinc-500">
                    <ListTodo className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                    <p className="font-mono text-xs uppercase tracking-wider mb-2">No tasks scheduled today</p>
                    <p className="text-xs text-slate-600">Click the + button to allocate goals</p>
                  </div>
                ) : (
                  filteredTasksList.map((t) => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:shadow-lg ${
                        t.isCompleted
                          ? "bg-slate-800/40 border-slate-700 text-zinc-500 opacity-60"
                          : "bg-gradient-to-br from-slate-800 to-slate-700 border-slate-700/50 text-white hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleTask(t.id)}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                            t.isCompleted
                              ? "bg-blue-600 border-blue-600"
                              : "border-slate-600 hover:border-blue-500 hover:bg-slate-700"
                          }`}
                        >
                          {t.isCompleted && <Check className="w-3 h-3 text-white stroke-[4]" />}
                        </button>
                        <div className="text-left min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${t.isCompleted ? "line-through text-zinc-600" : "text-white"}`}>
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-widest leading-none border ${
                              t.category === "Coding"
                                ? "bg-teal-950/20 border-teal-900/50 text-teal-400"
                                : t.category === "University"
                                  ? "bg-amber-950/20 border-amber-900/50 text-amber-400"
                                  : "bg-emerald-950/20 border-emerald-900/50 text-emerald-400"
                            }`}>
                              {t.category}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {t.dueTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setIsHomeAddOpen(true)}
                className="absolute bottom-6 right-6 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30 transition-all hover:scale-110 hover:shadow-2xl z-40"
                title="Add task for today"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
              </button>

              {isHomeAddOpen && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-800 border border-slate-600 w-full max-w-md rounded-2xl p-6 text-left shadow-2xl shadow-slate-900/80 relative overflow-hidden">
                    <button
                      onClick={() => setIsHomeAddOpen(false)}
                      className="absolute top-5 right-5 text-zinc-400 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <h4 className="text-xs font-bold font-mono text-blue-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                      <PlusCircle className="w-5 h-5" />
                      <span>Schedule Today's Goal</span>
                    </h4>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                          Goal/Task Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Code API endpoints"
                          value={homeTaskTitle}
                          onChange={(e) => setHomeTaskTitle(e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                          Category Workspace
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["University", "Coding", "General"] as const).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setHomeTaskCategory(cat)}
                              className={`py-2 text-xs font-bold font-mono uppercase rounded-lg border transition ${
                                homeTaskCategory === cat
                                  ? "bg-blue-600 text-white border-transparent shadow-lg shadow-blue-600/20"
                                  : "bg-slate-900/30 border-slate-700 text-zinc-400 hover:bg-slate-800 hover:border-slate-600"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                            Planned Hour
                          </label>
                          <select
                            value={homeTaskTime}
                            onChange={(e) => setHomeTaskTime(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition appearance-none"
                          >
                            {["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"].map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                            Target Date
                          </label>
                          <div className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-zinc-400 text-sm">
                            Today
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          handleAddNewTask(homeTaskTitle, homeTaskCategory, todayStr, homeTaskTime);
                          setHomeTaskTitle("");
                          setIsHomeAddOpen(false);
                        }}
                        className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 font-mono uppercase tracking-wider"
                      >
                        Create Today's Goal
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "ai" && (
            <div className="flex-1 flex flex-col min-h-0 p-5 md:p-8 space-y-4">
              {awaitingDeadlineTask && (
                <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/40 border border-amber-700/50 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-amber-300 animate-pulse shadow-lg shadow-amber-900/10">
                  <span className="font-mono">⏱️ Awaiting deadline details for: "{awaitingDeadlineTask}"</span>
                  <span className="text-[10px] bg-amber-900/60 px-2 py-0.5 rounded uppercase font-bold">Pending</span>
                </div>
              )}

              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Session: #{Object.keys(chatSessions).indexOf(activeSessionId) + 1}
                </span>
                <button
                  onClick={handleCreateNewTopic}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-mono text-blue-400 transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Topic / Clear Thread</span>
                </button>
              </div>

              <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-750 border border-slate-600 rounded-2xl p-4 flex flex-col overflow-hidden shadow-lg shadow-slate-900/50">
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border ${
                        m.isUser
                          ? "bg-gradient-to-br from-blue-600/20 to-blue-500/10 border-blue-500/30 self-end text-white"
                          : "bg-gradient-to-br from-slate-700/50 to-slate-600/50 border-slate-600 text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2.5">
                        <span className="font-semibold">{m.sender.toUpperCase()}</span>
                        <span className="text-slate-500">{m.timestamp}</span>
                      </div>
                      <div className="markdown-body text-left leading-relaxed text-zinc-100">
                        <ReactMarkdown
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-sm font-bold text-blue-400 mt-3 mb-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xs font-bold text-blue-400 mt-2.5 mb-1.5" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-xs font-bold text-blue-400 mt-2 mb-1" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2.5 last:mb-0 leading-relaxed text-sm text-zinc-200" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2.5 space-y-1 text-sm text-zinc-200" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2.5 space-y-1 text-sm text-zinc-200" {...props} />,
                            li: ({node, ...props}) => <li className="text-sm text-zinc-200" {...props} />,
                            code: ({node, inline, className, children, ...props}: any) => {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline ? (
                                <pre className="bg-slate-900 border border-slate-600 rounded-lg p-3 my-3 overflow-x-auto font-mono text-xs text-blue-300 shadow-inner">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className="bg-slate-900 px-1.5 py-0.5 rounded font-mono text-xs text-blue-300 border border-slate-700" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-blue-500/50 pl-3 italic text-zinc-400 my-3" {...props} />,
                            a: ({node, ...props}) => <a className="text-blue-400 hover:underline" target="_blank" rel="noreferrer" {...props} />
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}

                  {isGeneratingAI && (
                    <div className="flex items-center gap-3 text-blue-400 font-mono text-xs py-1.5 animate-pulse">
                      <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                      <span>COMPILING AI RESPONSE...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 shrink-0">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Quick Task Templates</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setChatInput("Prepare for my college math semester exam")}
                    className="bg-slate-800 hover:bg-slate-700 text-left p-3 rounded-xl border border-slate-700 hover:border-slate-600 text-xs font-mono truncate transition"
                  >
                    &gt; College math prep
                  </button>
                  <button
                    onClick={() => setChatInput("Build a python scraper for hackathon details")}
                    className="bg-slate-800 hover:bg-slate-700 text-left p-3 rounded-xl border border-slate-700 hover:border-slate-600 text-xs font-mono truncate transition"
                  >
                    &gt; Hackathon scraper
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendAIMessage} className="flex gap-3 pt-2 border-t border-slate-700">
                <input
                  type="text"
                  placeholder={awaitingDeadlineTask ? "Specify deadline (e.g. tomorrow at 5pm)..." : "Ask AI to solve any task..."}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-slate-800 text-white border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 focus:outline-none placeholder-slate-500 text-sm transition"
                />
                <button
                  type="submit"
                  disabled={isGeneratingAI}
                  className="bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition shadow-lg shadow-blue-600/20"
                >
                  <Terminal className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 custom-scrollbar">
              <div className="flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 rounded-xl border border-slate-700 shadow-sm select-none shrink-0">
                <span className="font-mono text-xs text-slate-500 uppercase">Month</span>
                <span className="text-white font-bold font-mono text-sm uppercase tracking-widest">
                  JUNE 2026
                </span>
                <span className="font-mono text-xs text-slate-500 uppercase">2026</span>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-750 p-4 rounded-2xl border border-slate-700 shadow-lg shadow-slate-900/50 shrink-0">
                <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-slate-500 font-bold mb-3 uppercase">
                  <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  <div className="h-8"></div>
                  {buildCalendarDays().map((d) => {
                    const dayTasks = tasks.filter((t) => t.dueDate === d.dateString);
                    const isSelected = selectedCalDate === d.dateString;

                    return (
                      <button
                        key={d.dayNumber}
                        onClick={() => setSelectedCalDate(d.dateString)}
                        className={`h-9 rounded-xl font-mono relative flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white font-bold scale-110 shadow-lg shadow-blue-600/30"
                            : d.isToday
                              ? "border border-blue-500 text-blue-400 font-bold bg-blue-500/10"
                              : "hover:bg-slate-700/50 hover:text-white text-zinc-400 hover:scale-105"
                        }`}
                      >
                        <span className="text-sm leading-none">{d.dayNumber}</span>
                        {dayTasks.length > 0 && (
                          <div className="flex gap-0.5 justify-center mt-1 absolute bottom-1.5 w-full">
                            {dayTasks.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSelected
                                    ? "bg-white"
                                    : t.category === "Coding"
                                      ? "bg-teal-400"
                                      : t.category === "University"
                                        ? "bg-amber-400"
                                        : "bg-emerald-400"
                                }`}
                              ></span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 bg-gradient-to-br from-slate-800/50 to-slate-750/50 border border-slate-700 rounded-2xl p-5 flex flex-col h-[220px] overflow-hidden shadow-lg shadow-slate-900/50">
                <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3 shrink-0">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-blue-400 font-bold">
                    Agenda • {new Date(selectedCalDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </h4>
                  <button
                    onClick={() => setIsTimelineAddOpen(true)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 font-mono text-xs flex items-center gap-2 font-bold uppercase px-2 py-1 rounded transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Manual Add</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"].map((hour) => {
                    const hourTasks = tasks.filter(
                      (t) => t.dueDate === selectedCalDate && t.dueTime === hour
                    );

                    return (
                      <div key={hour} className="flex gap-4 text-left group">
                        <span className="font-mono text-xs text-slate-500 w-16 pt-1.5 uppercase">
                          {hour}
                        </span>
                        <div className="flex-1">
                          {hourTasks.length === 0 ? (
                            <div className="border-t border-slate-700/50 pt-2 text-xs text-slate-600 italic">
                              No tasks scheduled
                            </div>
                          ) : (
                            hourTasks.map((t) => (
                              <div
                                key={t.id}
                                className={`px-3 py-2 rounded-lg border text-sm font-medium mb-2 flex items-center justify-between group-hover:shadow-md transition ${
                                  t.category === "Coding"
                                    ? "bg-teal-950/20 border-teal-900/50 text-teal-300"
                                    : t.category === "University"
                                      ? "bg-amber-950/20 border-amber-900/50 text-amber-300"
                                      : "bg-emerald-950/20 border-emerald-900/50 text-emerald-300"
                                }`}
                              >
                                <span className="truncate max-w-[140px]">{t.title}</span>
                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="text-zinc-600 hover:text-red-400 font-bold px-1.5 py-0.5 rounded hover:bg-red-500/10 transition"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isTimelineAddOpen && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-800 border border-slate-600 w-full max-w-md rounded-2xl p-6 text-left shadow-2xl shadow-slate-900/80 relative">
                    <button
                      onClick={() => setIsTimelineAddOpen(false)}
                      className="absolute top-5 right-5 text-zinc-400 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <h4 className="text-xs font-bold font-mono text-blue-400 uppercase tracking-widest mb-6">
                      Manual Calendar Allocator
                    </h4>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-zinc-400 uppercase block">
                          Goal Summary
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Solve physics problems"
                          value={timetableTaskName}
                          onChange={(e) => setTimetableTaskName(e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase block">
                            Hour Slot
                          </label>
                          <select
                            value={timetableTaskTime}
                            onChange={(e) => setTimetableTaskTime(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition appearance-none"
                          >
                            {["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"].map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase block">
                            Work Domain
                          </label>
                          <select
                            value={timetableTaskCategory}
                            onChange={(e) => setTimetableTaskCategory(e.target.value as any)}
                            className="w-full bg-slate-900/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition appearance-none"
                          >
                            <option value="Coding">Coding</option>
                            <option value="University">University</option>
                            <option value="General">General</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-zinc-400 uppercase block">
                          Selected Calendar Date
                        </label>
                        <div className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-zinc-400 text-sm font-mono">
                          {selectedCalDate}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          handleAddNewTask(timetableTaskName, timetableTaskCategory, selectedCalDate, timetableTaskTime);
                          setTimetableTaskName("");
                          setIsTimelineAddOpen(false);
                        }}
                        className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/20 font-mono uppercase tracking-wider"
                      >
                        Schedule Manual Task
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 custom-scrollbar">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <img
                    src={userProfile.avatar}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-3 border-blue-500 shadow-xl shadow-blue-500/20"
                  />
                  <span className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white text-[10px] border-3 border-slate-900 shadow-lg">
                    📸
                  </span>
                </div>

                <div className="flex gap-3">
                  {AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      onClick={() => setUserProfile({ ...userProfile, avatar: av })}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                        userProfile.avatar === av
                          ? "border-blue-500 scale-110 shadow-lg shadow-blue-500/25"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <img src={av} alt="Avatar choose" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4 text-left pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Profile Name
                    </label>
                    <input
                      type="text"
                      required
                      value={userProfile.displayName}
                      onChange={(e) => setUserProfile({ ...userProfile, displayName: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={userProfile.phone}
                      onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Custom Username
                    </label>
                    <input
                      type="text"
                      value={userProfile.username || ""}
                      onChange={(e) => setUserProfile({ ...userProfile, username: e.target.value })}
                      placeholder="Not set"
                      className="w-full bg-slate-800/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Registered Age
                    </label>
                    <input
                      type="number"
                      value={userProfile.age || ""}
                      onChange={(e) => setUserProfile({ ...userProfile, age: Number(e.target.value) || undefined })}
                      placeholder="Not set"
                      className="w-full bg-slate-800/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white focus:outline-none text-sm transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Google Accounts Mail
                  </label>
                  <input
                    type="email"
                    disabled
                    value={userProfile.email}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-zinc-500 focus:outline-none text-xs font-mono cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                    AI Voice / Response Tone
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Professional & Encouraging", "Concise & Technical", "Motivating Coach", "Friendly Peer"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setUserProfile({ ...userProfile, aiTone: t as any })}
                        className={`py-2 text-xs font-bold font-mono uppercase rounded-lg border transition truncate ${
                          userProfile.aiTone === t
                            ? "bg-blue-600 text-white border-transparent shadow-lg shadow-blue-600/20"
                            : "bg-slate-800/50 border-slate-600 text-zinc-400 hover:bg-slate-700 hover:border-slate-500"
                        }`}
                      >
                        {t.split(" ")[0]} {t.includes("&") ? "& " + t.split(" ")[2] : ""}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Special Instructions for AI
                  </label>
                  <textarea
                    rows={3}
                    value={userProfile.aiInstructions}
                    onChange={(e) => setUserProfile({ ...userProfile, aiInstructions: e.target.value })}
                    placeholder="e.g. Always write code with comments..."
                    className="w-full bg-slate-800/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white focus:outline-none text-sm font-mono resize-none transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/20 hover:shadow-xl font-mono uppercase tracking-wider"
                >
                  Update Profile Settings
                </button>
              </form>
            </div>
          )}

        </div>

        <div className="md:hidden bg-slate-800 border-t border-slate-700 px-3 py-3.5 flex justify-around items-center z-40 select-none shrink-0">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 transition-colors duration-150 ${
              activeTab === "home" ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span className="text-[10px] font-mono tracking-widest uppercase">Home</span>
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex flex-col items-center gap-1 transition-colors duration-150 ${
              activeTab === "ai" ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] font-mono tracking-widest uppercase">AI</span>
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex flex-col items-center gap-1 transition-colors duration-150 ${
              activeTab === "calendar" ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-mono tracking-widest uppercase">Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 transition-colors duration-150 ${
              activeTab === "profile" ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-mono tracking-widest uppercase">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}

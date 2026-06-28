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
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM AM/PM
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
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", // Student / Developer
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", // Professional
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", // Designer
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"  // Tech Lead
];

export default function App() {
  // Left Pane: Code & Workspace state
  const [activeFile, setActiveFile] = useState<string>("lib/main.dart");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>(DART_FILES);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editBuffer, setEditBuffer] = useState<string>("");
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // Right Pane: Simulated Phone & Authentication State
  const [currentTime, setCurrentTime] = useState<string>("10:00 AM");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("bhaiiikiishadiii@gmail.com");

  // Google Login State Machine
  const [loginStep, setLoginStep] = useState<"email" | "password" | "register" | "loading">("email");
  const [loginEmail, setLoginEmail] = useState<string>("bhaiiikiishadiii@gmail.com");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // New Registration Fields
  const [regUsername, setRegUsername] = useState<string>("");
  const [regAge, setRegAge] = useState<string>("");
  const [regEmail, setRegEmail] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");
  
  // Custom Bottom Navigation Tab
  const [activeTab, setActiveTab] = useState<"home" | "ai" | "calendar" | "profile">("home");

  // Profile Form state (synchronized to localStorage)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: "bhaiiikiishadiii",
    email: "bhaiiikiishadiii@gmail.com",
    phone: "+91 98765 43210",
    avatar: AVATARS[0],
    aiTone: "Professional & Encouraging",
    aiInstructions: "",
    age: 20,
    username: "bhaiiikiishadiii"
  });

  // State / Tasks List
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>("All");

  // AI Chat & Assistance State
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [awaitingDeadlineTask, setAwaitingDeadlineTask] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Calendar manual selection & timetable state
  const [selectedCalDate, setSelectedCalDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [timetableTaskName, setTimetableTaskName] = useState<string>("");
  const [timetableTaskCategory, setTimetableTaskCategory] = useState<"University" | "Coding" | "General">("Coding");
  const [timetableTaskTime, setTimetableTaskTime] = useState<string>("02:00 PM");
  const [isTimelineAddOpen, setIsTimelineAddOpen] = useState<boolean>(false);

  // Floating Home modal task creator
  const [isHomeAddOpen, setIsHomeAddOpen] = useState<boolean>(false);
  const [homeTaskTitle, setHomeTaskTitle] = useState<string>("");
  const [homeTaskCategory, setHomeTaskCategory] = useState<"University" | "Coding" | "General">("Coding");
  const [homeTaskTime, setHomeTaskTime] = useState<string>("02:00 PM");

  // Profile notifications
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Listen to Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const email = user.email || "bhaiiikiishadiii@gmail.com";
        setCurrentUserEmail(email);
        const storedToken = localStorage.getItem(`clutch_google_token_${email}`) || undefined;
        setUserProfile((prev) => ({
          ...prev,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          email: email,
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

  // Setup Google Identity Services for custom Client ID
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

  // Load and save user-specific data upon logging in
  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      // 1. Profile load
      const storedProfile = localStorage.getItem(`clutch_profile_${currentUserEmail}`);
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile));
      } else {
        const defaultProf: UserProfile = {
          displayName: currentUserEmail.split("@")[0],
          email: currentUserEmail,
          phone: "+91 98765 43210",
          avatar: AVATARS[0],
          aiTone: "Professional & Encouraging",
          aiInstructions: "",
          age: 20,
          username: currentUserEmail.split("@")[0]
        };
        setUserProfile(defaultProf);
        localStorage.setItem(`clutch_profile_${currentUserEmail}`, JSON.stringify(defaultProf));
      }

      // 2. Tasks load
      const storedTasks = localStorage.getItem(`clutch_tasks_${currentUserEmail}`);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        const defaultTasks: Task[] = [
          {
            id: "t1",
            title: "Study discrete mathematical models",
            category: "University",
            isCompleted: true,
            createdAt: new Date().toISOString(),
            dueDate: new Date().toISOString().split("T")[0],
            dueTime: "11:00 AM"
          },
          {
            id: "t2",
            title: "Optimize Flutter dart rendering layers",
            category: "Coding",
            isCompleted: false,
            createdAt: new Date().toISOString(),
            dueDate: new Date().toISOString().split("T")[0],
            dueTime: "02:00 PM"
          },
          {
            id: "t3",
            title: "Complete calendar REST synchronization blueprint",
            category: "General",
            isCompleted: false,
            createdAt: new Date().toISOString(),
            dueDate: new Date().toISOString().split("T")[0],
            dueTime: "05:00 PM"
          }
        ];
        setTasks(defaultTasks);
        localStorage.setItem(`clutch_tasks_${currentUserEmail}`, JSON.stringify(defaultTasks));
      }

      // 3. Chats load
      const storedChats = localStorage.getItem(`clutch_chats_${currentUserEmail}`);
      if (storedChats) {
        setChatMessages(JSON.parse(storedChats));
      } else {
        const defaultChats: ChatMessage[] = [
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
        setChatMessages(defaultChats);
        localStorage.setItem(`clutch_chats_${currentUserEmail}`, JSON.stringify(defaultChats));
      }
    }
  }, [isAuthenticated, currentUserEmail]);

  // Save tasks and profiles to persistent localStorage
  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      localStorage.setItem(`clutch_tasks_${currentUserEmail}`, JSON.stringify(tasks));
    }
  }, [tasks, isAuthenticated, currentUserEmail]);

  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      localStorage.setItem(`clutch_chats_${currentUserEmail}`, JSON.stringify(chatMessages));
    }
  }, [chatMessages, isAuthenticated, currentUserEmail]);

  useEffect(() => {
    if (isAuthenticated && currentUserEmail) {
      localStorage.setItem(`clutch_profile_${currentUserEmail}`, JSON.stringify(userProfile));
    }
  }, [userProfile, isAuthenticated, currentUserEmail]);

  // Dynamic Current Time Clock effect
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

  // Scroll chat window to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isGeneratingAI]);

  // Code Copier
  const handleCopyCode = () => {
    navigator.clipboard.writeText(fileContents[activeFile]);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  // Code Editor Actions
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

  // Sign In / Out actions
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
    const email = user.email || "bhaiiikiishadiii@gmail.com";
    
    // Try loading existing profile or make a new one
    const storedProfile = localStorage.getItem(`clutch_profile_${email}`);
    let profile: UserProfile;
    if (storedProfile) {
      profile = {
        ...JSON.parse(storedProfile),
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        email: email,
        avatar: user.photoURL || AVATARS[0],
        accessToken: token
      };
    } else {
      profile = {
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        email: email,
        phone: "+91 98765 43210",
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

    // Check if user exists in custom users database
    const userAccount = customUsers[emailKey];
    if (userAccount) {
      if (userAccount.password === loginPassword) {
        // Successful custom login!
        setLoginStep("loading");
        setTimeout(() => {
          setCurrentUserEmail(emailKey);
          // Load profile or create one
          const storedProfile = localStorage.getItem(`clutch_profile_${emailKey}`);
          if (storedProfile) {
            setUserProfile(JSON.parse(storedProfile));
          } else {
            const prof: UserProfile = {
              displayName: userAccount.username || emailKey.split("@")[0],
              email: emailKey,
              phone: "+91 98765 43210",
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
      // If no custom account is found, check if they entered the bypass hackathon account
      if (emailKey === "bhaiiikiishadiii@gmail.com" && loginPassword === "hackathon2026") {
        setLoginStep("loading");
        setTimeout(() => {
          setCurrentUserEmail(emailKey);
          setIsAuthenticated(true);
          setLoginStep("email");
          setLoginPassword("");
          setLoginError(null);
          setActiveTab("home");
        }, 1500);
      } else {
        setLoginError("No local Clutch AI account found for this email. Click 'Create account' to register or use real Google popup.");
      }
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
    // Save in custom users list
    const storedUsers = localStorage.getItem("clutch_custom_users");
    const customUsers = storedUsers ? JSON.parse(storedUsers) : {};
    
    customUsers[emailKey] = {
      username: regUsername.trim(),
      age: Number(regAge),
      password: regPassword
    };
    
    localStorage.setItem("clutch_custom_users", JSON.stringify(customUsers));

    // Save custom profile directly
    const customProfile: UserProfile = {
      displayName: regUsername.trim(),
      email: emailKey,
      phone: "+91 98765 43210",
      avatar: AVATARS[0],
      aiTone: "Professional & Encouraging",
      aiInstructions: "",
      age: Number(regAge),
      username: regUsername.trim()
    };
    localStorage.setItem(`clutch_profile_${emailKey}`, JSON.stringify(customProfile));

    // Sign them in
    setLoginStep("loading");
    setTimeout(() => {
      setCurrentUserEmail(emailKey);
      setUserProfile(customProfile);
      setIsAuthenticated(true);
      setLoginStep("email");
      // Reset registration form
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
    setLoginEmail("bhaiiikiishadiii@gmail.com");
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

  // Add simulated task
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

  // Chat conversation processor via server route with awaiting deadlines
  const handleSendAIMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userPrompt = chatInput.trim();
    if (!userPrompt || isGeneratingAI) return;

    setChatInput("");
    const userMsgId = Date.now().toString();
    const now = new Date();
    const timestamp = `${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;

    setChatMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: userProfile.displayName,
        content: userPrompt,
        timestamp,
        isUser: true
      }
    ]);

    setIsGeneratingAI(true);

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
          history: chatMessages
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsgId = (Date.now() + 1).toString();

        setChatMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            sender: "Clutch AI Agent",
            content: data.reply,
            timestamp,
            isUser: false
          }
        ]);

        // Check if we are finalizing a task creation
        if (data.suggestedTasks && data.suggestedTasks.length > 0) {
          data.suggestedTasks.forEach((sTask: any) => {
            const todayStr = new Date().toISOString().split("T")[0];
            handleAddNewTask(
              sTask.title,
              sTask.category || "General",
              sTask.dueDate || todayStr,
              "05:00 PM"
            );
          });
        }

        // Check if AI detected a task name but no deadline yet
        if (data.detectedTaskName && !data.clearAwaitingDeadline) {
          setAwaitingDeadlineTask(data.detectedTaskName);
        } else if (data.clearAwaitingDeadline) {
          setAwaitingDeadlineTask(null);
        }

      } else {
        throw new Error("Proxy offline.");
      }
    } catch (err) {
      console.error("AI Assistant network failed, using dynamic local simulation:", err);
      // Fallback dynamic scheduling simulation
      setTimeout(() => {
        const aiMsgId = (Date.now() + 1).toString();
        let replyText = "";

        if (awaitingDeadlineTask) {
          // User replied with deadline
          const todayStr = new Date().toISOString().split("T")[0];
          handleAddNewTask(awaitingDeadlineTask, "General", todayStr, "05:00 PM");
          
          replyText = `### 🗓️ Task scheduled successfully! \n\nI have locked **"${awaitingDeadlineTask}"** into your calendar for **${userPrompt}**.\n\n**Start Suggestion:**\nI recommend starting **3 hours prior** to ensure a perfect flow. Your instructions and **${userProfile.aiTone}** tone metrics have been compiled!`;
          setAwaitingDeadlineTask(null);
        } else {
          // normal task solution request
          const match = userPrompt.match(/(?:prepare for|study|do|write|create|build|make|plan|finish|complete)\s+([^.]+)/i);
          const taskName = match ? match[1].trim() : userPrompt.slice(0, 30);
          setAwaitingDeadlineTask(taskName);

          replyText = `### 💡 Solution Draft: ${taskName}\n\nHere is my professional approach to complete this task:\n1. **Prerequisites**: Review references and set milestones.\n2. **Execution**: Dedicate a single 90-minute block for completion.\n3. **Validation**: Audit outputs against specifications.\n\n**What is the deadline for this task?** Let me know so I can schedule it and find the best time to start!`;
          
          if (userProfile.aiTone === "Motivating Coach") {
            replyText = `🏆 **LETS WIN TODAY!** Here is your battle plan:\n\n${replyText}\n\n*Drop the deadline below! Let's get this done!*`;
          } else if (userProfile.aiTone === "Concise & Technical") {
            replyText = `**Plan for ${taskName}**:\n- Collect assets\n- Draft structure\n- Review\n\n*Deadline? (so I can schedule it on your calendar)*`;
          }
        }

        setChatMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            sender: "Clutch AI Simulator",
            content: replyText,
            timestamp,
            isUser: false
          }
        ]);
      }, 700);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Google Calendar Month Date Builders
  const buildCalendarDays = () => {
    // Return array of days in June 2026
    const days: { dayNumber: number; dateString: string; isToday: boolean }[] = [];
    const year = 2026;
    const month = 5; // June (0-indexed is May? No, 0=Jan, 5=June)
    
    for (let d = 1; d <= 30; d++) {
      const dateStr = `${year}-06-${d.toString().padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isToday: d === 27 // Set today as June 27
      });
    }
    return days;
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveToast("Profile updated successfully!");
    setTimeout(() => setSaveToast(null), 3000);
  };

  const highlightDartCode = (code: string) => {
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let escaped = escapeHtml(code);

    escaped = escaped.replace(
      /\b(import|class|extends|with|implements|required|final|static|const|factory|get|set|var|dynamic|void|Future|async|await|return|if|else|try|catch|finally|true|false|null|this|new|is|super)\b/g,
      '<span class="text-[#96AC9D] font-bold">$1</span>'
    );

    escaped = escaped.replace(/(@override)/g, '<span class="text-teal-400 font-medium">$1</span>');

    escaped = escaped.replace(
      /\b([A-Z][a-zA-Z0-9_]*)\b/g,
      '<span class="text-[#BDC7BF] font-semibold">$1</span>'
    );

    escaped = escaped.replace(/('.*?'|".*?")/g, '<span class="text-amber-100">$1</span>');
    escaped = escaped.replace(/(\/\/.*)/g, '<span class="text-zinc-500 italic">$1</span>');

    return escaped;
  };

  // Calculated statistics
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const activeTodayCount = todayTasks.filter((t) => !t.isCompleted).length;
  const completedTodayCount = todayTasks.filter((t) => t.isCompleted).length;
  const completionRate = todayTasks.length > 0 ? Math.round((completedTodayCount / todayTasks.length) * 100) : 0;

  // Filter lists based on Category chips
  const filteredTasksList = todayTasks.filter(
    (t) => selectedFilterCategory === "All" || t.category === selectedFilterCategory
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1110] text-[#BDC7BF] font-sans flex justify-center items-center antialiased p-4">
        <div className="w-full max-w-md bg-[#161A18] flex flex-col relative rounded-2xl shadow-2xl border border-[#96AC9D]/10 overflow-hidden text-xs py-8 px-6">
          <div className="flex-1 flex flex-col items-center justify-center bg-[#161A18] relative overflow-hidden">
            
            {/* Embedded styles for the Google linear loading bar animation */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes googleProgress {
                0% { left: -35%; width: 35%; }
                50% { left: 30%; width: 60%; }
                100% { left: 100%; width: 35%; }
              }
            `}} />

                  {/* Main Login Box */}
                  <div className="w-full max-w-[310px] bg-[#1b1c1e] border border-[#2d2f31] rounded-2xl p-5 shadow-2xl flex flex-col items-center relative transition-all duration-300">
                    
                    {/* Clutch AI Logo Header */}
                    <div className="flex flex-col items-center mb-4 select-none text-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#96AC9D] to-[#BDC7BF] flex items-center justify-center text-[#161A18] font-bold text-lg shadow-md mb-1.5">
                        C
                      </div>
                      <h2 className="text-white text-sm font-semibold tracking-wide">Login to Clutch AI</h2>
                      <p className="text-[9px] text-zinc-400">Synchronize workspace & dynamic objectives</p>
                    </div>

                    {/* Form handling step-by-step */}
                    {loginStep === "email" && (
                      <div className="w-full flex flex-col items-center">
                        {/* Official Google Identity Services Client ID Button */}
                        <div className="w-full flex justify-center mb-1.5 min-h-[40px] overflow-hidden rounded-lg">
                          <div id="gsi-button-container"></div>
                        </div>

                        {/* Direct Secure Google Popup Sign-In Button (Fallback/Alternative) */}
                        <button
                          type="button"
                          onClick={triggerRealGoogleLogin}
                          className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-lg text-[9px] font-mono tracking-wide transition shadow-sm mb-3.5 cursor-pointer"
                        >
                          <span>Can't see button? Trigger Sign In Popup</span>
                        </button>

                        <div className="flex items-center gap-2 w-full my-1.5 select-none">
                          <span className="h-px bg-[#2d2f31]/60 flex-1"></span>
                          <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">or manual credentials</span>
                          <span className="h-px bg-[#2d2f31]/60 flex-1"></span>
                        </div>

                        <form onSubmit={handleEmailNext} className="w-full flex flex-col items-center">
                          <div className="w-full text-left space-y-1.5 mt-2">
                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest block pl-1">
                              Clutch Email Address
                            </label>
                            <input
                              type="email"
                              required
                              value={loginEmail}
                              onChange={(e) => {
                                setLoginEmail(e.target.value);
                                setLoginError(null);
                              }}
                              placeholder="e.g. bhaiiikiishadiii@gmail.com"
                              className="w-full bg-[#1e1f20] border border-[#444746] focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] rounded-lg px-3.5 py-2.5 text-white focus:outline-none text-xs transition placeholder-zinc-600"
                            />
                          </div>

                          {loginError && (
                            <div className="text-red-400 text-[10px] flex items-start gap-1.5 text-left w-full mt-2.5 bg-red-950/20 p-2 rounded border border-red-900/20 font-mono">
                              <span className="shrink-0 mt-0.5">⚠️</span>
                              <span>{loginError}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center w-full pt-6 mt-4 border-t border-[#2d2f31]/50">
                            <button
                              type="button"
                              onClick={() => {
                                setLoginStep("register");
                                setLoginError(null);
                              }}
                              className="text-[#8ab4f8] font-bold text-xs hover:underline"
                            >
                              Create account
                            </button>
                            <button
                              type="submit"
                              className="bg-[#8ab4f8] hover:bg-[#8ab4f8]/90 text-[#131314] font-bold px-5 py-2 rounded-full text-xs transition shadow-md hover:shadow-lg"
                            >
                              Next
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {loginStep === "password" && (
                      <form onSubmit={handlePasswordNext} className="w-full flex flex-col items-center">
                        {/* Account Selector Chip */}
                        <button
                          type="button"
                          onClick={() => {
                            setLoginStep("email");
                            setLoginPassword("");
                            setLoginError(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-[#1e1f20] border border-[#444746] rounded-full text-[10px] text-[#e3e3e3] hover:bg-[#2a2b2c] transition mt-2 mb-4 max-w-[220px]"
                          title="Switch account"
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-zinc-600 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                            {loginEmail ? loginEmail.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="truncate max-w-[140px] font-mono text-[9px]">{loginEmail}</span>
                          <span className="text-[8px] text-[#c4c7c5] pl-0.5">▼</span>
                        </button>

                        <div className="w-full text-left space-y-1.5">
                          <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest block pl-1">
                            Enter Clutch Password
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              setLoginError(null);
                            }}
                            placeholder="Password"
                            className="w-full bg-[#1e1f20] border border-[#444746] focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] rounded-lg px-3.5 py-2.5 text-white focus:outline-none text-xs transition"
                          />
                        </div>

                        {/* Show password checkbox */}
                        <div className="flex items-center gap-2 mt-2.5 text-left w-full pl-1 select-none">
                          <input
                            type="checkbox"
                            id="showPass"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                            className="rounded border-[#747775] bg-[#1e1f20] text-[#8ab4f8] focus:ring-[#8ab4f8] w-3.5 h-3.5 accent-[#8ab4f8] cursor-pointer"
                          />
                          <label htmlFor="showPass" className="text-zinc-300 text-[10px] font-medium cursor-pointer">
                            Show password
                          </label>
                        </div>

                        {loginError && (
                          <div className="text-red-400 text-[10px] flex items-start gap-1.5 text-left w-full mt-3 bg-red-950/20 p-2 rounded border border-red-900/20 font-mono">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{loginError}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center w-full pt-6 mt-6 border-t border-[#2d2f31]/50">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginStep("email");
                              setLoginPassword("");
                              setLoginError(null);
                            }}
                            className="text-[#8ab4f8] font-bold text-xs hover:underline text-left"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            className="bg-[#8ab4f8] hover:bg-[#8ab4f8]/90 text-[#131314] font-bold px-5 py-2 rounded-full text-xs transition shadow-md"
                          >
                            Login
                          </button>
                        </div>
                      </form>
                    )}

                    {loginStep === "register" && (
                      <form onSubmit={handleRegisterSubmit} className="w-full flex flex-col items-center">
                        <h3 className="text-white text-xs font-semibold tracking-wide mt-1">Create Custom Account</h3>
                        <p className="text-[9px] text-zinc-400 mt-1 mb-4">
                          Enter your credentials to register on Clutch AI
                        </p>

                        <div className="w-full text-left space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider block pl-1">
                              Choose Username
                            </label>
                            <input
                              type="text"
                              required
                              value={regUsername}
                              onChange={(e) => {
                                setRegUsername(e.target.value);
                                setLoginError(null);
                              }}
                              placeholder="e.g. clutch_dev"
                              className="w-full bg-[#1e1f20] border border-[#444746] focus:border-[#8ab4f8] rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-[11px] transition placeholder-zinc-700"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider block pl-1">
                              Your Age
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
                              placeholder="e.g. 21"
                              className="w-full bg-[#1e1f20] border border-[#444746] focus:border-[#8ab4f8] rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-[11px] transition placeholder-zinc-700"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider block pl-1">
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
                              placeholder="email@example.com"
                              className="w-full bg-[#1e1f20] border border-[#444746] focus:border-[#8ab4f8] rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-[11px] transition placeholder-zinc-700"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider block pl-1">
                              Choose Password
                            </label>
                            <input
                              type="password"
                              required
                              value={regPassword}
                              onChange={(e) => {
                                setRegPassword(e.target.value);
                                setLoginError(null);
                              }}
                              placeholder="Min 6 characters"
                              className="w-full bg-[#1e1f20] border border-[#444746] focus:border-[#8ab4f8] rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-[11px] transition placeholder-zinc-700"
                            />
                          </div>
                        </div>

                        {loginError && (
                          <div className="text-red-400 text-[9px] flex items-start gap-1.5 text-left w-full mt-2.5 bg-red-950/20 p-1.5 rounded border border-red-900/20 font-mono">
                            <span className="shrink-0">⚠️</span>
                            <span>{loginError}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center w-full pt-4 mt-3 border-t border-[#2d2f31]/50">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginStep("email");
                              setLoginError(null);
                            }}
                            className="text-[#8ab4f8] font-bold text-xs hover:underline"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            className="bg-[#8ab4f8] hover:bg-[#8ab4f8]/90 text-[#131314] font-bold px-4 py-1.5 rounded-full text-xs transition shadow-md"
                          >
                            Register
                          </button>
                        </div>
                      </form>
                    )}

                    {loginStep === "loading" && (
                      <div className="w-full flex flex-col items-center py-6 text-center">
                        <h3 className="text-white text-sm font-semibold mb-2">Authenticating credentials...</h3>
                        <p className="text-[10px] text-zinc-500 font-mono mb-6 uppercase tracking-wider">
                          Establishing secure REST session
                        </p>

                        {/* Indeterminate linear loading bar */}
                        <div className="w-full max-w-[210px] h-1 bg-[#2a2b2c] rounded-full overflow-hidden relative">
                          <div 
                            className="h-full bg-[#8ab4f8] rounded-full absolute left-0 top-0"
                            style={{
                              animation: "googleProgress 1.5s infinite ease-in-out"
                            }}
                          ></div>
                        </div>

                        <p className="text-[9px] text-[#96AC9D] font-mono mt-5 uppercase tracking-widest animate-pulse">
                          Synchronizing calendars & tasks
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Hackathon Preset quick bypass */}
                  <div className="mt-8 pt-4 border-t border-[#96AC9D]/10 w-full max-w-[310px] text-center">
                    <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
                      HACKATHON QUICK SIGN-IN
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail("bhaiiikiishadiii@gmail.com");
                        setLoginPassword("hackathon2026");
                        setLoginStep("password");
                        setLoginError(null);
                      }}
                      className="text-[11px] text-[#96AC9D] hover:underline font-mono"
                    >
                      &gt; Autofill: bhaiiikiishadiii@gmail.com
                    </button>
                  </div>

          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render full screen portal with beautiful sidebar!
  return (
    <div className="min-h-screen bg-[#161A18] text-[#BDC7BF] font-sans flex antialiased w-full text-xs overflow-hidden h-screen">
      {/* LEFT SIDEBAR (visible only on md: and up) */}
      <div className="hidden md:flex flex-col w-64 bg-[#222925] border-r border-[#96AC9D]/10 p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2.5 px-1 pt-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#96AC9D] to-[#BDC7BF] flex items-center justify-center text-[#161A18] font-bold text-sm shadow-md">
              C
            </div>
            <div>
              <h2 className="text-white font-bold tracking-widest text-[12px] uppercase">Clutch AI</h2>
              <span className="text-[7px] font-mono text-[#96AC9D] uppercase tracking-widest">Workspace</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5 pt-4">
            <button
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-mono uppercase text-[10px] tracking-wider ${
                activeTab === "home" ? "bg-[#161A18] text-[#96AC9D] border border-[#96AC9D]/10 font-bold" : "text-zinc-400 hover:bg-[#161A18]/50 hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Home / Goals</span>
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-mono uppercase text-[10px] tracking-wider ${
                activeTab === "ai" ? "bg-[#161A18] text-[#96AC9D] border border-[#96AC9D]/10 font-bold" : "text-zinc-400 hover:bg-[#161A18]/50 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>AI assistance</span>
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-mono uppercase text-[10px] tracking-wider ${
                activeTab === "calendar" ? "bg-[#161A18] text-[#96AC9D] border border-[#96AC9D]/10 font-bold" : "text-zinc-400 hover:bg-[#161A18]/50 hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-mono uppercase text-[10px] tracking-wider ${
                activeTab === "profile" ? "bg-[#161A18] text-[#96AC9D] border border-[#96AC9D]/10 font-bold" : "text-zinc-400 hover:bg-[#161A18]/50 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>User Profile</span>
            </button>
          </nav>
        </div>

        {/* Bottom User Section */}
        <div className="bg-[#161A18]/50 rounded-xl border border-[#96AC9D]/5 p-3.5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#96AC9D]/20 border border-[#96AC9D]/30 flex items-center justify-center text-[#96AC9D] font-bold text-xs">
              {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-white text-[10px] font-bold truncate leading-tight">{userProfile.displayName}</h4>
              <span className="text-[7px] font-mono text-zinc-500 truncate block leading-none">{userProfile.email}</span>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-red-950/20 border border-red-900/20 text-red-400 hover:bg-red-900/20 transition-all font-mono uppercase text-[9px] tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Common Simulated Header */}
        <div className="px-5 py-4 bg-[#222925] border-b border-[#96AC9D]/10 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h3 className="font-mono font-black text-[12px] tracking-widest text-white uppercase flex items-center gap-2">
              <span>✦</span>
              <span>{activeTab === "home" ? "Goals Deck" : activeTab === "ai" ? "AI Terminal" : activeTab === "calendar" ? "Chronos Calendar" : "User Profile"}</span>
            </h3>
            <span className="text-[8px] font-mono text-[#96AC9D] block uppercase tracking-wider leading-none mt-1">
              {userProfile.email} {userProfile.aiTone ? `• ${userProfile.aiTone}` : ""}
            </span>
          </div>
          
          {/* Mobile logout */}
          <button
            onClick={handleSignOut}
            className="md:hidden p-1.5 rounded bg-[#161A18] border border-zinc-800 text-zinc-400 hover:text-red-400"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Global Success Notification Toast */}
        {saveToast && (
          <div className="mx-5 mt-3 bg-[#222925]/95 backdrop-blur-sm border border-[#96AC9D]/30 px-4 py-2.5 rounded-xl text-[10px] text-[#96AC9D] text-center shadow-lg font-mono animate-pulse flex items-center justify-center gap-1.5 shrink-0 z-50">
            <span>✨</span>
            <span>{saveToast}</span>
          </div>
        )}

        {/* Screen Content Wrapper */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-[#161A18]">
                    
                    {/* Screen Tab 1: HOME SCREEN */}
                    {activeTab === "home" && (
                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                        
                        {/* Date and Completion Rate */}
                        <div className="text-left">
                          <p className="text-[10px] font-mono text-[#96AC9D] uppercase tracking-widest font-bold">
                            {new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}
                          </p>
                          <h2 className="text-white text-lg font-bold">
                            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </h2>
                        </div>

                        {/* Efficiency Gauge */}
                        <div className="bg-[#222925] p-3.5 rounded-2xl border border-[#96AC9D]/10 shadow-md">
                          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 uppercase mb-1.5">
                            <span>Today's Progress</span>
                            <span className="text-[#96AC9D] font-black">{completionRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#161A18] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#96AC9D] transition-all duration-500 ease-out"
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                          <p className="text-[9px] text-zinc-500 font-mono mt-2 uppercase">
                            {completedTodayCount} of {todayTasks.length} objectives accomplished
                          </p>
                        </div>

                        {/* Filter Chips */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {["All", "University", "Coding", "General"].map((cat) => {
                            const isSel = selectedFilterCategory === cat;
                            return (
                              <button
                                key={cat}
                                onClick={() => setSelectedFilterCategory(cat)}
                                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition shrink-0 ${
                                  isSel
                                    ? "bg-[#96AC9D] text-[#161A18]"
                                    : "border border-[#96AC9D]/20 text-zinc-400 bg-[#222925] hover:bg-[#96AC9D]/5"
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>

                        {/* Task List Container */}
                        <div className="flex-1 space-y-2 pb-12 overflow-y-auto max-h-[220px]">
                          {filteredTasksList.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-[#96AC9D]/10 rounded-2xl bg-[#222925]/20 text-zinc-500">
                              <ListTodo className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                              <p className="font-mono text-[9px] uppercase tracking-wider">No tasks scheduled today</p>
                              <p className="text-[9px] text-zinc-600 mt-0.5">Click the + button to allocate goals</p>
                            </div>
                          ) : (
                            filteredTasksList.map((t) => (
                              <div
                                key={t.id}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                                  t.isCompleted
                                    ? "bg-[#222925]/30 border-[#96AC9D]/10 text-zinc-500 opacity-60"
                                    : "bg-[#222925] border-transparent text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    onClick={() => handleToggleTask(t.id)}
                                    className={`w-4.5 h-4.5 rounded-lg border-2 flex items-center justify-center transition ${
                                      t.isCompleted
                                        ? "bg-[#96AC9D] border-[#96AC9D]"
                                        : "border-[#96AC9D]/30 hover:border-[#96AC9D]"
                                    }`}
                                  >
                                    {t.isCompleted && <Check className="w-3.5 h-3.5 text-[#161A18] stroke-[3]" />}
                                  </button>
                                  <div className="text-left min-w-0">
                                    <p className={`text-xs font-semibold truncate ${t.isCompleted ? "line-through text-zinc-600" : "text-white"}`}>
                                      {t.title}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[8px] bg-[#161A18] border border-[#96AC9D]/10 text-[#96AC9D] px-1 rounded font-mono uppercase tracking-widest leading-none">
                                        {t.category}
                                      </span>
                                      <span className="text-[8px] font-mono text-zinc-500">
                                        ⏱️ {t.dueTime}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="text-zinc-600 hover:text-red-400 p-1.5 rounded transition shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Floating Action Button (FAB) */}
                        <button
                          onClick={() => setIsHomeAddOpen(true)}
                          className="absolute bottom-4 right-4 bg-[#96AC9D] hover:bg-[#96AC9D]/90 text-[#161A18] w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-40"
                          title="Add task for today"
                        >
                          <Plus className="w-5.5 h-5.5 stroke-[3]" />
                        </button>

                        {/* Add Task Modal overlay in the phone */}
                        {isHomeAddOpen && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                            <div className="bg-[#222925] border border-[#96AC9D]/20 w-full rounded-2xl p-4 text-left shadow-2xl relative">
                              <button
                                onClick={() => setIsHomeAddOpen(false)}
                                className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>

                              <h4 className="text-xs font-bold font-mono text-[#96AC9D] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <PlusCircle className="w-4 h-4" />
                                <span>Schedule Today's Goal</span>
                              </h4>

                              <div className="space-y-3.5">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                                    Goal/Task Title
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., Code API endpoints"
                                    value={homeTaskTitle}
                                    onChange={(e) => setHomeTaskTitle(e.target.value)}
                                    className="w-full bg-[#161A18] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-3 py-1.5 text-white focus:outline-none text-xs"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                                    Category Workspace
                                  </label>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {(["University", "Coding", "General"] as const).map((cat) => (
                                      <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setHomeTaskCategory(cat)}
                                        className={`py-1 text-[9px] font-bold font-mono uppercase rounded-md border transition ${
                                          homeTaskCategory === cat
                                            ? "bg-[#96AC9D] text-[#161A18] border-transparent"
                                            : "bg-[#161A18] border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                                        }`}
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                                      Planned Hour
                                    </label>
                                    <select
                                      value={homeTaskTime}
                                      onChange={(e) => setHomeTaskTime(e.target.value)}
                                      className="w-full bg-[#161A18] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-2 py-1.5 text-white text-xs"
                                    >
                                      {["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"].map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                                      Target Date
                                    </label>
                                    <div className="w-full bg-[#161A18] border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-400 text-xs">
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
                                  className="w-full bg-[#96AC9D] text-[#161A18] font-bold py-2 rounded-lg text-xs hover:bg-[#96AC9D]/90 transition font-mono uppercase tracking-wider mt-1.5"
                                >
                                  Create Today's Goal
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                    {/* Screen Tab 2: AI ASSISTANCE */}
                    {activeTab === "ai" && (
                      <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6 space-y-3">
                        
                        {/* Dynamic status of awaiting deadline */}
                        {awaitingDeadlineTask && (
                          <div className="bg-amber-950/40 border border-amber-900/40 px-3 py-1.5 rounded-lg flex items-center justify-between text-[10px] text-amber-200 animate-pulse">
                            <span className="font-mono">⏱️ Awaiting deadline details for: "{awaitingDeadlineTask}"</span>
                            <span className="text-[8px] bg-amber-900/50 px-1 rounded uppercase">Pending</span>
                          </div>
                        )}

                        {/* Chat Messages */}
                        <div className="flex-1 bg-[#161A18]/50 border border-[#96AC9D]/10 rounded-xl p-3 flex flex-col overflow-hidden min-h-[300px]">
                          <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-[11px] leading-relaxed">
                            {chatMessages.map((m) => (
                              <div
                                key={m.id}
                                className={`p-2.5 rounded-xl border ${
                                  m.isUser
                                    ? "bg-[#222925] border-transparent self-end text-white"
                                    : "bg-[#222925] border-[#96AC9D]/10 text-white"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[8px] font-mono text-[#96AC9D] mb-1">
                                  <span>{m.sender.toUpperCase()}</span>
                                  <span>{m.timestamp}</span>
                                </div>
                                <div className="markdown-body text-left leading-relaxed text-zinc-100">
                                  <ReactMarkdown
                                    components={{
                                      h1: ({node, ...props}) => <h1 className="text-xs font-bold text-[#96AC9D] mt-2 mb-1" {...props} />,
                                      h2: ({node, ...props}) => <h2 className="text-[11px] font-bold text-[#96AC9D] mt-2 mb-1" {...props} />,
                                      h3: ({node, ...props}) => <h3 className="text-[10px] font-bold text-[#96AC9D] mt-1.5 mb-1" {...props} />,
                                      p: ({node, ...props}) => <p className="mb-1.5 last:mb-0 leading-relaxed text-[11px] text-[#BDC7BF]" {...props} />,
                                      ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5 text-[11px] text-[#BDC7BF]" {...props} />,
                                      ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5 text-[11px] text-[#BDC7BF]" {...props} />,
                                      li: ({node, ...props}) => <li className="text-[11px] text-[#BDC7BF]" {...props} />,
                                      code: ({node, inline, className, children, ...props}: any) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline ? (
                                          <pre className="bg-[#161A18] border border-[#96AC9D]/10 rounded-lg p-2.5 my-2 overflow-x-auto font-mono text-[10px] text-[#96AC9D]">
                                            <code className={className} {...props}>
                                              {children}
                                            </code>
                                          </pre>
                                        ) : (
                                          <code className="bg-[#161A18] px-1 py-0.5 rounded font-mono text-[10px] text-[#96AC9D]" {...props}>
                                            {children}
                                          </code>
                                        );
                                      },
                                      blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-[#96AC9D]/30 pl-3 italic text-zinc-400 my-2" {...props} />,
                                      a: ({node, ...props}) => <a className="text-[#96AC9D] hover:underline" target="_blank" rel="noreferrer" {...props} />
                                    }}
                                  >
                                    {m.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ))}

                            {isGeneratingAI && (
                              <div className="flex items-center gap-2 text-[#96AC9D] font-mono text-[9px] py-1">
                                <span className="w-3 h-3 border-2 border-[#96AC9D] border-t-transparent rounded-full animate-spin"></span>
                                <span>COMPILING AI RESPONSE...</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pre-filled Quick Task prompts to seed conversation */}
                        <div className="space-y-1 shrink-0">
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Quick Hackathon Tasks</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => {
                                setChatInput("Prepare for my college math semester exam");
                              }}
                              className="bg-[#222925] hover:bg-[#222925]/80 text-left p-1.5 rounded-lg border border-[#96AC9D]/10 text-[9px] font-mono truncate"
                            >
                              &gt; College math prep
                            </button>
                            <button
                              onClick={() => {
                                setChatInput("Build a python scraper for hackathon details");
                              }}
                              className="bg-[#222925] hover:bg-[#222925]/80 text-left p-1.5 rounded-lg border border-[#96AC9D]/10 text-[9px] font-mono truncate"
                            >
                              &gt; Hackathon scraper
                            </button>
                          </div>
                        </div>

                        {/* Chat input form */}
                        <form onSubmit={handleSendAIMessage} className="flex gap-2 pt-1 border-t border-zinc-800">
                          <input
                            type="text"
                            placeholder={awaitingDeadlineTask ? "Specify deadline (e.g. tomorrow at 5pm)..." : "Ask AI to solve any task..."}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            className="flex-1 bg-[#222925] text-white border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-3 py-1.5 focus:outline-none placeholder-zinc-500 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={isGeneratingAI}
                            className="bg-[#96AC9D] hover:bg-[#96AC9D]/80 disabled:opacity-50 text-[#161A18] p-1.5 rounded-lg transition"
                          >
                            <Terminal className="w-4 h-4" />
                          </button>
                        </form>

                      </div>
                    )}

                    {/* Screen Tab 3: CALENDAR SCREEN */}
                    {activeTab === "calendar" && (
                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                        
                        {/* Month display */}
                        <div className="flex justify-between items-center bg-[#222925] px-3 py-1.5 rounded-xl border border-[#96AC9D]/5 select-none shrink-0">
                          <span className="font-mono text-[10px] text-zinc-500">MONTH</span>
                          <span className="text-white font-bold font-mono text-[11px] uppercase tracking-widest">
                            JUNE 2026
                          </span>
                          <span className="font-mono text-[10px] text-zinc-500">2026</span>
                        </div>

                        {/* Month Grid */}
                        <div className="bg-[#222925] p-2.5 rounded-xl border border-[#96AC9D]/10 shadow-sm shrink-0">
                          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[8px] text-zinc-500 font-bold mb-1.5 uppercase">
                            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                          </div>
                          
                          {/* Grid numbers */}
                          <div className="grid grid-cols-7 gap-1">
                            {/* Empty pads for June 2026 starting on Monday (offset 1) */}
                            <div className="h-6"></div> 
                            {buildCalendarDays().map((d) => {
                              // Find tasks for this day
                              const dayTasks = tasks.filter((t) => t.dueDate === d.dateString);
                              const isSelected = selectedCalDate === d.dateString;
                              
                              return (
                                <button
                                  key={d.dayNumber}
                                  onClick={() => setSelectedCalDate(d.dateString)}
                                  className={`h-6 rounded-lg font-mono relative flex flex-col items-center justify-center transition-all ${
                                    isSelected
                                      ? "bg-[#96AC9D] text-[#161A18] font-black scale-105"
                                      : d.isToday
                                        ? "border border-[#96AC9D] text-[#96AC9D] font-bold bg-[#96AC9D]/5"
                                        : "hover:bg-zinc-800 text-zinc-300"
                                  }`}
                                >
                                  <span className="text-[10px] leading-none">{d.dayNumber}</span>
                                  {/* Task dot markers */}
                                  {dayTasks.length > 0 && (
                                    <div className="flex gap-0.5 justify-center mt-0.5 absolute bottom-0.5 w-full">
                                      {dayTasks.slice(0, 3).map((t, idx) => (
                                        <span
                                          key={idx}
                                          className={`w-1 h-1 rounded-full ${
                                            isSelected 
                                              ? "bg-[#161A18]" 
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

                        {/* Selected day timeline and manual task allocation */}
                        <div className="flex-1 bg-[#222925]/30 border border-[#96AC9D]/5 rounded-xl p-3 flex flex-col h-[180px] overflow-hidden">
                          <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-2 shrink-0">
                            <h4 className="font-mono text-[9px] uppercase tracking-wider text-[#96AC9D]">
                              Agenda • {new Date(selectedCalDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </h4>
                            <button
                              onClick={() => setIsTimelineAddOpen(true)}
                              className="text-[#96AC9D] hover:underline font-mono text-[9px] flex items-center gap-1 font-bold uppercase"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Manual Add</span>
                            </button>
                          </div>

                          {/* Hourly listing */}
                          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[120px]">
                            {["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"].map((hour) => {
                              const hourTasks = tasks.filter(
                                (t) => t.dueDate === selectedCalDate && t.dueTime === hour
                              );
                              
                              return (
                                <div key={hour} className="flex gap-3 text-left">
                                  <span className="font-mono text-[8px] text-zinc-500 w-12 pt-1 uppercase">
                                    {hour}
                                  </span>
                                  <div className="flex-1">
                                    {hourTasks.length === 0 ? (
                                      <div className="border-t border-zinc-800/60 pt-1 text-[9px] text-zinc-600 italic">
                                        No tasks scheduled
                                      </div>
                                    ) : (
                                      hourTasks.map((t) => (
                                        <div
                                          key={t.id}
                                          className={`px-2 py-1 rounded-lg border text-[10px] font-medium mb-1 flex items-center justify-between ${
                                            t.category === "Coding"
                                              ? "bg-teal-950/20 border-teal-900/50 text-teal-300"
                                              : t.category === "University"
                                                ? "bg-amber-950/20 border-amber-900/50 text-amber-300"
                                                : "bg-emerald-950/20 border-emerald-900/50 text-emerald-300"
                                          }`}
                                        >
                                          <span className="truncate max-w-[120px]">{t.title}</span>
                                          <button
                                            onClick={() => handleDeleteTask(t.id)}
                                            className="text-zinc-600 hover:text-red-400 font-bold"
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

                        {/* Calendar Manual Scheduler Modal overlay in phone */}
                        {isTimelineAddOpen && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                            <div className="bg-[#222925] border border-[#96AC9D]/20 w-full rounded-2xl p-4 text-left shadow-2xl relative">
                              <button
                                onClick={() => setIsTimelineAddOpen(false)}
                                className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>

                              <h4 className="text-xs font-bold font-mono text-[#96AC9D] uppercase tracking-widest mb-3">
                                Manual Calendar Allocator
                              </h4>

                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-mono text-zinc-500 uppercase block">
                                    Goal Summary
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Solve physics problems"
                                    value={timetableTaskName}
                                    onChange={(e) => setTimetableTaskName(e.target.value)}
                                    className="w-full bg-[#161A18] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-3 py-1.5 text-white focus:outline-none text-xs"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono text-zinc-500 uppercase block">
                                      Hour Slot
                                    </label>
                                    <select
                                      value={timetableTaskTime}
                                      onChange={(e) => setTimetableTaskTime(e.target.value)}
                                      className="w-full bg-[#161A18] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-2 py-1.5 text-white text-xs"
                                    >
                                      {["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"].map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono text-zinc-500 uppercase block">
                                      Work Domain
                                    </label>
                                    <select
                                      value={timetableTaskCategory}
                                      onChange={(e) => setTimetableTaskCategory(e.target.value as any)}
                                      className="w-full bg-[#161A18] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-2 py-1.5 text-white text-xs animate-none"
                                    >
                                      <option value="Coding">Coding</option>
                                      <option value="University">University</option>
                                      <option value="General">General</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-mono text-zinc-500 uppercase block">
                                    Selected Calendar Date
                                  </label>
                                  <div className="w-full bg-[#161A18] border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-400 text-xs">
                                    {selectedCalDate}
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    handleAddNewTask(timetableTaskName, timetableTaskCategory, selectedCalDate, timetableTaskTime);
                                    setTimetableTaskName("");
                                    setIsTimelineAddOpen(false);
                                  }}
                                  className="w-full bg-[#96AC9D] text-[#161A18] font-bold py-2 rounded-lg text-xs hover:bg-[#96AC9D]/90 transition uppercase font-mono tracking-wider mt-1.5"
                                >
                                  Schedule Manual Task
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                    {/* Screen Tab 4: PROFILE SCREEN */}
                    {activeTab === "profile" && (
                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                        
                        {/* Save profile success notification */}
                        {saveToast && (
                          <div className="bg-emerald-950/40 border border-emerald-900/40 px-3 py-1.5 rounded-lg text-[10px] text-emerald-300 text-center animate-pulse">
                            {saveToast}
                          </div>
                        )}

                        {/* Editable Avatars selection */}
                        <div className="flex flex-col items-center space-y-2">
                          <div className="relative group">
                            <img
                              src={userProfile.avatar}
                              alt="Avatar"
                              className="w-16 h-16 rounded-full object-cover border-2 border-[#96AC9D]"
                            />
                            <span className="absolute bottom-0 right-0 bg-[#96AC9D] p-1 rounded-full text-[#161A18] text-[9px]">
                              📸
                            </span>
                          </div>
                          
                          <div className="flex gap-1.5">
                            {AVATARS.map((av, idx) => (
                              <button
                                key={idx}
                                onClick={() => setUserProfile({ ...userProfile, avatar: av })}
                                className={`w-6 h-6 rounded-full overflow-hidden border ${
                                  userProfile.avatar === av ? "border-[#96AC9D] scale-110" : "border-zinc-800"
                                }`}
                              >
                                <img src={av} alt="Avatar choose" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Profile Data form */}
                        <form onSubmit={handleProfileSave} className="space-y-3.5 text-left pb-6">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                                Profile Name
                              </label>
                              <input
                                type="text"
                                required
                                value={userProfile.displayName}
                                onChange={(e) => setUserProfile({ ...userProfile, displayName: e.target.value })}
                                className="w-full bg-[#222925] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                                Contact Phone
                              </label>
                              <input
                                type="text"
                                required
                                value={userProfile.phone}
                                onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                                className="w-full bg-[#222925] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 animate-none">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                                Custom Username
                              </label>
                              <input
                                type="text"
                                value={userProfile.username || ""}
                                onChange={(e) => setUserProfile({ ...userProfile, username: e.target.value })}
                                placeholder="Not set"
                                className="w-full bg-[#222925] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                                Registered Age
                              </label>
                              <input
                                type="number"
                                value={userProfile.age || ""}
                                onChange={(e) => setUserProfile({ ...userProfile, age: Number(e.target.value) || undefined })}
                                placeholder="Not set"
                                className="w-full bg-[#222925] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                              Google Accounts Mail
                            </label>
                            <input
                              type="email"
                              disabled
                              value={userProfile.email}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-500 focus:outline-none text-xs font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                              AI Voice / Response Tone
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {["Professional & Encouraging", "Concise & Technical", "Motivating Coach", "Friendly Peer"].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setUserProfile({ ...userProfile, aiTone: t as any })}
                                  className={`py-1 text-[8px] font-bold font-mono uppercase rounded border transition truncate ${
                                    userProfile.aiTone === t
                                      ? "bg-[#96AC9D] text-[#161A18] border-transparent"
                                      : "bg-[#222925] border-zinc-800 text-zinc-400"
                                  }`}
                                >
                                  {t.split(" ")[0]} {t.includes("&") ? "& " + t.split(" ")[2] : ""}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                              Special Instructions for AI
                            </label>
                            <textarea
                              rows={2}
                              value={userProfile.aiInstructions}
                              onChange={(e) => setUserProfile({ ...userProfile, aiInstructions: e.target.value })}
                              placeholder="e.g. Always write code with comments..."
                              className="w-full bg-[#222925] border border-zinc-800 focus:border-[#96AC9D] rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-xs font-mono resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-[#96AC9D] text-[#161A18] font-bold py-2 rounded-lg text-xs hover:bg-[#96AC9D]/90 transition font-mono uppercase tracking-wider shadow-md"
                          >
                            Update Profile Settings
                          </button>
                        </form>

                      </div>
                    )}

        </div>

        {/* MOBILE BOTTOM MENU BAR (hidden on md:) */}
        <div className="md:hidden bg-[#222925] border-t border-[#96AC9D]/15 px-3 py-3.5 flex justify-around items-center z-40 select-none shrink-0">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 transition-colors duration-150 ${
              activeTab === "home" ? "text-[#96AC9D]" : "text-zinc-500 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-widest uppercase">Home</span>
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex flex-col items-center gap-1 transition-colors duration-150 ${
              activeTab === "ai" ? "text-[#96AC9D]" : "text-zinc-500 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-widest uppercase">AI Assistance</span>
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex flex-col items-center gap-1 transition-colors duration-150 ${
              activeTab === "calendar" ? "text-[#96AC9D]" : "text-zinc-500 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-widest uppercase">Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 transition-colors duration-150 ${
              activeTab === "profile" ? "text-[#96AC9D]" : "text-zinc-500 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-widest uppercase">Profile</span>
          </button>
        </div>

      </div>
    </div>
  );
}

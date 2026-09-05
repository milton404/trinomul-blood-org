"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { X, Send, Sparkles, Bot, Trash2 } from "lucide-react";
import { serverChatWithAssistant } from "@/lib/db-actions";
import type { AssistantWorkflowState } from "@/lib/ai/assistant-workflow";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  intent?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

const STORAGE_KEY = "tbb-chat-session";
const WORKFLOW_STORAGE_KEY = "tbb-chat-workflow";
const MAX_MESSAGES = 20;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export default function ChatWidget() {
  const t = useTranslations("ai_assistant");
  const locale = useLocale();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<
    { id: string; text: string }[]
  >([]);
  const [hintIndex, setHintIndex] = useState(0);
  const [confirmNewChat, setConfirmNewChat] = useState(false);
  const [workflowState, setWorkflowState] = useState<AssistantWorkflowState | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rateLimitRef = useRef<number[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const sessionRef = useRef(0);

  const isBn = locale === "bn";

  const hintMessages = isBn
    ? [
        "🩸 রক্তদাতা খুঁজছেন?",
        "✅ রক্তদানের যোগ্যতা জানুন",
        "💬 যা জানতে চান জিজ্ঞাসা করুন",
        "📍 আপনার এলাকার রক্তদাতা খুঁজুন",
        "🚨 জরুরি রক্ত প্রয়োজন?",
        "❤️ রক্ত দান করুন, জীবন বাঁচান",
      ]
    : [
        "🩸 Looking for blood donors?",
        "✅ Check your donation eligibility",
        "💬 Ask me anything about blood donation",
        "📍 Find donors near your location",
        "🚨 Need blood urgently?",
        "❤️ Donate blood, save a life",
      ];

  // Hide on admin and auth pages
  const hidden =
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/forgot-password") ||
    pathname.includes("/reset-password");

  // Cycle hint messages every 2s when chat is closed
  useEffect(() => {
    if (isOpen || hidden) return;
    const timer = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % hintMessages.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [isOpen, hidden, hintMessages.length]);

  // Load session from sessionStorage on mount
  useEffect(() => {
    if (hidden) return;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
      const storedWorkflow = sessionStorage.getItem(WORKFLOW_STORAGE_KEY);
      if (storedWorkflow) {
        setWorkflowState(JSON.parse(storedWorkflow) as AssistantWorkflowState);
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  // Load quick replies (static, no server call needed) - only when locale changes
  useEffect(() => {
    const replies = [
      { id: "register_donor", text: t("quick_replies.register_donor") },
      { id: "find_donor_rangpur", text: t("quick_replies.find_donor_rangpur") },
      { id: "donation_benefits", text: t("quick_replies.donation_benefits") },
      { id: "urgent_blood", text: t("quick_replies.urgent_blood") },
    ];
    setQuickReplies(replies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Save to sessionStorage when messages change
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      const trimmed = messages.slice(-MAX_MESSAGES);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (workflowState) {
        sessionStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflowState));
      } else {
        sessionStorage.removeItem(WORKFLOW_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [workflowState]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    rateLimitRef.current = rateLimitRef.current.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
    );
    if (rateLimitRef.current.length >= RATE_LIMIT_MAX) {
      return false;
    }
    rateLimitRef.current.push(now);
    return true;
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      if (!checkRateLimit()) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: isBn
              ? "অনেক বেশি বার্তা পাঠিয়েছেন। ১০ মিনিট পরে আবার চেষ্টা করুন।"
              : "You've sent too many messages. Please try again in 10 minutes.",
            provider: "rules",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const userMsg: ChatMessage = {
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);
      const sessionId = sessionRef.current;

      try {
        // Build history from previous messages (pairs of user + assistant)
        const history: { user: string; ai: string }[] = [];
        let i = 0;
        const msgs = messagesRef.current;
        while (i < msgs.length - 1) {
          if (msgs[i].role === "user" && msgs[i + 1].role === "assistant") {
            history.push({
              user: msgs[i].content,
              ai: msgs[i + 1].content,
            });
            i += 2;
          } else {
            i += 1;
          }
        }
        const result = await serverChatWithAssistant(trimmed, history, isBn, workflowState);
        if (sessionRef.current !== sessionId) return;
        setWorkflowState(result.workflowState ?? null);
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: result.reply,
          provider: result.provider,
          intent: result.intent,
          data: result.data,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (result.needsLocationPermission && navigator.geolocation && result.workflowState) {
          navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
              const locationResult = await serverChatWithAssistant(
                "near me",
                history,
                isBn,
                result.workflowState,
                { latitude: coords.latitude, longitude: coords.longitude },
              );
              setWorkflowState(locationResult.workflowState ?? null);
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: locationResult.reply,
                  provider: locationResult.provider,
                  intent: locationResult.intent,
                  data: locationResult.data,
                  timestamp: Date.now(),
                },
              ]);
            },
            () => {},
            { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
          );
        }
      } catch (err) {
        const serverMsg =
          err instanceof Error ? err.message : String(err ?? "");
        const isRateLimit = /too many messages/i.test(serverMsg);
        const content = isRateLimit
          ? isBn
            ? "অনেক বেশি বার্তা পাঠিয়েছেন। কিছুক্ষণ পরে আবার চেষ্টা করুন।"
            : serverMsg
          : isBn
            ? "দুঃখিত, একটি ত্রুটি হয়েছে। আবার চেষ্টা করুন।"
            : "Sorry, an error occurred. Please try again.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content,
            provider: "rules",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, checkRateLimit, isBn],
  );

  const clearSession = useCallback(() => {
    sessionRef.current++;
    setMessages([]);
    setConfirmNewChat(false);
    setWorkflowState(null);
    setIsLoading(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(WORKFLOW_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  if (hidden) return null;

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <div className="fixed bottom-8 right-4 z-40 md:bottom-16 md:right-6">
          <button
            onClick={() => setIsOpen(true)}
            aria-label={t("open_chat")}
            className="group block"
          >
            <div className="relative">
              {/* Rotating hint message above icon */}
              <div className="absolute bottom-full right-0 mb-1 text-right">
                <span
                  key={hintIndex}
                  className="inline-block bg-white/95 text-[10px] sm:text-[11px] font-medium text-slate-700 shadow-md rounded-xl px-2.5 py-1.5 whitespace-nowrap border border-rose-100 transition-all duration-300"
                  style={{ animation: "hint-fade 0.3s ease-out" }}
                >
                  {hintMessages[hintIndex]}
                </span>
              </div>
              <div className="w-16 h-[4.5rem] transition-transform group-hover:scale-110 group-active:scale-95 drop-shadow-lg"
                style={{ animation: "chatbot-heartbeat 2.5s ease-in-out infinite", transformOrigin: "center" }}
              >
                <Image
                  src="/icons/chatbot (2).png"
                  alt="AI Chatbot"
                  width={80}
                  height={90}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              {/* Soft pulse glow behind mascot */}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-4 rounded-full bg-rose-400/60 blur-md animate-pulse" />

            </div>
          </button>
        </div>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 md:inset-x-auto md:bottom-6 md:right-6">
          <div className="mx-auto md:w-[380px] h-[75vh] md:h-[520px] md:max-h-[80vh] flex flex-col bg-gradient-to-b from-sky-50 to-white border border-rose-200/50 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 md:px-4 md:py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-9 md:h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[13px] md:text-sm leading-tight">
                    {t("title")}
                  </h3>
                  <p className="text-[10px] md:text-[11px] text-white/80 leading-tight">
                    {t("subtitle")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {hasMessages && (
                  <button
                    onClick={() => setConfirmNewChat(true)}
                    aria-label={t("new_chat")}
                    className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                    title={t("new_chat")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label={t("close_chat")}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* New Chat confirmation */}
            {confirmNewChat && (
              <div className="px-3 py-2 bg-rose-100/80 border-b border-rose-300/60">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-700">{t("confirm_new_chat")}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={clearSession}
                      className="px-2.5 py-1 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-md hover:from-red-600 hover:to-rose-600 transition-all text-xs font-medium shadow-sm"
                    >
                      {t("new_chat")}
                    </button>
                    <button
                      onClick={() => setConfirmNewChat(false)}
                      className="px-2.5 py-1 bg-white text-slate-600 rounded-md hover:bg-slate-50 transition-colors text-xs border border-slate-200"
                    >
                      {isBn ? "বাতিল" : "Cancel"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-white">
              {/* Welcome message if empty */}
              {!hasMessages && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-white/95 rounded-2xl rounded-tl-md px-3.5 py-2.5 shadow-md border border-rose-200/60">
                    <p className="text-sm text-slate-700">{t("welcome")}</p>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-red-500 text-white rounded-tr-md shadow-md"
                        : "bg-white/95 text-slate-700 rounded-tl-md shadow-md border border-rose-200/60"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    {msg.role === "assistant" && Array.isArray(msg.data?.donors) && msg.data.donors.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.data.donors.map((donor, donorIndex) => {
                          const item = donor as Record<string, unknown>;
                          return (
                            <div key={donorIndex} className="border border-rose-100 bg-rose-50/70 px-2.5 py-2 text-xs text-slate-700 rounded-lg">
                              <p className="font-semibold text-slate-800">{String(item.name ?? "Donor")} · {String(item.bloodGroup ?? "")}</p>
                              <p>{[item.upazila, item.district].filter(Boolean).join(", ")}</p>
                              {item.distance ? <p>{String(item.distance)} away</p> : null}
                              {item.phone ? <a className="text-red-600 font-medium" href={`tel:${String(item.phone)}`}>{String(item.phone)}</a> : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {msg.role === "assistant" && Array.isArray(msg.data?.requests) && msg.data.requests.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Blood requests nearby</p>
                        {msg.data.requests.map((request, requestIndex) => {
                          const item = request as Record<string, unknown>;
                          return (
                            <div key={requestIndex} className="border border-rose-100 bg-white/80 px-2.5 py-2 text-xs text-slate-700 rounded-lg">
                              <p className="font-semibold text-slate-800">
                                {String(item.bloodGroup ?? "")} · {String(item.units ?? 1)} unit(s)
                                {item.urgency ? ` · ${String(item.urgency)}` : ""}
                              </p>
                              <p>{[item.upazila, item.district].filter(Boolean).join(", ")}</p>
                              {item.hospital ? <p>{String(item.hospital)}</p> : null}
                              {item.distance ? <p>{String(item.distance)} away</p> : null}
                              {item.phone ? <a className="text-red-600 font-medium" href={`tel:${String(item.phone)}`}>{String(item.phone)}</a> : null}
                              {item.trackingCode ? <p className="text-slate-400">Code: {String(item.trackingCode)}</p> : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {msg.role === "assistant" && msg.provider && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                            msg.provider === "rules"
                              ? "bg-rose-100 text-rose-500"
                              : "bg-violet-50 text-violet-600"
                          }`}
                        >
                          {msg.provider === "rules" ? (
                            <>{t("badge_rules")}</>
                          ) : (
                            <>
                              <Sparkles className="w-2.5 h-2.5" />
                              {t("badge_ai")}
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/95 rounded-2xl rounded-tl-md px-4 py-3 shadow-md border border-rose-200/60">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {!hasMessages && quickReplies.length > 0 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {quickReplies.map((qr) => (
                  <button
                    key={qr.id}
                    onClick={() => sendMessage(qr.text)}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 text-xs bg-white/80 backdrop-blur-sm border border-rose-300/60 text-rose-600 rounded-full hover:bg-rose-500 hover:text-white hover:border-transparent transition-all duration-200 disabled:opacity-50 shadow-sm"
                  >
                    {qr.text}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-rose-200/60 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("placeholder")}
                  disabled={isLoading}
                  maxLength={500}
                  className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-rose-200 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent disabled:opacity-50 text-slate-900 placeholder:text-slate-400 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label={t("send")}
                  className="w-10 h-10 flex-shrink-0 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Globe,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { InternetConversation, InternetMessage, UserProfile } from "../types";

interface InternetChatScreenProps {
  firebaseUser: any;
  userProfile: UserProfile | null;
  conversations: InternetConversation[];
  activeConversation: InternetConversation | null;
  activeMessages: InternetMessage[];
  isSendingMessage: boolean;
  isSearching: boolean;
  searchResult: UserProfile | null;
  searchError: string | null;
  onSearchContact: (phone: string) => Promise<void>;
  onStartConversation: (contact: UserProfile) => Promise<any>;
  onSendMessage: (text: string) => Promise<boolean>;
  onSelectConversation: (convId: string) => void;
  onOpenAuthModal: () => void;
  onSwitchToLocalMode: () => void;
}

export function InternetChatScreen({
  firebaseUser,
  userProfile,
  conversations,
  activeConversation,
  activeMessages,
  isSendingMessage,
  isSearching,
  searchResult,
  searchError,
  onSearchContact,
  onStartConversation,
  onSendMessage,
  onSelectConversation,
  onOpenAuthModal,
  onSwitchToLocalMode,
}: InternetChatScreenProps) {
  const [phoneSearchInput, setPhoneSearchInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isEmailVerified = firebaseUser?.emailVerified;

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneSearchInput.trim()) {
      await onSearchContact(phoneSearchInput.trim());
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || isSendingMessage) return;

    const text = messageInput;
    setMessageInput("");
    const sent = await onSendMessage(text);
    if (!sent) {
      // restore text if failed
      setMessageInput(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // If user is not authenticated
  if (!firebaseUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-sm">
          <Globe className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
          <span>Mode 2: Internet Communication</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Account Required for Internet Mode
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          Internet Mode uses Firebase Authentication & Cloud Firestore so you can message contacts across different Wi-Fi networks and mobile data. 
          Sign up with your phone number and email to get started.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <button
            id="internet-signin-btn"
            onClick={onOpenAuthModal}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            Create Account / Sign In
          </button>
          <button
            onClick={onSwitchToLocalMode}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
          >
            Use Local / P2P (No Account)
          </button>
        </div>
      </div>
    );
  }

  // If user is authenticated but email is not verified
  if (!isEmailVerified) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-sm">
          <Mail className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
          <span>Email Verification Pending</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Please Verify Your Email
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          We have sent a verification email to <span className="font-semibold text-slate-900 dark:text-white">{firebaseUser.email}</span>. 
          Please click the verification link in your inbox before accessing Internet communication.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <button
            onClick={onOpenAuthModal}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Verification Status</span>
          </button>
          <button
            onClick={onSwitchToLocalMode}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
          >
            Return to Local P2P
          </button>
        </div>
      </div>
    );
  }

  // Active peer details in conversation
  const otherParticipantUid = activeConversation?.participants.find((p) => p !== firebaseUser.uid);
  const otherParticipantDetails = otherParticipantUid && activeConversation?.participantDetails
    ? activeConversation.participantDetails[otherParticipantUid]
    : null;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      {/* Left Sidebar: Conversations & Contact Search */}
      <div
        className={`w-full md:w-80 md:border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-900/50 ${
          activeConversation ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Search Contact Header */}
        <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Internet Contacts
              </span>
            </div>
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
              title="Add contact by phone"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* User Profile Mini Bar */}
          <div className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                {userProfile?.displayName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white truncate text-[11px]">
                  {userProfile?.displayName}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {userProfile?.phoneNumber}
                </div>
              </div>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
              Online
            </span>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No internet chats yet
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Search a friend's phone number to start chatting over the internet!
              </p>
              <button
                onClick={() => setShowSearchModal(true)}
                className="mt-3 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-colors inline-flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search by Phone</span>
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherUid = conv.participants.find((p) => p !== firebaseUser.uid) || "";
              const details = conv.participantDetails ? conv.participantDetails[otherUid] : null;
              const isSelected = activeConversation?.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-sm">
                    {details?.displayName?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {details?.displayName || "Contact"}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {conv.lastMessage || "No messages yet"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Active Chat or Empty State */}
      <div
        className={`flex-1 flex flex-col min-h-0 bg-[#efeae2]/30 dark:bg-[#0b141a] ${
          activeConversation ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* WhatsApp Styled Header */}
            <div className="px-4 py-2.5 bg-white dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onSelectConversation("")}
                  className="md:hidden p-1.5 -ml-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                  {otherParticipantDetails?.displayName?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {otherParticipantDetails?.displayName || "Internet Contact"}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                      🌐 Internet
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {otherParticipantDetails?.phoneNumber}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Firebase Synced</span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
              {/* WhatsApp-style Privacy Pill */}
              <div className="flex justify-center my-2">
                <div className="max-w-xs text-center px-3 py-1.5 rounded-lg bg-amber-50/90 dark:bg-slate-800/90 border border-amber-200/80 dark:border-slate-700/80 text-[10px] text-slate-600 dark:text-slate-300 shadow-2xs">
                  🔒 Internet Mode: Real-time messaging synced across networks via Google Cloud Firestore.
                </div>
              </div>

              {activeMessages.map((msg) => {
                const isMine = msg.senderId === firebaseUser.uid;
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs ${
                        isMine
                          ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-tr-xs"
                          : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-white rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60"
                      }`}
                    >
                      <div className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {msg.text}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                        <span>{timeStr}</span>
                        {isMine && (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-500 dark:text-emerald-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* WhatsApp Styled Input Bar */}
            <div className="p-3 bg-white dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800 shrink-0">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-[#2a3942] rounded-2xl px-3 py-1.5 border border-transparent focus-within:border-blue-500">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message (Enter to send)..."
                    className="w-full bg-transparent resize-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none max-h-28"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isSendingMessage}
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 disabled:opacity-40"
                >
                  {isSendingMessage ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 ml-0.5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-3">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Internet Communication
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
              Select an existing conversation or search for a contact using their registered phone number.
            </p>
            <button
              onClick={() => setShowSearchModal(true)}
              className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all inline-flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Contact by Phone</span>
            </button>
          </div>
        )}
      </div>

      {/* Search by Phone Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Search Contact by Phone
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setPhoneSearchInput("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phoneSearchInput}
                    onChange={(e) => setPhoneSearchInput(e.target.value)}
                    placeholder="e.g. +88017XXXXXXXX or 017XXXXXXXX"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Format: International (+880...) or local (017...).
                </p>
              </div>

              <button
                type="submit"
                disabled={isSearching || !phoneSearchInput.trim()}
                className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Search Contact</span>
              </button>
            </form>

            {searchError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400">
                {searchError}
              </div>
            )}

            {searchResult && (
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {searchResult.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      {searchResult.displayName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {searchResult.phoneNumber}
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await onStartConversation(searchResult);
                    setShowSearchModal(false);
                    setPhoneSearchInput("");
                  }}
                  className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

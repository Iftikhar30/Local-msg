import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Send,
  Shield,
  Smartphone,
  User,
  X,
  Zap,
} from "lucide-react";
import { UserProfile } from "../types";
import { normalizePhoneNumber, resolvedFirebaseConfig } from "../services/firebase";

interface InternetAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  firebaseUser: any;
  authError: string | null;
  authErrorCode?: string | null;
  verificationEmailSent: boolean;
  isVerifying: boolean;
  onSignUp: (email: string, pass: string, phone: string, name: string) => Promise<any>;
  onSignIn: (email: string, pass: string) => Promise<any>;
  onSignOut: () => Promise<void>;
  onResetPassword?: (email: string) => Promise<any>;
  onResendVerification: () => Promise<any>;
  onCheckVerification: () => Promise<any>;
}

export function InternetAuthModal({
  isOpen,
  onClose,
  userProfile,
  firebaseUser,
  authError,
  authErrorCode,
  verificationEmailSent,
  isVerifying,
  onSignUp,
  onSignIn,
  onSignOut,
  onResetPassword,
  onResendVerification,
  onCheckVerification,
}: InternetAuthModalProps) {
  const [authTab, setAuthTab] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isEmailVerified = firebaseUser?.emailVerified;

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalMessage(null);
    const res = await onSignUp(email, password, phone, name);
    setIsSubmitting(false);
    if (res.success) {
      setLocalMessage("Account created! Please check your email for verification link.");
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalMessage(null);
    const res = await onSignIn(email, password);
    setIsSubmitting(false);
    if (res.success) {
      if (firebaseUser?.emailVerified) {
        onClose();
      }
    }
  };

  const handleCheckStatus = async () => {
    const verified = await onCheckVerification();
    if (verified) {
      setLocalMessage("Email verified successfully! You can now use Internet Mode.");
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setLocalMessage("Email is not verified yet. Please check your inbox or spam folder.");
    }
  };

  const handleResend = async () => {
    const res = await onResendVerification();
    if (res?.success) {
      setLocalMessage("Verification email resent. Please check your inbox.");
    } else {
      setLocalMessage(res?.error || "Failed to resend verification email.");
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLocalMessage("Please enter your email address to receive password reset instructions.");
      return;
    }
    if (!onResetPassword) return;
    setIsResettingPassword(true);
    setLocalMessage(null);
    const res = await onResetPassword(cleanEmail);
    setIsResettingPassword(false);
    if (res?.success) {
      setLocalMessage(`Password reset link sent to ${cleanEmail}! Please check your email inbox or spam folder.`);
    } else {
      setLocalMessage(res?.error || "Could not send password reset link.");
    }
  };

  const isEmailAlreadyInUse =
    authErrorCode === "auth/email-already-in-use" ||
    Boolean(authError?.toLowerCase().includes("already registered"));

  const isOperationNotAllowed =
    authErrorCode === "auth/operation-not-allowed" ||
    Boolean(
      authError?.toLowerCase().includes("operation-not-allowed") ||
      authError?.toLowerCase().includes("disabled in your firebase")
    );

  const firebaseConsoleUrl = `https://console.firebase.google.com/project/${resolvedFirebaseConfig.projectId || "gen-lang-client-0709459456"}/authentication/providers`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span>Internet Mode Account</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                  Firebase
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Connect with contacts across different networks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* User already signed in */}
          {firebaseUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-base">
                      {userProfile?.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {userProfile?.displayName || firebaseUser.displayName || "User"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {firebaseUser.email}
                      </div>
                      {userProfile?.phoneNumber && (
                        <div className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                          {userProfile.phoneNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Verification State Banner */}
                {isEmailVerified ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Email Verified — Internet Mode is fully active!</span>
                  </div>
                ) : (
                  <div className="space-y-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Email verification required</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                      Please verify your email (<span className="font-semibold">{firebaseUser.email}</span>) before sending or receiving messages in Internet Mode.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleCheckStatus}
                        disabled={isVerifying}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <RefreshCw className={`w-3 h-3 ${isVerifying ? "animate-spin" : ""}`} />
                        <span>Check Status</span>
                      </button>
                      <button
                        onClick={handleResend}
                        className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[11px] font-semibold transition-colors"
                      >
                        Resend Email
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {localMessage && (
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
                  {localMessage}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onSignOut();
                    setLocalMessage("Signed out.");
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* Auth Form: Sign Up / Sign In */
            <div>
              {/* Tab Selector */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signup");
                    setLocalMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authTab === "signup"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signin");
                    setLocalMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authTab === "signin"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  Sign In
                </button>
              </div>

              {isOperationNotAllowed ? (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Project Mismatch / Provider Not Enabled</span>
                  </div>
                  <div className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed space-y-2">
                    <p>
                      এই অ্যাপটি বর্তমানে যুক্ত আছে: <code className="px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/80 font-mono font-bold text-amber-950 dark:text-amber-100">{resolvedFirebaseConfig.projectId}</code> প্রজেক্টের সাথে।
                    </p>
                    <div className="bg-amber-100/70 dark:bg-amber-900/50 p-2.5 rounded-lg space-y-1.5 text-[11px]">
                      <p className="font-semibold text-amber-950 dark:text-amber-100">
                        Firebase Console-এ কীভাবে সঠিক প্রজেক্ট নির্বাচন করবেন:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-amber-900 dark:text-amber-200">
                        <li>
                          Console-এর উপরে বাম পাশের প্রজেক্ট ড্রপডাউন (যেখানে <strong>Local msg ▾</strong> লেখা আছে) ক্লিক করুন
                        </li>
                        <li>
                          তালিকা থেকে <strong>{resolvedFirebaseConfig.projectId}</strong> সিলেক্ট করুন
                        </li>
                        <li>
                          <strong>Authentication</strong> &gt; <strong>Sign-in method</strong> &gt; <strong>Email/Password</strong> এনাবেল (Enable) করুন
                        </li>
                      </ol>
                    </div>
                  </div>
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <a
                      href={firebaseConsoleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 inline-flex"
                    >
                      <span>Open {resolvedFirebaseConfig.projectId} in Console</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                    >
                      Use Direct P2P Mode
                    </button>
                  </div>
                </div>
              ) : authTab === "signup" && isEmailAlreadyInUse ? (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Account Already Exists</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    An account with <span className="font-semibold underline">{email}</span> already exists. Please sign in with your password.
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab("signin");
                        setLocalMessage(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
                    >
                      <span>Switch to Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {onResetPassword && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={isResettingPassword}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-semibold text-[11px] transition-colors"
                      >
                        {isResettingPassword ? "Sending..." : "Forgot password?"}
                      </button>
                    )}
                  </div>
                </div>
              ) : authError ? (
                <div className="mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              ) : null}

              {localMessage && (
                <div className="mb-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
                  {localMessage}
                </div>
              )}

              {authTab === "signup" ? (
                <form onSubmit={handleSignUpSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Asif Ahmed"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number (Contact ID)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +88017XXXXXXXX or 017XXXXXXXX"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Used for contact directory searches. No SMS OTP required.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Address (Verification required)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Password (min. 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 mt-4 active:scale-98 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>Create Internet Account</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignInSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      {onResetPassword && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={isResettingPassword}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {isResettingPassword ? "Sending reset..." : "Forgot password?"}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 mt-4 active:scale-98 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                    <span>Sign In to Internet Mode</span>
                  </button>
                </form>
              )}

              {/* Local Mode Notice */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Want to use Local / P2P instead?</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Continue without account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

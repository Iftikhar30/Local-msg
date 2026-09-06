import { useEffect, useState, useRef } from "react";
import {
  auth,
  testFirestoreConnection,
  createUserProfile,
  getUserProfile,
  updateUserPresence,
  searchContactByPhone,
  getOrCreateConversation,
  subscribeToUserConversations,
  subscribeToConversationMessages,
  sendInternetChatMessage,
  normalizePhoneNumber,
  isValidPhoneNumber,
} from "../services/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { InternetConversation, InternetMessage, UserProfile } from "../types";

export function useInternetMode() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Conversations & Messages
  const [conversations, setConversations] = useState<InternetConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<InternetMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Search contacts
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Online / Connection diagnostics
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // 1. Initial boot test
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      setIsFirestoreConnected(connected);
    });
  }, []);

  // 2. Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            updateUserPresence(user.uid, true);
          } else {
            // Auto-heal: If profile document is missing from a previous failed attempt, create it now
            profile = await createUserProfile(
              user,
              user.phoneNumber || "",
              user.displayName || user.email?.split("@")[0] || "User"
            );
            setUserProfile(profile);
            updateUserPresence(user.uid, true);
          }
        } catch (e) {
          console.warn("Could not load or initialize user profile:", e);
        }
      } else {
        setUserProfile(null);
        setConversations([]);
        setActiveConversationId(null);
        setActiveMessages([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Listen to conversations when authenticated and email is verified
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      setConversations([]);
      return;
    }

    const unsub = subscribeToUserConversations(
      firebaseUser.uid,
      (convs) => {
        setConversations(convs);
      },
      (err) => {
        console.warn("Failed to subscribe to conversations:", err);
      }
    );

    return () => unsub();
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  // 4. Listen to messages for active conversation
  useEffect(() => {
    if (!activeConversationId || !firebaseUser || !firebaseUser.emailVerified) {
      setActiveMessages([]);
      return;
    }

    const unsub = subscribeToConversationMessages(
      activeConversationId,
      (msgs) => {
        setActiveMessages(msgs);
      },
      (err) => {
        console.warn("Failed to subscribe to messages:", err);
      }
    );

    return () => unsub();
  }, [activeConversationId, firebaseUser?.uid, firebaseUser?.emailVerified]);

  // Auth Operations
  const signUp = async (email: string, pass: string, phone: string, name: string) => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = normalizePhoneNumber(phone.trim());
    const cleanName = name.trim();

    if (!cleanEmail || !pass || !cleanPhone || !cleanName) {
      setAuthError("Please fill in all fields.");
      setAuthLoading(false);
      return { success: false, error: "Missing fields" };
    }

    if (!isValidPhoneNumber(cleanPhone)) {
      setAuthError("Invalid phone number format. Please provide a valid phone number (e.g. +88017XXXXXXXX or +1XXXXXXXXXX).");
      setAuthLoading(false);
      return { success: false, error: "Invalid phone number" };
    }

    if (pass.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      setAuthLoading(false);
      return { success: false, error: "Password too short" };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: cleanName });

      // Create Firestore User Document
      const profile = await createUserProfile(user, cleanPhone, cleanName);
      setUserProfile(profile);

      // Send Email Verification
      await sendEmailVerification(user);
      setVerificationEmailSent(true);

      setAuthLoading(false);
      return { success: true };
    } catch (err: any) {
      const code = err?.code || "";
      const isExpectedAuthNotice =
        code === "auth/email-already-in-use" ||
        code === "auth/invalid-email" ||
        code === "auth/weak-password" ||
        err?.message?.includes("email-already-in-use");

      if (isExpectedAuthNotice) {
        console.warn("[Auth] Notice during sign up:", code || err?.message);
      } else {
        console.warn("[Auth] Unexpected sign up error:", err);
      }

      let msg = err?.message || "Failed to sign up.";
      if (code === "auth/email-already-in-use" || err?.message?.includes("email-already-in-use")) {
        setAuthErrorCode("auth/email-already-in-use");
        msg = "This email is already registered. Please sign in with your password.";
      } else if (
        code === "auth/operation-not-allowed" ||
        err?.message?.includes("operation-not-allowed") ||
        err?.message?.includes("OPERATION_NOT_ALLOWED")
      ) {
        setAuthErrorCode("auth/operation-not-allowed");
        msg = "Email/Password sign-in is disabled in your Firebase console. Please enable the Email/Password provider under Authentication > Sign-in method.";
      } else if (code === "auth/invalid-email") {
        setAuthErrorCode("auth/invalid-email");
        msg = "Invalid email address format.";
      } else if (code === "auth/weak-password") {
        setAuthErrorCode("auth/weak-password");
        msg = "Password is too weak. Please use at least 6 characters.";
      } else {
        setAuthErrorCode(code || "unknown");
      }

      setAuthError(msg);
      setAuthLoading(false);
      return { success: false, error: msg, code: code || "auth/email-already-in-use" };
    }
  };

  const signIn = async (email: string, pass: string) => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
      const user = userCredential.user;
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
      }
      setAuthLoading(false);
      return { success: true };
    } catch (err: any) {
      const code = err?.code || "";
      console.warn("[Auth] Notice during sign in:", code || err?.message);
      let msg = "Invalid email or password.";
      setAuthErrorCode(code);
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        msg = "Incorrect email or password.";
      } else if (
        code === "auth/operation-not-allowed" ||
        err?.message?.includes("operation-not-allowed") ||
        err?.message?.includes("OPERATION_NOT_ALLOWED")
      ) {
        msg = "Email/Password sign-in is disabled in your Firebase console. Please enable it under Authentication > Sign-in method.";
      } else if (code === "auth/too-many-requests") {
        msg = "Access temporarily blocked due to many failed login attempts. Please reset your password or try again later.";
      } else if (code === "auth/invalid-email") {
        msg = "Invalid email address format.";
      }
      setAuthError(msg);
      setAuthLoading(false);
      return { success: false, error: msg, code };
    }
  };

  const resetPassword = async (email: string) => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      const msg = "Please enter your email address to receive password reset instructions.";
      setAuthError(msg);
      setAuthLoading(false);
      return { success: false, error: msg };
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setAuthLoading(false);
      return { success: true };
    } catch (err: any) {
      const code = err?.code || "";
      console.warn("[Auth] Notice during password reset:", code || err?.message);
      let msg = "Failed to send password reset email.";
      setAuthErrorCode(code);
      if (code === "auth/user-not-found") {
        msg = "No account found with this email address.";
      } else if (code === "auth/invalid-email") {
        msg = "Invalid email address format.";
      }
      setAuthError(msg);
      setAuthLoading(false);
      return { success: false, error: msg, code };
    }
  };

  const signOut = async () => {
    if (firebaseUser) {
      await updateUserPresence(firebaseUser.uid, false);
    }
    await fbSignOut(auth);
    setFirebaseUser(null);
    setUserProfile(null);
    setConversations([]);
    setActiveConversationId(null);
    setActiveMessages([]);
  };

  const resendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationEmailSent(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const checkVerification = async () => {
    if (!auth.currentUser) return;
    setIsVerifying(true);
    try {
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      setFirebaseUser({ ...updatedUser });

      if (updatedUser.emailVerified) {
        if (userProfile) {
          const updatedProfile = { ...userProfile, emailVerified: true };
          setUserProfile(updatedProfile);
        }
      }
      setIsVerifying(false);
      return updatedUser.emailVerified;
    } catch (err) {
      setIsVerifying(false);
      return false;
    }
  };

  // Search contact by phone
  const searchContact = async (rawPhone: string) => {
    if (!rawPhone.trim()) {
      setSearchResult(null);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const found = await searchContactByPhone(rawPhone);
      if (!found) {
        setSearchError("No user found with this phone number.");
      } else if (found.uid === firebaseUser?.uid) {
        setSearchError("This is your own phone number.");
      } else {
        setSearchResult(found);
      }
    } catch (err: any) {
      setSearchError("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Start chat with contact
  const startConversation = async (contact: UserProfile) => {
    if (!userProfile) return null;
    try {
      const conv = await getOrCreateConversation(userProfile, contact);
      setActiveConversationId(conv.id);
      setSearchResult(null);
      return conv;
    } catch (err) {
      console.error("Failed to start conversation:", err);
      return null;
    }
  };

  // Send message
  const sendMessage = async (text: string) => {
    if (!activeConversation || !firebaseUser || !text.trim()) return false;
    setIsSendingMessage(true);

    const receiverId = activeConversation.participants.find((p) => p !== firebaseUser.uid);
    if (!receiverId) {
      setIsSendingMessage(false);
      return false;
    }

    try {
      await sendInternetChatMessage(activeConversation.id, firebaseUser.uid, receiverId, text);
      setIsSendingMessage(false);
      return true;
    } catch (err) {
      console.warn("Failed to send message:", err);
      setIsSendingMessage(false);
      return false;
    }
  };

  return {
    firebaseUser,
    userProfile,
    authLoading,
    authError,
    authErrorCode,
    verificationEmailSent,
    isVerifying,
    conversations,
    activeConversationId,
    activeConversation,
    activeMessages,
    isSendingMessage,
    isSearching,
    searchResult,
    searchError,
    isFirestoreConnected,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendVerification,
    checkVerification,
    searchContact,
    startConversation,
    sendMessage,
    setActiveConversationId,
    setSearchResult,
    setAuthError,
    setAuthErrorCode,
  };
}

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  getDocFromServer,
  limit,
  Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { InternetConversation, InternetMessage, UserProfile } from "../types";

// Dynamic configuration prioritizing VITE_FIREBASE_* environment variables if provided
const env = (import.meta as any).env || {};
export const resolvedFirebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string) || firebaseConfig.apiKey,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfig.authDomain,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfig.projectId,
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfig.storageBucket,
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfig.messagingSenderId,
  appId: (env.VITE_FIREBASE_APP_ID as string) || firebaseConfig.appId,
  firestoreDatabaseId: (env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || firebaseConfig.firestoreDatabaseId || "(default)",
};

// 1. Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApp();

// 2. Initialize Auth
export const auth = getAuth(app);

// 3. Initialize Firestore with auto-detect long polling and custom databaseId if specified
const targetDatabaseId =
  resolvedFirebaseConfig.firestoreDatabaseId && resolvedFirebaseConfig.firestoreDatabaseId !== "(default)"
    ? resolvedFirebaseConfig.firestoreDatabaseId
    : undefined;

let firestoreInstance: any;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true,
    },
    targetDatabaseId
  );
} catch {
  firestoreInstance = targetDatabaseId ? getFirestore(app, targetDatabaseId) : getFirestore(app);
}

export const db = firestoreInstance;

// 4. Firestore error handling adhering to skill instructions
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 5. Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client is offline. Local P2P remains operational.");
    }
    return false;
  }
}

// 6. Phone number normalization & validation
export function normalizePhoneNumber(raw: string): string {
  let cleaned = raw.replace(/[\s\-()]/g, "");
  // Bangladesh local 11 digits format (e.g. 017xxxxxxxx)
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    cleaned = "+88" + cleaned;
  }
  if (!cleaned.startsWith("+") && cleaned.length >= 8) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

// 7. User Profile Functions
export async function createUserProfile(
  user: FirebaseUser,
  phoneNumber: string,
  displayName: string
): Promise<UserProfile> {
  const cleanPhone = normalizePhoneNumber(phoneNumber);
  const userRef = doc(db, "users", user.uid);
  const now = new Date().toISOString();
  const profile: UserProfile = {
    uid: user.uid,
    phoneNumber: cleanPhone,
    email: user.email || "",
    displayName: displayName.trim() || user.email?.split("@")[0] || "User",
    emailVerified: user.emailVerified,
    status: "online",
    createdAt: now,
    lastSeen: now,
  };

  try {
    await setDoc(userRef, profile, { merge: true });
    return profile;
  } catch (err: any) {
    const isOffline =
      err?.message?.includes("client is offline") ||
      err?.code === "unavailable";
    if (isOffline) {
      console.warn(`[Firestore] Client is offline when saving profile (${user.uid}), returning local profile.`);
      return profile;
    }
    handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid);
  // Retry with exponential backoff if the client is still establishing connection
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (err: any) {
      const isOffline =
        err?.message?.includes("client is offline") ||
        err?.code === "unavailable";
      if (isOffline && attempt < 2) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      if (isOffline) {
        console.warn(`[Firestore] Client is offline when fetching user profile (${uid}).`);
        return null;
      }
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  }
  return null;
}

export async function updateUserPresence(uid: string, isOnline: boolean): Promise<void> {
  if (!uid) return;
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, {
      status: isOnline ? "online" : "offline",
      lastSeen: new Date().toISOString(),
    });
  } catch {
    // Non-critical presence update
  }
}

// 8. Contact Search
export async function searchContactByPhone(rawPhone: string): Promise<UserProfile | null> {
  const cleanPhone = normalizePhoneNumber(rawPhone);
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("phoneNumber", "==", cleanPhone), limit(1));

  try {
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "users");
  }
}

// 9. Conversations & Real-time Messaging
export function generateConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

export async function getOrCreateConversation(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<InternetConversation> {
  const convId = generateConversationId(currentUser.uid, otherUser.uid);
  const convRef = doc(db, "conversations", convId);

  try {
    const snap = await getDoc(convRef);
    if (snap.exists()) {
      return snap.data() as InternetConversation;
    }

    const now = Date.now();
    const newConv: InternetConversation = {
      id: convId,
      participants: [currentUser.uid, otherUser.uid],
      participantDetails: {
        [currentUser.uid]: {
          displayName: currentUser.displayName,
          phoneNumber: currentUser.phoneNumber,
          email: currentUser.email,
        },
        [otherUser.uid]: {
          displayName: otherUser.displayName,
          phoneNumber: otherUser.phoneNumber,
          email: otherUser.email,
        },
      },
      lastMessage: "Conversation started",
      lastMessageAt: now,
      lastMessageSenderId: currentUser.uid,
      unreadCounts: {
        [currentUser.uid]: 0,
        [otherUser.uid]: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(convRef, newConv);
    return newConv;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `conversations/${convId}`);
  }
}

export function subscribeToUserConversations(
  uid: string,
  onUpdate: (conversations: InternetConversation[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const convsRef = collection(db, "conversations");
  const q = query(
    convsRef,
    where("participants", "array-contains", uid),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const convs: InternetConversation[] = [];
      snapshot.forEach((doc) => {
        convs.push(doc.data() as InternetConversation);
      });
      onUpdate(convs);
    },
    (err) => {
      console.error("Conversations snapshot error:", err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToConversationMessages(
  conversationId: string,
  onUpdate: (messages: InternetMessage[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const msgsRef = collection(db, "conversations", conversationId, "messages");
  const q = query(msgsRef, orderBy("timestamp", "asc"), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: InternetMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push(doc.data() as InternetMessage);
      });
      onUpdate(msgs);
    },
    (err) => {
      console.error("Messages snapshot error:", err);
      if (onError) onError(err);
    }
  );
}

export async function sendInternetChatMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string
): Promise<InternetMessage> {
  const msgsRef = collection(db, "conversations", conversationId, "messages");
  const msgDocRef = doc(msgsRef);
  const now = Date.now();

  const message: InternetMessage = {
    id: msgDocRef.id,
    conversationId,
    senderId,
    receiverId,
    text: text.trim(),
    timestamp: now,
    status: "sent",
  };

  try {
    await setDoc(msgDocRef, message);

    // Update parent conversation
    const convRef = doc(db, "conversations", conversationId);
    await updateDoc(convRef, {
      lastMessage: text.trim().slice(0, 100),
      lastMessageAt: now,
      lastMessageSenderId: senderId,
      updatedAt: now,
    });

    return message;
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.CREATE,
      `conversations/${conversationId}/messages/${msgDocRef.id}`
    );
  }
}

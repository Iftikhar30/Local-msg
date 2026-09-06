import { useEffect, useState } from "react";
import { AboutScreen } from "./components/AboutScreen";
import { BottomNav } from "./components/BottomNav";
import { ChatScreen } from "./components/ChatScreen";
import { ConnectModal } from "./components/ConnectModal";
import { DevicesScreen } from "./components/DevicesScreen";
import { HomeScreen } from "./components/HomeScreen";
import { IncomingRequestModal } from "./components/IncomingRequestModal";
import { InternetAuthModal } from "./components/InternetAuthModal";
import { InternetChatScreen } from "./components/InternetChatScreen";
import { ModeSwitcher } from "./components/ModeSwitcher";
import { Navbar } from "./components/Navbar";
import { QRCodeModal } from "./components/QRCodeModal";
import { RegenerateCodeModal } from "./components/RegenerateCodeModal";
import { SettingsScreen } from "./components/SettingsScreen";
import { VoiceCallModal } from "./components/VoiceCallModal";
import { useInternetMode } from "./hooks/useInternetMode";
import { useLocalLink } from "./hooks/useLocalLink";
import { AppMode, AppTab } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isInternetAuthModalOpen, setIsInternetAuthModalOpen] = useState(false);

  // Dual Communication Mode: 'local' (P2P WebRTC) or 'internet' (Firebase Cloud)
  const [currentMode, setCurrentMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem("locallink_current_mode");
    return saved === "internet" ? "internet" : "local";
  });

  const handleSelectMode = (mode: AppMode) => {
    setCurrentMode(mode);
    localStorage.setItem("locallink_current_mode", mode);
  };

  const {
    deviceInfo,
    connectionCode,
    isSignalingReady,
    signalingError,
    peersList,
    activePeerId,
    activePeer,
    activeChatMessages,
    isTargetTyping,
    incomingRequests,
    activeCall,
    soundEnabled,
    setSoundEnabled,
    updateDeviceName,
    regenerateCode,
    connectByCode,
    reconnectPeer,
    removePeer,
    acceptConnectionRequest,
    rejectConnectionRequest,
    disconnectPeer,
    sendMessage,
    sendFile,
    sendVoiceMessage,
    startVoiceCall,
    acceptVoiceCall,
    rejectVoiceCall,
    endVoiceCall,
    toggleVoiceCallMute,
    toggleVoiceCallSpeaker,
    cancelFileTransfer,
    sendTypingIndicator,
    openChatWithPeer,
    setActivePeerId,
  } = useLocalLink();

  // Internet Mode Hook
  const {
    firebaseUser,
    userProfile,
    authLoading,
    authError,
    authErrorCode,
    verificationEmailSent,
    isVerifying,
    conversations,
    activeConversation,
    activeMessages,
    isSendingMessage,
    isSearching,
    searchResult,
    searchError,
    signUp,
    signIn,
    signOut,
    resetPassword,
    checkVerification,
    resendVerification,
    searchContact,
    startConversation,
    sendMessage: sendInternetMessage,
    setActiveConversationId,
  } = useInternetMode();

  // Check URL parameters for direct connect link e.g. `?connect=A7K9P2`
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetCode = params.get("connect") || params.get("code");
    if (targetCode) {
      // Clean up URL query without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
      // Auto-initiate connection
      connectByCode(targetCode);
    }
  }, []);

  const totalUnread = peersList.reduce((sum, p) => sum + p.unreadCount, 0);
  const isChatActiveOnMobile =
    activeTab === "chat" && (currentMode === "local" ? !!activePeer : !!activeConversation);

  const handleOpenChat = (peerId: string) => {
    setCurrentMode("local");
    openChatWithPeer(peerId);
    setActiveTab("chat");
  };

  const handleOpenInternetChat = () => {
    setCurrentMode("internet");
    setActiveTab("chat");
  };

  return (
    <div
      className={`bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans selection:bg-indigo-500 selection:text-white ${
        activeTab === "chat"
          ? "h-[100dvh] max-h-[100dvh] overflow-hidden"
          : "min-h-screen"
      }`}
    >
      {/* Top Navigation */}
      <div className={isChatActiveOnMobile ? "hidden md:block shrink-0" : "shrink-0"}>
        <Navbar
          deviceInfo={deviceInfo}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          connectedCount={peersList.filter((p) => p.status === "connected").length}
          unreadTotal={totalUnread}
          isSignalingReady={isSignalingReady}
          currentMode={currentMode}
          onSelectMode={handleSelectMode}
          isInternetSignedIn={!!firebaseUser}
          internetDisplayName={userProfile?.displayName || firebaseUser?.displayName}
          onOpenAuthModal={() => setIsInternetAuthModalOpen(true)}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
          onUpdateDeviceName={updateDeviceName}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />
      </div>

      {/* Main Content Area */}
      <main
        className={`w-full mx-auto ${
          activeTab === "chat"
            ? "flex-1 min-h-0 w-full flex flex-col overflow-hidden max-w-7xl px-0 sm:px-3 md:px-6 lg:px-8 py-0 sm:py-2 md:py-4"
            : "flex-1 max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-20 md:pb-8"
        }`}
      >
        {activeTab === "home" && (
          <HomeScreen
            deviceInfo={deviceInfo}
            connectionCode={connectionCode}
            isSignalingReady={isSignalingReady}
            signalingError={signalingError}
            peers={peersList}
            incomingRequests={incomingRequests}
            currentMode={currentMode}
            onSelectMode={handleSelectMode}
            isInternetSignedIn={!!firebaseUser}
            isEmailVerified={!!firebaseUser?.emailVerified}
            userProfile={userProfile}
            onOpenAuthModal={() => setIsInternetAuthModalOpen(true)}
            onOpenInternetChat={handleOpenInternetChat}
            internetConversationsCount={conversations.length}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onOpenQrModal={() => setIsQrModalOpen(true)}
            onOpenRegenerateModal={() => setIsRegenerateModalOpen(true)}
            onUpdateDeviceName={updateDeviceName}
            onQuickConnect={connectByCode}
            onAcceptRequest={acceptConnectionRequest}
            onRejectRequest={rejectConnectionRequest}
            onOpenChat={handleOpenChat}
            onNavigateToDevices={() => setActiveTab("devices")}
          />
        )}

        {activeTab === "devices" && (
          <DevicesScreen
            peers={peersList}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onOpenChat={handleOpenChat}
            onDisconnectPeer={disconnectPeer}
            onReconnectPeer={reconnectPeer}
            onRemovePeer={removePeer}
          />
        )}

        {activeTab === "chat" && (
          <div className="flex-1 min-h-0 flex flex-col h-full">
            {/* Top Chat Bar Mode Switcher */}
            <div className="px-2 pb-2 shrink-0 max-w-md mx-auto w-full">
              <ModeSwitcher
                currentMode={currentMode}
                onSelectMode={handleSelectMode}
                localPeersCount={peersList.filter((p) => p.status === "connected").length}
                isInternetSignedIn={!!firebaseUser}
                isEmailVerified={!!firebaseUser?.emailVerified}
                isOnline={navigator.onLine}
              />
            </div>

            {/* Render Chat depending on current mode */}
            {currentMode === "local" ? (
              <ChatScreen
                peers={peersList}
                activePeer={activePeer}
                activeChatMessages={activeChatMessages}
                isTargetTyping={isTargetTyping}
                onSelectPeer={openChatWithPeer}
                onSendMessage={sendMessage}
                onSendFile={sendFile}
                onSendVoiceMessage={sendVoiceMessage}
                onStartVoiceCall={startVoiceCall}
                onCancelFileTransfer={cancelFileTransfer}
                onSendTypingIndicator={sendTypingIndicator}
                onDisconnectPeer={disconnectPeer}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
              />
            ) : (
              <InternetChatScreen
                firebaseUser={firebaseUser}
                userProfile={userProfile}
                conversations={conversations}
                activeConversation={activeConversation}
                activeMessages={activeMessages}
                isSendingMessage={isSendingMessage}
                isSearching={isSearching}
                searchResult={searchResult}
                searchError={searchError}
                onSearchContact={searchContact}
                onStartConversation={startConversation}
                onSendMessage={sendInternetMessage}
                onSelectConversation={setActiveConversationId}
                onOpenAuthModal={() => setIsInternetAuthModalOpen(true)}
                onSwitchToLocalMode={() => handleSelectMode("local")}
              />
            )}
          </div>
        )}

        {activeTab === "about" && (
          <AboutScreen
            deviceInfo={deviceInfo}
            isSignalingReady={isSignalingReady}
            peers={peersList}
          />
        )}

        {activeTab === "settings" && (
          <SettingsScreen
            deviceInfo={deviceInfo}
            connectionCode={connectionCode}
            isSignalingReady={isSignalingReady}
            soundEnabled={soundEnabled}
            onSetSoundEnabled={setSoundEnabled}
            onUpdateDeviceName={updateDeviceName}
            onOpenRegenerateModal={() => setIsRegenerateModalOpen(true)}
            onNavigateToAbout={() => setActiveTab("about")}
            isInternetSignedIn={!!firebaseUser}
            firebaseUser={firebaseUser}
            userProfile={userProfile}
            onOpenAuthModal={() => setIsInternetAuthModalOpen(true)}
            onSignOutInternet={signOut}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connectedCount={peersList.filter((p) => p.status === "connected").length}
        unreadTotal={totalUnread}
        hidden={isChatActiveOnMobile}
      />

      {/* Internet Auth Modal (Sign in / Sign Up / Verify Email) */}
      <InternetAuthModal
        isOpen={isInternetAuthModalOpen}
        onClose={() => setIsInternetAuthModalOpen(false)}
        firebaseUser={firebaseUser}
        userProfile={userProfile}
        authError={authError}
        authErrorCode={authErrorCode}
        verificationEmailSent={verificationEmailSent}
        isVerifying={isVerifying}
        onSignUp={signUp}
        onSignIn={signIn}
        onSignOut={signOut}
        onResetPassword={resetPassword}
        onCheckVerification={checkVerification}
        onResendVerification={resendVerification}
      />

      {/* Connect Device Modal (with manual code + QR Camera scanner) */}
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnect={connectByCode}
      />

      {/* QR Code Modal (generates high quality scannable SVG QR) */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        connectionCode={connectionCode}
        deviceName={deviceInfo.deviceName}
      />

      {/* Regenerate Code Confirmation Modal */}
      <RegenerateCodeModal
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        onConfirm={regenerateCode}
        currentCode={connectionCode}
      />

      {/* Incoming Connection Request Prompts */}
      <IncomingRequestModal
        requests={incomingRequests}
        onAccept={acceptConnectionRequest}
        onReject={rejectConnectionRequest}
      />

      {/* Direct P2P Voice Call Interface */}
      {activeCall && (
        <VoiceCallModal
          call={activeCall}
          onAccept={acceptVoiceCall}
          onReject={rejectVoiceCall}
          onEnd={endVoiceCall}
          onToggleMute={toggleVoiceCallMute}
          onToggleSpeaker={toggleVoiceCallSpeaker}
        />
      )}
    </div>
  );
}


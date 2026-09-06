import React from "react";
import { Globe, Radio, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { AppMode } from "../types";

interface ModeSwitcherProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  localPeersCount: number;
  isInternetSignedIn: boolean;
  isEmailVerified: boolean;
  isOnline: boolean;
}

export function ModeSwitcher({
  currentMode,
  onSelectMode,
  localPeersCount,
  isInternetSignedIn,
  isEmailVerified,
  isOnline,
}: ModeSwitcherProps) {
  return (
    <div className="w-full bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
      <div className="grid grid-cols-2 gap-1">
        {/* Mode 1: Local / P2P */}
        <button
          type="button"
          id="mode-switch-local"
          onClick={() => onSelectMode("local")}
          className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
            currentMode === "local"
              ? "bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-700/80 ring-1 ring-emerald-500/20"
              : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50 opacity-75 hover:opacity-100"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                currentMode === "local"
                  ? "bg-emerald-500 text-white shadow-2xs"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Radio className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  Local / P2P
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Direct WebRTC • No account
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 pl-1">
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {localPeersCount > 0 ? `${localPeersCount} connected` : "LAN / Code"}
            </span>
          </div>
        </button>

        {/* Mode 2: Internet Mode */}
        <button
          type="button"
          id="mode-switch-internet"
          onClick={() => onSelectMode("internet")}
          className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
            currentMode === "internet"
              ? "bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-700/80 ring-1 ring-blue-500/20"
              : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50 opacity-75 hover:opacity-100"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                currentMode === "internet"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  Internet
                </span>
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                    isOnline ? "bg-blue-500" : "bg-rose-500"
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Firebase Cloud • Cross-network
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 pl-1">
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                !isOnline
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 border-rose-200"
                  : isInternetSignedIn
                  ? isEmailVerified
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-200"
                    : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 border-amber-200"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200"
              }`}
            >
              {!isOnline
                ? "Offline"
                : isInternetSignedIn
                ? isEmailVerified
                  ? "Active"
                  : "Verify"
                : "Sign In"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

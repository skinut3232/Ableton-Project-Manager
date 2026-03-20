"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./ui/Button";
import { EMAIL_MODAL, DOWNLOAD_URL_WIN, DOWNLOAD_URL_MAC } from "@/lib/constants";

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
}

export default function EmailModal({ open, onClose }: EmailModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [securityNote, setSecurityNote] = useState<"none" | "windows" | "macos">("none");
  const triggerRef = useRef<Element | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    onClose();
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // Reset state when modal closes
      setSecurityNote("none");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "trial_download" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleDownload = (platform: "windows" | "macos") => {
    setSecurityNote(platform);
    window.location.href = platform === "windows" ? DOWNLOAD_URL_WIN : DOWNLOAD_URL_MAC;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-8"
          >
            {status === "success" ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <svg
                    className="h-6 w-6 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="mt-4 text-lg font-semibold text-heading">
                  {EMAIL_MODAL.successMessage}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Choose your platform to start the download.
                </p>

                {/* Platform download buttons */}
                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={() => handleDownload("windows")}
                    className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-heading transition-colors hover:border-[#3F3F46] hover:text-white cursor-pointer"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                    </svg>
                    Download for Windows
                  </button>
                  <button
                    onClick={() => handleDownload("macos")}
                    className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-heading transition-colors hover:border-[#3F3F46] hover:text-white cursor-pointer"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    Download for macOS
                  </button>
                </div>

                {/* Platform-specific security note — shown after clicking a download button */}
                {securityNote === "windows" && (
                  <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-left">
                    <p className="text-sm font-medium text-amber-400">
                      Windows may show a security warning
                    </p>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      SetCrate is new and not yet code-signed, so Windows SmartScreen
                      may flag it. Click <strong className="text-body">&quot;More info&quot;</strong> then{" "}
                      <strong className="text-body">&quot;Run anyway&quot;</strong> to install.
                    </p>
                  </div>
                )}
                {securityNote === "macos" && (
                  <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-left">
                    <p className="text-sm font-medium text-amber-400">
                      macOS may show a security warning
                    </p>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      SetCrate is not yet notarized by Apple, so Gatekeeper may block it.
                      Right-click the app and select <strong className="text-body">&quot;Open&quot;</strong>,
                      or go to <strong className="text-body">System Settings → Privacy &amp; Security</strong> and
                      click <strong className="text-body">&quot;Open Anyway&quot;</strong>.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    handleClose();
                    setStatus("idle");
                    setEmail("");
                  }}
                  className="mt-4 text-sm text-muted transition-colors hover:text-body cursor-pointer"
                >
                  Got it
                </button>
              </div>
            ) : (
              <>
                <h2 id="email-modal-title" className="text-2xl font-bold text-heading">
                  {EMAIL_MODAL.headline}
                </h2>
                <p className="mt-2 text-body">{EMAIL_MODAL.description}</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <input
                    ref={inputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={EMAIL_MODAL.placeholder}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-heading placeholder:text-muted outline-none focus:border-accent transition-colors"
                  />

                  {status === "error" && (
                    <p className="text-sm text-red-400">{errorMsg}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                  >
                    {status === "loading" ? "Submitting..." : EMAIL_MODAL.cta}
                  </Button>
                </form>

                <button
                  onClick={handleClose}
                  className="mt-4 w-full text-center text-sm text-muted transition-colors hover:text-body cursor-pointer"
                >
                  Maybe later
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useRef, useState } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Big play button starts the video with audio from the beginning
  const handleStart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    video.play();
    setIsPlaying(true);
    setHasStarted(true);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative rounded-xl border border-white/10 overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.15)]">
        <video
          ref={videoRef}
          playsInline
          poster="/images/video-poster.jpg"
          className="w-full block"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          <source src="https://assets.setcrate.app/setcrate-launch-v3.mp4" type="video/mp4" />
        </video>

        {/* Big centered play button — shown before first play */}
        {!hasStarted && (
          <button
            onClick={handleStart}
            aria-label="Play video"
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-accent/90 group-hover:bg-accent group-hover:scale-105 transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)]">
              <svg className="w-8 h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.5 4.27c0-.963 1.07-1.526 1.856-.977l10.983 7.73a1.125 1.125 0 0 1 0 1.954L8.356 20.707c-.786.549-1.856-.014-1.856-.977V4.27Z" />
              </svg>
            </div>
          </button>
        )}

        {/* Small play/pause — bottom-right, only after video has started */}
        {hasStarted && (
          <div className="absolute bottom-4 right-4">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause video" : "Play video"}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/80 transition-colors"
            >
              {isPlaying ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.5 4.27c0-.963 1.07-1.526 1.856-.977l10.983 7.73a1.125 1.125 0 0 1 0 1.954L8.356 20.707c-.786.549-1.856-.014-1.856-.977V4.27Z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

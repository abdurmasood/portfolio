'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const audioSrc = "/background-music.mp3";

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('error', handleAudioError);
      return () => audio.removeEventListener('error', handleAudioError);
    }
  }, []);

  const handleAudioError = (e) => {
    console.error("Audio error:", e);
    setError("Failed to load audio. Please check the file path and format.");
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error("Audio playback failed:", error);
          setError("Failed to play audio. Please try again.");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed bottom-4 right-6 z-50 flex flex-col items-end">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-2 max-w-xs" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <button
        onClick={togglePlayPause}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 rounded-full focus:outline-none focus:shadow-outline"
        aria-label={isPlaying ? "Mute audio" : "Play audio"}
      >
        {isPlaying ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </button>
      <audio ref={audioRef} src={audioSrc} loop />
    </div>
  );
};

export default MusicPlayer;
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  // Updated audio source path
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
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline"
      >
        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
      </button>
      <audio ref={audioRef} src={audioSrc} loop />
    </div>
  );
};

export default MusicPlayer;
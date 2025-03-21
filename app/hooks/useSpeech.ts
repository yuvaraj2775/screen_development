import { useState } from 'react';
import * as Speech from 'expo-speech';

export const useSpeech = () => {
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const playVoice = async (voiceText: string, selectedIndex: number) => {
    try {
      // If currently playing, stop it
      if (isPlaying !== null) {
        await Speech.stop();
        setIsPlaying(null);
        return;
      }

      // If no voice text, don't play
      if (!voiceText || voiceText.trim() === "") {
        return;
      }

      // Start playing
      setIsPlaying(selectedIndex);

      // Play the voice without moving to next slide
      await Speech.speak(voiceText, {
        onDone: () => {
          setIsPlaying(null);
        },
        onError: () => {
          setIsPlaying(null);
        },
      });
    } catch (error) {
      console.error("Error playing voice:", error);
      setIsPlaying(null);
    }
  };

  const stopVoice = async () => {
    await Speech.stop();
    setIsPlaying(null);
    setIsAutoPlaying(false);
  };

  return {
    isPlaying,
    isAutoPlaying,
    setIsAutoPlaying,
    playVoice,
    stopVoice,
  };
}; 
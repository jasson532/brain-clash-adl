import { useRef, useState, useEffect } from 'react';
import bgMusic from '../../../../assets/audio/mixkit-fright-night-871.mp3';
import './BackgroundMusic.css';

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const audio = new Audio(bgMusic);
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // Autoplay on first user interaction (browsers require it)
    const startOnInteraction = () => {
      audio.play().catch(() => {});
      document.removeEventListener('click', startOnInteraction);
      document.removeEventListener('keydown', startOnInteraction);
    };

    document.addEventListener('click', startOnInteraction);
    document.addEventListener('keydown', startOnInteraction);

    return () => {
      audio.pause();
      document.removeEventListener('click', startOnInteraction);
      document.removeEventListener('keydown', startOnInteraction);
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <button className="bg-music" onClick={toggle} title={isPlaying ? 'Silenciar música' : 'Activar música'}>
      {isPlaying ? '🔊' : '🔇'}
    </button>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerReturn {
  timeRemaining: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newTime?: number) => void;
  percentage: number;
}

export function useTimer(initialTime: number, onTimeUp?: () => void): UseTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onTimeUpRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(
    (newTime?: number) => {
      setIsRunning(false);
      setTimeRemaining(newTime ?? initialTime);
    },
    [initialTime],
  );

  const percentage = (timeRemaining / initialTime) * 100;

  return { timeRemaining, isRunning, start, pause, reset, percentage };
}

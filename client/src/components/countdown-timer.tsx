import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  createdAt: string;
  className?: string;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export default function CountdownTimer({ createdAt, className = "" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft => {
      const deploymentTime = new Date(createdAt);
      const deletionTime = new Date(deploymentTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
      const now = new Date();
      const difference = deletionTime.getTime() - now.getTime();

      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
      }

      const totalSeconds = Math.floor(difference / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return { hours, minutes, seconds, totalSeconds };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [createdAt]);

  if (!timeLeft) {
    return null;
  }

  const isExpiring = timeLeft.totalSeconds <= 3600; // Less than 1 hour left
  const isExpired = timeLeft.totalSeconds <= 0;

  if (isExpired) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 dark:text-red-400 ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">Expired - Being deleted</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${
      isExpiring 
        ? 'text-orange-600 dark:text-orange-400' 
        : 'text-gray-600 dark:text-gray-300'
    } ${className}`}>
      <Clock className="w-4 h-4" />
      <div className="text-sm">
        <span className="font-mono font-medium">
          {timeLeft.hours.toString().padStart(2, '0')}:
          {timeLeft.minutes.toString().padStart(2, '0')}:
          {timeLeft.seconds.toString().padStart(2, '0')}
        </span>
        <span className="ml-1 text-xs opacity-75">left</span>
      </div>
    </div>
  );
}

// Utility function to format countdown for display
export function formatTimeLeft(createdAt: string): string {
  const deploymentTime = new Date(createdAt);
  const deletionTime = new Date(deploymentTime.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const difference = deletionTime.getTime() - now.getTime();

  if (difference <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(difference / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}
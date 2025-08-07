import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  return null;
}

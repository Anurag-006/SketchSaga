import { useEffect, useState } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  // Set dark mode after component mounts
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initial = saved !== null ? JSON.parse(saved) : prefersDark;
    setIsDark(initial);
  }, []);

  // Sync class + storage
  useEffect(() => {
    if (isDark === null) return;
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    localStorage.setItem("darkMode", JSON.stringify(isDark));
  }, [isDark]);

  return [isDark, setIsDark] as const;
}

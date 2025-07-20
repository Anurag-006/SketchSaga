import { useEffect, useState } from "react";

export function useDarkMode(): [boolean | null, (value: boolean) => void] {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    const initialDark = savedTheme ? savedTheme === "dark" : prefersDark;

    setIsDark(initialDark);
  }, []);

  useEffect(() => {
    if (isDark === null) return;

    const root = window.document.documentElement;

    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return [isDark, setIsDark];
}

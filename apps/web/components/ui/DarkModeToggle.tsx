"use client";
import { Moon, Sun } from "lucide-react";

interface DarkModeToggleProps {
  isDark: boolean | null;
  toggle: () => void;
}

export default function DarkModeToggle({
  isDark,
  toggle,
}: DarkModeToggleProps) {
  if (isDark === null) return null; // Avoid hydration mismatch

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
}

"use client";
import { useState, useEffect } from "react";
import { Menu, X, Zap } from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";
import { useDarkMode } from "../../hooks/useDarkMode";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useDarkMode();
  const router = useRouter();

  function handleSignIn() {
    router.push("/signin");
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DrawFlow
            </span>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                Features
              </a>
              <a
                href="#gallery"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                Gallery
              </a>
              <a
                href="#pricing"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                Pricing
              </a>
              <a
                href="#about"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                About
              </a>

              <DarkModeToggle
                isDark={isDark}
                toggleAction={() => setIsDark(!isDark)}
              />

              <button
                onClick={handleSignIn}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500"
              >
                Sign In
              </button>
              <button
                onClick={handleSignIn}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Start Drawing
              </button>
            </div>
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <DarkModeToggle
              isDark={isDark}
              toggleAction={() => setIsDark(!isDark)}
            />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg mt-2">
              <a
                href="#features"
                className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              >
                Features
              </a>
              <a
                href="#gallery"
                className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              >
                Gallery
              </a>
              <a
                href="#pricing"
                className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              >
                Pricing
              </a>
              <a
                href="#about"
                className="block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              >
                About
              </a>
              <div className="px-3 py-2 space-y-2">
                <button className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 font-medium">
                  Sign In
                </button>
                <button className="w-full px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg">
                  Start Drawing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

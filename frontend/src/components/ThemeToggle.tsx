import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Check localStorage or system preference
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-bgPrimary border border-borderColor hover:bg-borderColor/50 text-textPrimary transition shadow-sm flex items-center justify-center"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme"
      id="theme-toggle-btn"
    >
      {isDark ? (
        <Sun className="w-4.5 h-4.5 text-yellow-500 animate-spin-slow" />
      ) : (
        <Moon className="w-4.5 h-4.5 text-slate-700" />
      )}
    </button>
  );
};

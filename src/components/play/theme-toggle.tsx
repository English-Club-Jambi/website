"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import type { PublicContentFor } from "@content/public-content";

import styles from "./play.module.css";

const storageKey = "english-club-theme";

export function ThemeToggle({ copy }: { copy: PublicContentFor<"global"> }) {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";

    return () => {
      delete document.documentElement.dataset.hydrated;
    };
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;

    try {
      window.localStorage.setItem(storageKey, nextTheme);
    } catch {
      // The selected theme still applies for this page when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggleTheme}
    >
      <SunIcon
        className={styles.themeSun}
        width={20}
        height={20}
        strokeWidth={2}
        aria-hidden
      />
      <MoonIcon
        className={styles.themeMoon}
        width={20}
        height={20}
        strokeWidth={2}
        aria-hidden
      />
      <span className={styles.themeLabelLight}>{copy.switchToDarkTheme}</span>
      <span className={styles.themeLabelDark}>{copy.switchToLightTheme}</span>
    </button>
  );
}

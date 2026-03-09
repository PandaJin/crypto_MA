"use client";

import { useState, useEffect } from "react";

function getThemeColors() {
  if (typeof document === "undefined") {
    return {
      muted: "#94a3b8",
      border: "#1e293b",
      accent: "#f59e0b",
      background: "#0a0e17",
      card: "#111827",
    };
  }
  const style = getComputedStyle(document.documentElement);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return {
    muted: get("--muted") || "#94a3b8",
    border: get("--border") || "#1e293b",
    accent: get("--accent") || "#f59e0b",
    background: get("--background") || "#0a0e17",
    card: get("--card") || "#111827",
  };
}

/** 返回当前主题下解析后的颜色，用于 canvas 图表（Lightweight Charts）等无法使用 CSS 变量的场景。随系统深浅色切换会更新。 */
export function useThemeColors() {
  const [colors, setColors] = useState(getThemeColors);

  useEffect(() => {
    setColors(getThemeColors());
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const listener = () => setColors(getThemeColors());
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  return colors;
}

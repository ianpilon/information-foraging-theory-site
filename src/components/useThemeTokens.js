import { useEffect, useState } from 'react'

export const LIGHT = {
  pillBg: '#111827',
  pillText: '#ffffff',
  surface: '#ffffff',
  text: '#111827',
  textMuted: '#6b7280',
  textSecondary: '#374151',
  textDim: '#9ca3af',
  border: '#e5e7eb',
  dropBg: '#f9fafb',
  dropBgActive: '#eff6ff',
  dropBorder: '#d1d5db',
  dropBorderActive: '#2563eb',
  chip: '#f3f4f6',
  success: '#065f46',
  errorText: '#991b1b',
  errorBg: '#fef2f2',
  errorBubbleBg: '#fee2e2',
  primaryBtnBg: '#111827',
  primaryBtnText: '#ffffff',
  secondaryBtnBg: '#ffffff',
  secondaryBtnText: '#111827',
  link: '#2563eb',
  overlay: 'rgba(0,0,0,0.30)',
  shadow: '0 20px 50px rgba(0,0,0,0.25)',
  panelShadow: '-12px 0 30px rgba(0,0,0,0.20)',
}

export const DARK = {
  pillBg: '#f9fafb',
  pillText: '#111827',
  surface: '#111827',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  textSecondary: '#d1d5db',
  textDim: '#6b7280',
  border: '#374151',
  dropBg: '#1f2937',
  dropBgActive: '#1e3a8a',
  dropBorder: '#4b5563',
  dropBorderActive: '#60a5fa',
  chip: '#1f2937',
  success: '#34d399',
  errorText: '#fca5a5',
  errorBg: '#450a0a',
  errorBubbleBg: '#3f1d1d',
  primaryBtnBg: '#f9fafb',
  primaryBtnText: '#111827',
  secondaryBtnBg: '#1f2937',
  secondaryBtnText: '#f3f4f6',
  link: '#60a5fa',
  overlay: 'rgba(0,0,0,0.55)',
  shadow: '0 20px 50px rgba(0,0,0,0.55)',
  panelShadow: '-12px 0 30px rgba(0,0,0,0.55)',
}

export function useThemeTokens() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isDark ? DARK : LIGHT
}

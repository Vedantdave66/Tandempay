import { useEffect, useState } from 'react';

function useDarkMode() {
  const isDarkNow = () =>
    document.documentElement.classList.contains('dark') ||
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.body.classList.contains('dark');

  const [isDark, setIsDark] = useState(isDarkNow);

  useEffect(() => {
    setIsDark(isDarkNow());
    const obs = new MutationObserver(() => setIsDark(isDarkNow()));
    obs.observe(document.documentElement, { attributes: true });
    obs.observe(document.body, { attributes: true });
    return () => obs.disconnect();
  }, []);

  return isDark;
}

interface TandemPayLogoProps {
  size?: number;
  className?: string;
}

export default function TandemPayLogo({ size = 26, className }: TandemPayLogoProps) {
  const isDark = useDarkMode();

  return (
    <span
      className={className}
      style={{
        fontSize: size,
        letterSpacing: '-0.4px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: isDark ? '#F2FBF5' : '#0E140F',
      }}
    >
      <span style={{ fontWeight: 700 }}>Tandem</span>
      <span style={{ fontWeight: 800, color: 'var(--color-accent)' }}>Pay</span>
    </span>
  );
}

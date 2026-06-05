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
  /** 'auto' (default) respects dark/light mode; 'onGreen' for green backgrounds */
  variant?: 'auto' | 'onGreen';
}

export default function TandemPayLogo({ size = 26, className, variant = 'auto' }: TandemPayLogoProps) {
  const isDark = useDarkMode();

  let tandemColor: string;
  let slashColor: string;
  let slashOpacity: number;
  let payColor: string;
  let payOpacity: number;

  if (variant === 'onGreen') {
    tandemColor  = '#FFFFFF';
    slashColor   = 'rgba(255,255,255,0.5)';
    slashOpacity = 1;
    payColor     = '#FFFFFF';
    payOpacity   = 0.7;
  } else if (isDark) {
    tandemColor  = '#FFFFFF';
    slashColor   = '#4ADE80';
    slashOpacity = 0.85;
    payColor     = '#4ADE80';
    payOpacity   = 1;
  } else {
    tandemColor  = '#020617';
    slashColor   = '#16A34A';
    slashOpacity = 0.85;
    payColor     = '#16A34A';
    payOpacity   = 1;
  }

  const hMargin = size * 0.18;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: size,
        fontWeight: 800,
        letterSpacing: '-0.025em',
      }}
    >
      <span style={{ color: tandemColor }}>Tandem</span>

      {/* Hairline slash */}
      <span
        aria-hidden="true"
        style={{
          display:         'inline-block',
          width:           1.5,
          height:          size * 1.1,
          backgroundColor: slashColor,
          opacity:         slashOpacity,
          transform:       'rotate(18deg)',
          borderRadius:    1,
          marginLeft:      hMargin,
          marginRight:     hMargin,
          flexShrink:      0,
        }}
      />

      <span style={{ color: payColor, opacity: payOpacity }}>Pay</span>
    </span>
  );
}

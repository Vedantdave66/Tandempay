const KEYFRAMES = `
  @keyframes tp-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-12px); }
  }
  @keyframes tp-blink-a {
    0%, 90%, 100% { transform: scaleY(1); }
    95%           { transform: scaleY(0.08); }
  }
  @keyframes tp-blink-b {
    0%, 84%, 100% { transform: scaleY(1); }
    89%           { transform: scaleY(0.08); }
  }
  @keyframes tp-blink-c {
    0%, 78%, 100% { transform: scaleY(1); }
    83%           { transform: scaleY(0.08); }
  }
  @keyframes tp-blink-d {
    0%, 86%, 100% { transform: scaleY(1); }
    91%           { transform: scaleY(0.08); }
  }
  @keyframes tp-progress {
    0%   { transform: translateX(-200%); }
    100% { transform: translateX(200%); }
  }
`;

/* ── Shared base styles ───────────────────────────── */
const eye = (blinkAnim: string): React.CSSProperties => ({
  borderRadius: '50%',
  backgroundColor: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transformOrigin: 'center',
  animation: `${blinkAnim} infinite`,
  overflow: 'hidden',
});

const pupilOnly = (blinkAnim: string): React.CSSProperties => ({
  borderRadius: '50%',
  backgroundColor: '#1a1a1a',
  transformOrigin: 'center',
  animation: `${blinkAnim} infinite`,
});

const pupilDot: React.CSSProperties = {
  borderRadius: '50%',
  backgroundColor: '#1a1a1a',
};

const eyeRow = (gap: number): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  gap: `${gap}px`,
});

export default function LoadingScreen() {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={{
          backgroundColor: '#0f0f10',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '28px',
        }}
      >
        {/* ── Characters ────────────────────────────── */}
        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-end' }}>

          {/* Max — tall green rectangle */}
          <div
            style={{
              position: 'relative',
              width: '56px',
              height: '120px',
              backgroundColor: '#34D399',
              borderRadius: '10px 10px 0 0',
              animation: 'tp-bounce 1.2s ease-in-out infinite',
              animationDelay: '0s',
            }}
          >
            <div style={{ ...eyeRow(10), top: '16px' }}>
              <div style={{ ...eye('tp-blink-a 3.5s'), width: '12px', height: '12px' }}>
                <div style={{ ...pupilDot, width: '5px', height: '5px' }} />
              </div>
              <div style={{ ...eye('tp-blink-a 3.5s'), width: '12px', height: '12px' }}>
                <div style={{ ...pupilDot, width: '5px', height: '5px' }} />
              </div>
            </div>
          </div>

          {/* Rue — amber semicircle */}
          <div
            style={{
              position: 'relative',
              width: '80px',
              height: '40px',
              backgroundColor: '#F59E0B',
              borderRadius: '40px 40px 0 0',
              animation: 'tp-bounce 1.2s ease-in-out infinite',
              animationDelay: '0.15s',
            }}
          >
            <div style={{ ...eyeRow(12), top: '9px' }}>
              <div style={{ ...pupilOnly('tp-blink-b 4.2s'), width: '9px', height: '9px' }} />
              <div style={{ ...pupilOnly('tp-blink-b 4.2s'), width: '9px', height: '9px' }} />
            </div>
          </div>

          {/* Kai — light emerald rounded rectangle */}
          <div
            style={{
              position: 'relative',
              width: '52px',
              height: '94px',
              backgroundColor: '#6EE7B7',
              borderRadius: '26px 26px 0 0',
              animation: 'tp-bounce 1.2s ease-in-out infinite',
              animationDelay: '0.3s',
            }}
          >
            <div style={{ ...eyeRow(8), top: '15px' }}>
              <div style={{ ...pupilOnly('tp-blink-d 3.8s'), width: '9px', height: '9px' }} />
              <div style={{ ...pupilOnly('tp-blink-d 3.8s'), width: '9px', height: '9px' }} />
            </div>
          </div>

          {/* Zo — dark rectangle */}
          <div
            style={{
              position: 'relative',
              width: '44px',
              height: '88px',
              backgroundColor: '#3f3f46',
              borderRadius: '8px 8px 0 0',
              animation: 'tp-bounce 1.2s ease-in-out infinite',
              animationDelay: '0.45s',
            }}
          >
            <div style={{ ...eyeRow(7), top: '12px' }}>
              <div style={{ ...eye('tp-blink-c 5.1s'), width: '10px', height: '10px' }}>
                <div style={{ ...pupilDot, width: '4px', height: '4px' }} />
              </div>
              <div style={{ ...eye('tp-blink-c 5.1s'), width: '10px', height: '10px' }}>
                <div style={{ ...pupilDot, width: '4px', height: '4px' }} />
              </div>
            </div>
          </div>

        </div>

        {/* ── Wordmark ───────────────────────────────── */}
        <div
          style={{
            color: '#34D399',
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          tandempay
        </div>

        {/* ── Progress bar ───────────────────────────── */}
        <div
          style={{
            width: '180px',
            height: '2px',
            backgroundColor: '#1f1f23',
            borderRadius: '1px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '50%',
              height: '100%',
              backgroundColor: '#34D399',
              borderRadius: '1px',
              animation: 'tp-progress 1.4s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
import { GroupListItem, UserBalance } from '../services/api';
import { formatCurrency } from '../utils/currency';
import CharacterShape from './CharacterShape';

const SETTLED_THRESHOLD = 0.01;

const LADDER = [
  { height: 104, bodyRotate: -4, nameRotate: -8  },
  { height: 138, bodyRotate:  2, nameRotate:  4  },
  { height:  80, bodyRotate:  0, nameRotate:  6  },
  { height: 122, bodyRotate:  7, nameRotate: -10 },
];

function useDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

interface GroupCardProps {
  group: GroupListItem;
  members?: UserBalance[];
  myNetBalance?: number;
}

export default function GroupCard({ group, members = [], myNetBalance = 0 }: GroupCardProps) {
  const navigate = useNavigate();
  const isDark = useDarkMode();
  const visibleMembers = members.slice(0, 4);
  const extraCount = members.length > 4 ? members.length - 4 : 0;
  const balanceLoaded = members.length > 0;
  const isOwe  = myNetBalance < -SETTLED_THRESHOLD;
  const isOwed = myNetBalance >  SETTLED_THRESHOLD;
  const isSettled = !isOwe && !isOwed;
  const balanceColor = isOwe ? '#F2C200' : '#27E06A';

  const darkGlow  = 'radial-gradient(ellipse 92% 62% at 50% 46%, #28E06B 0%, #109A47 30%, #064D26 52%, #070A08 78%)';
  const lightGlow = 'radial-gradient(ellipse 96% 64% at 50% 44%, #3BE57F 0%, #8FE9B0 30%, #D8F4E1 56%, #F3FBF4 80%)';

  const boxStyle: React.CSSProperties = {
    backgroundColor: isDark ? '#0A0B0A' : '#FFFFFF',
    border: isDark ? 'none' : '1px solid rgba(0,0,0,0.05)',
    boxShadow: isDark ? 'none' : '0 6px 18px rgba(20,60,35,0.10)',
  };

  return (
    <div
      onClick={() => navigate(`/groups/${group.id}`)}
      style={{ background: isDark ? darkGlow : lightGlow, borderRadius: 28, overflow: 'hidden',
               border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
               cursor: 'pointer', userSelect: 'none' }}
    >
      {/* Characters row */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
                    gap: 2, paddingTop: 22, paddingLeft: 18, paddingRight: 18, position: 'relative', zIndex: 1 }}>
        {balanceLoaded ? visibleMembers.map((m, i) => {
          const slot = LADDER[i] ?? LADDER[0];
          const displayName = m.character_nickname ?? m.name.split(' ')[0];
          return (
            <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {m.user_id === group.created_by
                ? <Crown style={{ width: 12, height: 12, color: '#FBBF24', marginBottom: 2 }} />
                : <div style={{ height: 14 }} />}
              <span style={{ fontSize: 11, color: isDark ? '#FFFFFF' : '#0E140F', marginBottom: 4,
                              fontWeight: 700, transform: `rotate(${slot.nameRotate}deg)`,
                              textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(255,255,255,0.55)' }}>
                {displayName}
              </span>
              <div style={{ transform: `rotate(${slot.bodyRotate}deg)`, transformOrigin: 'bottom center' }}>
                <CharacterShape
                  shape={m.character_shape ?? 'rect'}
                  color={m.character_color ?? '#6B7280'}
                  variant="card"
                />
              </div>
            </div>
          );
        }) : <div style={{ height: 80 }} />}
      </div>

      {/* Title pill — overlaps characters */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center',
                    marginTop: -22, padding: '0 16px' }}>
        <div style={{ ...boxStyle, borderRadius: 999, padding: '12px 28px', maxWidth: '92%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ color: isDark ? '#FFFFFF' : '#0E140F', fontSize: 26, fontWeight: 700,
                       letterSpacing: -0.5, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden',
                       textOverflow: 'ellipsis' }}>
            {group.name}
          </h3>
        </div>
      </div>

      {/* +N others */}
      {extraCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <div style={{ backgroundColor: isDark ? '#2A2C2A' : '#E6EAE5', borderRadius: 999,
                        padding: '5px 14px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#D7DAD6' : '#46504A' }}>
              +{extraCount} others
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: '16px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Total expenses */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
                         color: isDark ? '#0B6B38' : '#0A5F30' }}>
            Total Expenses
          </span>
          <div style={{ ...boxStyle, borderRadius: 22, padding: '14px 24px', width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: isDark ? '#FFFFFF' : '#0E140F', fontSize: 28, fontWeight: 700,
                           letterSpacing: -0.5 }}>
              ${formatCurrency(group.total_expenses)}
            </span>
          </div>
        </div>

        {/* Balance */}
        {balanceLoaded && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
                           color: isDark ? '#0B6B38' : '#0A5F30' }}>
              {isOwed ? "You're Owed" : isOwe ? 'You Owe' : 'Status'}
            </span>
            <div style={{ ...boxStyle, borderRadius: 22, padding: '10px 12px 10px 24px', width: '100%',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: isSettled ? '#27E06A' : balanceColor, fontSize: 28, fontWeight: 700,
                             letterSpacing: -0.5 }}>
                {isSettled ? '✓ Settled' : `$${formatCurrency(Math.abs(myNetBalance))}`}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/groups/${group.id}`); }}
                style={{ width: 44, height: 44, borderRadius: 22, border: `1.5px solid ${isSettled ? '#27E06A' : balanceColor}`,
                         backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                         display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ArrowRight style={{ width: 18, height: 18, color: isSettled ? '#27E06A' : balanceColor }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

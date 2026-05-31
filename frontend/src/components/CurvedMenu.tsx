import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, LogOut, Wallet, Users, Activity, Pencil,
    Loader2, CheckCircle2, RefreshCw, Download, Tag, Lock, Crown, Palette,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import { authApi } from '../services/api';

// ── Animation constants ────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];

const PANEL_SLIDE = {
    initial: { x: 'calc(-100% - 100px)' },
    enter:   { x: '0',                    transition: { duration: 0.8, ease: EASE } },
    exit:    { x: 'calc(-100% - 100px)',  transition: { duration: 0.8, ease: EASE } },
};

// ── Nav items ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { label: 'Dashboard',  href: '/dashboard',          icon: LayoutDashboard },
    { label: 'Payments',   href: '/payments',            icon: Wallet          },
    { label: 'Friends',    href: '/friends',             icon: Users           },
    { label: 'Activity',   href: '/friends?tab=activity',icon: Activity        },
    { label: 'Recurring',  href: '/recurring',           icon: RefreshCw,  pro: true },
    { label: 'Export',     href: '/export',              icon: Download,   pro: true },
    { label: 'Character',  href: '/settings/character',  icon: Palette         },
    { label: 'Pricing',    href: '/pricing',             icon: Tag             },
] as const;

function isActive(href: string, pathname: string, search: string): boolean {
    if (href === '/friends?tab=activity') return pathname === '/friends' && search.includes('tab=activity');
    if (href === '/friends')              return pathname === '/friends' && !search.includes('tab=activity');
    return pathname === href;
}

// ── Curve SVG — right edge of left-sliding panel ──────────────────────────────
// Mirrors the reference component: panel slides LEFT so the curved edge goes RIGHT.
// SVG sits 99px to the right of the panel (-right-[99px]) and fills with bg-surface.
// Path morphs from a pronounced rightward bulge (entry) to a straight edge (rest).

function Curve() {
    const [H, setH] = useState(window.innerHeight);
    useEffect(() => {
        const onResize = () => setH(window.innerHeight);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // The -200 segments extend into the panel area (clipped by SVG viewport)
    // so there's no gap between the panel fill and this SVG fill.
    const initialPath = `M0 0 L-200 0 L-200 ${H} L0 ${H} Q200 ${H / 2} 0 0`;
    const targetPath  = `M0 0 L-200 0 L-200 ${H} L0 ${H} Q0 ${H / 2} 0 0`;

    const variants = {
        initial: { d: initialPath },
        enter:   { d: targetPath,  transition: { duration: 1,   ease: EASE } },
        exit:    { d: initialPath, transition: { duration: 0.8, ease: EASE } },
    };

    return (
        <svg
            className="absolute top-0 -right-[99px] w-[100px] h-full stroke-none pointer-events-none"
            style={{ fill: '#111318' }}
        >
            <motion.path variants={variants} initial="initial" animate="enter" exit="exit" />
        </svg>
    );
}

// ── NavItem ────────────────────────────────────────────────────────────────────

interface NavItemProps {
    label: string;
    href: string;
    icon: React.ElementType;
    index: number;
    active: boolean;
    pro?: boolean;
    isPro: boolean;
    onNavigate: () => void;
}

function NavItem({ label, icon: Icon, index, active, pro, isPro, onNavigate }: NavItemProps) {
    return (
        <motion.button
            initial="initial"
            whileHover="whileHover"
            onClick={onNavigate}
            className={`w-full flex items-center gap-4 py-4 border-b transition-colors duration-300 cursor-pointer text-left ${
                active
                    ? 'border-accent/30'
                    : 'border-white/[0.08] hover:border-white/20'
            }`}
        >
            <span className={`text-xs font-mono tabular-nums w-5 shrink-0 ${active ? 'text-accent' : 'text-white/30'}`}>
                0{index}
            </span>
            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-accent' : 'text-white/50'}`} />

            <motion.span
                variants={{ initial: { x: 0 }, whileHover: { x: -8 } }}
                transition={{ type: 'spring', staggerChildren: 0.04, delayChildren: 0.1 }}
                className={`text-2xl font-light tracking-tight leading-none select-none ${
                    active ? 'text-accent' : 'text-white'
                }`}
            >
                {label.split('').map((ch, i) => (
                    <motion.span
                        key={i}
                        variants={{ initial: { x: 0 }, whileHover: { x: 10 } }}
                        transition={{ type: 'spring' }}
                        className="inline-block"
                    >
                        {ch === ' ' ? ' ' : ch}
                    </motion.span>
                ))}
            </motion.span>

            {pro && !isPro && (
                <Lock className="w-3 h-3 text-white/25 shrink-0 ml-auto" />
            )}
        </motion.button>
    );
}

// ── CurvedMenu ────────────────────────────────────────────────────────────────

export default function CurvedMenu() {
    const { user, logout, refetchUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isOpen, setIsOpen]           = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [profileInterac, setProfileInterac] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSaved, setProfileSaved]   = useState(false);
    const [profileError, setProfileError]   = useState('');
    const profileRef = useRef<HTMLDivElement>(null);

    // Close profile popover on outside click
    useEffect(() => {
        if (!showProfile) return;
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node))
                setShowProfile(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showProfile]);

    const openProfile = () => {
        setProfileName(user?.name || '');
        setProfileInterac(user?.interac_email || '');
        setProfileSaved(false);
        setProfileError('');
        setShowProfile(true);
    };

    const saveProfile = async () => {
        if (!profileName.trim()) { setProfileError('Name cannot be blank'); return; }
        setProfileSaving(true);
        setProfileError('');
        try {
            await authApi.updateMe({
                name: profileName.trim(),
                interac_email: profileInterac.trim() || undefined,
            });
            await refetchUser();
            setProfileSaved(true);
            setTimeout(() => setShowProfile(false), 900);
        } catch (err: any) {
            setProfileError(err.message || 'Save failed');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleNavigate = (href: string) => {
        navigate(href);
        setIsOpen(false);
        setShowProfile(false);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isPro = user?.subscription_tier === 'pro';

    return (
        <>
            {/* Logo trigger — fixed top-left, always on top */}
            <motion.button
                onClick={() => setIsOpen(v => !v)}
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
                animate={{ scale: isOpen ? 0.88 : 1 }}
                whileTap={{ scale: 0.82 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed left-0 top-0 m-4 z-[60] cursor-pointer"
            >
                <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
                    <Wallet className="w-5 h-5 text-white" />
                </div>
            </motion.button>

            <AnimatePresence mode="wait">
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Sliding panel */}
                        <motion.div
                            key="panel"
                            variants={PANEL_SLIDE}
                            initial="initial"
                            animate="enter"
                            exit="exit"
                            className="fixed left-0 top-0 z-50 h-[100dvh] w-80 flex flex-col bg-[#111318]"
                        >
                            {/* Brand header */}
                            <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-white/10 shrink-0">
                                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0">
                                    <Wallet className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-base font-bold text-white">
                                    TandemPay
                                </span>
                            </div>

                            {/* Nav items */}
                            <nav className="flex-1 overflow-y-auto px-6 pt-5 pb-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-4 text-white/40">
                                    Navigation
                                </p>
                                {NAV_ITEMS.map((item, i) => (
                                    <NavItem
                                        key={item.href}
                                        {...item}
                                        index={i + 1}
                                        active={isActive(item.href, location.pathname, location.search)}
                                        isPro={isPro}
                                        onNavigate={() => handleNavigate(item.href)}
                                    />
                                ))}
                            </nav>

                            {/* Footer — theme, notifications, user */}
                            <div
                                className="shrink-0 px-5 pt-4 pb-5 border-t border-white/10 space-y-2"
                                ref={profileRef}
                            >
                                {/* Theme + notifications row */}
                                <div className="flex items-center justify-between px-1 pb-2">
                                    <span className="text-xs text-white/40">
                                        Appearance
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <ThemeToggle />
                                        <NotificationBell />
                                    </div>
                                </div>

                                {/* Profile row */}
                                <button
                                    onClick={openProfile}
                                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    {user && <Avatar name={user.name} color={user.avatar_color} size="sm" />}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium truncate text-white">
                                                {user?.name}
                                            </span>
                                            {isPro && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                        </div>
                                        <p className="text-xs truncate text-white/50">
                                            {user?.email}
                                        </p>
                                    </div>
                                    <Pencil className="w-3.5 h-3.5 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </button>

                                {/* Inline profile edit */}
                                {showProfile && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold mb-1 text-white/50">
                                                Display name
                                            </label>
                                            <input
                                                value={profileName}
                                                onChange={e => setProfileName(e.target.value)}
                                                className="w-full px-3 py-2 text-sm text-white bg-white/5 border border-white/10 rounded-xl placeholder-white/20 focus:outline-none focus:border-accent transition-colors"
                                                placeholder="Your name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold mb-1 text-white/50">
                                                Interac e-Transfer email
                                            </label>
                                            <input
                                                value={profileInterac}
                                                onChange={e => setProfileInterac(e.target.value)}
                                                type="email"
                                                className="w-full px-3 py-2 text-sm text-white bg-white/5 border border-white/10 rounded-xl placeholder-white/20 focus:outline-none focus:border-accent transition-colors"
                                                placeholder="Optional"
                                            />
                                        </div>
                                        {profileError && (
                                            <p className="text-xs text-danger">{profileError}</p>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowProfile(false)}
                                                className="flex-1 py-2 text-xs text-white/60 rounded-xl transition-colors cursor-pointer hover:bg-white/10 bg-white/5"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={saveProfile}
                                                disabled={profileSaving}
                                                className="flex-1 py-2 text-xs font-bold text-white bg-accent hover:bg-accent/90 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                                            >
                                                {profileSaving ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : profileSaved ? (
                                                    <><CheckCircle2 className="w-3 h-3" /> Saved!</>
                                                ) : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Sign out */}
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/50 transition-colors cursor-pointer hover:bg-danger/10 hover:text-danger"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </div>

                            {/* Curved right edge */}
                            <Curve />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

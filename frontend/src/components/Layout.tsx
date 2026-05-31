import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Wallet, Menu, X, Users, Activity, Pencil, Loader2, CheckCircle2, RefreshCw, Download, Tag, Lock, Crown, Palette } from 'lucide-react';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import { authApi } from '../services/api';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout, refetchUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
    const [showProfile, setShowProfile] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [profileInterac, setProfileInterac] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [profileError, setProfileError] = useState('');
    const profileRef = useRef<HTMLDivElement>(null);

    const toggleCollapsed = () => setCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('sidebar_collapsed', String(next));
        return next;
    });

    useEffect(() => {
        if (!showProfile) return;
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfile(false);
            }
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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navBtn = (active: boolean, activeClass: string) =>
        `w-full flex items-center py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
            collapsed ? 'justify-center px-2' : 'gap-3 px-4'
        } ${active ? activeClass : 'text-secondary hover:text-primary hover:bg-surface-hover'}`;

    return (
        <div className="min-h-screen bg-bg flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden bg-surface border-b border-border p-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-primary">TandemPay</span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <NotificationBell />
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 bg-surface border-r border-border flex flex-col h-full
                shadow-[1px_0_0_rgba(0,0,0,0.05)] transform transition-all duration-300 ease-in-out
                w-64 md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                ${collapsed ? 'md:w-14' : 'md:w-64'}
            `}>
                {/* Logo — desktop: toggle collapse; mobile: static + close button */}
                <div className={`border-b border-border flex items-center ${collapsed ? 'justify-center p-3' : 'justify-between p-6'}`}>
                    <button
                        onClick={toggleCollapsed}
                        className="hidden md:flex items-center gap-3 hover:opacity-75 transition-opacity cursor-pointer"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center shrink-0">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        {!collapsed && <span className="text-lg font-bold text-primary">TandemPay</span>}
                    </button>
                    <div className="md:hidden flex items-center gap-3">
                        <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-primary">TandemPay</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden p-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className={`flex-1 space-y-2 ${collapsed ? 'p-2' : 'p-4'}`}>
                    <button
                        title="Dashboard"
                        onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}
                        className={navBtn(location.pathname === '/dashboard', 'bg-accent/10 text-accent font-bold')}
                    >
                        <LayoutDashboard className="w-5 h-5 shrink-0" />
                        {!collapsed && 'Dashboard'}
                    </button>
                    <button
                        title="Payments"
                        onClick={() => { navigate('/payments'); setIsMobileMenuOpen(false); }}
                        className={navBtn(location.pathname === '/payments', 'bg-indigo/10 text-indigo font-bold')}
                    >
                        <Wallet className="w-5 h-5 shrink-0" />
                        {!collapsed && 'Payments'}
                    </button>
                    <button
                        title="Friends"
                        onClick={() => { navigate('/friends'); setIsMobileMenuOpen(false); }}
                        className={navBtn(
                            location.pathname === '/friends' && !location.search.includes('tab=activity'),
                            'bg-warning/10 text-warning font-bold'
                        )}
                    >
                        <Users className="w-5 h-5 shrink-0" />
                        {!collapsed && 'Friends'}
                    </button>
                    <button
                        title="Activity"
                        onClick={() => { navigate('/friends?tab=activity'); setIsMobileMenuOpen(false); }}
                        className={navBtn(
                            location.pathname === '/friends' && location.search.includes('tab=activity'),
                            'bg-accent/10 text-accent font-bold'
                        )}
                    >
                        <Activity className="w-5 h-5 shrink-0" />
                        {!collapsed && 'Activity'}
                    </button>
                    <button
                        title="Recurring"
                        onClick={() => { navigate('/recurring'); setIsMobileMenuOpen(false); }}
                        className={navBtn(location.pathname === '/recurring', 'bg-accent/10 text-accent font-bold')}
                    >
                        <RefreshCw className="w-5 h-5 shrink-0" />
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left">Recurring</span>
                                {user?.subscription_tier !== 'pro' && <Lock className="w-3 h-3 text-secondary/40" />}
                            </>
                        )}
                    </button>
                    <button
                        title="Export"
                        onClick={() => { navigate('/export'); setIsMobileMenuOpen(false); }}
                        className={navBtn(location.pathname === '/export', 'bg-accent/10 text-accent font-bold')}
                    >
                        <Download className="w-5 h-5 shrink-0" />
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left">Export</span>
                                {user?.subscription_tier !== 'pro' && <Lock className="w-3 h-3 text-secondary/40" />}
                            </>
                        )}
                    </button>
                    <button
                        title="Character"
                        onClick={() => { navigate('/settings/character'); setIsMobileMenuOpen(false); }}
                        className={navBtn(location.pathname === '/settings/character', 'bg-accent/10 text-accent font-bold')}
                    >
                        <Palette className="w-5 h-5 shrink-0" />
                        {!collapsed && 'Character'}
                    </button>
                    <button
                        title="Pricing"
                        onClick={() => { navigate('/pricing'); setIsMobileMenuOpen(false); }}
                        className={navBtn(location.pathname === '/pricing', 'bg-accent/10 text-accent font-bold')}
                    >
                        <Tag className="w-5 h-5 shrink-0" />
                        {!collapsed && 'Pricing'}
                    </button>
                </nav>

                {/* Theme & Notifications — desktop only */}
                <div className={`hidden md:flex flex-col gap-3 pb-4 border-b border-border/60 mb-2 ${collapsed ? 'px-2 items-center' : 'px-4'}`}>
                    {collapsed ? (
                        <>
                            <ThemeToggle />
                            <NotificationBell />
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-primary/70">Theme</span>
                                <ThemeToggle />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-primary/70">Notifications</span>
                                <NotificationBell />
                            </div>
                        </>
                    )}
                </div>

                {/* User section + Edit Profile popover */}
                <div className={`border-t border-border relative ${collapsed ? 'p-2' : 'p-4'}`} ref={profileRef}>
                    {collapsed ? (
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={openProfile}
                                title={user?.name}
                                className="p-2 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                                {user && <Avatar name={user.name} color={user.avatar_color} size="sm" />}
                            </button>
                            <button
                                onClick={handleLogout}
                                title="Sign out"
                                className="p-2 text-secondary hover:text-danger hover:bg-danger/10 rounded-xl transition-colors cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={openProfile}
                                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-hover transition-all duration-200 group cursor-pointer"
                                aria-label="Edit profile"
                            >
                                {user && <Avatar name={user.name} color={user.avatar_color} size="sm" />}
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-sm font-medium text-primary truncate">{user?.name}</span>
                                        {user?.subscription_tier === 'pro' && (
                                            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-xs text-secondary truncate">{user?.email}</p>
                                </div>
                                <Pencil className="w-3.5 h-3.5 text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-secondary hover:text-danger hover:bg-danger/10 transition-all duration-200 cursor-pointer mt-1"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </button>
                        </>
                    )}

                    {showProfile && (
                        <div className="absolute bottom-full left-0 mb-2 w-72 bg-bg border border-border rounded-2xl shadow-2xl p-5 z-50 animate-in slide-in-from-bottom-2 duration-200">
                            <h3 className="text-sm font-bold text-primary mb-4">Edit Profile</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-secondary mb-1">Display name</label>
                                    <input
                                        value={profileName}
                                        onChange={e => setProfileName(e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-primary placeholder-secondary/50 focus:outline-none focus:border-accent transition-colors"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-secondary mb-1">Interac e-Transfer email</label>
                                    <input
                                        value={profileInterac}
                                        onChange={e => setProfileInterac(e.target.value)}
                                        type="email"
                                        className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-primary placeholder-secondary/50 focus:outline-none focus:border-accent transition-colors"
                                        placeholder="Optional — used for e-transfers"
                                    />
                                </div>
                            </div>
                            {profileError && <p className="text-xs text-danger mt-2">{profileError}</p>}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setShowProfile(false)}
                                    className="flex-1 py-2 text-sm text-secondary hover:text-primary bg-surface hover:bg-border rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveProfile}
                                    disabled={profileSaving}
                                    className="flex-1 py-2 text-sm font-bold text-white bg-accent hover:bg-accent/90 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                                >
                                    {profileSaving ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : profileSaved ? (
                                        <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</>
                                    ) : 'Save'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main content */}
            <main className={`flex-1 transition-all duration-300 ease-in-out p-4 sm:p-6 md:p-8 w-full max-w-full min-h-[calc(100vh-73px)] md:min-h-screen ${collapsed ? 'md:ml-14' : 'md:ml-64'}`}>
                {children}
            </main>
        </div>
    );
}

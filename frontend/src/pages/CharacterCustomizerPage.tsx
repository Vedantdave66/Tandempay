import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usersApi } from "../services/api";
import Characters from "../components/Characters";

const COLOR_SWATCHES = [
    '#34D399',
    '#F59E0B',
    '#818CF8',
    '#F87171',
    '#38BDF8',
    '#E879F9',
];

const SHAPE_OPTIONS: { value: string; label: string; w: number; h: number; radius: string }[] = [
    { value: 'rect',  label: 'Block',  w: 28, h: 52, radius: '6px 6px 0 0'   },
    { value: 'tall',  label: 'Slim',   w: 18, h: 56, radius: '4px 4px 0 0'   },
    { value: 'semi',  label: 'Dome',   w: 48, h: 24, radius: '24px 24px 0 0' },
    { value: 'round', label: 'Curve',  w: 32, h: 42, radius: '20px 20px 0 0' },
];

export default function CharacterCustomizerPage() {
    const { user, refetchUser } = useAuth();
    const navigate = useNavigate();

    const [shape, setShape]       = useState(user?.character_shape    ?? 'rect');
    const [color, setColor]       = useState(user?.character_color    ?? '#34D399');
    const [nickname, setNickname] = useState(user?.character_nickname ?? '');
    const [saving, setSaving]     = useState(false);
    const [saved, setSaved]       = useState(false);
    const [error, setError]       = useState('');

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSaved(false);
        try {
            await usersApi.patchCharacter({
                shape,
                color,
                nickname: nickname.trim() || undefined,
            });
            await refetchUser();
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err: any) {
            setError(err.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative min-h-screen grid lg:grid-cols-2 bg-bg">
            {/* Background dot grid */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(150,150,150,0.18) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />

            {/* Left panel — live preview */}
            <div className="relative hidden lg:flex flex-col justify-between p-12">
                <div className="relative z-10 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-6">Preview</p>
                    <div className="relative flex items-end justify-center h-[500px]">
                        <div className="relative" style={{ width: '550px', height: '400px' }}>
                            <Characters />
                        </div>
                    </div>
                </div>

                {/* Ambient glow that follows the selected colour */}
                <div
                    className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-colors duration-700"
                    style={{ backgroundColor: color }}
                />
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Right panel — controls */}
            <div className="flex items-center justify-center p-8">
                <div className="w-full max-w-[420px]">
                    {/* Mobile back */}
                    <button
                        onClick={() => navigate(-1)}
                        className="lg:hidden flex items-center gap-2 text-sm text-secondary hover:text-primary mb-8 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div className="mb-10">
                        <h1 className="text-2xl font-bold tracking-tight text-primary mb-1">Your Character</h1>
                        <p className="text-sm text-secondary">Choose the look that represents you in group splits.</p>
                    </div>

                    <div className="space-y-8">
                        {/* Colour picker */}
                        <div>
                            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-3">
                                Colour
                            </label>
                            <div className="flex gap-3 flex-wrap">
                                {COLOR_SWATCHES.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className="w-10 h-10 rounded-full transition-all duration-150 cursor-pointer"
                                        style={{
                                            backgroundColor: c,
                                            outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                                            outlineOffset: '2px',
                                            boxShadow: color === c ? `0 0 12px ${c}88` : undefined,
                                        }}
                                        aria-label={c}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Shape picker */}
                        <div>
                            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-3">
                                Shape
                            </label>
                            <div className="grid grid-cols-4 gap-3">
                                {SHAPE_OPTIONS.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => setShape(s.value)}
                                        className={`flex flex-col items-center justify-end gap-2 py-3 px-2 rounded-xl border transition-all duration-150 cursor-pointer h-24 ${
                                            shape === s.value
                                                ? 'border-accent bg-accent/10'
                                                : 'border-border bg-surface hover:bg-surface-hover hover:border-border'
                                        }`}
                                    >
                                        <div
                                            style={{
                                                width: s.w,
                                                height: s.h,
                                                borderRadius: s.radius,
                                                backgroundColor: shape === s.value ? color : 'var(--color-border, #3f3f46)',
                                                transition: 'background-color 0.2s',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span className="text-[10px] font-semibold text-secondary leading-none">
                                            {s.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Nickname */}
                        <div>
                            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                                Nickname{' '}
                                <span className="normal-case font-normal text-secondary/70">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={e => setNickname(e.target.value.slice(0, 20))}
                                placeholder="e.g. The Splitter"
                                className="flex h-12 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                            />
                            <p className="text-xs text-secondary mt-1.5">{nickname.length} / 20</p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}

                        {/* Save */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-emerald-500 hover:from-accent hover:to-emerald-600 text-white font-bold text-sm transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {saving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            ) : saved ? (
                                <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                            ) : (
                                'Save Character'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { groupsApi, GroupPreview } from '../services/api';
import TandemPayLogo from '../components/TandemPayLogo';
import { Wallet, Download, Smartphone } from 'lucide-react';

export default function JoinPage() {
    const { token } = useParams<{ token: string }>();
    const [preview, setPreview] = useState<GroupPreview | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setError('Invalid invite link.');
            setLoading(false);
            return;
        }
        groupsApi.previewInvite(token)
            .then(data => setPreview(data))
            .catch(() => setError('This invite link is invalid or has expired.'))
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-sm text-center">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2.5 mb-10">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <TandemPayLogo size="nav" />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-surface animate-pulse" />
                        <div className="h-3 w-40 bg-surface rounded animate-pulse" />
                        <div className="h-2 w-28 bg-surface rounded animate-pulse" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-secondary text-sm">{error}</p>
                        <a href="/" className="text-accent text-sm hover:underline">
                            Go to TandemPay →
                        </a>
                    </div>
                ) : preview && (
                    <>
                        <p className="text-secondary text-sm mb-2">
                            {preview.creator_name} invited you to
                        </p>
                        <h1 className="text-primary text-3xl font-black mb-2 leading-tight">
                            {preview.group_name}
                        </h1>
                        <p className="text-secondary text-sm mb-10">
                            {preview.member_count} member{preview.member_count !== 1 ? 's' : ''} already splitting bills
                        </p>

                        {/* Primary CTA — App Store */}
                        <a
                            href="https://apps.apple.com/ca/app/tandempay/id6744814484"
                            className="flex items-center justify-center gap-2 bg-accent text-bg rounded-2xl py-4 px-6 font-bold text-base mb-3 hover:opacity-90 transition-opacity no-underline"
                        >
                            <Download className="w-4 h-4" />
                            Download TandemPay
                        </a>

                        {/* Secondary — Open in app (custom scheme) */}
                        <a
                            href={`tandempay://join/${token}`}
                            className="flex items-center justify-center gap-2 border border-accent/25 bg-accent/5 text-accent rounded-2xl py-4 px-6 font-semibold text-sm hover:bg-accent/10 transition-colors no-underline"
                        >
                            <Smartphone className="w-4 h-4" />
                            Open in App
                        </a>

                        <p className="text-border text-xs mt-10">
                            Free Interac settlement for Canadian roommates 🇨🇦
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

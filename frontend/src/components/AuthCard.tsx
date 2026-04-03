import { ReactNode } from 'react';
import { Wallet } from 'lucide-react';
import AuthBackground from './AuthBackground';

interface AuthCardProps {
    children: ReactNode;
    footer?: ReactNode;
}

/**
 * Shared auth page wrapper — animated background, glassmorphic card,
 * staggered entrance animations for all child elements.
 */
export default function AuthCard({ children, footer }: AuthCardProps) {
    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4 overflow-hidden">
            <AuthBackground />

            <div className="w-full max-w-sm relative" style={{ zIndex: 1 }}>
                {/* Logo — entrance animation */}
                <div className="flex items-center justify-center gap-3 mb-10 auth-entrance" style={{ animationDelay: '0ms' }}>
                    <div className="w-12 h-12 bg-gradient-to-br from-accent to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30 auth-logo-pulse">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-primary">Tandem</span>
                </div>

                {/* Card — glassmorphism + entrance animation */}
                <div
                    className="auth-card auth-entrance"
                    style={{ animationDelay: '100ms' }}
                >
                    {children}
                </div>

                {/* Footer — entrance animation */}
                {footer && (
                    <div className="auth-entrance" style={{ animationDelay: '250ms' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

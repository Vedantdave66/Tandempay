import { useNavigate } from 'react-router-dom';
import { Crown, Check, ArrowRight } from 'lucide-react';

const PRO_FEATURES = [
    { label: 'Recurring expenses', description: 'auto-split monthly bills' },
    { label: 'CSV & PDF exports', description: 'download your full history' },
    { label: 'Receipt OCR', description: 'scan and split itemized receipts' },
    { label: 'Advanced splits', description: 'percentages, weights, itemized' },
    { label: 'Auto Interac confirmation', description: 'no manual tap required' },
];

export default function ProSuccessPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
                    <Crown className="w-10 h-10 text-amber-400" />
                </div>

                <h1 className="text-3xl font-black text-primary tracking-tight mb-2">
                    You're now on TandemPay Pro
                </h1>
                <p className="text-secondary text-lg mb-10">Welcome to the full experience.</p>

                <div className="bg-surface border border-border rounded-2xl p-6 mb-8 text-left space-y-3">
                    {PRO_FEATURES.map(({ label, description }) => (
                        <div key={label} className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-accent shrink-0" />
                            <span className="text-sm text-primary font-semibold">
                                {label}
                                <span className="text-secondary font-normal"> — {description}</span>
                            </span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center gap-2 bg-gradient-to-br from-[#4ADE80] to-[#22C55E] hover:from-[#22C55E] hover:to-[#16a34a] text-[#064E3B] font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_25px_rgba(74,222,128,0.5)] hover:-translate-y-0.5 cursor-pointer"
                >
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

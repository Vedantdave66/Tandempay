import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../services/api';
import { Download, FileText, Sheet, Crown, Lock, Loader2 } from 'lucide-react';

async function downloadExport(format: 'csv' | 'pdf'): Promise<void> {
    const token = localStorage.getItem('token');
    const resp = await fetch(`${BASE_URL}/export/${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Export failed' }));
        throw new Error(err.detail || 'Export failed');
    }

    const blob = await resp.blob();
    const disposition = resp.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="(.+?)"/);
    const filename = match ? match[1] : `tandempay_expenses.${format}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export default function ExportPage() {
    const { user } = useAuth();
    const isPro = user?.subscription_tier === 'pro';

    const [csvLoading, setCsvLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCsv = async () => {
        setCsvLoading(true);
        setError('');
        try {
            await downloadExport('csv');
        } catch (e: any) {
            setError(e.message || 'CSV download failed');
        } finally {
            setCsvLoading(false);
        }
    };

    const handlePdf = async () => {
        setPdfLoading(true);
        setError('');
        try {
            await downloadExport('pdf');
        } catch (e: any) {
            setError(e.message || 'PDF download failed');
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Download className="w-6 h-6 text-accent" />
                    Export Expenses
                    {isPro && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-accent/10 text-accent rounded-full">
                            <Crown className="w-3 h-3" /> Pro
                        </span>
                    )}
                </h1>
                <p className="text-sm text-secondary mt-1">
                    Download all your expense history in one click
                </p>
            </div>

            {!isPro ? (
                <div className="p-5 bg-accent/5 border border-accent/20 rounded-2xl flex items-start gap-3">
                    <Crown className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-primary">Upgrade to Pro to export your expenses</p>
                        <p className="text-xs text-secondary mt-0.5">
                            Pro members can download their full expense history as CSV or PDF at any time.
                        </p>
                        <a
                            href="/settings"
                            className="inline-block mt-2 text-xs font-bold text-accent hover:underline"
                        >
                            Upgrade now &rarr;
                        </a>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
                            {error}
                        </div>
                    )}

                    {/* CSV card */}
                    <div className="p-5 bg-surface border border-border rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                            <Sheet className="w-6 h-6 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-primary">CSV Spreadsheet</p>
                            <p className="text-xs text-secondary mt-0.5">
                                Open in Excel, Google Sheets, or Numbers
                            </p>
                        </div>
                        <button
                            onClick={handleCsv}
                            disabled={csvLoading || pdfLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                        >
                            {csvLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Download CSV
                        </button>
                    </div>

                    {/* PDF card */}
                    <div className="p-5 bg-surface border border-border rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo/10 rounded-xl flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-indigo" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-primary">PDF Report</p>
                            <p className="text-xs text-secondary mt-0.5">
                                Formatted table with header — ready to print or share
                            </p>
                        </div>
                        <button
                            onClick={handlePdf}
                            disabled={csvLoading || pdfLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo text-white text-sm font-semibold rounded-xl hover:bg-indigo/90 transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                        >
                            {pdfLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Download PDF
                        </button>
                    </div>

                    <p className="text-xs text-secondary text-center pt-1">
                        Exports include all expenses where you are a participant, sorted newest first.
                    </p>
                </div>
            )}

            {!isPro && (
                <div className="mt-6 p-5 bg-surface border border-border rounded-2xl opacity-40 pointer-events-none select-none">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-border rounded-xl flex items-center justify-center shrink-0">
                            <Lock className="w-6 h-6 text-secondary" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-primary">CSV &amp; PDF downloads</p>
                            <p className="text-xs text-secondary mt-0.5">Available with Pro</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { BASE_URL } from '../services/api';

export default function UpgradeButton() {
    const [loading, setLoading] = useState(false);

    const startCheckout = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(`${BASE_URL}/subscription/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!resp.ok) throw new Error('checkout failed');
            const { checkout_url } = await resp.json();
            window.location.href = checkout_url;
        } catch {
            alert('Failed to start checkout. Please try again.');
            setLoading(false);
        }
    };

    return (
        <button
            onClick={startCheckout}
            disabled={loading}
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-accent hover:underline disabled:opacity-60 cursor-pointer"
        >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Upgrade now &rarr;
        </button>
    );
}

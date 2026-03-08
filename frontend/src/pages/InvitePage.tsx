import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Wallet } from 'lucide-react';

export default function InvitePage() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        if (authLoading) return;

        // Note: The ProtectedRoute will handle redirecting unauthenticated users to /register first

        async function joinGroup() {
            if (!groupId) {
                setError('Invalid invite link');
                return;
            }

            try {
                // Call the join endpoint
                await groupsApi.join(groupId);
                // Success! Redirect directly into the group
                navigate(`/groups/${groupId}`);
            } catch (err: any) {
                setError(err.message || 'Failed to join group');
            }
        }

        joinGroup();
    }, [groupId, user, authLoading, navigate]);

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-sm text-center">
                <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/20 animate-pulse">
                    <Wallet className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-primary mb-2">Joining Group...</h1>
                <p className="text-secondary mb-8">Please wait while we add you to the split.</p>

                {error && (
                    <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg p-4 mb-5">
                        <p className="font-semibold mb-1">Oops!</p>
                        {error}
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="mt-4 block w-full bg-surface border border-border text-primary py-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

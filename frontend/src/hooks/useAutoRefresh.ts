import { useEffect, useRef, useCallback } from 'react';

/**
 * Auto-refresh hook that:
 * 1. Polls at a configurable interval (default 30s)
 * 2. Re-fetches when the browser tab regains visibility (user switches back)
 * 3. Re-fetches when the window regains focus
 * 4. Debounces rapid visibility/focus events to avoid spam
 * 
 * @param fetchFn - The async function to call for refreshing data
 * @param intervalMs - Polling interval in milliseconds (default: 30000)
 * @param enabled - Whether auto-refresh is active (default: true)
 */
export function useAutoRefresh(
    fetchFn: () => Promise<void> | void,
    intervalMs: number = 30000,
    enabled: boolean = true
) {
    const lastFetchRef = useRef<number>(0);
    const isMountedRef = useRef(true);

    // Stable reference to the fetch function
    const stableFetch = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        // Debounce: skip if we fetched less than 5 seconds ago
        const now = Date.now();
        if (now - lastFetchRef.current < 5000) return;
        lastFetchRef.current = now;
        
        try {
            await fetchFn();
        } catch {
            // Silent fail — individual pages handle their own error states
        }
    }, [fetchFn]);

    useEffect(() => {
        isMountedRef.current = true;

        if (!enabled) return;

        // 1. Periodic polling
        const interval = setInterval(stableFetch, intervalMs);

        // 2. Re-fetch on visibility change (user switches back to this tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                stableFetch();
            }
        };

        // 3. Re-fetch on window focus (user alt-tabs back)
        const handleFocus = () => {
            stableFetch();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            isMountedRef.current = false;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [stableFetch, intervalMs, enabled]);
}

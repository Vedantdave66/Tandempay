import CurvedMenu from './CurvedMenu';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-bg">
            <CurvedMenu />
            {/* pt-16 clears the fixed hamburger button (44px + 16px margin) */}
            <main className="w-full max-w-full min-h-screen p-4 sm:p-6 md:p-8 pt-16">
                {children}
            </main>
        </div>
    );
}

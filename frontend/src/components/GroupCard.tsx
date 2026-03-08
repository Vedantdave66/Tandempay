import { GroupListItem } from '../services/api';
import { Users, ArrowRight, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GroupCardProps {
    group: GroupListItem;
}

export default function GroupCard({ group }: GroupCardProps) {
    const navigate = useNavigate();

    // Generate a consistent, rich gradient string based on the group's ID
    const getGradient = (str: string) => {
        const colors = [
            'from-emerald-400 to-teal-500',
            'from-blue-400 to-indigo-500',
            'from-purple-400 to-fuchsia-500',
            'from-rose-400 to-orange-400',
            'from-amber-400 to-yellow-500',
            'from-cyan-400 to-blue-500',
        ];
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    const gradient = getGradient(group.id);

    return (
        <button
            onClick={() => navigate(`/groups/${group.id}`)}
            className="w-full bg-surface border border-border/60 rounded-3xl p-6 hover:bg-surface-light hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 text-left group cursor-pointer shadow-lg shadow-black/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col"
        >
            <div className="flex items-start gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-inner`}>
                    <Wallet className="w-6 h-6 text-white drop-shadow-md" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-lg font-bold text-primary truncate mb-1 group-hover:text-accent transition-colors">{group.name}</h3>
                    <div className="flex items-center gap-1.5 text-secondary text-xs font-medium bg-bg w-fit px-2 py-1 rounded-md border border-border/50">
                        <Users className="w-3 h-3" />
                        <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-border/50 flex items-end justify-between">
                <div>
                    <span className="text-xs text-secondary font-medium uppercase tracking-wider block mb-1">Total Expenses</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-primary tracking-tight">
                            ${group.total_expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center group-hover:bg-accent group-hover:scale-110 transition-all duration-300 shadow-sm border border-border/50 group-hover:border-transparent">
                    <ArrowRight className="w-5 h-5 text-secondary group-hover:text-white transition-colors" />
                </div>
            </div>
        </button>
    );
}

export function toArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (Array.isArray((raw as any)?.items)) return (raw as any).items as T[];
    if (Array.isArray((raw as any)?.groups)) return (raw as any).groups as T[];
    return [];
}

export function timeAgo(d: string): string {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 1)    return 'Just now';
    if (diff < 60)   return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

export function buildMembersList(
    groupMembers: any[],
    user: any,
    accentColor: string,
): Array<{ user_id: string; name: string; character_shape: string; character_color: string }> {
    const others = groupMembers
        .filter(m => m.user_id !== user?.id)
        .map(m => ({
            user_id: m.user_id,
            name: m.name,
            character_shape: m.character_shape ?? 'rect',
            character_color: m.character_color ?? m.avatar_color ?? accentColor,
        }));
    return [
        {
            user_id: user?.id ?? '',
            name: 'You',
            character_shape: user?.character_shape ?? 'rect',
            character_color: user?.character_color ?? accentColor,
        },
        ...others,
    ];
}

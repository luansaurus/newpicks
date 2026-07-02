'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useLeague } from '@/context/LeagueContext';
import { Globe, Users, Lock, Loader2, CheckCircle2 } from 'lucide-react';

interface LeagueSelectorProps {
  competitionId: number;
  currentUserId: string;
  onRowClick: () => void;
}

export function LeagueSelector({ competitionId, currentUserId, onRowClick }: LeagueSelectorProps) {
  const { activeLeague, selectLeague } = useLeague();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId || !currentUserId) return;
    
    const fetchLeagues = async () => {
      const { data } = await supabase
        .from('leagues')
        .select('*, league_members!inner(user_id)')
        .eq('competition_id', competitionId)
        .eq('league_members.user_id', currentUserId);
        
      if (data) setLeagues(data);
      setLoading(false);
    };
    fetchLeagues();
  }, [competitionId, currentUserId]);

  if (loading) {
    return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-500" size={20} /></div>;
  }

  return (
    <div className="py-2 max-h-60 overflow-y-auto scrollbar-thin">
      {/* OPÇÃO GLOBAL */}
      <button
        onClick={() => { selectLeague(null); onRowClick(); }}
        className={`w-full px-4 py-3 flex items-center justify-between transition-colors text-left ${!activeLeague ? 'bg-primary/20 text-primary border-l-2 border-primary' : 'hover:bg-white/5 text-slate-300 border-l-2 border-transparent'}`}
      >
        <div className="flex items-center gap-3">
          <Globe size={16} />
          <span className="text-sm font-medium">Liga Global</span>
        </div>
        {!activeLeague && <CheckCircle2 size={16} />}
      </button>

      {/* LIGAS DO USUÁRIO */}
      {leagues.map(league => (
        <button
          key={league.id}
          onClick={() => { selectLeague(league); onRowClick(); }}
          className={`w-full px-4 py-3 flex items-center justify-between transition-colors text-left ${activeLeague?.id === league.id ? 'bg-primary/20 text-primary border-l-2 border-primary' : 'hover:bg-white/5 text-slate-300 border-l-2 border-transparent'}`}
        >
          <div className="flex items-center gap-3">
            {league.is_private ? <Lock size={16} /> : <Users size={16} />}
            <span className="text-sm font-medium truncate max-w-[160px]">{league.name}</span>
          </div>
          {activeLeague?.id === league.id && <CheckCircle2 size={16} />}
        </button>
      ))}
    </div>
  );
}
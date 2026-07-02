'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { LeagueManager } from '@/components/shared/LeagueManager';
import { useCompetition } from '@/context/CompetitionContext';
import { Loader2, Trophy } from 'lucide-react';

export default function LeaguesPage() {
  const { activeCompetition } = useCompetition();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);
      setLoading(false);
    };
    initUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!currentUserId || !activeCompetition?.id) {
    return (
      <div className="text-center py-20 flex flex-col items-center gap-4 text-slate-500">
        <Trophy size={48} className="opacity-20" />
        <p>Selecione uma competição no menu superior para visualizar as ligas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-2 uppercase tracking-tight">Ligas Customizadas</h1>
        <p className="text-slate-400 text-sm">Gerencie suas ligas, ajuste regras de pontuação ou entre em grupos de amigos.</p>
      </div>

      <LeagueManager competitionId={activeCompetition.id} currentUserId={currentUserId} />
    </div>
  );
}
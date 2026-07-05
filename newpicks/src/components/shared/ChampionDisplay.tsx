'use client';

import { Trophy, Crown, Medal, Award } from 'lucide-react';

interface ChampionDisplayProps {
  championName: string;
  championLogo?: string;
  userPosition?: number;
  userName?: string;
  isChampion?: boolean;
  leagueName?: string;
  isTestMode?: boolean;
}

export function ChampionDisplay({ 
  championName, 
  championLogo, 
  userPosition, 
  userName, 
  isChampion,
  leagueName,
  isTestMode = false
}: ChampionDisplayProps) {
  if (!championName) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-full">
            <Crown size={20} className="text-yellow-500" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-yellow-500/70 tracking-wider flex items-center gap-1">
              <Trophy size={12} className="text-yellow-500" />
              Campeão {leagueName ? `da ${leagueName}` : 'da Competição'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {championLogo && (
                <img src={championLogo} className="w-6 h-6 object-contain" alt={championName} />
              )}
              <span className="font-bold text-yellow-500 text-lg">{championName}</span>
            </div>
          </div>
        </div>

        {/* Se o usuário for o campeão, mostrar badge dourado */}
        {isChampion && (
          <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2 rounded-lg shadow-lg shadow-yellow-500/20">
            <span className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Crown size={16} className="text-slate-900" />
              Você é o Campeão!
            </span>
          </div>
        )}

        {/* Se o usuário não for o campeão, mostrar posição */}
        {!isChampion && userPosition && userName && (
          <div className="bg-slate-800/50 border border-slate-700/50 px-4 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Medal size={16} className="text-slate-400" />
              <span className="text-sm text-slate-300">
                Você ficou em <span className="font-bold text-white">#{userPosition}º</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              {userPosition === 1 ? (
                <>
                  <Award size={10} className="text-yellow-500" />
                  Ouro
                </>
              ) : userPosition === 2 ? (
                <>
                  <Award size={10} className="text-slate-400" />
                  Prata
                </>
              ) : userPosition === 3 ? (
                <>
                  <Award size={10} className="text-amber-700" />
                  Bronze
                </>
              ) : (
                'Participação'
              )}
            </p>
          </div>
        )}

        {/* Modo de Teste para Admin */}
        {isTestMode && (
          <div className="bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-lg">
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
              <Award size={12} />
              Modo Teste
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const NOME_MAP: Record<string, string> = {
  "Brazil": "Brasil", "Argentina": "Argentina", "Uruguay": "Uruguai", "Colombia": "Colômbia", "Ecuador": "Equador",
  "Peru": "Peru", "Chile": "Chile", "Paraguay": "Paraguai", "United States": "EUA", "USA": "EUA", "Mexico": "México", "Canada": "Canadá",
  "Panama": "Panamá", "Haiti": "Haiti", "Curaçao": "Curaçau", "Curacao": "Curaçau", "Germany": "Alemanha", "Spain": "Espanha",
  "France": "França", "England": "Inglaterra", "Netherlands": "Holanda", "Italy": "Itália", "Croatia": "Croácia",
  "Belgium": "Bélgica", "Switzerland": "Suíça", "Sweden": "Suécia", "Norway": "Noruega", "Portugal": "Portugal",
  "Scotland": "Escócia", "Austria": "Áustria", 
  "Bosnia and Herzegovina": "Bósnia e Herzegovina", "Bosnia-Herzegovina": "Bósnia e Herzegovina",
  "Czech Republic": "Tchéquia", "Czechia": "Tchéquia", "Turkey": "Turquia", "Turkiye": "Turquia", "Türkiye": "Turquia", 
  "Morocco": "Marrocos", "Senegal": "Senegal", "Ghana": "Gana", "Ivory Coast": "Costa do Marfim", "Cote d'Ivoire": "Costa do Marfim",
  "Egypt": "Egito", "Tunisia": "Tunísia", "Algeria": "Argélia", "South Africa": "África do Sul", 
  "DR Congo": "RD do Congo", "Congo DR": "RD do Congo",
  "Cape Verde": "Cabo Verde", "Cape Verde Islands": "Cabo Verde",
  "Japan": "Japão", "South Korea": "Coreia do Sul",
  "Australia": "Austrália", "Iran": "Irã", "Saudi Arabia": "Arábia Saudita", "Qatar": "Catar", "Jordan": "Jordânia",
  "Iraq": "Iraque", "Uzbekistan": "Uzbequistão", "New Zealand": "Nova Zelândia"
};

export async function GET(request: Request) {
  try {
    console.log('🚀 Iniciando sincronização...');
    
    const apiKey = process.env.API_FOOTBALL_KEY;
    console.log('🔑 Chave API:', apiKey ? 'Presente' : 'Ausente');
    
    if (!apiKey) {
      return NextResponse.json({ erro: "Chave API ausente." }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('📊 Buscando jogos da competição 1 (Copa do Mundo)...');
    
    const { data: todosOsJogos, error: dbError } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_time, status')
      .eq('competition_id', 1);

    if (dbError || !todosOsJogos) {
      console.error('❌ Erro no banco:', dbError);
      return NextResponse.json({ 
        erro: "Erro ao consultar o banco.", 
        detalhe: dbError?.message 
      }, { status: 500 });
    }

    console.log(`📊 ${todosOsJogos.length} jogos encontrados no banco`);

    const agora = new Date().getTime();
    const datasParaAPI = new Set<string>();
    const jogosAtivos = [];
    
    for (const jogo of todosOsJogos) {
      let safeTime = jogo.match_time.replace(' ', 'T');
      if (!safeTime.endsWith('Z') && !safeTime.match(/[+-]\d{2}:\d{2}$/)) safeTime += 'Z';
      
      const horaDoJogo = new Date(safeTime).getTime();
      const jogoComecou = agora >= horaDoJogo;
      const jogoNaoTerminou = jogo.status !== 'FT' && jogo.status !== 'FINISHED';
      
      if (jogoComecou && jogoNaoTerminou) {
        jogosAtivos.push(jogo);
        const d = new Date(safeTime);
        datasParaAPI.add(d.toISOString().split('T')[0]);
      }
    }

    console.log(`📊 ${jogosAtivos.length} jogos ativos encontrados`);
    console.log(`📅 Datas para consultar:`, Array.from(datasParaAPI));

    if (jogosAtivos.length === 0) {
      return NextResponse.json({ 
        message: "Nenhum jogo ativo no momento no Supabase.", 
        chamadasAPI: 0 
      });
    }

    let totalAtualizados = 0;
    let chamadasAPI = 0;
    
    for (const utcDate of datasParaAPI) {
      chamadasAPI++;
      
      const url = `https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${utcDate}&dateTo=${utcDate}`;
      
      console.log(`🔍 Consultando API para ${utcDate}...`);
      
      const response = await fetch(url, {
        headers: { 'X-Auth-Token': apiKey },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro na API para ${utcDate}: ${response.status}`);
        console.error(`   ${errorText.substring(0, 200)}`);
        continue;
      }

      const data = await response.json();
      const todosOsJogosAPI = data.matches || [];

      console.log(`   ${todosOsJogosAPI.length} jogos encontrados na API`);

      for (const jogoDB of jogosAtivos) {
        const fixtureAPI = todosOsJogosAPI.find((m: any) => {
          const casaAPI = NOME_MAP[m.homeTeam.name] || m.homeTeam.name;
          const foraAPI = NOME_MAP[m.awayTeam.name] || m.awayTeam.name;
          return casaAPI === jogoDB.home_team && foraAPI === jogoDB.away_team;
        });

        if (fixtureAPI) {
          const statusAPI = fixtureAPI.status;
          
          if (['SCHEDULED', 'TIMED', 'POSTPONED', 'CANCELLED', 'SUSPENDED'].includes(statusAPI)) {
            console.log(`   ⏳ ${jogoDB.home_team} vs ${jogoDB.away_team} - ${statusAPI} (ignorado)`);
            continue; 
          }

          let statusFinal = '1H'; 
          if (statusAPI === 'IN_PLAY') {
            if (fixtureAPI.score?.halfTime?.home !== null && fixtureAPI.score?.halfTime?.home !== undefined) {
              statusFinal = '2H';
            } else {
              statusFinal = '1H';
            }
          }
          
          if (statusAPI === 'PAUSED') statusFinal = 'HT';
          if (['FINISHED', 'AWARDED'].includes(statusAPI)) statusFinal = 'FT';
          
          const golsCasa = fixtureAPI.score?.fullTime?.home ?? 0;
          const golsFora = fixtureAPI.score?.fullTime?.away ?? 0;
          const penCasa = fixtureAPI.score?.penalties?.home ?? null;
          const penFora = fixtureAPI.score?.penalties?.away ?? null;

          const { data: updated, error } = await supabase.from('matches')
            .update({
              home_score: golsCasa,
              away_score: golsFora,
              home_penalty: penCasa,
              away_penalty: penFora,
              status: statusFinal
            })
            .eq('id', jogoDB.id) 
            .select();
          
          if (!error && updated && updated.length > 0) {
            totalAtualizados++;
            console.log(`✅ Atualizado: ${jogoDB.home_team} ${golsCasa}-${golsFora} ${jogoDB.away_team}`);
          }
        } else {
          console.log(`   ⚠️ Jogo não encontrado na API: ${jogoDB.home_team} vs ${jogoDB.away_team}`);
        }
      }
    }

    console.log(`✅ Sincronização concluída! ${totalAtualizados} jogos atualizados.`);

    return NextResponse.json({ 
      sucesso: true,
      mensagem: "Sincronização via Football-Data executada com sucesso!",
      jogosProcessados: totalAtualizados,
      chamadasAPI: chamadasAPI
    });

  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error);
    return NextResponse.json({ 
      erro: error.message || 'Erro interno'
    }, { status: 500 });
  }
}
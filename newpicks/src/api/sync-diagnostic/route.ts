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

export async function GET() {
  try {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      return NextResponse.json({ erro: "Chave API ausente." }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar jogos ativos
    const { data: todosOsJogos, error: dbError } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_time, status')
      .order('match_time', { ascending: true });

    if (dbError || !todosOsJogos) {
      return NextResponse.json({ erro: "Erro ao consultar o banco." });
    }

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

    // Para cada data, buscar na API e comparar
    const diagnostic = {
      totalJogosNoBanco: todosOsJogos.length,
      jogosAtivos: jogosAtivos.length,
      datasConsultadas: Array.from(datasParaAPI),
      jogosAtivosDetalhes: jogosAtivos.map(j => ({
        id: j.id,
        home: j.home_team,
        away: j.away_team,
        time: j.match_time,
        status: j.status
      })),
      apiResults: [] as any[]
    };

    for (const utcDate of datasParaAPI) {
      const url = `https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${utcDate}&dateTo=${utcDate}`;
      
      const response = await fetch(url, {
        headers: { 'X-Auth-Token': apiKey },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        diagnostic.apiResults.push({
          data: utcDate,
          error: `Status ${response.status}`,
          errorText: await response.text()
        });
        continue;
      }

      const data = await response.json();
      const todosOsJogosAPI = data.matches || [];

      // Mapear jogos da API
      const jogosAPIMapeados = todosOsJogosAPI.map((m: any) => ({
        homeOriginal: m.homeTeam.name,
        homeMapeado: NOME_MAP[m.homeTeam.name] || m.homeTeam.name,
        awayOriginal: m.awayTeam.name,
        awayMapeado: NOME_MAP[m.awayTeam.name] || m.awayTeam.name,
        status: m.status,
        score: m.score?.fullTime
      }));

      // Verificar correspondências
      const matchesFound = [];
      for (const jogoDB of jogosAtivos) {
        const jogoData = new Date(jogoDB.match_time).toISOString().split('T')[0];
        if (jogoData !== utcDate) continue;

        const match = todosOsJogosAPI.find((m: any) => {
          const homeAPI = NOME_MAP[m.homeTeam.name] || m.homeTeam.name;
          const awayAPI = NOME_MAP[m.awayTeam.name] || m.awayTeam.name;
          return homeAPI === jogoDB.home_team && awayAPI === jogoDB.away_team;
        });

        if (match) {
          matchesFound.push({
            id: jogoDB.id,
            homeDB: jogoDB.home_team,
            awayDB: jogoDB.away_team,
            homeAPI: NOME_MAP[match.homeTeam.name] || match.homeTeam.name,
            awayAPI: NOME_MAP[match.awayTeam.name] || match.awayTeam.name,
            statusAPI: match.status,
            scoreAPI: match.score?.fullTime
          });
        }
      }

      diagnostic.apiResults.push({
        data: utcDate,
        totalJogosAPI: todosOsJogosAPI.length,
        jogosAPI: jogosAPIMapeados,
        matchesFound: matchesFound,
        matchesNotFound: jogosAtivos
          .filter(j => new Date(j.match_time).toISOString().split('T')[0] === utcDate)
          .filter(j => !matchesFound.some(m => m.id === j.id))
          .map(j => ({ id: j.id, home: j.home_team, away: j.away_team }))
      });
    }

    return NextResponse.json({
      sucesso: true,
      diagnostic
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function TelaEspera({ sessaoId, onVerPodio }) {
  const [rankingTurma, setRankingTurma] = useState([]);
  const [todosFinalizaram, setTodosFinalizaram] = useState(false);
  const [videoEsperaSrc, setVideoEsperaSrc] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4');

  useEffect(() => {
    if (!sessaoId) return;

    const carregarDadosEspera = async () => {
      // Busca informações da sessão e do enredo para pegar o vídeo customizado de espera
      const { data: sessaoData } = await supabase
        .from('sessoes')
        .select('*, enredos(*)')
        .eq('id', sessaoId)
        .single();

      if (sessaoData?.enredos?.video_espera_url) {
        setVideoEsperaSrc(sessaoData.enredos.video_espera_url);
      }

      // Busca o placar dos participantes
      const { data, error } = await supabase
        .from('participantes')
        .select('*')
        .eq('sessao_id', sessaoId)
        .order('pontos', { ascending: false });

      if (!error && data) {
        setRankingTurma(data);

        // Verifica se há participantes e se absolutamente todos já finalizaram
        if (data.length > 0) {
          const concluidos = data.every((p) => p.finalizado === true);
          setTodosFinalizaram(concluidos);
        }
      }
    };

    carregarDadosEspera();

    // Inscrição Realtime para monitorar a turma em tempo real
    const channel = supabase
      .channel('espera-turma-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes', filter: `sessao_id=eq.${sessaoId}` },
        () => {
          carregarDadosEspera();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessaoId]);

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-slate-950 text-slate-100 p-2 md:p-4 gap-3 overflow-y-auto md:overflow-hidden box-border">
      
      {/* 1º BLOCO (Mobile: Topo / Desktop: Esquerda 30%): Mensagem de Conclusão e Status */}
      <div className="w-full md:w-[30%] h-auto md:h-full bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 flex flex-col justify-between shadow-xl text-center shrink-0">
        <div className="space-y-2 md:my-auto">
          <div className="text-3xl md:text-4xl animate-bounce">🚀</div>
          <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-emerald-400">
            Missão Concluída!
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed px-1">
            VOCÊ CONCLUIU TODOS OS DESAFIOS, AGUARDE OS DEMAIS FINALIZAREM.
          </p>
        </div>

        <div className="space-y-2.5 pt-3 md:pt-4 border-t border-slate-800 mt-3 md:mt-0">
          <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-amber-300 font-mono">
            {todosFinalizaram ? '🏁 Todos os agentes concluíram!' : '⏳ Aguardando demais jogadores...'}
          </div>

          {/* Botão de acesso ao pódio */}
          <button 
            onClick={onVerPodio}
            className="w-full py-2.5 md:py-3 bg-amber-500 hover:bg-amber-400 font-bold rounded-lg transition-all shadow-md text-slate-950 text-xs tracking-wide cursor-pointer uppercase"
          >
            Ver Pódio Oficial 🏆
          </button>
        </div>
      </div>

      {/* 2º BLOCO (Mobile: Meio / Desktop: Centro 50%): Vídeo Temático Customizado do Enredo em Loop */}
      <div className="w-full md:w-[50%] h-56 md:h-full bg-slate-900 border border-slate-800 rounded-xl p-2 md:p-3 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
        <div className="w-full h-full rounded-lg overflow-hidden bg-black flex items-center justify-center border border-slate-800 relative">
          <video 
            key={videoEsperaSrc}
            src={videoEsperaSrc} 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4 pointer-events-none">
            <span className="text-[11px] md:text-xs text-slate-300 font-mono bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700 backdrop-blur">
              Modo Espectador Ativo 🛋️
            </span>
          </div>
        </div>
      </div>

      {/* 3º BLOCO (Mobile: Base / Desktop: Direita 20%): Placar da Turma em Tempo Real */}
      <div className="w-full md:w-[20%] h-40 md:h-full bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col shadow-xl overflow-hidden shrink-0">
        <h3 className="text-xs font-bold text-amber-400 mb-2 pb-1.5 border-b border-slate-800 text-center">
          🏆 Placar em Tempo Real
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {rankingTurma.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic text-center py-2">Carregando placar...</p>
          ) : (
            rankingTurma.map((p, idx) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-1.5 rounded border text-xs ${
                  p.finalizado 
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' 
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-[10px] text-slate-500">#{idx + 1}</span>
                  <span className="text-sm">{p.avatar}</span>
                  <span className="font-bold truncate text-[11px]">{p.nickname}</span>
                </div>
                <div className="text-[10px] font-mono shrink-0 pl-1">
                  {p.finalizado ? '🏁' : `Cena ${p.cena_atual}`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
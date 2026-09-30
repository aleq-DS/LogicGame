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
    <div className="w-full h-full flex bg-slate-950 text-slate-100 p-4 gap-4 overflow-hidden box-border">
      
      {/* 1ª COLUNA (Esquerda - 30%): Mensagem de Conclusão e Status */}
      <div className="w-[30%] h-full bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-xl overflow-hidden text-center">
        <div className="my-auto space-y-4">
          <div className="text-4xl animate-bounce">🚀</div>
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400">
            Missão Concluída!
          </h2>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed px-2">
            VOCÊ CONCLUIU TODOS OS DESAFIOS, AGUARDE OS DEMAIS FINALIZAREM.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-amber-300 font-mono">
            {todosFinalizaram ? '🏁 Todos os agentes concluíram!' : '⏳ Aguardando demais jogadores...'}
          </div>

          {/* Botão de acesso manual ou liberado automaticamente */}
          <button 
            onClick={onVerPodio}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 font-bold rounded-lg transition-all shadow-md text-slate-950 text-xs tracking-wide cursor-pointer uppercase"
          >
            Ver Pódio Oficial 🏆
          </button>
        </div>
      </div>

      {/* 2ª COLUNA (Centro - 50%): Vídeo Temático Customizado do Enredo em Loop (.mp4) */}
      <div className="w-[50%] h-full bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-center shadow-xl overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6 pointer-events-none">
            <span className="text-xs text-slate-300 font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur">
              Modo Espectador Ativo 🛋️
            </span>
          </div>
        </div>
      </div>

      {/* 3ª COLUNA (Direita - 20%): Placar da Turma em Tempo Real */}
      <div className="w-[20%] h-full bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col shadow-xl overflow-hidden">
        <h3 className="text-xs font-bold text-amber-400 mb-3 pb-2 border-b border-slate-800 text-center">
          🏆 Placar em Tempo Real
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {rankingTurma.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic text-center py-4">Carregando placar...</p>
          ) : (
            rankingTurma.map((p, idx) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-2 rounded border text-xs ${
                  p.finalizado 
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' 
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-[10px] text-slate-500">#{idx + 1}</span>
                  <span className="text-base">{p.avatar}</span>
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
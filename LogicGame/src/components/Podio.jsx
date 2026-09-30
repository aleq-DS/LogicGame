import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function Podio({ sessaoId, participanteAtualId, onReiniciar }) {
  const [rankingFinal, setRankingFinal] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!sessaoId) {
      setCarregando(false);
      return;
    }

    const buscarRankingFinal = async () => {
      const { data, error } = await supabase
        .from('participantes')
        .select('*')
        .eq('sessao_id', sessaoId)
        .order('pontos', { ascending: false }) // Ordena pela maior pontuação
        .order('tempo_fim', { ascending: true }); // Desempate pelo tempo mais rápido

      if (!error && data) {
        setRankingFinal(data);
      }
      setCarregando(false);
    };

    buscarRankingFinal();

    // Inscreve no Realtime caso mais alunos terminem depois
    const channel = supabase
      .channel('podio-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes', filter: `sessao_id=eq.${sessaoId}` },
        () => {
          buscarRankingFinal();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessaoId]);

  // Função para limpar os dados da sessão e participantes ao sair do pódio
  const handleLimparESair = async () => {
    if (sessaoId) {
      try {
        // Apaga os participantes desta sessão
        await supabase
          .from('participantes')
          .delete()
          .eq('sessao_id', sessaoId);

        // Opcional: Se quiser também resetar a sessão para o status inicial ou apagá-la
        await supabase
          .from('sessoes')
          .delete()
          .eq('id', sessaoId);
      } catch (err) {
        console.error('Erro ao limpar dados temporários da sessão:', err);
      }
    }
    
    // Retorna para a tela de login/início
    onReiniciar();
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 p-6 overflow-y-auto">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-slate-100 text-center my-auto">
        
        <div className="mb-6">
          <span className="text-4xl">🏆</span>
          <h2 className="text-3xl font-black text-amber-400 mt-2">Fim de Partida!</h2>
          <p className="text-xs text-slate-400 mt-1">Confira o pódio e o desempenho final da turma nesta sala.</p>
        </div>

        {carregando ? (
          <p className="text-xs text-slate-400 py-8 animate-pulse">Calculando pontuações finais...</p>
        ) : rankingFinal.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 italic">Nenhum participante registrado nesta sessão.</p>
        ) : (
          <div className="space-y-3 mb-8 max-h-96 overflow-y-auto pr-1">
            {rankingFinal.map((p, idx) => {
              const eOAlunoAtual = p.id === participanteAtualId;
              
              // Estilização especial para o Top 3
              let badgeCor = 'bg-slate-950 border-slate-800 text-slate-300';
              if (idx === 0) badgeCor = 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-lg shadow-amber-500/10';
              if (idx === 1) badgeCor = 'bg-slate-300/10 border-slate-400/60 text-slate-200';
              if (idx === 2) badgeCor = 'bg-amber-700/20 border-amber-700/60 text-amber-600';

              return (
                <div 
                  key={p.id} 
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${badgeCor} ${eOAlunoAtual ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black w-6 text-center text-slate-400">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <span className="text-2xl">{p.avatar}</span>
                    <div className="text-left">
                      <span className="font-bold text-sm text-white flex items-center gap-2">
                        {p.nickname}
                        {eOAlunoAtual && <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-black">Você</span>}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.finalizado ? '🏁 Trilha Concluída' : '⚠️ Partida Interrompida'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-emerald-400 block">{p.pontos || 0} pts</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {p.tempo_inicio && p.tempo_fim 
                        ? `${Math.floor((new Date(p.tempo_fim) - new Date(p.tempo_inicio)) / 1000)}s totais` 
                        : 'Em andamento'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button 
          onClick={handleLimparESair}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded-xl transition shadow-lg text-xs uppercase tracking-wider cursor-pointer"
        >
          Voltar à Tela Inicial 🚀
        </button>

      </div>
    </div>
  );
}
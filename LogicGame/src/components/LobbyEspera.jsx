import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export default function LobbyEspera({ sessaoId, participanteId, onIniciarJogo }) {
  const [participantes, setParticipantes] = useState([]);
  const [salaInfo, setSalaInfo] = useState(null);

  // Memoriza a função para evitar recriações desnecessárias no efeito
  const verificarEstadoSala = useCallback(async () => {
    if (!sessaoId) return;

    const { data: sessao } = await supabase
      .from('sessoes')
      .select('*, enredos(*)')
      .eq('id', sessaoId)
      .single();
    
    if (sessao) {
      setSalaInfo(sessao);
      if (sessao.iniciada === true) {
        onIniciarJogo();
      }
    }

    const { data: parts } = await supabase
      .from('participantes')
      .select('*')
      .eq('sessao_id', sessaoId)
      .order('id', { ascending: true });

    if (parts) setParticipantes(parts);
  }, [sessaoId, onIniciarJogo]);

  useEffect(() => {
    if (!sessaoId) return;

    // Executa a checagem inicial imediatamente
    verificarEstadoSala();

    // Verificação de segurança periódica (Fallback a cada 2 segundos caso o Realtime falhe na rede local)
    const intervaloVerificacao = setInterval(() => {
      verificarEstadoSala();
    }, 2000);

    // Inscrição Realtime do Supabase
    const channel = supabase
      .channel(`lobby-sala-${sessaoId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes', filter: `sessao_id=eq.${sessaoId}` },
        () => {
          verificarEstadoSala();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessoes', filter: `id=eq.${sessaoId}` },
        (payload) => {
          if (payload.new && payload.new.iniciada === true) {
            onIniciarJogo();
          }
        }
      )
      .subscribe((status) => {
        console.log('Status da inscrição Realtime:', status);
      });

    return () => {
      clearInterval(intervaloVerificacao);
      supabase.removeChannel(channel);
    };
  }, [sessaoId, verificarEstadoSala, onIniciarJogo]);

  // Define a mídia do lobby: Prioriza o vídeo customizado do enredo, senão usa um padrão
  const videoLobbySrc = salaInfo?.enredos?.video_lobby_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

  return (
    <div className="w-full h-full flex bg-slate-950 text-slate-100 p-4 gap-4 overflow-hidden box-border">
      
      {/* 1ª COLUNA (Esquerda - 30%): Mensagem de Sala de Espera */}
      <div className="w-[30%] h-full bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-xl text-center">
        <div className="my-auto space-y-4">
          <span className="text-4xl animate-pulse">⏳</span>
          <h2 className="text-lg font-black uppercase tracking-wider text-amber-400">
            Sala de Espera
          </h2>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed px-2">
            Você está conectado! Aguarde o professor dar o <span className="text-emerald-400 font-bold">Start Oficial</span> para a partida começar para todos ao mesmo tempo.
          </p>
          {salaInfo && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400">
              Sala: <strong className="text-white">{salaInfo.codigo}</strong><br />
              <span className="text-[10px] text-slate-400">{salaInfo.enredos?.titulo}</span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800">
          <p className="text-[11px] text-slate-400 animate-pulse font-mono">
            Conectado com sucesso 🟢
          </p>
        </div>
      </div>

      {/* 2ª COLUNA (Centro - 50%): Vídeo Temático Customizado do Enredo em Loop (.mp4) */}
      <div className="w-[50%] h-full bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-center shadow-xl overflow-hidden">
        <div className="w-full h-full rounded-lg overflow-hidden bg-black flex items-center justify-center border border-slate-800 relative">
          <video 
            key={videoLobbySrc}
            src={videoLobbySrc} 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-center pointer-events-none">
            <h3 className="text-base font-black text-amber-400 mb-1">Preparando os Equipamentos...</h3>
            <p className="text-xs text-slate-300">O desafio começará assim que o instrutor liberar o sinal.</p>
          </div>
        </div>
      </div>

      {/* 3ª COLUNA (Direita - 20%): Alunos Conectados na Sala */}
      <div className="w-[20%] h-full bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col shadow-xl overflow-hidden">
        <h3 className="text-xs font-bold text-amber-400 mb-3 pb-2 border-b border-slate-800 text-center">
          👥 Turma na Sala ({participantes.length})
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {participantes.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic text-center py-4">Carregando colegas...</p>
          ) : (
            participantes.map((p, idx) => {
              const eVoce = p.id === participanteId;
              return (
                <div 
                  key={p.id} 
                  className={`flex items-center justify-between p-2 rounded border text-xs ${
                    eVoce 
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' 
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-[10px] text-slate-500">#{idx + 1}</span>
                    <span className="text-base">{p.avatar}</span>
                    <span className="font-bold truncate text-[11px]">
                      {p.nickname} {eVoce && '(Você)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Pronto 🟢</span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
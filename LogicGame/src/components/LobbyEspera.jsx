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
    <div className="w-full h-full flex flex-col md:flex-row bg-slate-950 text-slate-100 p-2 md:p-4 gap-3 overflow-y-auto md:overflow-hidden box-border">
      
      {/* 1ª BLOCO (Mobile: Topo / Desktop: Esquerda 30%): Mensagem de Sala de Espera */}
      <div className="w-full md:w-[30%] h-auto md:h-full bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 flex flex-col justify-between shadow-xl text-center shrink-0">
        <div className="space-y-2 md:my-auto">
          <span className="text-3xl md:text-4xl animate-pulse">⏳</span>
          <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-amber-400">
            Sala de Espera
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed px-1">
            Você está conectado! Aguarde o professor dar o <span className="text-emerald-400 font-bold">Start Oficial</span>.
          </p>
          {salaInfo && (
            <div className="bg-slate-950 p-2 md:p-3 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 mt-2">
              Sala: <strong className="text-white">{salaInfo.codigo}</strong><br />
              <span className="text-[10px] text-slate-400">{salaInfo.enredos?.titulo}</span>
            </div>
          )}
        </div>

        <div className="pt-2 md:pt-4 border-t border-slate-800 mt-3 md:mt-0">
          <p className="text-[11px] text-slate-400 animate-pulse font-mono">
            Conectado com sucesso 🟢
          </p>
        </div>
      </div>

      {/* 2ª BLOCO (Mobile: Meio / Desktop: Centro 50%): Vídeo Temático do Lobby em Loop */}
      <div className="w-full md:w-[50%] h-56 md:h-full bg-slate-900 border border-slate-800 rounded-xl p-2 md:p-3 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex flex-col justify-end p-4 text-center pointer-events-none">
            <h3 className="text-xs md:text-base font-black text-amber-400 mb-0.5">Preparando os Equipamentos...</h3>
            <p className="text-[11px] md:text-xs text-slate-300">O desafio começará assim que o instrutor liberar o sinal.</p>
          </div>
        </div>
      </div>

      {/* 3ª BLOCO (Mobile: Base / Desktop: Direita 20%): Alunos Conectados na Sala */}
      <div className="w-full md:w-[20%] h-40 md:h-full bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col shadow-xl overflow-hidden shrink-0">
        <h3 className="text-xs font-bold text-amber-400 mb-2 pb-1.5 border-b border-slate-800 text-center">
          👥 Turma ({participantes.length})
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {participantes.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic text-center py-2">Carregando...</p>
          ) : (
            participantes.map((p, idx) => {
              const eVoce = p.id === participanteId;
              return (
                <div 
                  key={p.id} 
                  className={`flex items-center justify-between p-1.5 rounded border text-xs ${
                    eVoce 
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' 
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-[10px] text-slate-500">#{idx + 1}</span>
                    <span className="text-sm">{p.avatar}</span>
                    <span className="font-bold truncate text-[11px]">
                      {p.nickname} {eVoce && '(Você)'}
                    </span>
                  </div>
                  <span className="text-[9px] text-emerald-400 font-mono">Pronto</span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
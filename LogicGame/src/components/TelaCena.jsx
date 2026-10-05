import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function ItemBloco({ id, bloco, index, desativado }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: desativado });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
    touchAction: 'none', // Evita o comportamento padrão de toque durante o arrasto
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center justify-between p-2.5 rounded font-mono text-xs transition-colors border ${
        desativado 
          ? 'bg-slate-950/50 border-slate-900 text-slate-600 cursor-not-allowed opacity-50' 
          : isDragging 
            ? 'bg-emerald-500/25 border-emerald-500 text-emerald-200 shadow-xl cursor-grabbing' 
            : 'bg-slate-900 border-slate-700 text-emerald-300 hover:bg-slate-800 cursor-grab'
      }`}
    >
      <div className="flex items-center gap-2 truncate mr-2">
        <span className="text-slate-500 text-[10px] select-none">☰</span>
        <span className="truncate">{bloco}</span>
      </div>
      <span className="text-[10px] text-slate-500 font-sans shrink-0">#{index + 1}</span>
    </div>
  );
}

export default function TelaCena({ cena, sessaoId, participanteId, onProximaCena }) {
  const processarBlocos = (dados) => {
    if (!dados) return [];
    if (Array.isArray(dados)) {
      return dados.flatMap((b, idx) => {
        if (typeof b === 'string') {
          // Se contém estruturas de código Python com colchetes [], chaves {} ou parênteses () agrupados, mantém como bloco único
          const temAgrupamento = 
            (b.includes('[') && b.includes(']')) || 
            (b.includes('{') && b.includes('}')) || 
            (b.includes('(') && b.includes(')'));

          if (temAgrupamento) {
            return { id: `bloco-${idx}`, texto: b.trim() };
          }

          // Caso contrário, se tiver vírgulas normais de separação de múltiplos blocos, divide
          if (b.includes(',')) {
            return b.split(',').map((item, subIdx) => ({ id: `bloco-${idx}-${subIdx}`, texto: item.trim() }));
          }
        }
        return { id: `bloco-${idx}`, texto: typeof b === 'string' ? b.trim() : String(b) };
      });
    }
    return [];
  };

  const [blocosUsuario, setBlocosUsuario] = useState(() => processarBlocos(cena.blocos_embaralhados));
  const gabaritoProcessado = processarBlocos(cena.gabarito);

  const [tentativas, setTentativas] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [bloqueado, setBloqueado] = useState(false);
  const [rankingRodada, setRankingRodada] = useState([]);
  
  // Estados para controle do Vídeo Interativo, Som e Congelamento
  const videoRef = useRef(null);
  const [currentVideoSrc, setCurrentVideoSrc] = useState(cena.imagem_url);
  const [videoPausadoPorTempo, setVideoPausadoPorTempo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  const ehVideo = currentVideoSrc && (currentVideoSrc.includes('.mp4') || currentVideoSrc.includes('video') || currentVideoSrc.includes('supabase.co'));
  
  const [desafioLiberado, setDesafioLiberado] = useState(!ehVideo);
  const [tempoInicioCena] = useState(Date.now());
  const [reproduzindoDesfecho, setReproduzindoDesfecho] = useState(false);

  useEffect(() => {
    if (!sessaoId) return;

    const carregarRanking = async () => {
      const { data } = await supabase
        .from('participantes')
        .select('*')
        .eq('sessao_id', sessaoId)
        .order('pontos', { ascending: false });
      if (data) setRankingRodada(data);
    };

    carregarRanking();

    const channel = supabase
      .channel('ranking-rodada')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes', filter: `sessao_id=eq.${sessaoId}` },
        () => {
          carregarRanking();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessaoId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 200, // Pequeno atraso para diferenciar o toque de scroll do toque de arrastar
        tolerance: 8  // Tolerância em pixels antes de ativar o arrasto
      } 
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    if (bloqueado || !desafioLiberado) return;
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlocosUsuario((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    if (cena.tempo_pausa && !videoPausadoPorTempo) {
      if (videoRef.current.currentTime >= cena.tempo_pausa) {
        videoRef.current.pause();
        setVideoPausadoPorTempo(true);
        setDesafioLiberado(true);
        setFeedback('⏱️ Vídeo pausado para o desafio! Ordene os blocos.');
      }
    }
  };

  const handleVideoEnded = () => {
    setDesafioLiberado(true);
    setFeedback('▶️ Vídeo concluído! Faça o desafio.');
  };

  const validarResposta = async () => {
    if (bloqueado || !desafioLiberado) return;

    const usuarioTextos = blocosUsuario.map(b => b.texto);
    const gabaritoTextos = gabaritoProcessado.map(g => g.texto);
    const eIgual = JSON.stringify(usuarioTextos) === JSON.stringify(gabaritoTextos);

    if (eIgual) {
      setBloqueado(true);

      const tempoGastoSegundos = Math.max(1, Math.floor((Date.now() - tempoInicioCena) / 1000));
      const pontosGanhos = Math.max(10, 200 - (10 * tempoGastoSegundos));

      setFeedback(`🎉 Excelente! (${tempoGastoSegundos}s) +${pontosGanhos} pts. Avançando...`);

      if (participanteId) {
        try {
          const { data: partAtual } = await supabase
            .from('participantes')
            .select('pontos')
            .eq('id', participanteId)
            .single();

          const pontosAtuais = partAtual?.pontos || 0;
          const novosPontosTotais = pontosAtuais + pontosGanhos;

          await supabase
            .from('participantes')
            .update({ pontos: novosPontosTotais })
            .eq('id', participanteId);
        } catch (err) {
          console.error('Erro ao atualizar pontuação:', err);
        }
      }

      if (cena.video_sucesso_url && videoRef.current) {
        setIsMuted(false);
        setCurrentVideoSrc(cena.video_sucesso_url);
        setDesafioLiberado(false);
        setReproduzindoDesfecho(true); // <--- Ativa o modo desfecho
        videoRef.current.play();       
      } else {
        setTimeout(() => {
          onProximaCena();
        }, 1500);
      }

    } else {
      const novasTentativas = tentativas + 1;
      setTentativas(novasTentativas);

      if (novasTentativas >= 3) {
        setBloqueado(true);
        setFeedback('❌ Tentativas esgotadas! Aplicando a resposta correta...');
        setBlocosUsuario(gabaritoProcessado);

        if (cena.video_falha_url && videoRef.current) {
          setIsMuted(false);
          setCurrentVideoSrc(cena.video_falha_url);
          setDesafioLiberado(false);
          videoRef.current.play();
          setTimeout(() => {
            onProximaCena();
          }, 4000);
        } else {
          setTimeout(() => {
            onProximaCena();
          }, 3500);
        }
      } else {
        setFeedback(`⚠️ Ops! Sequência incorreta. Tentativa ${novasTentativas} de 3.`);
        if (videoRef.current && videoPausadoPorTempo) {
          videoRef.current.play();
          setVideoPausadoPorTempo(false);
        }
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-slate-950 text-slate-100 p-2 md:p-4 gap-3 overflow-y-auto md:overflow-hidden box-border">
      
      {/* 1ª BLOCO (Mobile: Topo / Desktop: Esquerda 30%): Enredo e Blocos de Desafio */}
      <div className="w-full md:w-[30%] h-auto md:h-full bg-slate-900 border border-slate-800 rounded-xl p-3 md:p-4 flex flex-col justify-between shadow-xl shrink-0">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Cena {cena.numero_cena}</span>
            <span className="text-xs text-slate-400 font-mono">Tentativas: {tentativas}/3</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed mb-3 max-h-20 overflow-y-auto">
            {cena.enredo_text || cena.enredo_texto}
          </p>
        </div>

        {/* Área de blocos arrastáveis (Totalmente visível e adaptável) */}
        <div className={`p-2.5 rounded-lg border flex flex-col my-2 transition-all flex-1 min-h-[160px] max-h-[220px] md:max-h-none overflow-hidden ${
          !desafioLiberado ? 'bg-slate-950/40 border-slate-900 opacity-60' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <p className="text-[11px] text-amber-400 font-mono">
              {!desafioLiberado ? '🔒 Assista ao vídeo para liberar:' : '💡 Arraste os blocos na ordem correta:'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocosUsuario.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {blocosUsuario.map((item, index) => (
                    <ItemBloco key={item.id} id={item.id} bloco={item.texto} index={index} desativado={!desafioLiberado || bloqueado} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Feedback e Botão de Testar */}
        <div className="space-y-2 shrink-0 mt-2">
          {feedback && (
            <div className={`p-2 rounded text-[11px] text-center font-semibold ${
              bloqueado && tentativas >= 3 ? 'bg-red-950/80 border border-red-800 text-red-200' : 
              bloqueado ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200' : 
              'bg-slate-800 border border-slate-700 text-amber-300'
            }`}>
              {feedback}
            </div>
          )}

          {!bloqueado && (
            <button 
              onClick={validarResposta}
              disabled={!desafioLiberado}
              className={`w-full py-2.5 font-bold rounded-lg transition-all shadow-md text-xs tracking-wide ${
                !desafioLiberado 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 cursor-pointer'
              }`}
            >
              {!desafioLiberado ? '⏳ Aguarde o Vídeo...' : 'Testar Código Python 🚀'}
            </button>
          )}
        </div>
      </div>

      {/* 2ª BLOCO (Mobile: Meio / Desktop: Centro 50%): Mídia em Destaque */}
      <div className="w-full md:w-[50%] h-56 md:h-full bg-slate-900 border border-slate-800 rounded-xl p-2 md:p-3 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
        <div className="w-full h-full rounded-lg overflow-hidden bg-black flex items-center justify-center border border-slate-800 relative">
          {ehVideo ? (
            <>
              <video 
                ref={videoRef}
                src={currentVideoSrc} 
                autoPlay 
                loop={!cena.video_sucesso_url && !cena.video_falha_url && !cena.tempo_pausa && !reproduzindoDesfecho} 
                muted={isMuted} 
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  if (reproduzindoDesfecho) {
                    onProximaCena(); // Avança assim que o vídeo de desfecho acabar de falar!
                  } else {
                    handleVideoEnded();
                  }
                }}
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-2 right-2 z-20 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-amber-400 rounded-lg border border-slate-700 text-[11px] font-bold shadow-lg backdrop-blur transition cursor-pointer"
              >
                {isMuted ? '🔇 Ativar Som' : '🔊 Som Ligado'}
              </button>
            </>
          ) : (
            <img 
              src={currentVideoSrc} 
              alt="Cena do Desafio" 
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800'; }}
            />
          )}
        </div>
      </div>

      {/* 3ª BLOCO (Mobile: Base / Desktop: Direita 20%): Placar ao Vivo */}
      <div className="w-full md:w-[20%] h-36 md:h-full bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col shadow-xl overflow-hidden shrink-0">
        <h3 className="text-xs font-bold text-amber-400 mb-2 pb-1.5 border-b border-slate-800 text-center">
          🏆 Placar da Turma
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {rankingRodada.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic text-center py-2">Carregando placar...</p>
          ) : (
            rankingRodada.map((p, idx) => (
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
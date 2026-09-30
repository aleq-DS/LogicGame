import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export default function PainelAdmin({ onVoltar }) {
  const [abaAtiva, setAbaAtiva] = useState('enredos');

  const [enredos, setEnredos] = useState([]);
  const [tituloEnredo, setTituloEnredo] = useState('');
  const [descricaoEnredo, setDescricaoEnredo] = useState('');
  const [capaUrl, setCapaUrl] = useState('');
  const [enviandoCapa, setEnviandoCapa] = useState(false);

  // Novos estados para os vídeos customizados do enredo
  const [videoLobbyUrl, setVideoLobbyUrl] = useState('');
  const [enviandoVideoLobby, setEnviandoVideoLobby] = useState(false);
  const [videoEsperaUrl, setVideoEsperaUrl] = useState('');
  const [enviandoVideoEspera, setEnviandoVideoEspera] = useState(false);

  const [enredoSelecionadoId, setEnredoSelecionadoId] = useState('');
  const [numeroCena, setNumeroCena] = useState(1);
  const [enredoTexto, setEnredoTexto] = useState('');
  const [imagemCenaUrl, setImagemCenaUrl] = useState('');
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  
  // Estados para o controle de Vídeo Interativo
  const [tempoPausa, setTempoPausa] = useState('');
  const [videoSucessoUrl, setVideoSucessoUrl] = useState('');
  const [enviandoSucesso, setEnviandoSucesso] = useState(false);
  const [videoFalhaUrl, setVideoFalhaUrl] = useState('');
  const [enviandoFalha, setEnviandoFalha] = useState(false);

  const [blocosTexto, setBlocosTexto] = useState('');
  const [gabaritoTexto, setGabaritoTexto] = useState('');

  const [salas, setSalas] = useState([]);
  const [codigoSalaNovo, setCodigoSalaNovo] = useState('');
  const [enredoParaSalaId, setEnredoParaSalaId] = useState('');

  const [salaSelecionadaMonitor, setSalaSelecionadaMonitor] = useState('');
  const [participantesAoVivo, setParticipantesAoVivo] = useState([]);
  const [salaInfo, setSalaInfo] = useState(null);

  useEffect(() => {
    carregarDadosBase();
  }, []);

  useEffect(() => {
    if (!salaSelecionadaMonitor) {
      setSalaInfo(null);
      setParticipantesAoVivo([]);
      return;
    }

    const salaAtual = salas.find(s => s.id === salaSelecionadaMonitor);
    setSalaInfo(salaAtual);

    carregarParticipantes(salaSelecionadaMonitor);

    const channel = supabase
      .channel('realtime-admin-monitor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes', filter: `sessao_id=eq.${salaSelecionadaMonitor}` },
        () => {
          carregarParticipantes(salaSelecionadaMonitor);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessoes', filter: `id=eq.${salaSelecionadaMonitor}` },
        (payload) => {
          setSalaInfo(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salaSelecionadaMonitor, salas]);

  const carregarDadosBase = async () => {
    const { data: enredosData } = await supabase.from('enredos').select('*');
    if (enredosData) setEnredos(enredosData);

    const { data: salasData } = await supabase.from('sessoes').select('*, enredos(titulo)');
    if (salasData) setSalas(salasData);
  };

  const carregarParticipantes = async (sessaoId) => {
    const { data } = await supabase
      .from('participantes')
      .select('*')
      .eq('sessao_id', sessaoId)
      .order('cena_atual', { ascending: false });
    if (data) setParticipantesAoVivo(data);
  };

  // Upload genérico para mídias
  const handleFileUpload = async (e, setUrlDestino, setLoadingDestino) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoadingDestino(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('midias-jog')
      .upload(filePath, file);

    if (uploadError) {
      alert('Erro ao fazer upload da mídia: ' + uploadError.message);
      setLoadingDestino(false);
      return;
    }

    const { data } = supabase.storage
      .from('midias-jog')
      .getPublicUrl(filePath);

    if (data?.publicUrl) {
      setUrlDestino(data.publicUrl);
      alert('Arquivo enviado com sucesso!');
    }
    setLoadingDestino(false);
  };

  // Upload específico para a capa do enredo
  const handleCapaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setEnviandoCapa(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `capa-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('midias-jog')
      .upload(filePath, file);

    if (uploadError) {
      alert('Erro ao fazer upload da capa: ' + uploadError.message);
      setEnviandoCapa(false);
      return;
    }

    const { data } = supabase.storage
      .from('midias-jog')
      .getPublicUrl(filePath);

    if (data?.publicUrl) {
      setCapaUrl(data.publicUrl);
      alert('Capa enviada com sucesso!');
    }
    setEnviandoCapa(false);
  };

  const handleCriarEnredo = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('enredos').insert([{
      titulo: tituloEnredo,
      descricao: descricaoEnredo,
      capa_url: capaUrl,
      video_lobby_url: videoLobbyUrl || null,
      video_espera_url: videoEsperaUrl || null
    }]);

    if (error) {
      alert('Erro ao criar enredo: ' + error.message);
    } else {
      alert('Enredo criado com sucesso!');
      setTituloEnredo('');
      setDescricaoEnredo('');
      setCapaUrl('');
      setVideoLobbyUrl('');
      setVideoEsperaUrl('');
      carregarDadosBase();
    }
  };

  const handleExcluirEnredo = async (id, titulo) => {
    if (!window.confirm(`Tem certeza que deseja excluir o enredo "${titulo}"? Todas as cenas e salas associadas serão apagadas.`)) {
      return;
    }

    const { error } = await supabase.from('enredos').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir enredo: ' + error.message);
    } else {
      alert('Enredo excluído com sucesso!');
      carregarDadosBase();
    }
  };

  const handleCriarCena = async (e) => {
    e.preventDefault();
    const blocosArray = blocosTexto.split('\n').map(b => b.trim()).filter(Boolean);
    const gabaritoArray = gabaritoTexto.split('\n').map(g => g.trim()).filter(Boolean);

    const { error } = await supabase.from('cenas').insert([{
      enredo_id: enredoSelecionadoId,
      numero_cena: parseInt(numeroCena),
      enredo_texto: enredoTexto,
      imagem_url: imagemCenaUrl,
      tempo_pausa: tempoPausa ? parseFloat(tempoPausa) : 0,
      video_sucesso_url: videoSucessoUrl || null,
      video_falha_url: videoFalhaUrl || null,
      blocos_embaralhados: blocosArray,
      gabarito: gabaritoArray
    }]);

    if (error) {
      alert('Erro ao cadastrar cena: ' + error.message);
    } else {
      alert('Cena cadastrada com sucesso!');
      setEnredoTexto('');
      setImagemCenaUrl('');
      setTempoPausa('');
      setVideoSucessoUrl('');
      setVideoFalhaUrl('');
      setBlocosTexto('');
      setGabaritoTexto('');
      setNumeroCena(prev => prev + 1);
    }
  };

  const handleCriarSala = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('sessoes').insert([{
      codigo: codigoSalaNovo.toUpperCase().trim(),
      enredo_id: enredoParaSalaId,
      status: 'ativa',
      iniciada: false
    }]);

    if (error) {
      alert('Erro ao criar sala (verifique se o código já existe): ' + error.message);
    } else {
      alert(`Sala ${codigoSalaNovo.toUpperCase()} gerada com sucesso!`);
      setCodigoSalaNovo('');
      carregarDadosBase();
    }
  };

  const handleExcluirSala = async (id, codigo) => {
    if (!window.confirm(`Tem certeza que deseja excluir a sala "${codigo}"?`)) {
      return;
    }

    const { error } = await supabase.from('sessoes').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir sala: ' + error.message);
    } else {
      alert('Sala excluída com sucesso!');
      carregarDadosBase();
    }
  };

  const handleIniciarPartida = async () => {
    if (!salaSelecionadaMonitor) return;

    const { error } = await supabase
      .from('sessoes')
      .update({ iniciada: true })
      .eq('id', salaSelecionadaMonitor);

    if (error) {
      alert('Erro ao iniciar a partida: ' + error.message);
    } else {
      alert('🚀 Partida iniciada com sucesso! Todos os alunos foram liberados.');
    }
  };

  return (
    <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-slate-100 my-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-amber-400">Painel do Professor (Admin)</h2>
          <p className="text-xs text-slate-400">Gerencie histórias, monte cenas, tokens e monitore as turmas em tempo real.</p>
        </div>
        <button 
          onClick={onVoltar}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold transition cursor-pointer"
        >
          Sair do Painel
        </button>
      </div>

      <div className="flex space-x-2 mb-6">
        <button 
          onClick={() => setAbaAtiva('enredos')}
          className={`px-4 py-2 rounded text-xs font-bold transition cursor-pointer ${abaAtiva === 'enredos' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          1. Criar & Gerenciar Histórias
        </button>
        <button 
          onClick={() => setAbaAtiva('salas')}
          className={`px-4 py-2 rounded text-xs font-bold transition cursor-pointer ${abaAtiva === 'salas' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          2. Gerar Tokens (Salas)
        </button>
        <button 
          onClick={() => setAbaAtiva('monitor')}
          className={`px-4 py-2 rounded text-xs font-bold transition cursor-pointer ${abaAtiva === 'monitor' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          3. Monitorar Turma Ao Vivo 🔴
        </button>
      </div>

      {abaAtiva === 'enredos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <form onSubmit={handleCriarEnredo} className="bg-slate-950 p-4 rounded-lg border border-slate-800 max-h-[580px] overflow-y-auto pr-1">
              <h3 className="text-sm font-bold text-emerald-400 mb-3">Novo Enredo (Trilha)</h3>
              <div className="space-y-3 text-xs">
                <input 
                  type="text" placeholder="Título (Ex: A Fuga do Labirinto)" value={tituloEnredo} 
                  onChange={e => setTituloEnredo(e.target.value)} required
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white"
                />
                <textarea 
                  placeholder="Breve descrição da história..." value={descricaoEnredo} 
                  onChange={e => setDescricaoEnredo(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white h-16"
                />
                
                {/* Upload de Capa via Imagem */}
                <div className="bg-slate-900 p-2.5 border border-dashed border-slate-700 rounded">
                  <label className="block text-[10px] text-amber-400 mb-1 font-bold">Capa do Enredo (Enviar Imagem .png / .jpg):</label>
                  <input 
                    type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleCapaUpload} 
                    className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                  />
                  {enviandoCapa && <p className="text-[10px] text-amber-300 mt-1 animate-pulse">Enviando capa...</p>}
                  {capaUrl && <p className="text-[10px] text-emerald-400 mt-1 truncate">✔️ Capa carregada com sucesso</p>}
                </div>

                {/* Vídeo do Lobby (Pré-Partida) */}
                <div className="bg-slate-900 p-2.5 border border-dashed border-slate-700 rounded space-y-1">
                  <label className="block text-[10px] text-amber-400 font-bold">Vídeo do Lobby (.mp4 Pré-Partida):</label>
                  <input 
                    type="text" placeholder="URL do vídeo do lobby" value={videoLobbyUrl} onChange={e => setVideoLobbyUrl(e.target.value)} 
                    className="w-full p-1.5 bg-slate-950 border border-slate-700 rounded text-white text-[11px]"
                  />
                  <input 
                    type="file" accept="video/mp4" onChange={(e) => handleFileUpload(e, setVideoLobbyUrl, setEnviandoVideoLobby)} 
                    className="w-full text-[10px] text-slate-400 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-amber-500 file:text-slate-950 cursor-pointer"
                  />
                  {enviandoVideoLobby && <p className="text-[10px] text-amber-300 animate-pulse">Enviando vídeo do lobby...</p>}
                </div>

                {/* Vídeo de Espera (Pós-Jogo) */}
                <div className="bg-slate-900 p-2.5 border border-dashed border-slate-700 rounded space-y-1">
                  <label className="block text-[10px] text-amber-400 font-bold">Vídeo de Espera (.mp4 Pós-Jogo):</label>
                  <input 
                    type="text" placeholder="URL do vídeo de espera" value={videoEsperaUrl} onChange={e => setVideoEsperaUrl(e.target.value)} 
                    className="w-full p-1.5 bg-slate-950 border border-slate-700 rounded text-white text-[11px]"
                  />
                  <input 
                    type="file" accept="video/mp4" onChange={(e) => handleFileUpload(e, setVideoEsperaUrl, setEnviandoVideoEspera)} 
                    className="w-full text-[10px] text-slate-400 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-amber-500 file:text-slate-950 cursor-pointer"
                  />
                  {enviandoVideoEspera && <p className="text-[10px] text-amber-300 animate-pulse">Enviando vídeo de espera...</p>}
                </div>

                <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-slate-950 rounded cursor-pointer">
                  Salvar Enredo
                </button>
              </div>
            </form>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 max-h-48 overflow-y-auto">
              <h3 className="text-xs font-bold text-slate-400 mb-2">Enredos Cadastrados:</h3>
              {enredos.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">Nenhum enredo criado.</p>
              ) : (
                <div className="space-y-2">
                  {enredos.map(en => (
                    <div key={en.id} className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800 text-xs">
                      <span className="font-bold text-white">{en.titulo}</span>
                      <button 
                        onClick={() => handleExcluirEnredo(en.id, en.titulo)}
                        className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 rounded text-[10px] font-bold cursor-pointer transition"
                      >
                        Excluir 🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleCriarCena} className="bg-slate-950 p-4 rounded-lg border border-slate-800 max-h-[580px] overflow-y-auto pr-1">
            <h3 className="text-sm font-bold text-emerald-400 mb-3">Adicionar Cena ao Enredo</h3>
            <div className="space-y-3 text-xs">
              <select 
                value={enredoSelecionadoId} onChange={e => setEnredoSelecionadoId(e.target.value)} required
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white"
              >
                <option value="">Selecione o Enredo...</option>
                {enredos.map(en => <option key={en.id} value={en.id}>{en.titulo}</option>)}
              </select>

              <div className="flex gap-2">
                <input 
                  type="number" placeholder="Nº Cena" value={numeroCena} onChange={e => setNumeroCena(e.target.value)} 
                  className="w-24 p-2 bg-slate-900 border border-slate-700 rounded text-white" required
                />
                <input 
                  type="text" placeholder="URL da Mídia Principal ou faça o upload" value={imagemCenaUrl} onChange={e => setImagemCenaUrl(e.target.value)} 
                  className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded text-white" required
                />
              </div>

              {/* Upload Mídia Principal */}
              <div className="bg-slate-900 p-2 border border-dashed border-slate-700 rounded">
                <label className="block text-[10px] text-amber-400 mb-1 font-bold">Upar Mídia Principal (.mp4, gif, imagem):</label>
                <input 
                  type="file" accept="image/*,video/mp4" onChange={(e) => handleFileUpload(e, setImagemCenaUrl, setEnviandoArquivo)} 
                  className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                />
                {enviandoArquivo && <p className="text-[10px] text-amber-300 mt-1 animate-pulse">Enviando vídeo principal...</p>}
              </div>

              {/* Controles do Vídeo Interativo (Pausa, Sucesso e Falha) */}
              <div className="bg-slate-900/60 p-3 rounded border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-amber-400 block">🎬 Configuração de Vídeo Interativo (Opcional):</span>
                
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tempo de Pausa (segundos, ex: 7.5):</label>
                  <input 
                    type="number" step="0.1" placeholder="Ex: 7.5" value={tempoPausa} onChange={e => setTempoPausa(e.target.value)} 
                    className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Vídeo de Sucesso (após acertar):</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" placeholder="URL do vídeo de sucesso" value={videoSucessoUrl} onChange={e => setVideoSucessoUrl(e.target.value)} 
                      className="flex-1 p-1.5 bg-slate-900 border border-slate-700 rounded text-white text-[11px]"
                    />
                  </div>
                  <input 
                    type="file" accept="video/mp4" onChange={(e) => handleFileUpload(e, setVideoSucessoUrl, setEnviandoSucesso)} 
                    className="w-full text-[10px] text-slate-400 mt-1 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-emerald-600 file:text-slate-950 cursor-pointer"
                  />
                  {enviandoSucesso && <p className="text-[10px] text-emerald-300 animate-pulse">Enviando vídeo de sucesso...</p>}
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Vídeo de Falha (após 3 erros):</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" placeholder="URL do vídeo de falha" value={videoFalhaUrl} onChange={e => setVideoFalhaUrl(e.target.value)} 
                      className="flex-1 p-1.5 bg-slate-900 border border-slate-700 rounded text-white text-[11px]"
                    />
                  </div>
                  <input 
                    type="file" accept="video/mp4" onChange={(e) => handleFileUpload(e, setVideoFalhaUrl, setEnviandoFalha)} 
                    className="w-full text-[10px] text-slate-400 mt-1 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-red-600 file:text-white cursor-pointer"
                  />
                  {enviandoFalha && <p className="text-[10px] text-red-300 animate-pulse">Enviando vídeo de falha...</p>}
                </div>
              </div>

              <textarea 
                placeholder="Texto da história para esta cena..." value={enredoTexto} onChange={e => setEnredoTexto(e.target.value)} 
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white h-14" required
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Blocos Embaralhados (1 por linha):</label>
                  <textarea 
                    placeholder="x = 10&#10;y = 20" value={blocosTexto} onChange={e => setBlocosTexto(e.target.value)} 
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px] h-16" required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Gabarito Correto (1 por linha):</label>
                  <textarea 
                    placeholder="x = 10&#10;y = 20" value={gabaritoTexto} onChange={e => setGabaritoTexto(e.target.value)} 
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[11px] h-16" required
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-slate-950 rounded cursor-pointer">
                Cadastrar Cena
              </button>
            </div>
          </form>
        </div>
      )}

      {abaAtiva === 'salas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleCriarSala} className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs space-y-3">
            <h3 className="text-sm font-bold text-amber-400 mb-2">Gerar Código de Acesso para Turma</h3>
            <div>
              <label className="block text-slate-400 mb-1">Selecione a História:</label>
              <select 
                value={enredoParaSalaId} onChange={e => setEnredoParaSalaId(e.target.value)} required
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white"
              >
                <option value="">Escolha um enredo...</option>
                {enredos.map(en => <option key={en.id} value={en.id}>{en.titulo}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Código da Sala (Ex: PYTHON-01):</label>
              <input 
                type="text" placeholder="PYTHON-01" value={codigoSalaNovo} onChange={e => setCodigoSalaNovo(e.target.value)} required
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white uppercase font-bold"
              />
            </div>
            <button type="submit" className="w-full py-2 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded cursor-pointer">
              Gerar Código de Sala
            </button>
          </form>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs">
            <h3 className="text-sm font-bold text-amber-400 mb-3">Salas Cadastradas</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {salas.length === 0 ? (
                <p className="text-slate-500 italic text-center py-4">Nenhuma sala gerada.</p>
              ) : (
                salas.map(sala => (
                  <div key={sala.id} className="flex justify-between items-center bg-slate-900 p-2.5 rounded border border-slate-800">
                    <div>
                      <span className="font-bold text-emerald-400 text-sm">{sala.codigo}</span>
                      <p className="text-[11px] text-slate-400">História: {sala.enredos?.titulo || 'Removida'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${sala.status === 'ativa' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
                        {sala.status}
                      </span>
                      <button 
                        onClick={() => handleExcluirSala(sala.id, sala.codigo)}
                        className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 rounded text-[10px] font-bold cursor-pointer transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'monitor' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs text-slate-400 font-bold">Sala:</label>
              <select 
                value={salaSelecionadaMonitor} onChange={e => setSalaSelecionadaMonitor(e.target.value)}
                className="p-2 bg-slate-900 border border-slate-700 rounded text-white text-xs w-64"
              >
                <option value="">Escolha a sala ativa...</option>
                {salas.map(sala => <option key={sala.id} value={sala.id}>{sala.codigo} ({sala.enredos?.titulo})</option>)}
              </select>
            </div>

            {salaSelecionadaMonitor && (
              <div>
                {salaInfo?.iniciada ? (
                  <span className="px-4 py-2 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-bold block text-center">
                    🟢 Partida em Andamento
                  </span>
                ) : (
                  <button 
                    onClick={handleIniciarPartida}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-lg text-xs tracking-wide shadow-lg transition cursor-pointer uppercase animate-bounce"
                  >
                    🚀 Iniciar Partida (Start)
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center justify-between">
              <span>Participantes Conectados no Lobby 🟢</span>
              <span className="text-xs font-normal text-slate-400">Total: {participantesAoVivo.length} aluno(s)</span>
            </h3>

            {participantesAoVivo.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">Aguardando os alunos entrarem com o código da sala...</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {participantesAoVivo.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-800 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>
                      <span className="text-xl">{p.avatar}</span>
                      <div>
                        <span className="font-bold text-white">{p.nickname}</span>
                        <p className="text-[10px] text-slate-400">Status: Conectado no Lobby</p>
                      </div>
                    </div>
                    <div>
                      {p.finalizado ? (
                        <span className="px-2.5 py-1 bg-emerald-900/60 text-emerald-300 rounded font-bold text-[10px]">
                          🏁 Finalizado!
                        </span>
                      ) : salaInfo?.iniciada ? (
                        <span className="px-2.5 py-1 bg-blue-900/50 text-blue-300 rounded font-bold text-[10px]">
                          🎮 Jogando (Cena {p.cena_atual})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-950 border border-amber-800/60 text-amber-300 rounded font-bold text-[10px]">
                          ⏳ Aguardando Start
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
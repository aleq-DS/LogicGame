import React, { useState } from 'react';
import { supabase } from './services/supabaseClient';
import TelaCena from './components/TelaCena';
import TelaLogin from './components/TelaLogin';
import PainelAdmin from './components/PainelAdmin';
import Podio from './components/Podio';
import TelaEspera from './components/TelaEspera';
import LobbyEspera from './components/LobbyEspera';

export default function App() {
  const [telaAtual, setTelaAtual] = useState('login'); // 'login', 'lobby', 'jogo', 'espera', 'podio', 'admin'
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [participante, setParticipante] = useState(null);
  const [cenasTrilha, setCenasTrilha] = useState([]);
  const [indiceCenaAtual, setIndiceCenaAtual] = useState(0);

  const handleAcessoAdmin = () => {
    const senha = prompt('Digite a senha de acesso ao Painel do Professor:');
    // Lê a senha segura do arquivo .env (com fallback de segurança caso o .env não esteja presente)
    const senhaCorreta = import.meta.env.VITE_ADMIN_SENHA || 'Admin123';

    if (senha === senhaCorreta) {
      setTelaAtual('admin');
    } else if (senha !== null) {
      alert('Senha incorreta!');
    }
  };

  const handleEntrarNaSala = async (codigoSala, dadosAluno) => {
    try {
      const { data: sessaoData, error: sessaoError } = await supabase
        .from('sessoes')
        .select('*, enredos(*)')
        .eq('codigo', codigoSala.toUpperCase())
        .single();

      if (sessaoError || !sessaoData) {
        alert('Sala não encontrada! Verifique o código.');
        return;
      }

      if (sessaoData.status === 'encerrada') {
        alert('Esta sala já foi encerrada pelo professor.');
        return;
      }

      setSessaoAtiva(sessaoData);

      // Inserção segura do participante
      const { data: participanteData, error: partError } = await supabase
        .from('participantes')
        .insert([{
          sessao_id: sessaoData.id,
          nickname: dadosAluno.nickname,
          avatar: dadosAluno.avatar,
          cena_atual: 1,
          pontos: 0,
          tempo_inicio: new Date()
        }])
        .select()
        .single();

      if (partError) {
        console.error('Erro detalhado do Supabase:', partError);
        alert(`Erro ao entrar na sala: ${partError.message}`);
        return;
      }

      setParticipante(participanteData);

      const { data: cenasData, error: cenasError } = await supabase
        .from('cenas')
        .select('*')
        .eq('enredo_id', sessaoData.enredo_id)
        .order('numero_cena', { ascending: true });

      if (cenasError || !cenasData || cenasData.length === 0) {
        alert('Este enredo ainda não possui cenas cadastradas!');
        return;
      }

      setCenasTrilha(cenasData);
      setIndiceCenaAtual(0);
      
      // Se a sessão já foi iniciada anteriormente, joga direto pro jogo; senão, vai pro lobby
      if (sessaoData.iniciada) {
        setTelaAtual('jogo');
      } else {
        setTelaAtual('lobby');
      }

    } catch (err) {
      console.error('Erro ao conectar:', err);
      alert('Ocorreu um erro inesperado ao conectar à sala.');
    }
  };

  const handleIniciarJogo = () => {
    setTelaAtual('jogo');
  };

  const handleProximaCena = async () => {
    const proximoIndice = indiceCenaAtual + 1;

    if (proximoIndice < cenasTrilha.length) {
      setIndiceCenaAtual(proximoIndice);
      await supabase
        .from('participantes')
        .update({ cena_atual: proximoIndice + 1 })
        .eq('id', participante.id);
    } else {
      await supabase
        .from('participantes')
        .update({ finalizado: true, tempo_fim: new Date() })
        .eq('id', participante.id);

      setTelaAtual('espera');
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center overflow-hidden relative m-0 p-0 box-border">
      {/* Atalho discreto no topo protegido por senha para alternar para o admin */}
      {telaAtual === 'login' && (
        <header className="absolute top-3 right-4 z-50">
          <button 
            onClick={handleAcessoAdmin}
            className="text-xs bg-slate-900/80 hover:bg-slate-800 text-amber-400 px-3 py-1.5 rounded-lg border border-slate-800 transition font-bold shadow-lg backdrop-blur cursor-pointer"
          >
            Área do Professor 🔒
          </button>
        </header>
      )}

      {/* Roteamento centralizado de Telas */}
      <main className="w-full h-full flex items-center justify-center p-2">
        {telaAtual === 'login' && (
          <TelaLogin onEntrar={handleEntrarNaSala} />
        )}

        {telaAtual === 'lobby' && (
          <LobbyEspera 
            sessaoId={sessaoAtiva?.id}
            participanteId={participante?.id}
            onIniciarJogo={handleIniciarJogo}
          />
        )}

        {telaAtual === 'jogo' && cenasTrilha.length > 0 && (
          <TelaCena 
            key={cenasTrilha[indiceCenaAtual].id}
            cena={cenasTrilha[indiceCenaAtual]} 
            sessaoId={sessaoAtiva?.id}
            participanteId={participante?.id}
            onProximaCena={handleProximaCena} 
          />
        )}

        {telaAtual === 'espera' && (
          <TelaEspera 
            sessaoId={sessaoAtiva?.id}
            onVerPodio={() => setTelaAtual('podio')}
          />
        )}

        {telaAtual === 'podio' && (
          <Podio 
            sessaoId={sessaoAtiva?.id} 
            participanteAtualId={participante?.id} 
            onReiniciar={() => {
              setSessaoAtiva(null);
              setParticipante(null);
              setTelaAtual('login');
            }} 
          />
        )}

        {telaAtual === 'admin' && (
          <PainelAdmin onVoltar={() => setTelaAtual('login')} />
        )}
      </main>
    </div>
  );
}
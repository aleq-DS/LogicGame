import React, { useState } from 'react';

// Lista de avatares divertidos disponíveis para escolha
const AVATARES_DISPONIVEIS = ['🤖', '🐱', '🚀', '🧙‍♂️', '👾', '🦊', '⚡', '🐉', '🐼', '🦄'];

export default function TelaLogin({ onEntrar }) {
  const [codigoSala, setCodigoSala] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarEscolhido, setAvatarEscolhido] = useState('🤖');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!codigoSala.trim() || !nickname.trim()) {
      alert('Por favor, preencha o código da sala e o seu nickname!');
      return;
    }

    setCarregando(true);
    // Chama a função passada pelo App.jsx para validar a sala e registrar o participante
    await onEntrar(codigoSala, {
      nickname: nickname.trim(),
      avatar: avatarEscolhido
    });
    setCarregando(false);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl text-slate-100 text-center">
        <div className="mb-6">
          <span className="text-3xl">🐍</span>
          <h1 className="text-2xl font-black text-emerald-400 mt-2">Python Quest</h1>
          <p className="text-xs text-slate-400 mt-1">Entre na sala com o código do professor e embarque no desafio!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Código da Sala:</label>
            <input 
              type="text" 
              placeholder="EX: PYTHON-01" 
              value={codigoSala} 
              onChange={(e) => setCodigoSala(e.target.value)} 
              required
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white uppercase font-bold tracking-wider text-center text-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Seu Apelido (Nickname):</label>
            <input 
              type="text" 
              placeholder="Ex: DevMaster" 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              maxLength={15}
              required
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">Escolha seu Avatar:</label>
            <div className="grid grid-cols-5 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-700">
              {AVATARES_DISPONIVEIS.map((avatar) => (
                <button
                  type="button"
                  key={avatar}
                  onClick={() => setAvatarEscolhido(avatar)}
                  className={`text-2xl p-2 rounded-lg transition-all cursor-pointer ${avatarEscolhido === avatar ? 'bg-emerald-600/30 border border-emerald-500 scale-110 shadow-lg' : 'hover:bg-slate-900 opacity-60 hover:opacity-100'}`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-slate-950 rounded-lg transition shadow-md mt-4 cursor-pointer"
          >
            {carregando ? 'Conectando à Sala...' : 'Entrar na Partida 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
import React, { useState } from 'react';

export default function TelaCena({ cena, onProximaCena }) {
  // Tratamento inteligente: se vier tudo em uma string com vírgula, separa em itens individuais
  const processarBlocos = (dados) => {
    if (!dados) return [];
    if (Array.isArray(dados)) {
      return dados.flatMap(b => 
        typeof b === 'string' && b.includes(',') 
          ? b.split(',').map(item => item.trim()) 
          : b
      );
    }
    return [];
  };

  const [blocosUsuario, setBlocosUsuario] = useState(() => processarBlocos(cena.blocos_embaralhados));
  const gabaritoProcessado = processarBlocos(cena.gabarito);

  const [indiceSelecionado, setIndiceSelecionado] = useState(null);
  const [tentativas, setTentativas] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [bloqueado, setBloqueado] = useState(false);

  // Mecânica de Clique e Troca (Click-to-Swap)
  const handleSelecionarBloco = (index) => {
    if (bloqueado) return;

    if (indiceSelecionado === null) {
      setIndiceSelecionado(index);
    } else {
      const novoArr = [...blocosUsuario];
      const temp = novoArr[indiceSelecionado];
      novoArr[indiceSelecionado] = novoArr[index];
      novoArr[index] = temp;

      setBlocosUsuario(novoArr);
      setIndiceSelecionado(null);
    }
  };

  // Validar a resposta do aluno
  const validarResposta = () => {
    if (bloqueado) return;

    const eIgual = JSON.stringify(blocosUsuario) === JSON.stringify(gabaritoProcessado);

    if (eIgual) {
      setBloqueado(true);
      setFeedback('🎉 Perfeito! Lógica correta. Avançando...');
      setTimeout(() => {
        onProximaCena();
      }, 1500);
    } else {
      const novasTentativas = tentativas + 1;
      setTentativas(novasTentativas);

      if (novasTentativas >= 3) {
        setBloqueado(true);
        setFeedback('❌ Tentativas esgotadas! Aplicando a resposta correta para você...');
        setBlocosUsuario(gabaritoProcessado); // Mostra o gabarito
        setTimeout(() => {
          onProximaCena();
        }, 3500);
      } else {
        setFeedback(`⚠️ Ops! Sequência incorreta. Tentativa ${novasTentativas} de 3.`);
      }
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto p-6 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl shadow-2xl">
      {/* 1. Imagem Ilustrativa da Cena */}
      <div className="mb-5 overflow-hidden rounded-lg h-60 bg-slate-950 flex items-center justify-center border border-slate-800">
        <img 
          src={cena.imagem_url} 
          alt="Cena do Desafio" 
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600'; }}
        />
      </div>

      {/* 2. Texto do Enredo */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Cena {cena.numero_cena}</span>
          <span className="text-xs text-slate-400 font-mono">Tentativas: {tentativas}/3</span>
        </div>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed">{cena.enredo_text || cena.enredo_texto}</p>
      </div>

      {/* 3. Área de Organização do Código (Click to Swap) */}
      <div className="mb-6 bg-slate-950 p-4 rounded-lg border border-slate-800">
        <p className="text-xs text-amber-400 mb-3 font-mono">
          💡 Clique em um bloco para selecioná-lo e clique em outro para trocá-los de posição:
        </p>
        
        <div className="space-y-2">
          {blocosUsuario.map((bloco, index) => {
            const estaSelecionado = indiceSelecionado === index;
            return (
              <div 
                key={index} 
                onClick={() => handleSelecionarBloco(index)}
                className={`flex items-center justify-between p-3 rounded font-mono text-sm cursor-pointer transition-all border ${
                  estaSelecionado 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 scale-[1.02] shadow-lg' 
                    : 'bg-slate-900 border-slate-700 text-emerald-300 hover:bg-slate-800'
                }`}
              >
                <span>{bloco}</span>
                <span className="text-xs text-slate-500 font-sans">#{index + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback Visual */}
      {feedback && (
        <div className={`p-3 rounded-lg mb-4 text-sm text-center font-semibold ${
          bloqueado && tentativas >= 3 ? 'bg-red-950/80 border border-red-800 text-red-200' : 
          bloqueado ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200' : 
          'bg-slate-800 border border-slate-700 text-amber-300'
        }`}>
          {feedback}
        </div>
      )}

      {/* 4. Botão de Verificação */}
      {!bloqueado && (
        <button 
          onClick={validarResposta}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg transition-all shadow-md text-slate-950 text-sm tracking-wide cursor-pointer"
        >
          Testar Código Python 🚀
        </button>
      )}
    </div>
  );
}
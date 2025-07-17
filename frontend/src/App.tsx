import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';

function App() {
  // --- Estados do Componente ---

  // Entradas do formulário
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Informal');

  // Saída e controle de fluxo
  const [streamedArticle, setStreamedArticle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para o histórico, inicializado a partir do localStorage
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const savedHistory = localStorage.getItem('articleHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (e) {
      console.error("Falha ao ler o histórico do localStorage", e);
      return [];
    }
  });

  // --- Efeitos (Hooks) ---

  // Efeito para salvar o histórico no localStorage sempre que ele for alterado
  useEffect(() => {
    try {
      localStorage.setItem('articleHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Falha ao salvar o histórico no localStorage", e);
    }
  }, [history]);

  // --- Funções ---

  /**
   * Função principal que lida com o envio do formulário
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // 1. Resetar estados antes de uma nova requisição
    setIsLoading(true);
    setError(null);
    setStreamedArticle('');

    // Variável local para construir o artigo completo antes de salvar no histórico
    let fullArticle = '';

    try {
      const API_URL = 'https://desafio-ia-backend.onrender.com';

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, tone }),
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error("O corpo da resposta de streaming não está disponível.");
      }

      // 2. Ler a resposta como um fluxo (stream)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // O fluxo terminou
          break;
        }
        const chunk = decoder.decode(value);
        fullArticle += chunk; // Constrói a string completa
        setStreamedArticle((prevArticle) => prevArticle + chunk); // Atualiza a UI em tempo real
      }
      
      // 3. Adicionar o artigo completo ao histórico após o término do fluxo
      if (fullArticle) {
        setHistory(prevHistory => [fullArticle, ...prevHistory.slice(0, 4)]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Um erro desconhecido ocorreu.';
      setError(`Houve um problema ao gerar o artigo. Verifique se o backend está rodando. (${errorMessage})`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Função para carregar um artigo do histórico para a área de visualização
   * @param article - O conteúdo do artigo a ser exibido
   */
  const loadArticleFromHistory = (article: string) => {
    setStreamedArticle(article);
    // Rola a página para o topo para que o usuário veja o artigo carregado
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Renderização do Componente (JSX) ---

  return (
    <div className="container">
      <header>
        <h1>Gerador Inteligente de Artigos 🤖</h1>
        <p>Insira um tema, escolha um tom e deixe a IA fazer a mágica!</p>
      </header>
      
      <form onSubmit={handleSubmit} className="form-container">
        <div className="input-group">
          <label htmlFor="topic">Tema do Artigo:</label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: O futuro da inteligência artificial"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="tone">Tom do Texto:</label>
          <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="Informal">Informal</option>
            <option value="Técnico">Técnico</option>
            <option value="Persuasivo">Persuasivo</option>
            <option value="Acadêmico">Acadêmico</option>
          </select>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Gerando, aguarde...' : 'Gerar Artigo'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {(isLoading || streamedArticle) && (
        <div className="result-container">
          <section>
            <h2>Artigo Gerado</h2>
            <div className="article-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {streamedArticle}
              </ReactMarkdown>
              {/* Indicador visual de que o texto está sendo carregado */}
              {isLoading && <span className="blinking-cursor"></span>}
            </div>
          </section>
        </div>
      )}

      {history.length > 0 && (
        <div className="history-container">
          <h2>Histórico Recente</h2>
          <p>Clique em um item para visualizar novamente.</p>
          <ul>
            {history.map((item, index) => (
              <li key={index} onClick={() => loadArticleFromHistory(item)}>
                {item.substring(0, 70)}...
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
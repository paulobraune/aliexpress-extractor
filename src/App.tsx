import { useState } from 'react';
import { Search, Image as ImageIcon, AlertCircle, Loader2, Upload, Download, FileText } from 'lucide-react';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imageUrl: string;
    productTitle: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResults, setCsvResults] = useState<Array<{
    url: string;
    imageUrl: string;
    error: string | null;
  }> | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!url.trim()) {
      setError('Por favor, insira uma URL');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/extract-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          imageUrl: data.imageUrl,
          productTitle: data.productTitle,
        });
      } else {
        setError(data.error || 'Erro ao extrair a imagem');
      }
    } catch (err) {
      setError('Erro de conexão. Certifique-se de que o servidor está rodando na porta 3001.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setError('');
    } else {
      setCsvFile(null);
      setError('Por favor, selecione um arquivo CSV válido');
    }
  };

  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csvFile) {
      setError('Por favor, selecione um arquivo CSV');
      return;
    }

    setCsvLoading(true);
    setError('');
    setCsvResults(null);

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const urls = lines.map(line => line.split(',')[0].trim()).filter(url => url);

      const response = await fetch('http://localhost:3001/api/process-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls }),
      });

      const data = await response.json();

      if (data.success) {
        setCsvResults(data.results);
        setCsvContent(data.csv);
      } else {
        setError(data.error || 'Erro ao processar o arquivo CSV');
      }
    } catch (err) {
      setError('Erro ao processar o arquivo. Certifique-se de que o servidor está rodando.');
    } finally {
      setCsvLoading(false);
    }
  };

  const downloadCsv = () => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultados.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-2xl shadow-lg">
              <ImageIcon className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            AliExpress Image Extractor
          </h1>
          <p className="text-xl text-gray-600">
            Extraia imagens de produtos do AliExpress individualmente ou em lote
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Search className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900">Extração Individual</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="url" className="block text-sm font-semibold text-gray-700 mb-3">
                  URL do Produto
                </label>
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://pt.aliexpress.com/item/..."
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 outline-none"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 px-6 rounded-xl hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extraindo...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Extrair Imagem
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900">Processamento em Lote</h2>
            </div>

            <form onSubmit={handleCsvSubmit} className="space-y-6">
              <div>
                <label htmlFor="csv" className="block text-sm font-semibold text-gray-700 mb-3">
                  Arquivo CSV
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="csv"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={csvLoading}
                  />
                  <label
                    htmlFor="csv"
                    className="flex items-center justify-center gap-3 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 transition-all cursor-pointer bg-gray-50 hover:bg-orange-50"
                  >
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">
                      {csvFile ? csvFile.name : 'Selecione um arquivo CSV'}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  O CSV deve ter uma URL por linha na primeira coluna
                </p>
              </div>

              <button
                type="submit"
                disabled={csvLoading || !csvFile}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 px-6 rounded-xl hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {csvLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Processar CSV
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-5 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 mb-1">Erro</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Imagem Extraída</h2>
            <p className="text-gray-600 mb-6">{result.productTitle}</p>

            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <img
                src={result.imageUrl}
                alt={result.productTitle}
                className="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/600x600?text=Erro+ao+carregar+imagem';
                }}
              />
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">URL da Imagem:</p>
              <a
                href={result.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 break-all text-sm underline"
              >
                {result.imageUrl}
              </a>
            </div>
          </div>
        )}

        {csvResults && csvResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Resultados do Processamento</h2>
                <p className="text-gray-600 mt-1">
                  {csvResults.filter(r => r.imageUrl).length} de {csvResults.length} URLs processadas com sucesso
                </p>
              </div>
              <button
                onClick={downloadCsv}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Baixar CSV
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto border-2 border-gray-200 rounded-xl">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      URL do Produto
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      URL da Imagem
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {csvResults.map((result, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {result.url}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {result.imageUrl ? (
                          <a
                            href={result.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 underline max-w-xs truncate block"
                          >
                            {result.imageUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">{result.error || 'Não encontrado'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {result.imageUrl ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Sucesso
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Falha
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

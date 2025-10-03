import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const validateAliExpressUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('aliexpress.com') || urlObj.hostname.includes('aliexpress.us');
  } catch {
    return false;
  }
};

app.post('/api/extract-image', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL é obrigatória'
    });
  }

  if (!validateAliExpressUrl(url)) {
    return res.status(400).json({
      success: false,
      error: 'Por favor, forneça uma URL válida do AliExpress'
    });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    let imageUrl = null;
    let productTitle = null;

    productTitle = $('h1').first().text().trim() ||
                   $('[class*="Product"]').first().text().trim() ||
                   $('title').text().trim();

    const possibleSelectors = [
      'meta[property="og:image"]',
      'img[class*="magnifier-image"]',
      'img[class*="ImageGallery"]',
      'img[class*="product"]',
      '.images-view-item img',
      '.gallery-main-img img',
      '[class*="mainImage"] img',
    ];

    for (const selector of possibleSelectors) {
      const element = $(selector).first();

      if (selector.startsWith('meta')) {
        imageUrl = element.attr('content');
      } else {
        imageUrl = element.attr('src') || element.attr('data-src') || element.attr('data-original');
      }

      if (imageUrl) {
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://aliexpress.com' + imageUrl;
        }

        if (imageUrl.includes('http')) {
          break;
        }
      }
    }

    if (!imageUrl) {
      const scriptContent = $('script').toArray().map(el => $(el).html()).join(' ');
      const imageMatch = scriptContent.match(/"imageUrl":"([^"]+)"/);
      if (imageMatch) {
        imageUrl = imageMatch[1].replace(/\\u002F/g, '/');
      }
    }

    if (!imageUrl || !imageUrl.includes('http')) {
      return res.status(404).json({
        success: false,
        error: 'Não foi possível extrair a imagem do produto. O formato da página pode ter mudado.'
      });
    }

    res.json({
      success: true,
      imageUrl,
      productTitle: productTitle || 'Produto do AliExpress'
    });

  } catch (error) {
    console.error('Erro ao extrair imagem:', error.message);

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        error: 'Tempo limite de conexão excedido. Tente novamente.'
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Produto não encontrado. Verifique se a URL está correta.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao processar a requisição. Tente novamente mais tarde.'
    });
  }
});

const extractImageFromUrl = async (url) => {
  if (!validateAliExpressUrl(url)) {
    return { success: false, error: 'URL inválida do AliExpress' };
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    let imageUrl = null;
    let productTitle = null;

    productTitle = $('h1').first().text().trim() ||
                   $('[class*="Product"]').first().text().trim() ||
                   $('title').text().trim();

    const possibleSelectors = [
      'meta[property="og:image"]',
      'img[class*="magnifier-image"]',
      'img[class*="ImageGallery"]',
      'img[class*="product"]',
      '.images-view-item img',
      '.gallery-main-img img',
      '[class*="mainImage"] img',
    ];

    for (const selector of possibleSelectors) {
      const element = $(selector).first();

      if (selector.startsWith('meta')) {
        imageUrl = element.attr('content');
      } else {
        imageUrl = element.attr('src') || element.attr('data-src') || element.attr('data-original');
      }

      if (imageUrl) {
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://aliexpress.com' + imageUrl;
        }

        if (imageUrl.includes('http')) {
          break;
        }
      }
    }

    if (!imageUrl) {
      const scriptContent = $('script').toArray().map(el => $(el).html()).join(' ');
      const imageMatch = scriptContent.match(/"imageUrl":"([^"]+)"/);
      if (imageMatch) {
        imageUrl = imageMatch[1].replace(/\\u002F/g, '/');
      }
    }

    if (!imageUrl || !imageUrl.includes('http')) {
      return { success: false, error: 'Imagem não encontrada' };
    }

    return { success: true, imageUrl, productTitle };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

app.post('/api/process-csv', async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Lista de URLs é obrigatória'
    });
  }

  const results = [];

  for (const url of urls) {
    const trimmedUrl = url.trim();
    if (trimmedUrl) {
      const result = await extractImageFromUrl(trimmedUrl);
      results.push({
        url: trimmedUrl,
        imageUrl: result.success ? result.imageUrl : '',
        error: result.success ? null : result.error
      });
    }
  }

  let csvContent = 'URL,Image URL\n';
  results.forEach(result => {
    const urlEscaped = `"${result.url.replace(/"/g, '""')}"`;
    const imageUrlEscaped = `"${result.imageUrl.replace(/"/g, '""')}"`;
    csvContent += `${urlEscaped},${imageUrlEscaped}\n`;
  });

  res.json({
    success: true,
    csv: csvContent,
    results
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

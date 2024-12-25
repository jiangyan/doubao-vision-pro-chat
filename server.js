import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local first, then fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // This will load .env as fallback

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
const host = '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In production, serve the static files from the client build directory
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
}

// Initialize OpenAI clients for both models
const doubaoClient = new OpenAI({
  apiKey: process.env.ARK_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

const qwenClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// Add API key validation
if (!process.env.ARK_API_KEY) {
  console.error('Error: ARK_API_KEY is required but not set in environment variables');
  process.exit(1);
}

if (!process.env.DASHSCOPE_API_KEY) {
  console.error('Error: DASHSCOPE_API_KEY is required but not set in environment variables');
  process.exit(1);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.NODE_ENV });
});

// Doubao Vision endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await doubaoClient.chat.completions.create({
      messages,
      model: 'ep-20241223220835-p7wpl',
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Qwen VL endpoint
app.post('/api/qwen-chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await qwenClient.chat.completions.create({
      messages,
      model: 'qwen-vl-max-latest',
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// In production, handle all other routes by serving the index.html
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on http://${host}:${port}`);
}); 
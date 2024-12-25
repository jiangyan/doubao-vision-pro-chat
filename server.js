import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

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

const openai = new OpenAI({
  apiKey: process.env.ARK_API_KEY || '***REMOVED***',
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.NODE_ENV });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Pass messages directly without transformation
    const stream = await openai.chat.completions.create({
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

// In production, handle all other routes by serving the index.html
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on http://${host}:${port}`);
}); 
# Doubao Vision Pro Chat

A web application that enables visual conversations powered by the Doubao Vision Pro model. This application allows users to have interactive conversations about images using the advanced capabilities of the doubao-vision-pro-32k model.

## Features

- 🖼️ Image Analysis & Understanding
- 💬 Multi-turn Visual Conversations
- 🔄 Real-time Streaming Responses
- 📱 Modern Responsive Interface
- 🎨 Material-UI Design System

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- ARK API key for accessing the Doubao Vision Pro model

### Installation

1. Clone the repository
2. Install all dependencies (both frontend and backend):
   ```bash
   npm run install:all
   ```
3. Create `.env` file in the root directory:
   ```
   ARK_API_KEY=your_ark_api_key_here
   ```

### Development

Run both frontend and backend in development mode:
```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

Or run them separately:
```bash
npm run dev:server  # Backend only
npm run dev:client  # Frontend only
```

### Production

Build and start the production server:
```bash
npm run build
npm start
```

## Tech Stack

### Frontend
- React 18
- Material-UI v5
- Vite
- Axios

### Backend
- Node.js with Express
- OpenAI API client (configured for Doubao Vision Pro)
- Server-Sent Events for streaming responses

## API Configuration

The application uses the Doubao Vision Pro model:
- Model: ep-20241223220835-p7wpl
- Base URL: https://ark.cn-beijing.volces.com/api/v3
- Features: Streaming responses for real-time interaction

## Available Scripts

- `npm run dev` - Start development environment
- `npm run dev:client` - Start frontend development server
- `npm run dev:server` - Start backend development server
- `npm run build` - Build frontend for production
- `npm start` - Start production server
- `npm run install:all` - Install all dependencies

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/               # Source files
│   ├── public/            # Static assets
│   └── dist/              # Production build output
├── server.js              # Express backend server
├── package.json           # Project dependencies and scripts
└── .env                   # Environment variables (create from .env.example)
```

## Environment Variables

Required environment variables in `.env`:
```
ARK_API_KEY=your_ark_api_key_here
NODE_ENV=development
PORT=3001
```

## Contributing

Feel free to submit issues and enhancement requests.

## License

[Your chosen license]

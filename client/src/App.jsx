import { useState, useRef, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  Typography,
  Box
} from '@mui/material';
import axios from 'axios';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const fileInputRef = useRef();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type');
        return;
      }

      // Convert file to base64 through canvas to ensure JPEG format
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image on canvas
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'white'; // Handle transparent PNGs
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // Convert to JPEG format
          const jpegBase64 = canvas.toDataURL('image/jpeg', 0.9);
          setImage(jpegBase64);
        };
        img.onerror = () => {
          console.error('Error loading image');
          setImage(null);
        };
        img.src = reader.result;
      };
      reader.onerror = () => {
        console.error('Error reading file');
        setImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if ((!input.trim() && !image) || isStreaming) return;

    // Create message based on content type
    const newMessage = {
      role: 'user',
      content: image ? [] : input.trim() // If no image, use simple string format
    };

    // If we have an image, use array format
    if (image) {
      // Add text content if present
      if (input.trim()) {
        newMessage.content.push({
          type: 'text',
          text: input.trim()
        });
      } else {
        // Default text for image-only messages
        newMessage.content.push({
          type: 'text',
          text: 'What can you tell me about this image?'
        });
      }

      // Add image content
      newMessage.content.push({
        type: 'image_url',
        image_url: {
          url: image
        }
      });
    }

    try {
      setIsStreaming(true);
      
      // Add message to UI first
      setMessages(prev => [...prev, newMessage]);
      setInput('');
      setImage(null);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that can understand images and text.'
            },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content // Keep original format, array for images, string for text
            })),
            newMessage
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Initialize assistant message with string content
      const assistantMessage = {
        role: 'assistant',
        content: ''
      };
      setMessages(prev => [...prev, assistantMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const { content, error } = JSON.parse(data);
            if (error) {
              console.error('Stream error:', error);
              setMessages(prev => prev.slice(0, -1));
              continue;
            }
            
            if (content) {
              currentText += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  lastMessage.content = currentText;
                }
                return newMessages;
              });
            }
          } catch (e) {
            console.error('Error parsing stream data:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <Container 
      maxWidth="md" 
      sx={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        py: 2  // padding top and bottom instead of margins
      }}
    >
      {/* Header Section */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          mb: 2,
          flexShrink: 0  // prevent header from shrinking
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <img 
            src="/doubao-vision-pro-32K.png" 
            alt="Doubao Vision Pro Logo" 
            style={{ height: '40px', width: 'auto' }}
          />
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 500,
              color: '#1976d2'
            }}
          >
            doubao-vision-pro-32k 豆包图像模型
          </Typography>
        </Box>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: 'text.secondary',
            fontWeight: 300
          }}
        >
          支持图像多轮对话
        </Typography>
      </Box>

      {/* Chat Interface */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          flex: 1,  // take remaining space
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'  // prevent paper overflow
        }}
      >
        <List 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            mb: 2,
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '-ms-overflow-style': 'none'
          }}
        >
          {messages.map((msg, index) => (
            <ListItem key={index} sx={{ 
              flexDirection: 'column', 
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              width: '100%'
            }}>
              <Box sx={{ 
                maxWidth: '70%',
                backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                borderRadius: 2,
                p: 1
              }}>
                {Array.isArray(msg.content) ? (
                  msg.content.map((content, i) => {
                    if (content.type === 'text') {
                      return <Typography key={i}>{content.text}</Typography>;
                    }
                    if (content.type === 'image_url' && content.image_url?.url) {
                      return (
                        <Box key={i} sx={{ mt: 1, mb: 1 }}>
                          <img 
                            src={content.image_url.url} 
                            alt="Uploaded content"
                            style={{ maxWidth: '100%', borderRadius: 4 }}
                          />
                        </Box>
                      );
                    }
                    return null;
                  })
                ) : (
                  <Typography>{msg.content}</Typography>
                )}
              </Box>
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>

        {image && (
          <Box sx={{ mb: 2 }}>
            <img 
              src={image} 
              alt="Preview" 
              style={{ maxHeight: '100px', borderRadius: 4 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current.click()}
            disabled={isStreaming}
          >
            上传<br></br>图片
          </Button>
          <input
            type="file"
            accept="image/*"
            hidden
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请输入消息..."
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            disabled={isStreaming}
            multiline
            maxRows={4}
          />
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={isStreaming}
          >
            发送
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default App; 
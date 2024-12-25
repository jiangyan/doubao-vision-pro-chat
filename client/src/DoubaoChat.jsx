import { useState, useRef, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  Typography,
  Box,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';

function DoubaoChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [images, setImages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef();
  const messagesEndRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handlePaste = (e) => {
      if (e.clipboardData.files.length > 0) {
        const files = Array.from(e.clipboardData.files);
        files.forEach(file => {
          if (file.type.startsWith('image/')) {
            processImageFile(file);
          }
        });
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isStreaming) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (isStreaming) return;

      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          processImageFile(file);
        }
      });
    };

    window.addEventListener('paste', handlePaste);
    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener('dragover', handleDragOver);
      dropZone.addEventListener('dragleave', handleDragLeave);
      dropZone.addEventListener('drop', handleDrop);
    }

    return () => {
      window.removeEventListener('paste', handlePaste);
      if (dropZone) {
        dropZone.removeEventListener('dragover', handleDragOver);
        dropZone.removeEventListener('dragleave', handleDragLeave);
        dropZone.removeEventListener('drop', handleDrop);
      }
    };
  }, [isStreaming]);

  const processImageFile = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const jpegBase64 = canvas.toDataURL('image/jpeg', 0.9);
        setImages(prev => [...prev, jpegBase64]);
      };
      img.onerror = () => {
        console.error('Error loading image');
      };
      img.src = reader.result;
    };
    reader.onerror = () => {
      console.error('Error reading file');
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    });
    event.target.value = '';
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if ((!input.trim() && images.length === 0) || isStreaming) return;

    const newMessage = {
      role: 'user',
      content: images.length > 0 ? [] : input.trim()
    };

    if (images.length > 0) {
      if (input.trim()) {
        newMessage.content.push({
          type: 'text',
          text: input.trim()
        });
      } else {
        newMessage.content.push({
          type: 'text',
          text: 'What can you tell me about these images?'
        });
      }

      images.forEach(image => {
        newMessage.content.push({
          type: 'image_url',
          image_url: {
            url: image
          }
        });
      });
    }

    try {
      setIsStreaming(true);
      setMessages(prev => [...prev, newMessage]);
      setInput('');
      setImages([]);
      
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
              content: msg.content
            })),
            newMessage
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        py: 2
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          mb: 2,
          flexShrink: 0
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

      <Paper 
        ref={dropZoneRef}
        elevation={3} 
        sx={{ 
          p: 2, 
          flex: 1,
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          overflow: 'hidden',
          position: 'relative',
          ...(isDragging && {
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              border: '2px dashed #1976d2',
              borderRadius: 'inherit',
              zIndex: 1,
            }
          })
        }}
      >
        <List 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            mb: 2
          }}
        >
          {messages.map((message, index) => (
            <ListItem 
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                padding: 1
              }}
            >
              <Paper 
                elevation={1}
                sx={{ 
                  p: 1,
                  maxWidth: '80%',
                  bgcolor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5'
                }}
              >
                {Array.isArray(message.content) ? (
                  <Box>
                    {message.content.map((content, i) => (
                      content.type === 'text' ? (
                        <Typography key={i}>{content.text}</Typography>
                      ) : (
                        <Box 
                          key={i} 
                          component="img" 
                          src={content.image_url.url}
                          sx={{ 
                            maxWidth: '100%',
                            maxHeight: '300px',
                            objectFit: 'contain',
                            mt: 1
                          }}
                        />
                      )
                    ))}
                  </Box>
                ) : (
                  <Typography 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {message.content}
                  </Typography>
                )}
              </Paper>
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>

        {images.length > 0 && (
          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              mb: 2,
              flexWrap: 'wrap',
              gap: 1
            }}
          >
            {images.map((image, index) => (
              <Box 
                key={index} 
                sx={{ 
                  position: 'relative',
                  '&:hover .remove-icon': {
                    opacity: 1,
                  }
                }}
              >
                <img 
                  src={image} 
                  alt={`Preview ${index + 1}`} 
                  style={{ 
                    height: '100px', 
                    borderRadius: 4,
                    display: 'block'
                  }}
                />
                <IconButton
                  className="remove-icon"
                  size="small"
                  onClick={() => removeImage(index)}
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <Tooltip title="上传图片">
            <IconButton
              onClick={() => fileInputRef.current.click()}
              disabled={isStreaming}
              sx={{ p: 1 }}
            >
              <ImageIcon />
            </IconButton>
          </Tooltip>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isStreaming}
            placeholder={images.length > 0 ? "描述这些图片..." : "输入消息..."}
          />
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isStreaming || (!input.trim() && images.length === 0)}
          >
            发送
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default DoubaoChat; 
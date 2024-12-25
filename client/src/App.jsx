import { useState } from 'react';
import { Box, Container, Tabs, Tab } from '@mui/material';
import DoubaoChat from './DoubaoChat';
import QwenChat from './QwenChat';

function App() {
  const [currentModel, setCurrentModel] = useState('doubao');

  const handleModelChange = (event, newValue) => {
    setCurrentModel(newValue);
  };

  return (
    <Container maxWidth="md" sx={{ height: '100vh', py: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={currentModel} onChange={handleModelChange} centered>
          <Tab label="豆包视觉" value="doubao" />
          <Tab label="通义千问" value="qwen" />
        </Tabs>
      </Box>
      
      <Box sx={{ display: currentModel === 'doubao' ? 'block' : 'none', height: 'calc(100% - 50px)' }}>
        <DoubaoChat />
      </Box>
      <Box sx={{ display: currentModel === 'qwen' ? 'block' : 'none', height: 'calc(100% - 50px)' }}>
        <QwenChat />
      </Box>
    </Container>
  );
}

export default App; 
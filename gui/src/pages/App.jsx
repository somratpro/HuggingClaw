import React from 'react';
import ChatPanel from '../components/ChatPanel';
import FileExplorer from '../components/FileExplorer';
import Dashboard from '../components/Dashboard';
import FloatingAssistant from '../components/FloatingAssistant';

export default function App() {
  return <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,padding:16}}>
    <ChatPanel />
    <aside><FileExplorer /><Dashboard /></aside>
    <FloatingAssistant />
  </div>;
}

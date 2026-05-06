import React, { useEffect, useRef, useState } from 'react';
import { sendChat } from '../services/api';

export default function ChatPanel() {
  const [msg, setMsg] = useState('organize my downloads');
  const [out, setOut] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/chat');
    wsRef.current = ws;
    ws.onmessage = (e) => setEvents(prev => [...prev.slice(-8), JSON.parse(e.data)]);
    return () => ws.close();
  }, []);

  const run = async () => {
    setLoading(true);
    wsRef.current?.readyState === 1 && wsRef.current.send(msg);
    try { setOut((await sendChat(msg)).data); } finally { setLoading(false); }
  };

  return <section><h2>AI Chat Interface</h2>
    <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} style={{width:'100%'}} />
    <button onClick={run} disabled={loading}>{loading ? 'Running...' : 'Execute'}</button>
    <pre>{JSON.stringify(out, null, 2)}</pre>
    <h4>Live Action Trace</h4>
    <pre>{JSON.stringify(events, null, 2)}</pre>
  </section>;
}

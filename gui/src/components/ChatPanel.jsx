import React, { useState } from 'react';
import { sendChat } from '../services/api';

export default function ChatPanel() {
  const [msg, setMsg] = useState('organize my downloads');
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { setOut((await sendChat(msg)).data); } finally { setLoading(false); }
  };
  return <section><h2>AI Chat Interface</h2>
    <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} style={{width:'100%'}} />
    <button onClick={run} disabled={loading}>{loading ? 'Running...' : 'Execute'}</button>
    <pre>{JSON.stringify(out, null, 2)}</pre>
  </section>;
}

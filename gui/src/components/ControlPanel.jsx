import React, { useState } from 'react';

export default function ControlPanel() {
  const [voice, setVoice] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [safeMode, setSafeMode] = useState(true);

  return <section>
    <h3>OS Controls</h3>
    <label><input type='checkbox' checked={voice} onChange={() => setVoice(!voice)} /> Voice Mode</label><br/>
    <label><input type='checkbox' checked={autoRun} onChange={() => setAutoRun(!autoRun)} /> Auto Execute</label><br/>
    <label><input type='checkbox' checked={safeMode} onChange={() => setSafeMode(!safeMode)} /> Safe Mode</label>
    <p style={{fontSize:12}}>Voice: {String(voice)} | Auto: {String(autoRun)} | Safe: {String(safeMode)}</p>
  </section>;
}

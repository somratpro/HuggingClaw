import React, { useEffect, useState } from 'react';
import { getTools } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { getTools().then(r => setData(r.data)); }, []);
  return <section><h3>Dashboard</h3><pre>{JSON.stringify(data?.analytics ?? {}, null, 2)}</pre></section>;
}

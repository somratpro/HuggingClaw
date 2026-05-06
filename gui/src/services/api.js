import axios from 'axios';
const client = axios.create({ baseURL: 'http://localhost:8000' });
export const sendChat = (message) => client.post('/chat', { message, session_id: 'desktop' });
export const getTools = () => client.get('/tools');

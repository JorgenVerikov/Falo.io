import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const app = express();

// Serve static assets from project root
app.use(express.static(__dirname, {
  index: 'index.html',
  maxAge: '0'
}));

// Fallback to index.html for client routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Falo.io server listening on http://0.0.0.0:${PORT}`);
});



import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

const app = express();

// Social crawlers (LinkedInBot, facebookexternalhit, Slack, etc.) send a Range
// header when probing. A byte-range aware static server answers with 206 Partial
// Content, which those crawlers reject, so og:image comes back as "No image found".
// acceptRanges:false forces a full 200 response for every asset, including the
// Open Graph image.
const staticOptions = { acceptRanges: false, index: false };

app.use(express.static(distDir, staticOptions));

app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'), { acceptRanges: false });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`frontend server listening on port ${port}`);
});

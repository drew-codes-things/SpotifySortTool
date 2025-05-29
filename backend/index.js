require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  REDIRECT_URI,
  LASTFM_API_KEY
} = process.env;

const basicAuth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

app.get('/api/config', (req, res) => {
  res.json({
    spotifyClientId: SPOTIFY_CLIENT_ID,
    redirectUri: REDIRECT_URI,
    lastfmApiKey: LASTFM_API_KEY
  });
});

app.post('/api/token', async (req, res) => {
  const { code } = req.body;
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      }),
      { headers: { Authorization: `Basic ${basicAuth}` } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Token exchange failed', details: err.response?.data });
  }
});

app.post('/api/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      { headers: { Authorization: `Basic ${basicAuth}` } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Refresh failed', details: err.response?.data });
  }
});

app.get('/api/genres', async (req, res) => {
  const { artist, track } = req.query;
  try {
    const url = `http://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;
    const { data } = await axios.get(url);
    const tags = data?.track?.toptags?.tag?.map(tag => tag.name) || [];
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Globals
let accessToken = '';
let playlists = [];
let currentPlaylistId = '';
let currentTracks = [];
let sortable;
let audio = null;
let playingIndex = null;
let config = {};

window.onload = async function () {
  try {
    const res = await fetch('/api/config');
    config = await res.json();

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) return alert(`Spotify auth error: ${error}`);
    if (code) await exchangeCode(code);
    else {
      const token = localStorage.getItem('spotify_access_token');
      const expiry = localStorage.getItem('token_expiry');
      if (token && expiry && Date.now() < +expiry) {
        accessToken = token;
        document.getElementById('login').textContent = 'Logged In';
        await loadProfileAndPlaylists();
      } else if (token) {
        const refreshed = await refreshAccessToken();
        if (refreshed) await loadProfileAndPlaylists();
      }
    }
  } catch (err) {
    console.error('Initialization error:', err);
  }
};

document.getElementById('login').onclick = () => {
  if (!config.spotifyClientId || !config.redirectUri) return alert('Missing Spotify config');
  const state = [...Array(16)].map(() => Math.random().toString(36)[2]).join('');
  localStorage.setItem('spotify_auth_state', state);
  const scope = 'playlist-read-private playlist-modify-public playlist-modify-private user-read-private';
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${config.spotifyClientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(config.redirectUri)}&state=${state}`;
  location.href = authUrl;
};

async function exchangeCode(code) {
  const res = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  accessToken = data.access_token;
  localStorage.setItem('spotify_access_token', accessToken);
  localStorage.setItem('token_expiry', Date.now() + data.expires_in * 1000);
  if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
  history.replaceState({}, '', '/');
  document.getElementById('login').textContent = 'Logged In';
  await loadProfileAndPlaylists();
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  const res = await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const data = await res.json();
  if (data.access_token) {
    accessToken = data.access_token;
    localStorage.setItem('spotify_access_token', accessToken);
    localStorage.setItem('token_expiry', Date.now() + data.expires_in * 1000);
    return true;
  }
  return false;
}

async function loadProfileAndPlaylists() {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  const user = await res.json();
  document.getElementById('profileImage').src = user.images?.[0]?.url || '';
  document.getElementById('profileName').textContent = user.display_name;
  document.getElementById('profile').classList.remove('hidden');

  const smallPic = document.getElementById('profilePic');
  if (user.images?.[0]?.url) {
    smallPic.src = user.images[0].url;
    smallPic.classList.remove('hidden');
  }

  await fetchPlaylists();
  renderPlaylists();
}

async function fetchPlaylists() {
  playlists = [];
  let url = 'https://api.spotify.com/v1/me/playlists?limit=50';
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const data = await res.json();
    playlists.push(...data.items);
    url = data.next;
  }
}

function renderPlaylists() {
  const container = document.getElementById('playlists');
  container.innerHTML = '';
  playlists.forEach(p => {
    const card = document.createElement('div');
    card.className = 'bg-red-800 p-4 rounded-lg hover:bg-red-900 cursor-pointer text-red-200 shadow';
    card.textContent = p.name;
    card.onclick = () => loadPlaylistTracks(p.id, p.name);
    container.appendChild(card);
  });
}

async function loadPlaylistTracks(id, name) {
  currentPlaylistId = id;
  currentTracks = [];
  document.getElementById('playlistTitle').textContent = name + ' (Loading...)';
  document.getElementById('trackSection').classList.remove('hidden');
  document.getElementById('trackList').innerHTML = '';

  let url = `https://api.spotify.com/v1/playlists/${id}/tracks`;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const data = await res.json();
    const valid = data.items.filter(t => t.track).map(t => ({
      uri: t.track.uri,
      name: t.track.name,
      artist: t.track.artists.map(a => a.name).join(', '),
      preview_url: t.track.preview_url,
      image: t.track.album?.images?.[2]?.url || null
    }));
    currentTracks.push(...valid);
    url = data.next;
  }

  document.getElementById('playlistTitle').textContent = `${name} (${currentTracks.length} tracks)`;
  renderTracks();
}

async function renderTracks() {
  const list = document.getElementById('trackList');
  list.innerHTML = '';
  for (let i = 0; i < currentTracks.length; i++) {
    const track = currentTracks[i];
    const genre = await fetch(`/api/genres?artist=${encodeURIComponent(track.artist)}&track=${encodeURIComponent(track.name)}`)
      .then(res => res.json())
      .then(data => data.tags?.slice(0, 3).join(', ') || 'Unknown')
      .catch(() => 'Unknown');

    const li = document.createElement('li');
    li.className = 'flex justify-between items-center py-2 text-red-300 hover:bg-red-900 rounded px-2';
    li.dataset.index = i;
    li.innerHTML = `
      <div class="flex items-center space-x-2">
        ${track.preview_url ? `<button class="preview-button" data-index="${i}">▶️</button>` : '<span>🔇</span>'}
        ${track.image ? `<img src="${track.image}" class="w-10 h-10 rounded">` : ''}
        <div>
          <p class="font-semibold text-red-400">${track.name}</p>
          <p class="text-red-600 text-sm">${track.artist}</p>
          <p class="text-red-500 text-xs">Genres: ${genre}</p>
        </div>
      </div>
      <button class="remove-track text-red-500" data-index="${i}">🗑️</button>
    `;
    list.appendChild(li);
  }

  document.querySelectorAll('.remove-track').forEach(b => b.onclick = e => {
    const i = +e.currentTarget.dataset.index;
    currentTracks.splice(i, 1);
    renderTracks();
  });

  if (sortable) sortable.destroy();
  sortable = Sortable.create(list, {
    animation: 200,
    easing: 'cubic-bezier(1, 0, 0, 1)',
    onEnd: () => {
      currentTracks = [...document.querySelectorAll('#trackList li')].map(li => currentTracks[+li.dataset.index]);
      renderTracks();
    }
  });
}

async function saveReorder() {
  if (!currentPlaylistId || currentTracks.length === 0) return alert('No tracks to save');
  const uris = currentTracks.map(t => t.uri);
  const btn = document.getElementById('saveOrderBtn');
  btn.textContent = 'Saving...';
  btn.disabled = true;
  try {
    await fetch(`https://api.spotify.com/v1/playlists/${currentPlaylistId}/tracks`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [] })
    });
    for (let i = 0; i < uris.length; i += 100) {
      await fetch(`https://api.spotify.com/v1/playlists/${currentPlaylistId}/tracks`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: uris.slice(i, i + 100) })
      });
    }
    btn.textContent = 'Saved!';
    setTimeout(() => btn.textContent = 'Save Order', 2000);
  } catch (e) {
    console.error(e);
    alert(`Failed to save: ${e.message}`);
    btn.textContent = 'Save Order';
  }
  btn.disabled = false;
}

let accessToken = '';
let playlists = [];
let currentPlaylistId = '';
let currentUserId = '';
let originalCurrentTracks = [];
let displayedTracks = [];
let sortable;
let config = {};
let playbackCheckInterval = null;
let lastViewedPlaylistId = localStorage.getItem('lastViewedPlaylistId');
let lastPlayedOnSpotifyInfo = null;

let lastRemovedTrack = null;


let savedSortFeature = localStorage.getItem('savedSortFeature') || 'manual';
let savedSortOrder = localStorage.getItem('savedSortOrder') || 'asc';


const loadingOverlay = document.getElementById('loadingOverlay');
const loginOrLogoutButton = document.getElementById('loginOrLogoutBtn');
const profileSection = document.getElementById('profile');
const profileImage = document.getElementById('profileImage');
const profileName = document.getElementById('profileName');
const profileStatusText = document.getElementById('profileStatusText');
const smallProfilePic = document.getElementById('profilePic');
const onlineIndicator = document.getElementById('onlineIndicator');
const playlistsContainer = document.getElementById('playlists');
const playlistsTotal = document.getElementById('playlistsTotal');
const trackSection = document.getElementById('trackSection');
const playlistTitle = document.getElementById('playlistTitle');
const playlistStatsText = document.getElementById('playlistStatsText');

const trackList = document.getElementById('trackList');
const emptyState = document.getElementById('emptyState');
const saveOrderButton = document.getElementById('saveOrderBtn');
const shufflePlaylistBtn = document.getElementById('shufflePlaylistBtn');
const saveAsNewBtn = document.getElementById('saveAsNewBtn');
const removeDuplicatesBtn = document.getElementById('removeDuplicatesBtn');
const undoBtn = document.getElementById('undoBtn');


const playlistToolsContainer = document.getElementById('playlistToolsContainer');
const filterInput = document.getElementById('filterInput');
const sortFeatureSelect = document.getElementById('sortFeatureSelect');
const sortOrderSelect = document.getElementById('sortOrderSelect');


const batchActionsContainer = document.getElementById('batchActionsContainer');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const removeSelectedButton = document.getElementById('removeSelectedBtn');
const selectedCountSpan = document.getElementById('selectedCount');
const headerSubtitle = document.getElementById('headerSubtitle');
const yourPlaylistsSection = document.getElementById('yourPlaylistsSection');

const trackInfoModal = document.getElementById('trackInfoModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTrackImage = document.getElementById('modalTrackImage');
const modalTrackName = document.getElementById('modalTrackName');
const modalTrackArtist = document.getElementById('modalTrackArtist');
const modalTrackAlbum = document.getElementById('modalTrackAlbum');
const modalTrackReleaseDate = document.getElementById('modalTrackReleaseDate');
const modalTrackDuration = document.getElementById('modalTrackDuration');
const modalTrackGenres = document.getElementById('modalTrackGenres');
const modalAudioFeatures = document.getElementById('modalAudioFeatures');
const modalSpotifyLink = document.getElementById('modalSpotifyLink');


function showLoading(message = "Loading your music...") {
  if (loadingOverlay && loadingOverlay.querySelector('p:first-of-type')) {
    loadingOverlay.querySelector('p:first-of-type').textContent = message;
  }
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

window.onload = async function () {
  updateProfileStatus();

  if(sortFeatureSelect) {
    sortFeatureSelect.value = savedSortFeature;
    sortFeatureSelect.addEventListener('change', handleSortChange);
  }
  if(sortOrderSelect) {
    sortOrderSelect.value = savedSortOrder;
    sortOrderSelect.addEventListener('change', handleSortChange);
  }
  if(undoBtn) {
    undoBtn.disabled = true;
    undoBtn.addEventListener('click', handleUndoRemove);
  }


  try {
    showLoading("Initializing...");
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
    config = await res.json();

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      hideLoading();
      alert(`Spotify auth error: ${error}`);
      updateLoginLogoutButtonState(false);
      return;
    }
    if (code) {
      await exchangeCode(code);
    } else {
      const token = localStorage.getItem('spotify_access_token');
      const expiry = localStorage.getItem('token_expiry');
      if (token && expiry && Date.now() < +expiry) {
        accessToken = token;
        currentUserId = localStorage.getItem('spotify_user_id') || '';
        updateLoginLogoutButtonState(true);
        await loadProfileAndPlaylists();
      } else if (localStorage.getItem('spotify_refresh_token')) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          currentUserId = localStorage.getItem('spotify_user_id') || '';
          updateLoginLogoutButtonState(true);
          await loadProfileAndPlaylists();
        } else {
          updateLoginLogoutButtonState(false);
        }
      } else {
          updateLoginLogoutButtonState(false);
      }
    }
    hideLoading();
  } catch (err) {
    hideLoading();
    console.error('Initialization error:', err);
    updateLoginLogoutButtonState(false);
    if(playlistsContainer) playlistsContainer.innerHTML = `<p class="text-red-400 text-center col-span-full">Initialization failed: ${err.message}</p>`;
  }
};

function updateLoginLogoutButtonState(isLoggedIn) {
  if (isLoggedIn) {
    loginOrLogoutButton.innerHTML = `<span class="flex items-center space-x-2"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path></svg><span>Logout</span></span>`;
    loginOrLogoutButton.classList.remove('red-gradient', 'spotify-gradient');
    loginOrLogoutButton.classList.add('bg-gray-700', 'hover:bg-gray-600');
    loginOrLogoutButton.onclick = logout;
    if(onlineIndicator) onlineIndicator.classList.remove('hidden');
    if(headerSubtitle) headerSubtitle.classList.remove('hidden');
    if(yourPlaylistsSection) yourPlaylistsSection.classList.remove('hidden');
  } else {
    loginOrLogoutButton.innerHTML = `<span class="flex items-center space-x-2"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg><span>Connect Spotify</span></span>`;
    loginOrLogoutButton.classList.add('red-gradient');
    loginOrLogoutButton.classList.remove('bg-gray-700', 'hover:bg-gray-600', 'spotify-gradient');
    loginOrLogoutButton.onclick = loginWithSpotify;
    if(onlineIndicator) onlineIndicator.classList.add('hidden');
    if(profileSection) profileSection.classList.add('hidden');
    if(playlistsContainer) playlistsContainer.innerHTML = '';
    if(trackSection) trackSection.classList.add('hidden');
    if(playlistToolsContainer) playlistToolsContainer.classList.add('hidden');
    if(headerSubtitle) headerSubtitle.classList.add('hidden');
    if(yourPlaylistsSection) yourPlaylistsSection.classList.add('hidden');
    updateProfileStatus();
  }
}

function loginWithSpotify() {
  if (!config.spotifyClientId || !config.redirectUri) return alert('Missing Spotify client configuration.');
  const state = [...Array(16)].map(() => Math.random().toString(36)[2]).join('');
  localStorage.setItem('spotify_auth_state', state);
  const scope = 'playlist-read-private playlist-modify-public playlist-modify-private user-read-private user-read-playback-state';
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${config.spotifyClientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(config.redirectUri)}&state=${state}`;
  location.href = authUrl;
}

function logout() {
  accessToken = ''; currentUserId = '';
  localStorage.removeItem('spotify_access_token'); localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expiry'); localStorage.removeItem('spotify_user_id');
  localStorage.removeItem('lastViewedPlaylistId');
  currentPlaylistId = ''; originalCurrentTracks = []; displayedTracks = []; playlists = [];
  if (playbackCheckInterval) { clearInterval(playbackCheckInterval); playbackCheckInterval = null; }
  lastPlayedOnSpotifyInfo = null;
  if(filterInput) filterInput.value = '';
  if(undoBtn) undoBtn.disabled = true; lastRemovedTrack = null;
  updateLoginLogoutButtonState(false);
}

async function exchangeCode(code) {
  showLoading("Authenticating...");
  const res = await fetch('/api/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  if (!res.ok) { const errorData = await res.json(); throw new Error(`Token exchange failed: ${errorData.error_description || res.statusText}`); }
  const data = await res.json();
  accessToken = data.access_token;
  localStorage.setItem('spotify_access_token', accessToken);
  localStorage.setItem('token_expiry', Date.now() + data.expires_in * 1000);
  if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
  history.replaceState({}, '', '/');
  updateLoginLogoutButtonState(true);
  await loadProfileAndPlaylists();
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return false;
  showLoading("Refreshing session...");
  try {
    const res = await fetch('/api/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
    if (!res.ok) throw new Error('Refresh token failed');
    const data = await res.json();
    if (data.access_token) {
      accessToken = data.access_token;
      localStorage.setItem('spotify_access_token', accessToken);
      localStorage.setItem('token_expiry', Date.now() + data.expires_in * 1000);
      if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
      return true;
    } return false;
  } catch (error) { console.error("Refresh token error:", error); logout(); return false; }
}

async function spotifyApiCall(url, options = {}, expectNoContent = false) {
    if (!accessToken) throw new Error("No access token");
    let response;
    try { response = await fetch(url, { ...options, headers: { ...options.headers, 'Authorization': 'Bearer ' + accessToken }});
    } catch (fetchError) { console.error("Direct fetch error:", fetchError, "URL:", url); throw fetchError; }
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            try { response = await fetch(url, { ...options, headers: { ...options.headers, 'Authorization': 'Bearer ' + accessToken }});
            } catch (retryFetchError) { console.error("Direct fetch error on retry:", retryFetchError, "URL:", url); throw retryFetchError; }
        } else { logout(); throw new Error("Spotify API authentication failed after refresh attempt."); }
    }
    if (expectNoContent && response.status === 204) return null;
    if (!response.ok) {
        let errorData = {};
        try { errorData = await response.json(); } catch (jsonError) { errorData.message = response.statusText || "Unknown API error"; }
        console.error("Spotify API Error:", response.status, errorData, "URL:", url);
        throw new Error(`Spotify API Error: ${errorData.error?.message || errorData.message || response.statusText}`);
    }
    return response.json();
}

async function fetchCurrentPlayback() {
    if (!accessToken) return;
    try {
        const data = await spotifyApiCall('https://api.spotify.com/v1/me/player/currently-playing', {}, true);
        if (data && data.item && data.is_playing) {
            updateProfileStatus({ name: data.item.name, artist: data.item.artists.map(a => a.name).join(', '), is_playing_on_spotify: true });
            lastPlayedOnSpotifyInfo = { name: data.item.name, artist: data.item.artists.map(a => a.name).join(', ') };
        } else if (data && data.item && !data.is_playing) {
            lastPlayedOnSpotifyInfo = { name: data.item.name, artist: data.item.artists.map(a => a.name).join(', ') };
            updateProfileStatus({ is_playing_on_spotify: false });
        } else {
            updateProfileStatus({ is_playing_on_spotify: false });
        }
    } catch (error) { console.error("Error fetching current playback:", error); }
}
async function loadProfileAndPlaylists() {
  showLoading("Loading profile & user data...");
  renderPlaylistSkeletons(8);
  try {
    const user = await spotifyApiCall('https://api.spotify.com/v1/me');
    currentUserId = user.id; localStorage.setItem('spotify_user_id', user.id);
    if (user.images?.[0]?.url) {
        if(profileImage) profileImage.src = user.images[0].url;
        if(smallProfilePic) {smallProfilePic.src = user.images[0].url; smallProfilePic.classList.remove('hidden');}
    } else { if(smallProfilePic) smallProfilePic.classList.add('hidden'); }
    if(profileName) profileName.textContent = user.display_name || 'Music Lover';
    if(profileSection) profileSection.classList.remove('hidden');
    await fetchPlaylists();
    renderPlaylists();
    if (playbackCheckInterval) clearInterval(playbackCheckInterval);
    fetchCurrentPlayback();
    playbackCheckInterval = setInterval(fetchCurrentPlayback, 15000);
    lastViewedPlaylistId = localStorage.getItem('lastViewedPlaylistId');
    if(lastViewedPlaylistId){
        const lastPlaylist = playlists.find(p => p.id === lastViewedPlaylistId);
        if(lastPlaylist) {
            await loadPlaylistTracks(lastPlaylist.id, lastPlaylist.name);
        } else {
            localStorage.removeItem('lastViewedPlaylistId');
        }
    }
  } catch (error) {
    console.error('Error loading profile or playlists:', error);
    if(playlistsContainer) playlistsContainer.innerHTML = `<p class="text-red-400 text-center col-span-full">${error.message || 'Could not load profile.'}</p>`;
  } finally {
    hideLoading();
  }
}

async function fetchPlaylists() {
  playlists = [];
  let url = 'https://api.spotify.com/v1/me/playlists?fields=next,items(id,name,images,owner(display_name),public,tracks(total))&limit=50';
  while (url) {
    const data = await spotifyApiCall(url);
    if (data && data.items) {
        playlists.push(...data.items.filter(p => p.tracks.total > 0));
    }
    url = data ? data.next : null;
  }
}

function renderPlaylistSkeletons(count) {
    if (!playlistsContainer) return;
    playlistsContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'glass-effect p-6 rounded-2xl shadow-xl animate-pulse';
        card.innerHTML = `<div class="flex items-center space-x-4 mb-4"><div class="w-16 h-16 rounded-xl skeleton skeleton-image flex-shrink-0"></div><div class="flex-grow min-w-0"><div class="h-4 bg-gray-700 rounded w-3/4 mb-2 skeleton skeleton-text"></div><div class="h-3 bg-gray-700 rounded w-1/2 mb-1 skeleton skeleton-text"></div><div class="h-3 bg-gray-700 rounded w-1/3 skeleton skeleton-text"></div></div></div><div class="flex items-center justify-between text-sm"><div class="h-3 bg-gray-700 rounded w-1/4 skeleton skeleton-text"></div><div class="w-2 h-2 bg-red-700 rounded-full"></div></div>`;
        playlistsContainer.appendChild(card);
    }
}

function renderPlaylists() {
  if (!playlistsContainer || !playlistsTotal) return;
  playlistsContainer.innerHTML = '';
  if (playlists.length === 0) { playlistsTotal.textContent = "No playlists found or they are all empty."; return; }
  playlistsTotal.textContent = `Showing ${playlists.length} playlists. Click to organize.`;
  playlists.forEach((p, index) => {
    const card = document.createElement('div');
    card.className = 'glass-effect p-6 rounded-2xl cursor-pointer text-red-100 shadow-xl card-hover fade-in-up';
    card.style.animationDelay = `${index * 0.05}s`;
    const imageUrl = p.images?.[0]?.url;
    card.innerHTML = `<div class="flex items-center space-x-4 mb-4"><div class="w-16 h-16 rounded-xl overflow-hidden bg-red-800 flex-shrink-0 ${!imageUrl ? 'flex items-center justify-center' : ''}">${imageUrl ? `<img src="${imageUrl}" alt="${p.name}" class="w-full h-full object-cover">` : `<svg class="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`}</div><div class="flex-grow min-w-0"><h3 class="font-bold text-lg text-red-100 truncate" title="${p.name}">${p.name}</h3><p class="text-red-300 text-sm opacity-80">${p.tracks.total} tracks</p><p class="text-red-400 text-xs opacity-60 mt-1">by ${p.owner.display_name}</p></div></div><div class="flex items-center justify-between text-sm"><span class="text-red-300 opacity-60">${p.public ? 'Public' : 'Private'}</span><div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div></div>`;
    card.onclick = () => loadPlaylistTracks(p.id, p.name);
    playlistsContainer.appendChild(card);
  });
}

async function enrichTracksWithLastFMGenres(tracksToEnrich) {
    const tracksNeedingEnrichment = tracksToEnrich.filter(track => (!track.genre_text || track.genre_text === 'Unknown' || track.genre_text === 'Genre N/A') && track.artists && track.artists[0]?.name);
    if (tracksNeedingEnrichment.length === 0) return;

    showLoading(`Fetching Last.fm genres for ${tracksNeedingEnrichment.length} tracks...`);
    const genrePromises = tracksNeedingEnrichment.map(track =>
        fetch(`/api/genres?artist=${encodeURIComponent(track.artists[0].name)}&track=${encodeURIComponent(track.name)}`)
            .then(res => res.ok ? res.json() : { tags: [] })
            .then(genreData => ({ uri: track.uri, genre_text: genreData.tags?.slice(0, 2).join(', ') || 'Genre N/A'}))
            .catch(() => ({ uri: track.uri, genre_text: 'Genre N/A' }))
    );
    try {
        const settledGenres = await Promise.all(genrePromises);
        settledGenres.forEach(genreResult => {
            const track = originalCurrentTracks.find(t => t.uri === genreResult.uri);
            if (track) track.genre_text = genreResult.genre_text;
        });
    } catch (error) { console.error("Error fetching some Last.fm genres:", error); }
}

function renderTrackSkeletons(count) {
    if (!trackList || !emptyState || !batchActionsContainer) return;
    trackList.innerHTML = ''; emptyState.classList.add('hidden'); batchActionsContainer.classList.add('hidden');
    for(let i=0; i < count; i++) {
        const li = document.createElement('li');
        li.className = 'track-item flex justify-between items-center py-4 px-4 animate-pulse';
        li.innerHTML = `<div class="flex items-center space-x-3 flex-grow min-w-0"><div class="h-5 w-5 bg-gray-700 rounded skeleton flex-shrink-0"></div><div class="h-10 w-10 bg-gray-700 rounded skeleton flex-shrink-0"></div><div class="w-14 h-14 bg-gray-700 rounded-lg skeleton skeleton-image flex-shrink-0"></div><div class="flex-grow min-w-0 space-y-2"><div class="h-4 bg-gray-700 rounded w-3/4 skeleton skeleton-text"></div><div class="h-3 bg-gray-700 rounded w-1/2 skeleton skeleton-text"></div><div class="h-3 bg-gray-700 rounded w-2/5 skeleton skeleton-text"></div></div></div><div class="h-10 w-10 bg-gray-700 rounded-full skeleton flex-shrink-0"></div>`;
        trackList.appendChild(li);
    }
}

function calculatePlaylistStats(tracks) {
    if (!tracks || tracks.length === 0) return { totalDurationMs: 0, avgPopularity: 0, mostCommonGenre: "N/A" };
    let totalDurationMs = 0;
    let totalPopularity = 0;
    const genreCounts = {};

    tracks.forEach(track => {
        totalDurationMs += track.duration_ms || 0;
        totalPopularity += track.popularity || 0;
        if (track.genre_text && track.genre_text !== 'Unknown' && track.genre_text !== 'Genre N/A') {
            track.genre_text.split(', ').forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
        }
    });

    const avgPopularity = tracks.length > 0 ? Math.round(totalPopularity / tracks.length) : 0;

    let mostCommonGenre = "N/A";
    let maxCount = 0;
    for (const genre in genreCounts) {
        if (genreCounts[genre] > maxCount) {
            mostCommonGenre = genre;
            maxCount = genreCounts[genre];
        }
    }
    return { totalDurationMs, avgPopularity, mostCommonGenre };
}

async function loadPlaylistTracks(id, name) {
  currentPlaylistId = id; localStorage.setItem('lastViewedPlaylistId', id);
  originalCurrentTracks = []; displayedTracks = [];
  if(filterInput) filterInput.value = '';
  showLoading(`Loading playlist: ${name}...`); renderTrackSkeletons(10);
  if(playlistTitle) playlistTitle.textContent = `${name} (Loading...)`;
  if(playlistStatsText) playlistStatsText.textContent = 'Calculating stats...';
  if(trackSection) trackSection.classList.remove('hidden');
  if(playlistToolsContainer) playlistToolsContainer.classList.remove('hidden');
  if(batchActionsContainer) batchActionsContainer.classList.add('hidden');
  if(emptyState) emptyState.classList.add('hidden');
  if(undoBtn) undoBtn.disabled = true; lastRemovedTrack = null;

  try {
    let allTrackItems = [];
    let url = `https://api.spotify.com/v1/playlists/${id}/tracks?fields=next,items(track(id,uri,name,artists(id,name,external_urls),album(id,name,images,external_urls,release_date,genres),duration_ms,popularity,external_urls))`;
    while (url) {
      const data = await spotifyApiCall(url);
      if (!data || !data.items) { url = null; continue; }
      const validItems = data.items
        .filter(t => t.track && t.track.uri && t.track.id)
        .map(t => ({
          id: t.track.id, uri: t.track.uri, name: t.track.name,
          artists: t.track.artists,
          albumName: t.track.album.name, albumId: t.track.album.id,
          albumExternalUrls: t.track.album.external_urls,
          albumGenres: t.track.album.genres || [],
          release_date: t.track.album.release_date, popularity: t.track.popularity,
          image: t.track.album?.images?.slice(-1)[0]?.url || t.track.album?.images?.[0]?.url || null,
          duration_ms: t.track.duration_ms, spotify_url: t.track.external_urls?.spotify, genre_text: 'Unknown'
      }));
      allTrackItems.push(...validItems); url = data.next;
    }
    originalCurrentTracks = allTrackItems;
    await enrichTracksWithLastFMGenres(originalCurrentTracks);

    const stats = calculatePlaylistStats(originalCurrentTracks);
    if(playlistStatsText) {
        playlistStatsText.textContent = `Total: ${formatTotalDuration(stats.totalDurationMs)} • Avg Popularity: ${stats.avgPopularity}/100 • Top Genre: ${stats.mostCommonGenre}`;
    }

    displayedTracks = [...originalCurrentTracks];
    applySorting();

    if(playlistTitle) playlistTitle.textContent = `${name} (${displayedTracks.length} tracks)`;

    if(trackSection) trackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Error loading tracks:', error); alert(`Failed to load playlist tracks: ${error.message}`);
    if(playlistTitle) playlistTitle.textContent = `${name} (Error loading)`;
    if(trackList) trackList.innerHTML = `<p class="text-red-400 text-center">Error: ${error.message}</p>`;
  } finally { hideLoading(); }
}

function formatDuration(ms) {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function formatTotalDuration(ms) {
    if (!ms) return '0s';
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    seconds = seconds % 60;
    minutes = minutes % 60;
    let durationString = "";
    if (hours > 0) durationString += `${hours}h `;
    if (minutes > 0 || hours > 0) durationString += `${minutes}m `;
    durationString += `${seconds}s`;
    return durationString.trim();
}

function updateProfileStatus(spotifyPlaybackInfo = null) {
    if (!profileStatusText) return;
    if (spotifyPlaybackInfo && spotifyPlaybackInfo.is_playing_on_spotify) {
        profileStatusText.textContent = `Now Playing (Spotify): ${spotifyPlaybackInfo.name} - ${spotifyPlaybackInfo.artist}`;
    } else if (lastPlayedOnSpotifyInfo) {
         profileStatusText.textContent = `Last Played (Spotify): ${lastPlayedOnSpotifyInfo.name} - ${lastPlayedOnSpotifyInfo.artist}`;
    }
    else { profileStatusText.textContent = ''; }
}

function createArtistLinks(artists) {
    if (!artists || !Array.isArray(artists)) { return 'Unknown Artist'; }
    return artists.map(artist => {
        const url = artist.external_urls?.spotify;
        return url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-red-300 hover:text-red-100 hover:underline">${artist.name}</a>` : artist.name;
    }).join(', ');
}

function renderTracks(tracksToRender) {
  if (!trackList || !emptyState || !batchActionsContainer) return;
  trackList.innerHTML = '';
  if (tracksToRender.length === 0) {
    emptyState.classList.remove('hidden'); batchActionsContainer.classList.add('hidden');
    if (filterInput && filterInput.value) {
        if(emptyState.querySelector('p:first-of-type')) emptyState.querySelector('p:first-of-type').textContent = "No tracks match filter";
        if(emptyState.querySelector('p:last-of-type')) emptyState.querySelector('p:last-of-type').textContent = "Clear filter or try different term.";
    } else {
        if(emptyState.querySelector('p:first-of-type')) emptyState.querySelector('p:first-of-type').textContent = "No tracks to display";
        if(emptyState.querySelector('p:last-of-type')) emptyState.querySelector('p:last-of-type').textContent = "This playlist seems empty.";
    } return;
  }
  emptyState.classList.add('hidden'); batchActionsContainer.classList.remove('hidden');
  tracksToRender.forEach((track) => {
    const li = document.createElement('li');
    li.className = 'track-item flex justify-between items-center py-4 px-4 text-red-200';
    li.dataset.uri = track.uri; li.dataset.id = track.id;
    const duration = formatDuration(track.duration_ms);
    const artistLinksHtml = createArtistLinks(track.artists);
    const albumLink = track.albumExternalUrls?.spotify;
    const albumTextOrLink = albumLink ? `<a href="${albumLink}" target="_blank" rel="noopener noreferrer" class="hover:underline text-red-200">${track.albumName}</a>` : track.albumName;

    li.innerHTML = `
      <div class="flex items-center space-x-3 flex-grow min-w-0 track-info-clickable-area">
        <input type="checkbox" class="track-checkbox form-checkbox h-5 w-5 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500 flex-shrink-0" data-uri="${track.uri}" onclick="event.stopPropagation();">
        <div class="flex-shrink-0 w-10 h-10"></div>
        <div class="w-14 h-14 rounded-lg overflow-hidden bg-red-800 flex-shrink-0 ${!track.image ? 'flex items-center justify-center' : ''}">
          ${track.image ? `<img src="${track.image}" alt="${track.name}" class="w-full h-full object-cover">` : `<svg class="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`}
        </div>
        <div class="flex-grow min-w-0">
          <p class="font-semibold text-red-100 truncate text-lg" title="${track.name}">${track.name}</p>
          <div class="text-sm truncate" title="${track.artists.map(a => a.name).join(', ')}">${artistLinksHtml}</div>
          <p class="text-red-400 text-xs truncate" title="Album: ${track.albumName}">Album: ${albumTextOrLink}</p>
          <div class="flex items-center space-x-3 mt-1">
            <p class="text-red-400 text-xs truncate" title="Genres: ${track.genre_text || 'Loading...'}">Genres: ${track.genre_text || 'Loading...'}</p>
            ${duration ? `<span class="text-red-500 text-xs">${duration}</span>` : ''}
          </div>
        </div>
      </div>
      <button class="remove-track-btn flex-shrink-0 w-10 h-10 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-full flex items-center justify-center transition-all duration-200" data-uri="${track.uri}" title="Remove track">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    `;

    trackList.appendChild(li);
  });

  document.querySelectorAll('.remove-track-btn').forEach(b => b.onclick = (e) => {
    e.stopPropagation(); const trackUriToRemove = e.currentTarget.dataset.uri;
    const removedIndex = originalCurrentTracks.findIndex(t => t.uri === trackUriToRemove);
    if (removedIndex > -1) {
        lastRemovedTrack = { track: originalCurrentTracks[removedIndex], index: displayedTracks.findIndex(t => t.uri === trackUriToRemove) };
        originalCurrentTracks.splice(originalCurrentTracks.findIndex(t => t.uri === trackUriToRemove), 1);
        if(undoBtn) undoBtn.disabled = false;
    }
    applyFilter(); updateSelectedCount();
  });
  document.querySelectorAll('.track-checkbox').forEach(checkbox => {
    checkbox.onchange = () => {
        const li = checkbox.closest('li.track-item');
        if(li) {
          if (checkbox.checked) li.classList.add('selected'); else li.classList.remove('selected');
        }
        updateSelectedCount();
    }
  });
  updateSelectedCount();
  if (sortable) sortable.destroy();
  if (trackList && tracksToRender.length > 0) {
    sortable = Sortable.create(trackList, {
      animation: 200, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      ghostClass: 'opacity-50 bg-red-700/50', chosenClass: 'bg-red-900/30',
      filter: '.track-checkbox, .remove-track-btn, a', preventOnFilter: true,
      onEnd: (evt) => {
        const newUriOrder = [...trackList.querySelectorAll('li.track-item')].map(li => li.dataset.uri);
        originalCurrentTracks.sort((a, b) => {
            let aIndex = newUriOrder.indexOf(a.uri); let bIndex = newUriOrder.indexOf(b.uri);
            if (aIndex === -1 && bIndex === -1) return 0; if (aIndex === -1) return 1;
            if (bIndex === -1) return -1; return aIndex - bIndex;
        });
        if(sortFeatureSelect) sortFeatureSelect.value = 'manual';
        savedSortFeature = 'manual'; localStorage.setItem('savedSortFeature', 'manual');
        applyFilter();
      }
    });
  }
}

function updateSelectedCount() {
    if(!selectedCountSpan || !removeSelectedButton || !selectAllCheckbox) return;
    const selectedCheckboxes = document.querySelectorAll('#trackList .track-checkbox:checked');
    const count = selectedCheckboxes.length;
    selectedCountSpan.textContent = count;
    removeSelectedButton.disabled = count === 0;
    const allCheckboxes = document.querySelectorAll('#trackList .track-checkbox');
    selectAllCheckbox.checked = allCheckboxes.length > 0 && count === allCheckboxes.length;
}

if(selectAllCheckbox) {
    selectAllCheckbox.onchange = () => {
        const isChecked = selectAllCheckbox.checked;
        document.querySelectorAll('#trackList .track-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
            const li = checkbox.closest('li.track-item');
            if (isChecked && li) li.classList.add('selected');
            else if (li) li.classList.remove('selected');
        });
        updateSelectedCount();
    };
}

if(removeSelectedButton) {
    removeSelectedButton.onclick = () => {
        const selectedUris = [...document.querySelectorAll('#trackList .track-checkbox:checked')].map(cb => cb.dataset.uri);
        if (selectedUris.length === 0) return;
        originalCurrentTracks = originalCurrentTracks.filter(track => !selectedUris.includes(track.uri));
        if(undoBtn) undoBtn.disabled = true; lastRemovedTrack = null;
        applyFilter();
    };
}

if(filterInput) filterInput.addEventListener('input', () => applyFilter());

function applyFilter() {
    const filterText = filterInput && filterInput.value ? filterInput.value.toLowerCase() : "";
    if (!filterText) { displayedTracks = [...originalCurrentTracks]; }
    else {
        displayedTracks = originalCurrentTracks.filter(track =>
            track.name.toLowerCase().includes(filterText) ||
            (track.artists && track.artists.some(artist => artist.name.toLowerCase().includes(filterText)))
        );
    }
    renderTracks(displayedTracks);
}

async function showTrackInfoModal(trackId) {
    showLoading("Fetching track details...");
    try {
        const trackData = await spotifyApiCall(`https://api.spotify.com/v1/tracks/${trackId}`);
        const audioFeaturesData = await spotifyApiCall(`https://api.spotify.com/v1/audio-features/${trackId}`);
        if (!trackData) throw new Error("Track data not found.");

        if(modalTrackImage) modalTrackImage.src = trackData.album?.images?.[0]?.url || '';
        if(modalTrackName) modalTrackName.textContent = trackData.name || 'N/A';
        if(modalTrackArtist) modalTrackArtist.innerHTML = createArtistLinks(trackData.artists);

        const albumUrl = trackData.album?.external_urls?.spotify;
        if(modalTrackAlbum) modalTrackAlbum.innerHTML = `Album: ${albumUrl ? `<a href="${albumUrl}" target="_blank" rel="noopener noreferrer" class="hover:underline text-red-200">${trackData.album.name}</a>` : (trackData.album?.name || 'N/A')}`;
        if(modalTrackReleaseDate) modalTrackReleaseDate.textContent = `Released: ${trackData.album?.release_date || 'N/A'}`;
        if(modalTrackDuration) modalTrackDuration.textContent = `Duration: ${formatDuration(trackData.duration_ms)}`;
        if(modalSpotifyLink) modalSpotifyLink.href = trackData.external_urls?.spotify || '#';

        let combinedGenres = new Set(trackData.album?.genres || []);
        const originalTrackFromList = originalCurrentTracks.find(t => t.id === trackId);
        if (originalTrackFromList && originalTrackFromList.genre_text && originalTrackFromList.genre_text !== 'Unknown' && originalTrackFromList.genre_text !== 'Genre N/A') {
            originalTrackFromList.genre_text.split(', ').forEach(g => combinedGenres.add(g));
        } else if (trackData.artists && trackData.artists[0] && trackData.artists[0].genres) {
             trackData.artists[0].genres.slice(0,2).forEach(g => combinedGenres.add(g));
        }

        if(modalTrackGenres) modalTrackGenres.innerHTML = combinedGenres.size > 0 ? `Genres: <span class="text-red-200">${Array.from(combinedGenres).join(', ')}</span>` : 'Genres: Not available';

        let featuresHtml = '';
        if(audioFeaturesData) {
            const relevantFeatures = { Danceability: audioFeaturesData.danceability, Energy: audioFeaturesData.energy, Tempo: `${Math.round(audioFeaturesData.tempo)} BPM`, Valence: audioFeaturesData.valence, Acousticness: audioFeaturesData.acousticness, Instrumentalness: audioFeaturesData.instrumentalness, Loudness: `${audioFeaturesData.loudness.toFixed(1)} dB`, Speechiness: audioFeaturesData.speechiness };
            for(const key in relevantFeatures) { featuresHtml += `<div><span class="font-semibold">${key}:</span> <span class="text-red-200">${relevantFeatures[key] !== undefined ? relevantFeatures[key] : 'N/A'}</span></div>`; }
        }
        if(modalAudioFeatures) modalAudioFeatures.innerHTML = featuresHtml || 'Audio features not available.';

        if(trackInfoModal) {
            trackInfoModal.classList.remove('hidden');
            trackInfoModal.classList.add('flex');
        }
    } catch (error) { console.error("Error fetching track details for modal:", error); alert("Could not fetch track details.");
    } finally { hideLoading(); }
}

if(closeModalBtn) closeModalBtn.addEventListener('click', () => { if(trackInfoModal) { trackInfoModal.classList.add('hidden'); trackInfoModal.classList.remove('flex'); } });
if(trackInfoModal) trackInfoModal.addEventListener('click', (e) => { if (e.target === trackInfoModal) { if(closeModalBtn) closeModalBtn.click(); } });

function handleSortChange() {
    if(sortFeatureSelect && sortOrderSelect){
        savedSortFeature = sortFeatureSelect.value;
        savedSortOrder = sortOrderSelect.value;
        localStorage.setItem('savedSortFeature', savedSortFeature);
        localStorage.setItem('savedSortOrder', savedSortOrder);
        applySorting();
    }
}

async function applySorting() {
    if (savedSortFeature === 'manual') {


        applyFilter();
        return;
    }


    const audioFeatureSorts = ['popularity', 'danceability', 'energy', 'tempo', 'valence', 'acousticness', 'instrumentalness'];
    if (audioFeatureSorts.includes(savedSortFeature)) {
        const tracksNeedingFeatures = originalCurrentTracks.filter(t => t[savedSortFeature] === undefined && t.popularity === undefined);
        if (savedSortFeature !== 'popularity' && tracksNeedingFeatures.length > 0) {
            await fetchAudioFeaturesForTracks(tracksNeedingFeatures);
        }
    }

    let tempTracks = [...originalCurrentTracks];

    tempTracks.sort((a, b) => {
        let valA, valB;

        switch (savedSortFeature) {
            case 'name':
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
                break;
            case 'artist':
                valA = a.artists[0]?.name.toLowerCase() || '';
                valB = b.artists[0]?.name.toLowerCase() || '';
                break;
            case 'albumName':
                 valA = a.albumName?.toLowerCase() || '';
                 valB = b.albumName?.toLowerCase() || '';
                 break;
            case 'duration_ms':
            case 'popularity':
            case 'danceability':
            case 'energy':
            case 'tempo':
            case 'valence':
            case 'acousticness':
            case 'instrumentalness':
                valA = a[savedSortFeature] === undefined ? (savedSortOrder === 'asc' ? Infinity : -Infinity) : a[savedSortFeature];
                valB = b[savedSortFeature] === undefined ? (savedSortOrder === 'asc' ? Infinity : -Infinity) : b[savedSortFeature];
                break;
            default:
                return 0;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            return savedSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return savedSortOrder === 'asc' ? valA - valB : valB - valA;
        }
    });

    originalCurrentTracks = tempTracks;
    applyFilter();
}

async function fetchAudioFeaturesForTracks(tracks) {
    if (tracks.length === 0) return;
    showLoading(`Fetching audio features for ${tracks.length} tracks...`);
    const trackIds = tracks.map(t => t.id);
    try {
        for (let i = 0; i < trackIds.length; i += 100) {
            const batchIds = trackIds.slice(i, i + 100).join(',');
            const featuresData = await spotifyApiCall(`https://api.spotify.com/v1/audio-features?ids=${batchIds}`);
            if (featuresData && featuresData.audio_features) {
                featuresData.audio_features.forEach(feature => {
                    if (feature) {
                        const track = originalCurrentTracks.find(t => t.id === feature.id);
                        if (track) {
                            Object.assign(track, feature);
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error fetching audio features:", error);
    } finally {
        hideLoading();
    }
}

if(shufflePlaylistBtn) {
    shufflePlaylistBtn.addEventListener('click', () => {
        if (originalCurrentTracks.length < 2) return;
        for (let i = originalCurrentTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [originalCurrentTracks[i], originalCurrentTracks[j]] = [originalCurrentTracks[j], originalCurrentTracks[i]];
        }
        if(sortFeatureSelect) sortFeatureSelect.value = 'manual';
        savedSortFeature = 'manual'; localStorage.setItem('savedSortFeature', 'manual');
        applyFilter();
        if(undoBtn) undoBtn.disabled = true; lastRemovedTrack = null;
        alert('Playlist shuffled locally! Click "Save Changes" to make it permanent on Spotify.');
    });
}

if(removeDuplicatesBtn) {
    removeDuplicatesBtn.addEventListener('click', () => {
        if (originalCurrentTracks.length === 0) return;
        const uniqueTracks = []; const seenUris = new Set(); let duplicatesRemovedCount = 0;
        for (const track of originalCurrentTracks) {
            if (!seenUris.has(track.uri)) { uniqueTracks.push(track); seenUris.add(track.uri); }
            else { duplicatesRemovedCount++; }
        }
        if (duplicatesRemovedCount > 0) {
            originalCurrentTracks = uniqueTracks;
            if(sortFeatureSelect) sortFeatureSelect.value = 'manual';
            savedSortFeature = 'manual'; localStorage.setItem('savedSortFeature', 'manual');
            applyFilter();
            if(undoBtn) undoBtn.disabled = true; lastRemovedTrack = null;
            alert(`${duplicatesRemovedCount} duplicate track(s) removed. Save changes to make it permanent.`);
        } else { alert('No duplicate tracks found.'); }
    });
}

function handleUndoRemove() {
    if (lastRemovedTrack && lastRemovedTrack.track) {
        let insertAtIndex = lastRemovedTrack.index;






        if (insertAtIndex >= 0 && insertAtIndex < displayedTracks.length) {
            const trackBefore = displayedTracks[insertAtIndex -1];
            const trackAfter = displayedTracks[insertAtIndex];
            let originalIndexToInsert = originalCurrentTracks.length;

            if (trackAfter) {
                originalIndexToInsert = originalCurrentTracks.findIndex(t => t.uri === trackAfter.uri);
            } else if (trackBefore) {
                 originalIndexToInsert = originalCurrentTracks.findIndex(t => t.uri === trackBefore.uri) + 1;
            }
            originalCurrentTracks.splice(originalIndexToInsert, 0, lastRemovedTrack.track);

        } else {
             originalCurrentTracks.push(lastRemovedTrack.track);
        }


        applyFilter();

        lastRemovedTrack = null;
        if(undoBtn) undoBtn.disabled = true;
    }
}


if(saveAsNewBtn){
    saveAsNewBtn.addEventListener('click', async () => {
        if (!currentUserId) { alert("User ID not found. Cannot create playlist."); return; }
        if (originalCurrentTracks.length === 0) { alert("Current track list is empty. Nothing to save."); return; }

        const currentP = playlists.find(p => p.id === currentPlaylistId);
        const baseName = currentP ? currentP.name : "My Current Selection";
        const newPlaylistName = prompt("Enter a name for the new playlist:", `${baseName} (Sorted)`);

        if (!newPlaylistName) return;
        showLoading("Creating new playlist...");
        try {
            const createPlaylistData = { name: newPlaylistName, public: false, description: "Sorted with Drew's Spotify Sorter" };
            const newPlaylist = await spotifyApiCall(`https://api.spotify.com/v1/users/${currentUserId}/playlists`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createPlaylistData)
            });
            const trackUris = originalCurrentTracks.map(t => t.uri);
            if (trackUris.length > 0) {
                for (let i = 0; i < trackUris.length; i += 100) {
                    await spotifyApiCall(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uris: trackUris.slice(i, i + 100) })
                    });
                }
            }
            alert(`Playlist "${newPlaylistName}" created successfully!`);
            await fetchPlaylists(); renderPlaylists();
        } catch (error) { console.error("Error creating new playlist:", error); alert(`Failed to create new playlist: ${error.message}`);
        } finally { hideLoading(); }
    });
}

if(saveOrderButton) {
    saveOrderButton.onclick = async () => {
      if (!currentPlaylistId) return alert('No playlist selected.');
      const urisToSave = originalCurrentTracks.map(t => t.uri);
      const btn = saveOrderButton; const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="flex items-center space-x-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Saving...</span></span>`;
      btn.disabled = true;
      if(undoBtn) undoBtn.disabled = true; lastRemovedTrack = null;
      try {
        await spotifyApiCall(`https://api.spotify.com/v1/playlists/${currentPlaylistId}/tracks`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uris: [] }) });
        if (urisToSave.length > 0) {
            for (let i = 0; i < urisToSave.length; i += 100) {
              await spotifyApiCall(`https://api.spotify.com/v1/playlists/${currentPlaylistId}/tracks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uris: urisToSave.slice(i, i + 100) }) });
            }
        }
        btn.innerHTML = `<span class="flex items-center space-x-2"><svg class="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Saved!</span></span>`;
        btn.classList.add('animate-pulse');
        setTimeout(() => { btn.innerHTML = originalText; btn.classList.remove('animate-pulse'); btn.disabled = false;}, 2500);
      } catch (e) {
        console.error("Failed to save playlist order:", e); alert(`Failed to save order: ${e.message}`);
        btn.innerHTML = originalText; btn.disabled = false;
      }
    };
}

# Drew's Spotify Playlist Sorter

A web application for easily reordering your Spotify playlists with a sleek, modern interface. It features drag-and-drop sorting, automatic genre tagging via Last.fm, and real-time saving to your Spotify account.

## How to use
1. Clone this repository and run `cd <project-directory>/backend` to move into the project folder
2. Make sure you have Node.js installed. You can check by running `node --version`
3. Install dependencies by running `npm install express axios cors dotenv`
4. Fill out the .env.example and rename it to .env
5. Start the server using `node index.js` within the backend folder
6. Open your browser and navigate to `http://localhost:4000`
7. Click "Connect Spotify" to authenticate with your Spotify account

## Features
-   **Spotify Integration**: Full OAuth2 authentication with automatic token refresh.
-   **Playlist Loading**: Fetches and displays your Spotify playlists (excluding empty ones).
-   **Persistent Last Viewed Playlist**: Remembers and reloads your last opened playlist.
-   **Track Listing & Sorting**:
    -   **Drag & Drop Reordering**: Intuitive reordering of tracks within a playlist.
    -   **Random Shuffling**: Shuffle the current playlist locally.
-   **Track Management**:
    -   **Filter Tracks**: Filter tracks within a playlist by name or artist.
    -   **Remove Individual Tracks**: Click the trash icon to remove a track.
    -   **Batch Track Removal**: Select multiple tracks with checkboxes and remove them.
    -   **Remove Duplicate Tracks**: Scan and remove duplicate tracks (based on URI) from the current playlist.
-   **Saving Options**:
    -   **Save Changes to Current Playlist**: Overwrite the current Spotify playlist with your new order.
    -   **Save As New Playlist**: Save the sorted/modified track list as a new playlist in your Spotify account.
-   **Track Information & Discovery**:
    -   **Clickable Artist & Album Links**: Navigate directly to Spotify pages for artists and albums.
    -   **Detailed Track Info Modal**: Click a track (not links/buttons) to see:
        -   Album Art, Name, Release Date
        -   Artist(s), Duration
        -   Combined Genres (from Last.fm and Spotify album data)
        -   Direct link to the track on Spotify.
-   **Genre Tagging**: Automatic genre suggestion for tracks using the Last.fm API.
-   **Spotify Playback Status**: Shows what you're currently playing on any of your Spotify devices in the profile section ("Now Playing (Spotify): ...").

## API Endpoints (Backend - `index.js`)
-   `GET /api/config` - Returns client configuration (Spotify Client ID, Redirect URI, Last.fm API Key).
-   `POST /api/token` - Exchanges Spotify authorization code for an access token.
-   `POST /api/refresh` - Refreshes an expired Spotify access token.
-   `GET /api/genres` - Fetches genre information for a track from the Last.fm API.

## Potential Future Features
-   App Logo (for browser tab and header).
-   **Undo/Redo Action**: For track removal or reordering (More Complex).
-   **Playlist Analysis/Stats**: Display overall stats for a playlist (duration)
-   **Persistent UI Preferences**: Remember user choices like sort order, compact view, etc.
-   **Lyrics Display**: (If a suitable API is found and integrated).
-   **Account-related statistical information (most listened etc)**.
-   **When you're not playing music, it will display the last played song**.

## Issues
If you encounter any issues, please try to gather the following information before reaching out:
-   A screenshot or screen recording of the problem.
-   Any errors shown in the browser's developer console (Press F12 → Console tab).
-   A clear, step-by-step explanation of what you did and what went wrong.


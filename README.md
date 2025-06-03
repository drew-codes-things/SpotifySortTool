# Drew's Spotify Tool

## How to use
1. Clone this repository and run `cd <project-directory>/backend` to move into the project folder
2. Make sure you have Node.js installed. You can check by running `node --version`
3. Install dependencies by running `npm install express axios cors dotenv`
4. Fill out the .env.example and rename it to .env (make sure your spotify APP redirect URL is the same as this)
6. Start the server using `node index.js` within the backend folder
7. Open your browser and navigate to `http://localhost:4000`
8. Click "Connect Spotify" to authenticate with your Spotify account


## Features

*   **Spotify Integration**: Full OAuth2 authentication with automatic token refresh.
*   **Playlist Loading**: Fetches and displays your Spotify playlists (excluding empty ones).
*   **Persistent Last Viewed Playlist**: Remembers and reloads your last opened playlist.
*   **Track Information & Discovery**: Clickable Artist & Album Links**: Navigate directly to Spotify pages for artists and albums.
*   **Genre Tagging**: Automatic genre suggestion for tracks using the Last.fm API.
*   **Track Listing & Sorting**:
    *   **Drag & Drop Reordering**: Intuitive reordering of tracks within a playlist.
    *   **Multi-Criteria Sorting**: Sort tracks by name, artist, album, duration, or popularity (ascending/descending).
    *   **Random Shuffling**: Shuffle the current playlist locally.
*   **Track Management**:
    *   **Filter Tracks**: Filter tracks within a playlist by name or artist.
    *   **Remove Individual Tracks**: Click the trash icon to remove a track.
    *   **Batch Track Removal**: Select multiple tracks with checkboxes and remove them.
    *   **Remove Duplicate Tracks**: Scan and remove duplicate tracks (based on URI) from the current playlist.
    *   **Undo Action**: Quickly undo the last track removal (Still in beta.)
*   **Saving Options**:
    *   **Save Changes to Current Playlist**: Overwrite the current Spotify playlist with your new order.
    *   **Save As New Playlist**: Save the sorted/modified track list as a new playlist in your Spotify account.
*   **Spotify Playback Status**:
    *   Shows what you're currently playing on any of your Spotify devices in the profile section ("Now Playing (Spotify): ...").
    *   Displays your "Last Played" track if nothing is currently active.

## API Endpoints (Backend - `index.js`)
-   `GET /api/config` - Returns client configuration (Spotify Client ID, Redirect URI, Last.fm API Key).
-   `POST /api/token` - Exchanges Spotify authorization code for an access token.
-   `POST /api/refresh` - Refreshes an expired Spotify access token.
-   `GET /api/genres` - Fetches genre information for a track from the Last.fm API.

## Potential Future Features
*   App Logo (for browser tab and header).
*   **More Robust Undo/Redo Action**: For various actions beyond just track removal (e.g., Bulk actions reversal).
*   **Enhanced Playlist Analysis/Stats**: Display more detailed stats for a playlist (release year).
*   **Persistent UI Preferences**: Remember user choices like sort order preferences across sessions.
*   **Adding songs between playlists singularly and in bulk**

## Issues
If you encounter any issues, please try to gather the following information before reaching out:
-   A screenshot or screen recording of the problem.
-   Any errors shown in the browser's developer console (Press F12 → Console tab).
-   A clear, step-by-step explanation of what you did and what went wrong.




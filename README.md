# Drew's Spotify Playlist Sorter  

## How to use
1. Clone this repository and run `cd <project-directory>/backend` to move into the project folder
2. Make sure you have Node.js installed. You can check by running `node --version`
3. Install dependencies by running `npm install express axios cors dotenv`
4. Fill out the .env.example and rename it to .env
5. Start the server using `node index.js` within the backend folder
6. Open your browser and navigate to `http://localhost:4000`
7. Click "Connect Spotify" to authenticate with your Spotify account

## Features
- **Spotify Integration**: Full OAuth authentication with automatic token refresh
- **Drag & Drop Sorting**: Intuitive playlist reordering with smooth animations
- **Genre Tagging**: Automatic genre detection using Last.fm API
- **Music Previews**: Play track previews directly in the browser
- **Modern UI**: Glass-morphism design with red gradient theme and smooth animations
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Changes are saved directly to your Spotify playlists
- **Track Management**: Remove unwanted tracks with a simple click
- **Profile Integration**: Displays your Spotify profile and connection status

## API Endpoints
- `GET /api/config` - Returns client configuration
- `POST /api/token` - Exchanges authorization code for access token
- `POST /api/refresh` - Refreshes expired access tokens
- `GET /api/genres` - Fetches genre information from Last.fm

# Features to come
- Logo for the website TAB
- Own logo for the header
- Log out and log in functions in the top right
- Better sorting logic (drag & drop)
- Song preview ability
- "Now playing" view instead of "Music Curator"
- Lower loading times for playlists
- Batch song remove

## Issues
Contact me via email in case of any issues. Make sure to include:
- A screenshot of the problem (if applicable)
- The playlist you were trying to sort
- Browser console errors (press F12 → Console tab)
- A brief but clear explanation of what went wrong

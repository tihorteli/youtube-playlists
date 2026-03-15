// script.js - Frontend code to load and display playlists

async function loadPlaylists() {
    try {
        // Fetch playlists from the JSON file (not from YouTube API)
        const response = await fetch('playlists.json?' + new Date().getTime()); // Add timestamp to avoid cache
        
        if (!response.ok) {
            throw new Error(`Failed to load playlists: ${response.status}`);
        }
        
        const playlists = await response.json();
        
        // Update last updated time
        updateLastUpdated();
        
        // Display playlists
        displayPlaylists(playlists);
        
    } catch (error) {
        console.error('Error loading playlists:', error);
        document.getElementById('playlistContainer').innerHTML = `
            <div class="error">
                ❌ Failed to load playlists. Please try again later.
                <br>
                <small>${error.message}</small>
            </div>
        `;
    }
}

function displayPlaylists(playlists) {
    const container = document.getElementById('playlistContainer');
    
    if (!playlists || playlists.length === 0) {
        container.innerHTML = '<div class="error">No playlists available</div>';
        return;
    }
    
    container.innerHTML = playlists.map(playlist => `
        <div class="playlist-card" onclick="openPlaylist('${playlist.id}')">
            <div class="thumbnail-container">
                <img 
                    src="${playlist.thumbnail}" 
                    class="thumbnail" 
                    alt="${playlist.title}"
                    loading="lazy"
                    onerror="this.src='https://via.placeholder.com/320x180?text=No+Thumbnail'"
                >
            </div>
            <div class="playlist-info">
                <div class="playlist-title">${playlist.title || 'Untitled Playlist'}</div>
                <div class="channel-name">${playlist.channelTitle || 'Unknown Channel'}</div>
            </div>
        </div>
    `).join('');
}

function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    
    // Try to get from localStorage first
    let lastUpdated = localStorage.getItem('playlistsLastUpdated');
    
    if (lastUpdated) {
        const date = new Date(lastUpdated);
        lastUpdatedElement.innerHTML = `📅 Last updated: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    } else {
        // If not in localStorage, fetch from a meta file or use current date
        fetch('playlists-meta.json?' + new Date().getTime())
            .then(response => response.json())
            .then(meta => {
                const date = new Date(meta.lastUpdated);
                lastUpdatedElement.innerHTML = `📅 Last updated: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
                localStorage.setItem('playlistsLastUpdated', meta.lastUpdated);
            })
            .catch(() => {
                lastUpdatedElement.innerHTML = '📅 Updated daily';
            });
    }
}

function openPlaylist(playlistId) {
    if (playlistId) {
        window.open(`https://www.youtube.com/playlist?list=${playlistId}`, '_blank');
    }
}

// Load playlists when page loads
document.addEventListener('DOMContentLoaded', loadPlaylists);

// Refresh data every hour (optional)
setInterval(loadPlaylists, 60 * 60 * 1000);
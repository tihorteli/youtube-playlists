// update-playlists.js
const fs = require('fs').promises;
const path = require('path');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_PLAYLISTS = 10;

async function fetchFromYouTube(url) {
    const response = await fetch(url);
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`YouTube API error: ${response.status} - ${error}`);
    }
    return response.json();
}

async function updatePlaylists() {
    console.log('🔄 Starting playlist update...');
    console.log(`🔑 API Key present: ${YOUTUBE_API_KEY ? 'Yes' : 'No'}`);
    
    try {
        const allPlaylists = [];
        let nextPageToken = '';
        
        // Search for popular playlists (adding a search query to get results)
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
            `part=snippet` +
            `&type=playlist` +
            `&q=music` +  // Adding a search term to get results
            `&maxResults=10` +
            `&key=${YOUTUBE_API_KEY}`;
        
        console.log(`🔍 Fetching from YouTube...`);
        console.log(`URL: ${searchUrl.replace(YOUTUBE_API_KEY, 'HIDDEN')}`);
        
        const searchData = await fetchFromYouTube(searchUrl);
        
        if (!searchData.items || searchData.items.length === 0) {
            console.log('❌ No playlists found from YouTube');
            console.log('Response:', JSON.stringify(searchData, null, 2));
            return;
        }
        
        console.log(`✅ Found ${searchData.items.length} playlists`);
        
        // Process each playlist
        for (const item of searchData.items) {
            // Get low quality thumbnail (default is smallest)
            const thumbnail = 
                item.snippet.thumbnails.default?.url ||
                'https://via.placeholder.com/120x90?text=No+Thumbnail';
            
            allPlaylists.push({
                id: item.id.playlistId,
                title: item.snippet.title || 'Untitled Playlist',
                channelTitle: item.snippet.channelTitle || 'Unknown Channel',
                thumbnail: thumbnail,
            });
            
            console.log(`📋 Added: ${item.snippet.title}`);
        }
        
        console.log(`✅ Processed ${allPlaylists.length} playlists`);
        
        // Save to playlists.json
        await fs.writeFile(
            path.join(__dirname, 'playlists.json'),
            JSON.stringify(allPlaylists, null, 2)
        );
        
        console.log('💾 Saved to playlists.json');
        console.log('📝 First playlist:', allPlaylists[0]);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

updatePlaylists();
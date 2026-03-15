// update-playlists.js
// This script runs daily via GitHub Action to fetch new playlists

const fs = require('fs').promises;
const path = require('path');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_PLAYLISTS = 10; // Fetch exactly 10 playlists

async function fetchFromYouTube(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
    }
    return response.json();
}

async function getChannelNames(channelIds) {
    if (!channelIds || channelIds.length === 0) return {};
    
    const uniqueIds = [...new Set(channelIds)];
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${uniqueIds.join(',')}&key=${YOUTUBE_API_KEY}`;
    
    try {
        const data = await fetchFromYouTube(url);
        const channelMap = {};
        
        for (const channel of data.items || []) {
            channelMap[channel.id] = channel.snippet.title;
        }
        
        return channelMap;
    } catch (error) {
        console.error('Error fetching channel names:', error);
        return {};
    }
}

async function updatePlaylists() {
    console.log('🔄 Starting playlist update...');
    console.log(`📊 Target: ${MAX_PLAYLISTS} playlists`);
    
    try {
        const allPlaylists = [];
        let nextPageToken = '';
        let totalFetched = 0;
        
        // Keep fetching until we have exactly 10 playlists
        while (totalFetched < MAX_PLAYLISTS) {
            const needsToFetch = Math.min(10, MAX_PLAYLISTS - totalFetched);
            
            // Search for playlists (get random ones by not specifying any query)
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
                `part=snippet` +
                `&type=playlist` +
                `&maxResults=${needsToFetch}` +
                `&key=${YOUTUBE_API_KEY}` +
                (nextPageToken ? `&pageToken=${nextPageToken}` : '');
            
            console.log(`🔍 Fetching batch ${Math.floor(totalFetched/10) + 1}...`);
            
            const searchData = await fetchFromYouTube(searchUrl);
            
            if (!searchData.items || searchData.items.length === 0) {
                console.log('❌ No more playlists available');
                break;
            }
            
            // Collect channel IDs for this batch
            const channelIds = searchData.items.map(item => item.snippet.channelId);
            const channelNames = await getChannelNames(channelIds);
            
            // Process each playlist
            for (const item of searchData.items) {
                if (totalFetched >= MAX_PLAYLISTS) break;
                
                // Get LOW QUALITY thumbnail (default is smallest)
                const thumbnail = 
                    item.snippet.thumbnails.default?.url || // 120x90
                    item.snippet.thumbnails.medium?.url ||  // 320x180
                    'https://via.placeholder.com/120x90?text=No+Thumbnail';
                
                allPlaylists.push({
                    id: item.id.playlistId,
                    title: item.snippet.title || 'Untitled Playlist',
                    channelTitle: channelNames[item.snippet.channelId] || item.snippet.channelTitle || 'Unknown Channel',
                    thumbnail: thumbnail,
                    // NO date, NO views, NO creator details (as requested)
                });
                
                totalFetched++;
            }
            
            nextPageToken = searchData.nextPageToken;
            
            // If no more pages, break
            if (!nextPageToken) break;
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`✅ Fetched ${allPlaylists.length} playlists`);
        
        // Save to playlists.json (this will OVERWRITE the old ones)
        await fs.writeFile(
            path.join(__dirname, 'playlists.json'),
            JSON.stringify(allPlaylists, null, 2)
        );
        
        // Also save a minified version (optional, smaller file size)
        await fs.writeFile(
            path.join(__dirname, 'playlists.min.json'),
            JSON.stringify(allPlaylists)
        );
        
        // Save metadata with timestamp
        const metadata = {
            count: allPlaylists.length,
            lastUpdated: new Date().toISOString(),
            version: 1
        };
        
        await fs.writeFile(
            path.join(__dirname, 'playlists-meta.json'),
            JSON.stringify(metadata, null, 2)
        );
        
        console.log('💾 Files saved successfully!');
        console.log('📝 Metadata:', metadata);
        
        // Log the first playlist as sample
        if (allPlaylists.length > 0) {
            console.log('📋 Sample playlist:', {
                title: allPlaylists[0].title,
                channel: allPlaylists[0].channelTitle,
                thumbnail: allPlaylists[0].thumbnail
            });
        }
        
    } catch (error) {
        console.error('❌ Error updating playlists:', error);
        process.exit(1);
    }
}

// Run the update
updatePlaylists();
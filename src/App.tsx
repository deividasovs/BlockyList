import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import { getSpotifyData } from './spotifyScript';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  Container,
  Paper,
  Grid,
  CircularProgress,
  Fade,
  Zoom,
  Avatar,
  AppBar,
  Toolbar,
  IconButton,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { CreatePlaylistBlocks } from './components/CreatePlaylistBlocks';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase/config';
import { Play } from './playing';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { motion } from 'framer-motion';

interface Playlist {
  id: string;
  title: string;
  name: string;
  description: string;
  blocks: any[];
}

function MainPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfileImage, setUserProfileImage] = useState<any | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [creatingPlaylistId, setCreatingPlaylistId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    async function initializeAuth() {
      setIsAuthenticating(true);
      setIsLoading(true);

      try {
        // First check if token is valid, or handle the callback
        const isAuthenticated = await getSpotifyData();

        console.log('isAuthenticated:', isAuthenticated);

        if (isAuthenticated) {
          // If authentication is successful, load user data
          const profileId = localStorage.getItem('profile_id');
          setUserId(profileId);
          setUserProfileImage(localStorage.getItem('profile_image'));
          setUserDisplayName(localStorage.getItem('profile_display_name'));

          if (profileId) {
            await fetchPlaylistsForUser(profileId);
          }
          else {
            console.log('No profile ID found!');
          }
        }
      } catch (error) {
        console.error('Error during authentication:', error);
        setSnackbar({
          open: true,
          message: 'Authentication failed. Please try again.',
          severity: 'error'
        });
      } finally {
        setIsAuthenticating(false);
        setIsLoading(false);
      }
    }

    initializeAuth();

    // Show welcome message if user just came from callback
    if (location.pathname === '/callback') {
      setSnackbar({
        open: true,
        message: 'Successfully logged in!',
        severity: 'success'
      });
    }

  }, []);

  const fetchPlaylistsForUser = async (profileId: string) => {
    try {
      const playlistsCollection = collection(db, `users/${profileId}/playlists`);
      const playlistSnapshot = await getDocs(playlistsCollection);
      const playlistList = playlistSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setPlaylists(playlistList);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load your playlists',
        severity: 'error'
      });
    }
  };

  const handlePlaylistClick = (playlistId: string) => {
    navigate(`/edit-playlist/${playlistId}`);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const createPlaylistOnSpotify = async (playlist: Playlist) => {
    try {
      setCreatingPlaylistId(playlist.id);
      const accessToken = localStorage.getItem('spotify_access_token');
      if (!accessToken) throw new Error('No access token found');

      // Get user ID
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const userData = await userResponse.json();

      // Create empty playlist
      const createResponse = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playlist.name,
          description: playlist.description,
          public: true
        })
      });
      const playlistData = await createResponse.json();

      // Process each block and add items
      for (const block of playlist.blocks) {
        console.log('[Block Processing] Inspecting block:', JSON.stringify(block, null, 2));

        if (block.type === 'podcast' && block.podcastEpisode) {
          // Add podcast episode
          await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uris: [`spotify:episode:${block.podcastEpisode.id}`]
            })
          });
        } else if (block.type === 'songs' && block.playlist) {
          let tracksData;

          console.log(`[Songs Block] Processing source: ${block.playlist.id}`);

          if (block.playlist.id === 'liked_songs') {
            // Fetch tracks from Liked Songs
            const likedTracksResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!likedTracksResponse.ok) {
              throw new Error('Failed to fetch liked tracks');
            }

            tracksData = await likedTracksResponse.json();
            tracksData.items = tracksData.items.map((item: any) => ({
              track: item.track
            }));
            console.log('[Songs Block] Raw Liked Songs data:', tracksData);
          } else {
            // Fetch tracks from regular playlist
            const tracksResponse = await fetch(
              `https://api.spotify.com/v1/playlists/${block.playlist.id}/tracks?limit=50`,
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );

            if (!tracksResponse.ok) {
              throw new Error('Failed to fetch tracks from source playlist');
            }

            tracksData = await tracksResponse.json();
            console.log(`[Songs Block] Raw Playlist (${block.playlist.id}) data:`, tracksData);
          }

          const validTracks = tracksData.items
            .filter((item: any) => item.track && !item.track.is_local)
            .map((item: any) => item.track.uri);
          console.log('[Songs Block] Valid track URIs:', validTracks);

          const numTracks = Math.floor(Math.random() *
            (block.songRange.max - block.songRange.min + 1)) + block.songRange.min;
          console.log(`[Songs Block] Number of tracks to select: ${numTracks}`);

          const selectedTracks = validTracks
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(numTracks, validTracks.length));
          console.log('[Songs Block] Selected track URIs to add:', selectedTracks);

          if (selectedTracks.length > 0) {
            await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                uris: selectedTracks
              })
            });
          }
        } else if (block.type === 'latest-podcast' && block.podcastShow) {
          // Fetch latest episode for the show
          const showResponse = await fetch(`https://api.spotify.com/v1/shows/${block.podcastShow.id}/episodes`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const showData = await showResponse.json();
          const latestEpisode = showData.items[0];

          if (latestEpisode) {
            await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                uris: [`spotify:episode:${latestEpisode.id}`]
              })

            });
          }
        } else if (block.type === 'recommended-songs') {
          console.log('[Recommended Songs Block - Using Top Tracks] Processing...');

          // 1. Get user's top tracks
          const topTracksResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (!topTracksResponse.ok) {
            console.error('[Recommended Songs Block - Using Top Tracks] Failed to fetch top tracks');
            continue; // Skip this block if fetching top tracks fails
          }
          const topTracksData = await topTracksResponse.json();

          const topTrackUris = topTracksData.items
            .filter((item: any) => item && !item.is_local) // Ensure track exists and is not local
            .map((item: any) => item.uri);

          console.log(`[Recommended Songs Block - Using Top Tracks] Fetched ${topTrackUris.length} top track URIs:`, topTrackUris);

          if (topTrackUris.length === 0) {
            console.warn('[Recommended Songs Block - Using Top Tracks] No valid top tracks found, skipping block.');
            continue; // Skip if no seeds
          }

          // 2. Select random number of tracks within range from the fetched top tracks
          const numTracksToSelect = Math.floor(Math.random() *
            (block.songRange.max - block.songRange.min + 1)) + block.songRange.min;

          // Ensure we don't try to select more than we have
          const finalNumTracks = Math.min(numTracksToSelect, topTrackUris.length);

          // Shuffle and slice
          const selectedTracks = topTrackUris
            .sort(() => Math.random() - 0.5)
            .slice(0, finalNumTracks);

          console.log(`[Recommended Songs Block - Using Top Tracks] Selected ${selectedTracks.length} tracks to add:`, selectedTracks);

          // 3. Add selected tracks to the playlist
          if (selectedTracks.length > 0) {
            await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                uris: selectedTracks
              })
            });
          }
        }
      }

      // Successful creation notification
      setSnackbar({
        open: true,
        message: 'Playlist created successfully!',
        severity: 'success'
      });

      // Open the playlist in Spotify
      window.open(playlistData.external_urls.spotify, '_blank');
    } catch (error) {
      console.error('Error creating playlist on Spotify:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create playlist on Spotify',
        severity: 'error'
      });
    } finally {
      setCreatingPlaylistId(null);
    }
  };

  if (isAuthenticating || isLoading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        backgroundColor: '#121212'
      }}>
        <CircularProgress sx={{ color: '#1DB954', mb: 3 }} />
        <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
          {isAuthenticating ? 'Authenticating with Spotify...' : 'Loading your content...'}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: '#121212', mb: 2 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#1DB954', fontWeight: 'bold' }}>
            BlockyList Home
          </Typography>

        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Box>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                mb: 4,
                bgcolor: '#121212',
                borderRadius: 2,
                backgroundImage: 'linear-gradient(60deg, #121212 0%, #181818 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                {userProfileImage && (
                  <Avatar
                    src={userProfileImage}
                    alt="Profile"
                    sx={{
                      height: 80,
                      width: 80,
                      border: '3px solid #1DB954',
                      mr: 3
                    }}
                  />
                )}
                <Box>
                  <Typography variant="h4" sx={{ color: '#FFFFFF', mb: 1, fontWeight: 'bold' }}>
                    Welcome, {userDisplayName}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#B3B3B3' }}>
                    Template your Spotify playlists using BlockyLists.
                    Instantly generate a fresh Spotify playlist on demand—featuring a mix of your favorite music and your latest podcast episodes.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>

          <Box>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                bgcolor: '#121212',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Typography variant="h5" sx={{ color: '#FFFFFF', mb: 3, fontWeight: 'bold' }}>
                My Custom Blockylists
              </Typography>

              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  p: 2,
                  zIndex: 1
                }}
              >
                <Tooltip title="Create New Blockylist">
                  <IconButton
                    component={motion.button}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/create-playlist-blocks')}
                    sx={{
                      bgcolor: '#1DB954',
                      color: '#FFFFFF',
                      '&:hover': {
                        bgcolor: '#1ed760',
                      },
                      boxShadow: '0 4px 20px rgba(29, 185, 84, 0.5)'
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ mt: 4 }}>
                {playlists.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 6,
                      color: '#B3B3B3',
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      You don't have any Blockylists yet
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/create-playlist-blocks')}
                      sx={{
                        bgcolor: '#1DB954',
                        color: '#FFFFFF',
                        '&:hover': {
                          bgcolor: '#1ed760',
                        },
                        py: 1,
                        px: 3
                      }}
                    >
                      Create Your First Blockylist
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {playlists.map((playlist: any, index: number) => (
                      <Grid item xs={12} sm={6} md={4} key={playlist.id}>
                        <Fade in={true} style={{ transitionDelay: `${index * 100}ms` }}>
                          <Paper
                            component={motion.div}
                            whileHover={{
                              y: -8,
                              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            sx={{
                              p: 3,
                              borderRadius: 2,
                              bgcolor: '#282828',
                              color: '#FFFFFF',
                              minHeight: '180px',
                              display: 'flex',
                              flexDirection: 'column',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                              position: 'relative',
                              overflow: 'hidden',
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '4px',
                                background: '#1DB954',
                              }
                            }}
                            onClick={() => handlePlaylistClick(playlist.id)}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                mb: 1,
                                fontWeight: 'bold',
                                color: '#FFFFFF'
                              }}
                            >
                              {playlist.name}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#B3B3B3',
                                mb: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {playlist.description || 'No description'}
                            </Typography>
                            <Box
                              sx={{
                                mt: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#1DB954',
                                  fontWeight: 'medium',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5
                                }}
                              >
                                <span>{playlist.blocks?.length || 0} blocks</span>
                              </Typography>

                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Edit Blockylist">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlaylistClick(playlist.id);
                                    }}
                                    sx={{
                                      color: '#FFFFFF',
                                      bgcolor: 'rgba(255,255,255,0.1)',
                                      '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                      }
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Create playlist on Spotify">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      createPlaylistOnSpotify(playlist);
                                    }}
                                    disabled={creatingPlaylistId !== null}
                                    sx={{
                                      color: '#FFFFFF',
                                      bgcolor: '#1DB954',
                                      '&:hover': {
                                        bgcolor: '#1ed760',
                                      },
                                      width: 32,
                                      height: 32,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {creatingPlaylistId === playlist.id ? (
                                      <CircularProgress size={20} sx={{ color: '#FFFFFF' }} />
                                    ) : (
                                      <PlaylistAddIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          </Paper>
                        </Fade>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%', bgcolor: snackbar.severity === 'success' ? '#1DB954' : undefined }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

function App() {
  return (
    <Router basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/create-playlist-blocks" element={<CreatePlaylistBlocks mode="create" />} />
        <Route path="/edit-playlist/:playlistId" element={<CreatePlaylistBlocks mode="edit" />} />
        <Route path="/callback" element={<MainPage />} />
        <Route path="/playing" element={<Play />} />
      </Routes>
    </Router>
  );
}

export default App;

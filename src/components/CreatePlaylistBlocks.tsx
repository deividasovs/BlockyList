import { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    Typography,
    Container,
    Stack,
    Paper,
    FormControlLabel,
    Checkbox,
    TextField,
    Fade,
    Zoom,
    IconButton,
    AppBar,
    Toolbar,
    Tooltip,
    Avatar,
    CircularProgress,
    Slide,
    Backdrop,
    Divider,
    Grid,
    Chip,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CardMedia,
    CardContent
} from '@mui/material';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';

import { motion, AnimatePresence } from 'framer-motion';

import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import SaveIcon from '@mui/icons-material/Save';
import HomeIcon from '@mui/icons-material/Home';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import RecommendIcon from '@mui/icons-material/Recommend';
import { useNavigate, useParams } from 'react-router-dom';

interface PlaylistBlock {
    id: string;
    type: 'podcast' | 'songs' | 'latest-podcast' | 'recommended-songs';
    title: string;
    description: string;
    songRange?: { min: number; max: number };
    podcastEpisode?: {
        id: string;
        title: string;
        showName: string;
        imageUrl: string;
    };
    playlist?: {
        id: string;
        name: string;
        imageUrl: string;
    };
    podcastShow?: {
        id: string;
        name: string;
        imageUrl: string;
    };
}

interface PodcastEpisode {
    id: string;
    title: string;
    showName: string;
    imageUrl: string;
    duration: string;
}

interface Playlist {
    id: string;
    name: string;
    imageUrl: string;
    trackCount: number;
}

interface PodcastShow {
    id: string;
    name: string;
    imageUrl: string;
}

interface CreatePlaylistBlocksProps {
    mode: 'create' | 'edit';
}

export function CreatePlaylistBlocks({ mode }: CreatePlaylistBlocksProps) {
    const { playlistId } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const [playlistData, setPlaylistData] = useState<{
        blocks: PlaylistBlock[];
        name: string;
        description: string;
        isSelfDeleting: boolean;
        isDailyCreating: boolean;
    } | null>(null);
    const [blocks, setBlocks] = useState<PlaylistBlock[]>([]);
    const [playlistName, setPlaylistName] = useState('');
    const [playlistDescription, setPlaylistDescription] = useState('');
    const [isSelfDeleting, setIsSelfDeleting] = useState(false);
    const [isDailyCreating, setIsDailyCreating] = useState(false);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [isPodcastDialogOpen, setIsPodcastDialogOpen] = useState(false);
    const [recentPodcasts, setRecentPodcasts] = useState<PodcastEpisode[]>([]);
    const [isLoadingPodcasts, setIsLoadingPodcasts] = useState(false);
    const [podcastError, setPodcastError] = useState<string | null>(null);
    const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
    const [playlistError, setPlaylistError] = useState<string | null>(null);
    const [shows, setShows] = useState<PodcastShow[]>([]);
    const [isShowDialogOpen, setIsShowDialogOpen] = useState(false);
    const [isLoadingShows, setIsLoadingShows] = useState(false);
    const [showError, setShowError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [podcastSearchQuery, setPodcastSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<PodcastShow[]>([]);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'info' | 'warning'
    });

    const songRangeOptions = [
        { label: 'Few (2-4)', min: 2, max: 4 },
        { label: 'Some (4-7)', min: 4, max: 7 },
        { label: 'Many (7-12)', min: 7, max: 12 },
        { label: 'Lots (12-20)', min: 12, max: 20 },
    ];

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    useEffect(() => {
        if (mode === 'edit' && playlistId) {
            fetchPlaylistData();
        } else {
            setIsLoading(false);
        }
    }, [playlistId]);

    const fetchPlaylistData = async () => {
        setIsLoading(true);
        try {
            const accessToken = localStorage.getItem('spotify_access_token');
            if (!accessToken) throw new Error('No access token found');

            // Get user ID
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const userData = await userResponse.json();

            const docRef = doc(db, `users/${userData.id}/playlists`, playlistId!);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const typedData = data as {
                    blocks: PlaylistBlock[];
                    name: string;
                    description: string;
                    isSelfDeleting: boolean;
                    isDailyCreating: boolean;
                };
                setPlaylistData(typedData);
                setBlocks(typedData.blocks);
                setPlaylistName(typedData.name);
                setPlaylistDescription(typedData.description);
                setIsSelfDeleting(typedData.isSelfDeleting);
                setIsDailyCreating(docSnap.data().isDailyCreating);

                setSnackbar({
                    open: true,
                    message: 'Blockylist loaded successfully',
                    severity: 'success'
                });
            }
        } catch (error) {
            console.error('Error fetching playlist:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch playlist');
            setSnackbar({
                open: true,
                message: 'Failed to load Blockylist',
                severity: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (updatedData: any) => {
        try {
            setIsCreating(true);
            if (mode === 'edit' && playlistId) {
                await updateDoc(doc(db, 'playlists', playlistId), updatedData);
                setSnackbar({
                    open: true,
                    message: 'Blockylist updated successfully',
                    severity: 'success'
                });
            }
        } catch (error) {
            console.error('Error updating playlist:', error);
            setError(error instanceof Error ? error.message : 'Failed to update playlist');
            setSnackbar({
                open: true,
                message: 'Failed to update Blockylist',
                severity: 'error'
            });
        } finally {
            setIsCreating(false);
        }
    };

    const fetchRecentPodcasts = async () => {
        setIsLoadingPodcasts(true);
        setPodcastError(null);

        try {
            const response = await fetch('https://api.spotify.com/v1/me/episodes', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch podcasts');
            }

            const data = await response.json();

            const formattedPodcasts: PodcastEpisode[] = data.items.map((item: any) => ({
                id: item.episode.id,
                title: item.episode.name,
                showName: item.episode.show.name,
                imageUrl: item.episode.images[0]?.url || '',
                duration: formatDuration(item.episode.duration_ms)
            }));

            setRecentPodcasts(formattedPodcasts);
        } catch (error) {
            console.error('Error fetching podcasts:', error);
            setPodcastError('Failed to load recent podcasts');
            setSnackbar({
                open: true,
                message: 'Failed to load recent podcasts',
                severity: 'error'
            });
        } finally {
            setIsLoadingPodcasts(false);
        }
    };

    const formatDuration = (ms: number): string => {
        const minutes = Math.floor(ms / 60000);
        return `${minutes} min`;
    };

    useEffect(() => {
        if (isPodcastDialogOpen) {
            fetchRecentPodcasts();
        }
    }, [isPodcastDialogOpen]);

    const addPodcastBlock = () => {
        setBlocks([...blocks, {
            id: `block-${Date.now()}`,
            type: 'podcast',
            title: 'Podcast Episode',
            description: 'Click to select an episode'
        }]);
        setSnackbar({
            open: true,
            message: 'Podcast block added',
            severity: 'success'
        });
    };

    const addLatestPodcastBlock = () => {
        setBlocks([...blocks, {
            id: `block-${Date.now()}`,
            type: 'latest-podcast',
            title: 'Latest From Show',
            description: 'Click to select a show'
        }]);
        setSnackbar({
            open: true,
            message: 'Latest podcast block added',
            severity: 'success'
        });
    };

    const addSongsBlock = () => {
        setBlocks([...blocks, {
            id: `block-${Date.now()}`,
            type: 'songs',
            title: 'Songs From Playlist',
            description: 'Click to select a playlist',
            songRange: { min: 4, max: 7 }
        }]);
        setSnackbar({
            open: true,
            message: 'Songs block added',
            severity: 'success'
        });
    };

    const addRecommendedSongsBlock = () => {
        setBlocks([...blocks, {
            id: `block-${Date.now()}`,
            type: 'recommended-songs',
            title: 'New Recommended Songs Block',
            description: 'Based on your listening history',
            songRange: { min: 4, max: 7 }
        }]);
        setSnackbar({
            open: true,
            message: 'Recommended songs block added',
            severity: 'success'
        });
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItem === null) return;

        const items = Array.from(blocks);
        const draggedItemContent = items[draggedItem];
        items.splice(draggedItem, 1);
        items.splice(index, 0, draggedItemContent);

        setBlocks(items);
        setDraggedItem(index);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const removeBlock = (blockId: string) => {
        setBlocks(blocks.filter(block => block.id !== blockId));
    };

    const handlePodcastClick = (blockId: string) => {
        setSelectedBlockId(blockId);
        const block = blocks.find(b => b.id === blockId);
        if (block?.type === 'latest-podcast') {
            setIsShowDialogOpen(true);
        } else {
            setIsPodcastDialogOpen(true);
        }
    };

    const handlePodcastSelect = (episode: PodcastEpisode) => {
        setBlocks(blocks.map(block =>
            block.id === selectedBlockId
                ? {
                    ...block,
                    title: episode.title,
                    description: episode.showName,
                    podcastEpisode: {
                        id: episode.id,
                        title: episode.title,
                        showName: episode.showName,
                        imageUrl: episode.imageUrl
                    }
                }
                : block
        ));
        setIsPodcastDialogOpen(false);
    };

    const fetchPlaylists = async () => {
        setIsLoadingPlaylists(true);
        setPlaylistError(null);

        try {
            const accessToken = localStorage.getItem('spotify_access_token');
            if (!accessToken) throw new Error('No access token found');

            // Fetch liked songs count first
            let likedSongsCount = 0;
            try {
                const likedSongsResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (likedSongsResponse.ok) {
                    const likedSongsData = await likedSongsResponse.json();
                    likedSongsCount = likedSongsData.total || 0;
                } else {
                    console.warn('Failed to fetch liked songs count');
                }
            } catch (err) {
                console.warn('Error fetching liked songs count:', err);
            }

            let allPlaylists: Playlist[] = [{
                id: 'liked_songs',
                name: 'Liked Songs',
                imageUrl: 'https://misc.scdn.co/liked-songs/liked-songs-640.png',
                trackCount: likedSongsCount // Use the fetched count here
            }];

            // Fetch user playlists
            const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch playlists');
            }

            const data = await response.json();

            const formattedPlaylists = data.items.map((item: any) => ({
                id: item.id,
                name: item.name,
                imageUrl: item.images && item.images.length > 0 ? item.images[0].url : '',
                trackCount: item.tracks.total
            }));

            allPlaylists = [...allPlaylists, ...formattedPlaylists];
            setPlaylists(allPlaylists);
        } catch (error) {
            console.error('Error fetching playlists:', error);
            setPlaylistError('Failed to load playlists');
            setSnackbar({
                open: true,
                message: 'Failed to load playlists',
                severity: 'error'
            });
        } finally {
            setIsLoadingPlaylists(false);
        }
    };

    useEffect(() => {
        if (isPlaylistDialogOpen) {
            fetchPlaylists();
        }
    }, [isPlaylistDialogOpen]);

    const handlePlaylistClick = (blockId: string) => {
        const block = blocks.find(b => b.id === blockId);
        if (block?.type !== 'recommended-songs') {
            setSelectedBlockId(blockId);
            setIsPlaylistDialogOpen(true);
        }
    };

    const handlePlaylistSelect = (playlist: Playlist) => {
        setBlocks(blocks.map(block =>
            block.id === selectedBlockId
                ? {
                    ...block,
                    title: playlist.name,
                    description: `${playlist.trackCount} tracks`,
                    playlist: {
                        id: playlist.id,
                        name: playlist.name,
                        imageUrl: playlist.imageUrl
                    }
                }
                : block
        ));
        setIsPlaylistDialogOpen(false);
    };

    const fetchPodcastShows = async () => {
        setIsLoadingShows(true);
        setShowError(null);

        try {
            const accessToken = localStorage.getItem('spotify_access_token');
            if (!accessToken) throw new Error('No access token found');

            // Fetch user's followed shows
            const response = await fetch('https://api.spotify.com/v1/me/shows?limit=50', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch shows');
            }

            const data = await response.json();

            const formattedShows = data.items.map((item: any) => ({
                id: item.show.id,
                name: item.show.name,
                imageUrl: item.show.images[0]?.url || ''
            }));

            setShows(formattedShows);
        } catch (error) {
            console.error('Error fetching podcast shows:', error);
            setShowError('Failed to load podcast shows');
            setSnackbar({
                open: true,
                message: 'Failed to load podcast shows',
                severity: 'error'
            });
        } finally {
            setIsLoadingShows(false);
        }
    };

    useEffect(() => {
        if (isShowDialogOpen) {
            fetchPodcastShows();
        }
    }, [isShowDialogOpen]);

    const handleShowSelect = (show: PodcastShow) => {
        setBlocks(blocks.map(block =>
            block.id === selectedBlockId
                ? {
                    ...block,
                    title: show.name,
                    description: 'Latest episode will be added',
                    podcastShow: {
                        id: show.id,
                        name: show.name,
                        imageUrl: show.imageUrl
                    }
                }
                : block
        ));
        setIsShowDialogOpen(false);
    };

    const getRecommendedTracks = async (accessToken: string, numTracks: number) => {
        try {
            const allTracks = new Map();

            // Get user's top artists
            const topArtistsResponse = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (topArtistsResponse.ok) {
                const topArtistsData = await topArtistsResponse.json();
                const artists = topArtistsData.items || [];

                // Get 10 random artists
                const randomArtists = artists
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 10);

                // Get top tracks from each artist
                for (const artist of randomArtists) {
                    const artistTracksResponse = await fetch(
                        `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=from_token`,
                        {
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        }
                    );

                    if (artistTracksResponse.ok) {
                        const artistTracksData = await artistTracksResponse.json();
                        (artistTracksData.tracks || []).forEach((track: any) => {
                            if (track?.uri && !track.is_local) {
                                allTracks.set(track.uri, {
                                    uri: track.uri,
                                    popularity: track.popularity || 50,
                                    weight: 0.8 // Good weight for artist tracks
                                });
                            }
                        });
                    }
                }
            }

            // Get user's playlists
            const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (playlistsResponse.ok) {
                const playlistsData = await playlistsResponse.json();
                const playlists = playlistsData.items || [];

                // Get 8 random playlists
                const randomPlaylists = playlists
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 8);

                // Get tracks from each playlist
                for (const playlist of randomPlaylists) {
                    const playlistTracksResponse = await fetch(
                        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=30`,
                        {
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        }
                    );

                    if (playlistTracksResponse.ok) {
                        const playlistTracksData = await playlistTracksResponse.json();
                        (playlistTracksData.items || []).forEach((item: any) => {
                            if (item?.track?.uri && !item.track.is_local) {
                                const existing = allTracks.get(item.track.uri);
                                allTracks.set(item.track.uri, {
                                    uri: item.track.uri,
                                    popularity: item.track.popularity || 50,
                                    weight: existing ? existing.weight + 0.3 : 0.3
                                });
                            }
                        });
                    }
                }
            }

            // Get user's saved tracks to exclude them
            const savedTracksResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (savedTracksResponse.ok) {
                const savedTracksData = await savedTracksResponse.json();
                const savedTrackUris = new Set(
                    (savedTracksData.items || [])
                        .map((item: any) => item?.track?.uri)
                        .filter(Boolean)
                );

                // Remove saved tracks from our selection
                savedTrackUris.forEach(uri => {
                    allTracks.delete(uri);
                });
            }

            // Convert to array and sort by weight and popularity
            const tracks = Array.from(allTracks.values())
                .sort((a, b) => {
                    // Mix weight, popularity, and randomness for better variety
                    const aScore = (a.weight * 30) + (a.popularity * 0.7) + (Math.random() * 20);
                    const bScore = (b.weight * 30) + (b.popularity * 0.7) + (Math.random() * 20);
                    return bScore - aScore;
                });

            if (tracks.length === 0) {
                throw new Error('No valid tracks found');
            }

            // Select tracks ensuring variety
            const selectedTracks: string[] = [];
            const tracksNeeded = Math.min(numTracks, tracks.length);

            // Select from different popularity ranges
            const lowPop = Math.floor(tracksNeeded * 0.3);  // 30% less popular
            const midPop = Math.floor(tracksNeeded * 0.4);  // 40% medium popularity
            const highPop = tracksNeeded - lowPop - midPop; // 30% high popularity

            // Add low popularity tracks
            selectedTracks.push(
                ...tracks.slice(0, Math.floor(tracks.length * 0.4))
                    .sort(() => Math.random() - 0.5)
                    .slice(0, lowPop)
                    .map(track => track.uri)
            );

            // Add mid popularity tracks
            const midStart = Math.floor(tracks.length * 0.4);
            selectedTracks.push(
                ...tracks.slice(midStart, Math.floor(tracks.length * 0.7))
                    .sort(() => Math.random() - 0.5)
                    .slice(0, midPop)
                    .map(track => track.uri)
            );

            // Add high popularity tracks
            const highStart = Math.floor(tracks.length * 0.7);
            selectedTracks.push(
                ...tracks.slice(highStart)
                    .sort(() => Math.random() - 0.5)
                    .slice(0, highPop)
                    .map(track => track.uri)
            );

            // Final shuffle
            return selectedTracks.sort(() => Math.random() - 0.5);

        } catch (error) {
            console.error('Error getting recommended tracks:', error);
            throw new Error('Failed to generate track recommendations. Please try again.');
        }
    };

    // Check if any block is incomplete
    const isAnyBlockIncomplete = blocks.some(block =>
        (block.type === 'podcast' && !block.podcastEpisode) ||
        (block.type === 'latest-podcast' && !block.podcastShow) ||
        (block.type === 'songs' && !block.playlist)
    );

    const createPlaylist = async () => {
        if (!playlistName.trim()) {
            setSnackbar({
                open: true,
                message: 'Please enter a Blockylist name',
                severity: 'error'
            });
            return;
        }

        // Add check for incomplete blocks
        if (isAnyBlockIncomplete) {
            setSnackbar({
                open: true,
                message: 'Please complete all blocks before saving.',
                severity: 'error'
            });
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const accessToken = localStorage.getItem('spotify_access_token');
            if (!accessToken) throw new Error('No access token found');

            // Get user ID for Firestore
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            const userId = userData.id;

            // Create a new document in the user's playlists collection
            const playlistsCollection = `users/${userId}/playlists`;
            const newPlaylistRef = doc(collection(db, playlistsCollection));

            await setDoc(newPlaylistRef, {
                name: playlistName,
                description: playlistDescription,
                blocks: blocks,
                isSelfDeleting: isSelfDeleting,
                isDailyCreating: isDailyCreating,
                createdAt: new Date().toISOString()
            });

            setSnackbar({
                open: true,
                message: 'Blockylist created successfully!',
                severity: 'success'
            });

            // Navigate back to home
            navigate('/');
        } catch (error) {
            console.error('Error creating playlist:', error);
            setError(error instanceof Error ? error.message : 'Failed to create playlist');
            setSnackbar({
                open: true,
                message: 'Failed to create Blockylist',
                severity: 'error'
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleSongRangeSelect = (blockId: string, min: number, max: number) => {
        setBlocks(blocks.map(block =>
            block.id === blockId
                ? { ...block, songRange: { min, max } }
                : block
        ));
    };

    const searchPodcasts = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=show&limit=20`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to search shows');

            const data = await response.json();
            const formattedResults: PodcastShow[] = (data.shows?.items || []).map((show: any) => ({
                id: show.id,
                name: show.name,
                imageUrl: show.images[0]?.url || ''
            }));

            setSearchResults(formattedResults);
        } catch (error) {
            console.error('Error searching shows:', error);
            setShowError('Failed to search for podcasts');
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (podcastSearchQuery) {
                searchPodcasts(podcastSearchQuery);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [podcastSearchQuery]);

    const handleUpdate = async () => {
        if (!playlistName.trim()) {
            setSnackbar({
                open: true,
                message: 'Please enter a Blockylist name',
                severity: 'error'
            });
            return;
        }

        // Add check for incomplete blocks
        if (isAnyBlockIncomplete) {
            setSnackbar({
                open: true,
                message: 'Please complete all blocks before saving.',
                severity: 'error'
            });
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const accessToken = localStorage.getItem('spotify_access_token');
            if (!accessToken) throw new Error('No access token found');

            // Get user ID for Firestore
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            const userId = userData.id;

            // Update the playlist document
            const playlistRef = doc(db, `users/${userId}/playlists`, playlistId!);

            await updateDoc(playlistRef, {
                name: playlistName,
                description: playlistDescription,
                blocks: blocks,
                isSelfDeleting: isSelfDeleting,
                isDailyCreating: isDailyCreating,
                updatedAt: new Date().toISOString()
            });

            setSnackbar({
                open: true,
                message: 'Blockylist updated successfully!',
                severity: 'success'
            });

            // Navigate back to home
            navigate('/');
        } catch (error) {
            console.error('Error updating playlist:', error);
            setError(error instanceof Error ? error.message : 'Failed to update playlist');
            setSnackbar({
                open: true,
                message: 'Failed to update Blockylist',
                severity: 'error'
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this Blockylist?')) {
            return;
        }

        try {
            const accessToken = localStorage.getItem('spotify_access_token');
            if (!accessToken) throw new Error('No access token found');

            // Get user ID for Firestore
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            const userId = userData.id;

            // Delete the playlist document
            const playlistRef = doc(db, `users/${userId}/playlists`, playlistId!);
            await deleteDoc(playlistRef);

            setSnackbar({
                open: true,
                message: 'Blockylist deleted successfully',
                severity: 'success'
            });

            // Navigate back to home
            navigate('/');
        } catch (error) {
            console.error('Error deleting playlist:', error);
            setError(error instanceof Error ? error.message : 'Failed to delete playlist');
            setSnackbar({
                open: true,
                message: 'Failed to delete Blockylist',
                severity: 'error'
            });
        }
    };

    // Loading state
    if (isLoading) {
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
                    {mode === 'edit' ? 'Loading your Blockylist...' : 'Preparing to create a new Blockylist...'}
                </Typography>
            </Box>
        );
    }

    return (
        <>
            <AppBar position="static" sx={{ bgcolor: '#121212', mb: 2 }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate('/')}
                        sx={{ mr: 2 }}
                    >
                        <HomeIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#1DB954', fontWeight: 'bold' }}>
                        {mode === 'create' ? 'Create New Blockylist' : 'Edit Blockylist'}
                    </Typography>
                    {mode === 'edit' && (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleDelete}
                            startIcon={<DeleteIcon />}
                            sx={{
                                mr: 2,
                                borderColor: 'rgba(255, 0, 0, 0.5)',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 0, 0, 0.08)',
                                    borderColor: '#f44336'
                                }
                            }}
                        >
                            Delete
                        </Button>
                    )}
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ pt: 2, pb: 8 }}>
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
                        <Typography variant="h5" sx={{ color: '#FFFFFF', mb: 3, fontWeight: 'bold' }}>
                            {mode === 'create' ? 'Create Your Blockylist' : 'Edit Your Blockylist'}
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Blockylist Name"
                                    value={playlistName}
                                    onChange={(e) => setPlaylistName(e.target.value)}
                                    sx={{
                                        mb: 3,
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#1DB954',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#1DB954',
                                            },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: 'rgba(255, 255, 255, 0.7)',
                                        },
                                        '& .MuiInputBase-input': {
                                            color: '#FFFFFF',
                                        },
                                    }}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Description"
                                    value={playlistDescription}
                                    onChange={(e) => setPlaylistDescription(e.target.value)}
                                    sx={{
                                        mb: 3,
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#1DB954',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#1DB954',
                                            },
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: 'rgba(255, 255, 255, 0.7)',
                                        },
                                        '& .MuiInputBase-input': {
                                            color: '#FFFFFF',
                                        },
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>

                <Box>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            mb: 4,
                            bgcolor: '#121212',
                            borderRadius: 2,
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <Typography variant="h5" sx={{ color: '#FFFFFF', mb: 1, fontWeight: 'bold' }}>
                            Blockylist Content
                        </Typography>

                        <Typography variant="body2" sx={{ color: '#B3B3B3', mb: 3 }}>
                            Add blocks to your Blockylist. Each block is a placeholder for the tracks that will be added to your playlist on Spotify.
                        </Typography>

                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<PodcastsIcon />}
                                    onClick={addPodcastBlock}
                                    sx={{
                                        bgcolor: '#1DB954',
                                        color: '#FFFFFF',
                                        '&:hover': {
                                            bgcolor: '#1ed760',
                                        },
                                        borderRadius: 2,
                                        py: 1,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Box sx={{ mb: 0.5 }}>
                                        <PodcastsIcon sx={{ fontSize: 28 }} />
                                    </Box>
                                    Add Podcast Episode
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<NewReleasesIcon />}
                                    onClick={addLatestPodcastBlock}
                                    sx={{
                                        bgcolor: '#1DB954',
                                        color: '#FFFFFF',
                                        '&:hover': {
                                            bgcolor: '#1ed760',
                                        },
                                        borderRadius: 2,
                                        py: 1,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Box sx={{ mb: 0.5 }}>
                                        <NewReleasesIcon sx={{ fontSize: 28 }} />
                                    </Box>
                                    Latest From Show
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<QueueMusicIcon />}
                                    onClick={addSongsBlock}
                                    sx={{
                                        bgcolor: '#1DB954',
                                        color: '#FFFFFF',
                                        '&:hover': {
                                            bgcolor: '#1ed760',
                                        },
                                        borderRadius: 2,
                                        py: 1,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Box sx={{ mb: 0.5 }}>
                                        <QueueMusicIcon sx={{ fontSize: 28 }} />
                                    </Box>
                                    Add Songs
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<RecommendIcon />}
                                    onClick={addRecommendedSongsBlock}
                                    sx={{
                                        bgcolor: '#1DB954',
                                        color: '#FFFFFF',
                                        '&:hover': {
                                            bgcolor: '#1ed760',
                                        },
                                        borderRadius: 2,
                                        py: 1,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Box sx={{ mb: 0.5 }}>
                                        <RecommendIcon sx={{ fontSize: 28 }} />
                                    </Box>
                                    Recommended Songs
                                </Button>
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                                Your Blocks ({blocks.length})
                            </Typography>
                            {blocks.length > 0 && (
                                <Typography variant="body2" sx={{ color: '#B3B3B3' }}>
                                    Drag to reorder • Click to edit
                                </Typography>
                            )}
                        </Box>

                        {blocks.length === 0 ? (
                            <Box
                                sx={{
                                    textAlign: 'center',
                                    py: 6,
                                    color: '#B3B3B3',
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    borderRadius: 2,
                                    mb: 4
                                }}
                            >
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    You don't have any blocks yet
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 3 }}>
                                    Add some blocks using the buttons above
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {blocks.map((block, index) => (
                                    <Card
                                        key={block.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => block.type === 'podcast'
                                            ? handlePodcastClick(block.id)
                                            : block.type === 'latest-podcast'
                                                ? handlePodcastClick(block.id)
                                                : block.type === 'songs' || block.type === 'recommended-songs'
                                                    ? handlePlaylistClick(block.id)
                                                    : null
                                        }
                                        sx={{
                                            p: 3,
                                            bgcolor: '#282828',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease-in-out',
                                            borderRadius: 2,
                                            position: 'relative',
                                            '&:hover': {
                                                bgcolor: '#3E3E3E',
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 6px 10px rgba(0, 0, 0, 0.3)'
                                            },
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', color: '#B3B3B3' }}>
                                                <DragIndicatorIcon sx={{ mr: 1 }} />
                                                {block.type === 'podcast' ?
                                                    <PodcastsIcon sx={{ color: '#1DB954' }} /> :
                                                    block.type === 'latest-podcast' ?
                                                        <NewReleasesIcon sx={{ color: '#1DB954' }} /> :
                                                        block.type === 'recommended-songs' ?
                                                            <RecommendIcon sx={{ color: '#1DB954' }} /> :
                                                            <QueueMusicIcon sx={{ color: '#1DB954' }} />
                                                }
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                                                    {block.title}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color:
                                                            (block.type === 'podcast' && !block.podcastEpisode) ||
                                                                (block.type === 'latest-podcast' && !block.podcastShow) ||
                                                                (block.type === 'songs' && !block.playlist)
                                                                ? theme.palette.error.light
                                                                : '#B3B3B3'
                                                    }}
                                                >
                                                    {block.description}
                                                </Typography>
                                                {(block.type === 'songs' || block.type === 'recommended-songs') && block.songRange && (
                                                    <Box
                                                        onClick={(e) => e.stopPropagation()}
                                                        sx={{
                                                            mt: 2,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 1
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Typography variant="body2" sx={{ color: '#FFFFFF', flexShrink: 0 }}>
                                                                Number of songs:
                                                            </Typography>
                                                            <Stack
                                                                direction="row"
                                                                spacing={1}
                                                                sx={{
                                                                    flexWrap: 'wrap',
                                                                    gap: 1
                                                                }}
                                                            >
                                                                {songRangeOptions.map((option) => (
                                                                    <Chip
                                                                        key={option.label}
                                                                        label={option.label}
                                                                        onClick={() => handleSongRangeSelect(
                                                                            block.id,
                                                                            option.min,
                                                                            option.max
                                                                        )}
                                                                        color={
                                                                            block.songRange?.min === option.min &&
                                                                                block.songRange?.max === option.max
                                                                                ? "primary"
                                                                                : "default"
                                                                        }
                                                                        sx={{
                                                                            bgcolor: block.songRange?.min === option.min &&
                                                                                block.songRange?.max === option.max
                                                                                ? '#1DB954'
                                                                                : 'rgba(255,255,255,0.1)',
                                                                            color: block.songRange?.min === option.min &&
                                                                                block.songRange?.max === option.max
                                                                                ? '#FFFFFF'
                                                                                : '#FFFFFF',
                                                                            '&:hover': {
                                                                                bgcolor: block.songRange?.min === option.min &&
                                                                                    block.songRange?.max === option.max
                                                                                    ? '#1ed760'
                                                                                    : 'rgba(255,255,255,0.2)',
                                                                            }
                                                                        }}
                                                                    />
                                                                ))}
                                                            </Stack>
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Box>
                                            <IconButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeBlock(block.id);
                                                }}
                                                sx={{
                                                    color: '#B3B3B3',
                                                    '&:hover': {
                                                        color: '#FFFFFF',
                                                        bgcolor: 'rgba(255,255,255,0.1)'
                                                    }
                                                }}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Stack>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Box>

                <Box sx={{ textAlign: 'center', mt: 4, mb: 6 }}>
                    <Button
                        variant="contained"
                        onClick={mode === 'create' ? createPlaylist : handleUpdate}
                        disabled={isCreating || (mode === 'create' && blocks.length === 0) || isAnyBlockIncomplete}
                        startIcon={<SaveIcon />}
                        sx={{
                            bgcolor: '#1DB954',
                            color: '#FFFFFF',
                            '&:hover': {
                                bgcolor: '#1ed760',
                            },
                            '&.Mui-disabled': {
                                bgcolor: 'rgba(29, 185, 84, 0.5)',
                                color: 'rgba(255, 255, 255, 0.7)',
                            },
                            borderRadius: 2,
                            py: 1.2,
                            px: 3,
                            fontSize: '1rem',
                        }}
                    >
                        {isCreating ? (
                            <>
                                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                                {mode === 'create' ? 'Creating...' : 'Updating...'}
                            </>
                        ) : (
                            mode === 'create' ? 'Create Blockylist' : 'Update Blockylist'
                        )}
                    </Button>
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

            {/* Podcast Episode Selection Dialog */}
            <Dialog
                open={isPodcastDialogOpen}
                onClose={() => setIsPodcastDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#282828',
                        color: '#FFFFFF',
                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.3) 0%, #282828 100%)',
                        minHeight: '50vh'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#FFFFFF', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    Select a Podcast Episode
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    {isLoadingPodcasts ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                            <CircularProgress sx={{ color: '#1DB954' }} />
                        </Box>
                    ) : podcastError ? (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {podcastError}
                        </Alert>
                    ) : (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" sx={{ mb: 3, color: '#B3B3B3' }}>
                                Select an episode from your recent podcasts
                            </Typography>
                            <Grid container spacing={2}>
                                {recentPodcasts.map((podcast) => (
                                    <Grid item xs={6} sm={4} md={3} key={podcast.id}>
                                        <Card
                                            onClick={() => handlePodcastSelect(podcast)}
                                            sx={{
                                                bgcolor: '#333',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: '#444',
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                                },
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%'
                                            }}
                                        >
                                            <CardMedia
                                                component="img"
                                                image={podcast.imageUrl || ''}
                                                alt={podcast.title}
                                                sx={{ height: 120, objectFit: 'cover', aspectRatio: '1 / 1' }}
                                            />
                                            <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                                                <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 'bold', mb: 0.5, fontSize: '0.9rem' }}>
                                                    {podcast.title}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#B3B3B3' }}>
                                                    {podcast.showName}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#1DB954', mt: 1, display: 'block' }}>
                                                    {podcast.duration}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
                    <Button
                        onClick={() => setIsPodcastDialogOpen(false)}
                        sx={{
                            color: '#FFFFFF',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Playlist Selection Dialog */}
            <Dialog
                open={isPlaylistDialogOpen}
                onClose={() => setIsPlaylistDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#282828',
                        color: '#FFFFFF',
                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.3) 0%, #282828 100%)',
                        minHeight: '50vh'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#FFFFFF', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    Select a Playlist
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    {isLoadingPlaylists ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                            <CircularProgress sx={{ color: '#1DB954' }} />
                        </Box>
                    ) : playlistError ? (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {playlistError}
                        </Alert>
                    ) : (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" sx={{ mb: 3, color: '#B3B3B3' }}>
                                Select a playlist to pull songs from
                            </Typography>
                            <Grid container spacing={2}>
                                {playlists.map((playlist) => (
                                    <Grid item xs={6} sm={4} md={3} key={playlist.id}>
                                        <Card
                                            onClick={() => handlePlaylistSelect(playlist)}
                                            sx={{
                                                bgcolor: '#333',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: '#444',
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                                },
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%'
                                            }}
                                        >
                                            <CardMedia
                                                component="img"
                                                image={playlist.imageUrl || ''}
                                                alt={playlist.name}
                                                sx={{ height: 120, objectFit: 'cover', aspectRatio: '1 / 1' }}
                                            />
                                            <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                                                <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 'bold', mb: 0.5, fontSize: '0.9rem' }}>
                                                    {playlist.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#1DB954', mt: 1, display: 'block' }}>
                                                    {playlist.trackCount} tracks
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
                    <Button
                        onClick={() => setIsPlaylistDialogOpen(false)}
                        sx={{
                            color: '#FFFFFF',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Podcast Show Selection Dialog */}
            <Dialog
                open={isShowDialogOpen}
                onClose={() => setIsShowDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#282828',
                        color: '#FFFFFF',
                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.3) 0%, #282828 100%)',
                        minHeight: '50vh'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#FFFFFF', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    Select a Podcast Show
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Search podcast shows"
                        type="text"
                        fullWidth
                        value={podcastSearchQuery}
                        onChange={(e) => setPodcastSearchQuery(e.target.value)}
                        variant="outlined"
                        sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#1DB954',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#1DB954',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                            },
                            '& .MuiInputBase-input': {
                                color: '#FFFFFF',
                            },
                        }}
                    />

                    {isSearching || isLoadingShows ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                            <CircularProgress sx={{ color: '#1DB954' }} />
                        </Box>
                    ) : showError ? (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {showError}
                        </Alert>
                    ) : (
                        <Box>
                            {podcastSearchQuery ? (
                                <Box>
                                    <Typography variant="body2" sx={{ mb: 3, color: '#B3B3B3' }}>
                                        Search results
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {searchResults.map((show) => (
                                            <Grid item xs={6} sm={4} md={3} key={show.id}>
                                                <Card
                                                    onClick={() => handleShowSelect(show)}
                                                    sx={{
                                                        bgcolor: '#333',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        '&:hover': {
                                                            bgcolor: '#444',
                                                            transform: 'translateY(-4px)',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                                        },
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        height: '100%'
                                                    }}
                                                >
                                                    <CardMedia
                                                        component="img"
                                                        image={show.imageUrl || ''}
                                                        alt={show.name}
                                                        sx={{ height: 120, objectFit: 'cover', aspectRatio: '1 / 1' }}
                                                    />
                                                    <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                                                        <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                            {show.name}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            ) : (
                                <Box>
                                    <Typography variant="body2" sx={{ mb: 3, color: '#B3B3B3' }}>
                                        Your followed shows
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {shows.map((show) => (
                                            <Grid item xs={6} sm={4} md={3} key={show.id}>
                                                <Card
                                                    onClick={() => handleShowSelect(show)}
                                                    sx={{
                                                        bgcolor: '#333',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        '&:hover': {
                                                            bgcolor: '#444',
                                                            transform: 'translateY(-4px)',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                                        },
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        height: '100%'
                                                    }}
                                                >
                                                    <CardMedia
                                                        component="img"
                                                        image={show.imageUrl || ''}
                                                        alt={show.name}
                                                        sx={{ height: 120, objectFit: 'cover', aspectRatio: '1 / 1' }}
                                                    />
                                                    <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                                                        <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                            {show.name}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
                    <Button
                        onClick={() => setIsShowDialogOpen(false)}
                        sx={{
                            color: '#FFFFFF',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}



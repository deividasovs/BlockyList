import { db } from '../../firebase/config';
import type { NextApiRequest, NextApiResponse } from 'next';
import { collection, doc, setDoc } from 'firebase/firestore';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const playlistData = req.body;
        // Add to Firestore using the new API
        const playlistsRef = collection(db, 'playlists');
        await setDoc(doc(playlistsRef, playlistData.playlistId), playlistData);

        res.status(200).json({ message: 'Playlist saved successfully' });
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        res.status(500).json({ message: 'Error saving playlist' });
    }
} 
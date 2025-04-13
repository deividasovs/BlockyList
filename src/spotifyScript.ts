const clientId = process.env.REACT_APP_CLIENT_ID as string;
let isAuthenticated = false;
let accessTokenGlobal: string | null = null;

// Add a function to check if the token is valid
export async function checkTokenValidity(): Promise<boolean> {
    const token = localStorage.getItem('spotify_access_token');
    if (!token) return false;

    try {
        // Test the token with a simple API call
        const result = await fetch("https://api.spotify.com/v1/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (result.ok) {
            accessTokenGlobal = token;
            isAuthenticated = true;
            return true;
        }

        console.log(" we nooo good ")

        return false;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

export async function getSpotifyData() {
    // Only proceed with authentication if we're not already authenticated
    if (isAuthenticated) return true;

    // Check if we have a valid token already
    if (await checkTokenValidity()) return true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    try {
        if (!code) {
            redirectToAuthCodeFlow(clientId);
            return false;
        } else {
            var accessTokenGlobal = localStorage.getItem('spotify_access_token');

            if (!accessTokenGlobal) {
                accessTokenGlobal = await getAccessToken(clientId, code);
            }

            if (!accessTokenGlobal) {
                throw new Error('Failed to get access token');
            }

            const profile = await fetchProfile(accessTokenGlobal);

            console.log('Profile:', profile);

            if (profile.error) {
                throw new Error('Failed to fetch profile: ' + profile.error.message);
            }

            populateUI(profile);
            isAuthenticated = true;
            return true;
        }
    } catch (error) {
        console.error('Custom authentication error:', error);
        isAuthenticated = false;
        accessTokenGlobal = null;
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('profile_id');
        return false;
    }
}

export async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:3000/callback");
    params.append("scope", "user-read-private user-read-email playlist-modify-public playlist-modify-private user-library-read playlist-read-private user-top-read")
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId: string, code: string): Promise<string | null> {
    try {
        const verifier = localStorage.getItem("verifier");
        if (!verifier) {
            console.error('No verifier found in localStorage');
            return null;
        }

        const params = new URLSearchParams();
        params.append("client_id", clientId);
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", "http://localhost:3000/callback");
        params.append("code_verifier", verifier);

        const result = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });

        if (!result.ok) {
            throw new Error(`Token request failed: ${result.status}`);
        } else {
            console.log('Token request successful');
        }

        const { access_token } = await result.json();
        localStorage.setItem('spotify_access_token', access_token);

        return access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
}

function populateUI(profile: any) {
    // document.getElementById("displayName")!.innerText = profile.display_name;
    if (profile.images[0]) {
        localStorage.setItem('profile_image', profile.images[0].url);
        // const profileImage = new Image(200, 200);
        // profileImage.src = profile.images[0].url;
        // document.getElementById("avatar")!.appendChild(profileImage);
    }

    localStorage.setItem('profile_id', profile.id);
    localStorage.setItem('profile_display_name', profile.display_name);

    // document.getElementById("id")!.innerText = profile.id;
    // document.getElementById("email")!.innerText = profile.email;
    // document.getElementById("uri")!.innerText = profile.uri;

    // document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);

    // document.getElementById("url")!.innerText = profile.href;
    // document.getElementById("url")!.setAttribute("href", profile.href);
    // document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)';
}

async function fetchProfile(token: string): Promise<any> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!result.ok) {
        throw new Error(`Profile fetch failed: ${result.status}`);
    }

    return await result.json();
}
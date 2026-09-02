const SIMKL_CLIENT_ID = process.env.SIMKL_CLIENT_ID;
const SIMKL_CLIENT_SECRET = process.env.SIMKL_CLIENT_SECRET;
const SIMKL_REDIRECT_URI = process.env.SIMKL_REDIRECT_URI || "http://localhost:3000/api/auth/simkl/callback";

export function getSimklAuthUrl(): string {
  if (!SIMKL_CLIENT_ID) return "#";
  return `https://simkl.com/oauth/authorize?response_type=code&client_id=${SIMKL_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    SIMKL_REDIRECT_URI
  )}`;
}

export async function exchangeSimklCode(code: string): Promise<{ accessToken: string } | null> {
  if (!SIMKL_CLIENT_ID || !SIMKL_CLIENT_SECRET) return null;

  try {
    const res = await fetch("https://api.simkl.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: SIMKL_CLIENT_ID,
        client_secret: SIMKL_CLIENT_SECRET,
        redirect_uri: SIMKL_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      accessToken: data.access_token,
    };
  } catch (err) {
    console.error("[Simkl] Token exchange failure:", err);
    return null;
  }
}

export async function syncActivityToSimkl(
  token: string,
  mediaType: "movie" | "tv",
  tmdbId: number,
  status: string,
  season?: number | null,
  episode?: number | null
): Promise<void> {
  if (!SIMKL_CLIENT_ID || !token) return;

  try {
    // Fire-and-forget sync to Simkl
    const endpoint = status === "completed" ? "https://api.simkl.com/sync/history" : "https://api.simkl.com/sync/add-to-list";

    const payload: any = {};
    if (mediaType === "movie") {
      payload.movies = [{ ids: { tmdb: tmdbId } }];
    } else {
      payload.shows = [
        {
          ids: { tmdb: tmdbId },
          seasons: season ? [{ number: season, episodes: episode ? [{ number: episode }] : [] }] : [],
        },
      ];
    }

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "simkl-api-key": SIMKL_CLIENT_ID,
      },
      body: JSON.stringify(payload),
    }).catch((err) => console.warn("[Simkl] Async sync error:", err));
  } catch (err) {
    console.warn("[Simkl] Sync dispatcher error:", err);
  }
}

export async function importFromSimkl(
  token: string
): Promise<{ moviesCount: number; showsCount: number; items: any[] }> {
  if (!SIMKL_CLIENT_ID || !token) {
    throw new Error("Missing Simkl credentials or access token");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "simkl-api-key": SIMKL_CLIENT_ID,
  };

  const [moviesRes, showsRes] = await Promise.all([
    fetch("https://api.simkl.com/sync/all-items/movies/all", { headers }).then((r) =>
      r.ok ? r.json() : []
    ),
    fetch("https://api.simkl.com/sync/all-items/shows/all", { headers }).then((r) =>
      r.ok ? r.json() : []
    ),
  ]);

  const items: any[] = [];
  const now = new Date().toISOString();

  // Process movies
  if (Array.isArray(moviesRes?.movies)) {
    for (const item of moviesRes.movies) {
      const tmdbId = item.movie?.ids?.tmdb;
      if (tmdbId) {
        items.push({
          mediaId: Number(tmdbId),
          mediaType: "movie",
          title: item.movie?.title || "Movie",
          posterPath: item.movie?.poster ? `https://simkl.in/posters/${item.movie.poster}_m.jpg` : null,
          status: item.status === "completed" ? "completed" : item.status === "watching" ? "watching" : "plan_to_watch",
          isFavorite: false,
          progress: {
            timestampSeconds: item.status === "completed" ? 5400 : 0,
            durationSeconds: 5400,
          },
          updatedAt: item.last_watched_at || now,
          createdAt: now,
        });
      }
    }
  }

  // Process shows
  if (Array.isArray(showsRes?.shows)) {
    for (const item of showsRes.shows) {
      const tmdbId = item.show?.ids?.tmdb;
      if (tmdbId) {
        items.push({
          mediaId: Number(tmdbId),
          mediaType: "tv",
          title: item.show?.title || "TV Show",
          posterPath: item.show?.poster ? `https://simkl.in/posters/${item.show.poster}_m.jpg` : null,
          status: item.status === "completed" ? "completed" : item.status === "watching" ? "watching" : "plan_to_watch",
          isFavorite: false,
          progress: {
            lastSeason: item.seasons?.[0]?.number || 1,
            lastEpisode: item.seasons?.[0]?.episodes?.[0]?.number || 1,
            timestampSeconds: 0,
            durationSeconds: 1500,
          },
          updatedAt: item.last_watched_at || now,
          createdAt: now,
        });
      }
    }
  }

  return {
    moviesCount: moviesRes?.movies?.length || 0,
    showsCount: showsRes?.shows?.length || 0,
    items,
  };
}

export async function exportToSimkl(
  token: string,
  activities: any[]
): Promise<{ success: boolean; exportedCount: number }> {
  if (!SIMKL_CLIENT_ID || !token) {
    throw new Error("Missing Simkl credentials or access token");
  }

  const movies: any[] = [];
  const shows: any[] = [];

  for (const act of activities) {
    if (act.mediaType === "movie") {
      movies.push({ ids: { tmdb: act.mediaId } });
    } else {
      shows.push({
        ids: { tmdb: act.mediaId },
        seasons: act.progress?.lastSeason
          ? [
              {
                number: act.progress.lastSeason,
                episodes: act.progress.lastEpisode ? [{ number: act.progress.lastEpisode }] : [],
              },
            ]
          : [],
      });
    }
  }

  const res = await fetch("https://api.simkl.com/sync/add-to-list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "simkl-api-key": SIMKL_CLIENT_ID,
    },
    body: JSON.stringify({ movies, shows }),
  });

  return {
    success: res.ok,
    exportedCount: activities.length,
  };
}


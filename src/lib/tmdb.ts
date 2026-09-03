import { MediaDetail, MediaType, TVEpisode, TVSeasonSummary } from "@/types";
import { cacheGet, cacheSet } from "./redis";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";

async function fetchFromTmdb<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = process.env.TMDB_API_KEY;
  const baseUrl = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
  if (!apiKey) {
    return null;
  }

  const url = new URL(`${baseUrl}${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      url.searchParams.set(key, val);
    }
  });

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`[TMDb] API error ${res.status}: ${res.statusText} on ${endpoint}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[TMDb] Fetch failure on ${endpoint}:`, err);
    return null;
  }
}

// Adapters
export function adaptMovieDetails(raw: any): MediaDetail {
  return {
    tmdbId: raw.id,
    imdbId: raw.imdb_id || null,
    title: raw.title || raw.original_title || "Untitled",
    originalTitle: raw.original_title,
    overview: raw.overview || "",
    posterPath: raw.poster_path ? (raw.poster_path.startsWith("http") ? raw.poster_path : `https://image.tmdb.org/t/p/w500${raw.poster_path}`) : null,
    backdropPath: raw.backdrop_path ? (raw.backdrop_path.startsWith("http") ? raw.backdrop_path : `https://image.tmdb.org/t/p/original${raw.backdrop_path}`) : null,
    releaseDate: raw.release_date,
    runtime: raw.runtime || 0,
    genres: raw.genres?.map((g: any) => ({ id: g.id, name: g.name })) || [],
    voteAverage: Math.round((raw.vote_average || 0) * 10) / 10,
    voteCount: raw.vote_count || 0,
    status: raw.status || "Released",
    tagline: raw.tagline || "",
    mediaType: "movie",
  };
}

export function adaptTVDetails(raw: any): MediaDetail {
  return {
    tmdbId: raw.id,
    imdbId: raw.external_ids?.imdb_id || null,
    title: raw.name || raw.original_name || "Untitled",
    originalTitle: raw.original_name,
    overview: raw.overview || "",
    posterPath: raw.poster_path ? (raw.poster_path.startsWith("http") ? raw.poster_path : `https://image.tmdb.org/t/p/w500${raw.poster_path}`) : null,
    backdropPath: raw.backdrop_path ? (raw.backdrop_path.startsWith("http") ? raw.backdrop_path : `https://image.tmdb.org/t/p/original${raw.backdrop_path}`) : null,
    firstAirDate: raw.first_air_date,
    numberOfSeasons: raw.number_of_seasons || 1,
    numberOfEpisodes: raw.number_of_episodes || 1,
    genres: raw.genres?.map((g: any) => ({ id: g.id, name: g.name })) || [],
    voteAverage: Math.round((raw.vote_average || 0) * 10) / 10,
    voteCount: raw.vote_count || 0,
    status: raw.status || "Ended",
    tagline: raw.tagline || "",
    mediaType: "tv",
    seasons: raw.seasons?.map((s: any) => ({
      id: s.id,
      seasonNumber: s.season_number,
      name: s.name || `Season ${s.season_number}`,
      overview: s.overview || "",
      episodeCount: s.episode_count || 0,
      posterPath: s.poster_path ? (s.poster_path.startsWith("http") ? s.poster_path : `https://image.tmdb.org/t/p/w300${s.poster_path}`) : null,
      airDate: s.air_date,
    })) || [],
  };
}

export function adaptSeasonEpisodes(raw: any): TVEpisode[] {
  if (!raw?.episodes) return [];
  return raw.episodes.map((ep: any) => ({
    id: ep.id,
    episodeNumber: ep.episode_number,
    seasonNumber: ep.season_number,
    name: ep.name || `Episode ${ep.episode_number}`,
    overview: ep.overview || "",
    stillPath: ep.still_path ? (ep.still_path.startsWith("http") ? ep.still_path : `https://image.tmdb.org/t/p/w500${ep.still_path}`) : null,
    airDate: ep.air_date,
    voteAverage: Math.round((ep.vote_average || 0) * 10) / 10,
    runtime: ep.runtime || 0,
  }));
}

// Fallback rich curated mock catalog (24 diverse movies and TV shows)
const MOCK_MEDIA_LIST: MediaDetail[] = [
  // MOVIES
  {
    tmdbId: 693134,
    imdbId: "tt15239678",
    title: "Dune: Part Two",
    overview: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    posterPath: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520b42.jpg",
    releaseDate: "2024-02-27",
    runtime: 166,
    genres: [{ id: 878, name: "Sci-Fi" }, { id: 12, name: "Adventure" }],
    voteAverage: 8.3,
    status: "Released",
    tagline: "Long live the fighters.",
    mediaType: "movie",
  },
  {
    tmdbId: 872585,
    imdbId: "tt15398776",
    title: "Oppenheimer",
    overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    posterPath: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/rLb2cw69zbPQaZta1fuj37Fljnm.jpg",
    releaseDate: "2023-07-19",
    runtime: 180,
    genres: [{ id: 18, name: "Drama" }, { id: 36, name: "History" }],
    voteAverage: 8.1,
    status: "Released",
    tagline: "The world forever changes.",
    mediaType: "movie",
  },
  {
    tmdbId: 27205,
    imdbId: "tt1375666",
    title: "Inception",
    overview: "Cobb, a skilled thief who steals corporate secrets through dream-sharing technology, is given the inverse task of planting an idea into the mind of a CEO.",
    posterPath: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    releaseDate: "2010-07-15",
    runtime: 148,
    genres: [{ id: 28, name: "Action" }, { id: 878, name: "Sci-Fi" }],
    voteAverage: 8.4,
    status: "Released",
    tagline: "Your mind is the scene of the crime.",
    mediaType: "movie",
  },
  {
    tmdbId: 157336,
    imdbId: "tt0816692",
    title: "Interstellar",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.",
    posterPath: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    releaseDate: "2014-11-05",
    runtime: 169,
    genres: [{ id: 18, name: "Drama" }, { id: 878, name: "Sci-Fi" }],
    voteAverage: 8.4,
    status: "Released",
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    mediaType: "movie",
  },
  {
    tmdbId: 155,
    imdbId: "tt0468569",
    title: "The Dark Knight",
    overview: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent, until the Joker unleashes chaos on Gotham.",
    posterPath: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
    releaseDate: "2008-07-16",
    runtime: 152,
    genres: [{ id: 18, name: "Drama" }, { id: 28, name: "Action" }, { id: 80, name: "Crime" }],
    voteAverage: 8.5,
    status: "Released",
    tagline: "Welcome to a world without rules.",
    mediaType: "movie",
  },
  {
    tmdbId: 569094,
    imdbId: "tt9362722",
    title: "Spider-Man: Across the Spider-Verse",
    overview: "After reuniting with Gwen Stacy, Brooklyn's full-time friendly neighborhood Spider-Man is catapulted across the Multiverse.",
    posterPath: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    releaseDate: "2023-05-31",
    runtime: 140,
    genres: [{ id: 16, name: "Animation" }, { id: 28, name: "Action" }, { id: 878, name: "Sci-Fi" }],
    voteAverage: 8.4,
    status: "Released",
    tagline: "It's how you wear the mask that matters.",
    mediaType: "movie",
  },
  {
    tmdbId: 335984,
    imdbId: "tt1856101",
    title: "Blade Runner 2049",
    overview: "Thirty years after the events of the first film, a new blade runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what's left of society into chaos.",
    posterPath: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/sAtoMqDVhNDQBc3QJL3RF6hlxGq.jpg",
    releaseDate: "2017-10-04",
    runtime: 164,
    genres: [{ id: 878, name: "Sci-Fi" }, { id: 18, name: "Drama" }],
    voteAverage: 7.6,
    status: "Released",
    tagline: "The key to the future is finally unearthed.",
    mediaType: "movie",
  },
  {
    tmdbId: 603,
    imdbId: "tt0133093",
    title: "The Matrix",
    overview: "Set in the 22nd century, The Matrix tells the story of a computer hacker who learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    posterPath: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/oEJNawsk1v3xU2vJc6sV0eQ87Ua.jpg",
    releaseDate: "1999-03-30",
    runtime: 136,
    genres: [{ id: 28, name: "Action" }, { id: 878, name: "Sci-Fi" }],
    voteAverage: 8.2,
    status: "Released",
    tagline: "Welcome to the Real World.",
    mediaType: "movie",
  },
  {
    tmdbId: 680,
    imdbId: "tt0110912",
    title: "Pulp Fiction",
    overview: "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in this sprawling, comedic crime caper.",
    posterPath: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    releaseDate: "1994-09-10",
    runtime: 154,
    genres: [{ id: 80, name: "Crime" }, { id: 53, name: "Thriller" }],
    voteAverage: 8.5,
    status: "Released",
    tagline: "Just because you are a character doesn't mean that you have character.",
    mediaType: "movie",
  },
  {
    tmdbId: 550,
    imdbId: "tt0137523",
    title: "Fight Club",
    overview: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.",
    posterPath: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    releaseDate: "1999-10-15",
    runtime: 139,
    genres: [{ id: 18, name: "Drama" }],
    voteAverage: 8.4,
    status: "Released",
    tagline: "Mischief. Mayhem. Soap.",
    mediaType: "movie",
  },
  {
    tmdbId: 98,
    imdbId: "tt0172495",
    title: "Gladiator",
    overview: "In the year 180, the death of emperor Marcus Aurelius throws the Roman Empire into turmoil. Maximus, one of the Roman army's most capable and trusted generals, is stripped of his rank and forced into slavery as a gladiator.",
    posterPath: "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/Ar7oc06gXv79v5nI0FmH94L1yD6.jpg",
    releaseDate: "2000-05-04",
    runtime: 155,
    genres: [{ id: 28, name: "Action" }, { id: 18, name: "Drama" }, { id: 12, name: "Adventure" }],
    voteAverage: 8.2,
    status: "Released",
    tagline: "What we do in life echoes in eternity.",
    mediaType: "movie",
  },
  {
    tmdbId: 76600,
    imdbId: "tt1630029",
    title: "Avatar: The Way of Water",
    overview: "Set more than a decade after the events of the first film, learn the story of the Sully family, the trouble that follows them, the lengths they go to keep each other safe, and the tragedies they endure.",
    posterPath: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vREc0547VKqEv.jpg",
    releaseDate: "2022-12-14",
    runtime: 192,
    genres: [{ id: 878, name: "Sci-Fi" }, { id: 12, name: "Adventure" }, { id: 28, name: "Action" }],
    voteAverage: 7.7,
    status: "Released",
    tagline: "Return to Pandora.",
    mediaType: "movie",
  },

  // TV SHOWS
  {
    tmdbId: 1396,
    imdbId: "tt0903747",
    title: "Breaking Bad",
    overview: "Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of two years left to live. He turns to a life of crime by manufacturing and selling methamphetamine.",
    posterPath: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    firstAirDate: "2008-01-20",
    numberOfSeasons: 5,
    numberOfEpisodes: 62,
    genres: [{ id: 18, name: "Drama" }, { id: 80, name: "Crime" }],
    voteAverage: 8.9,
    status: "Ended",
    tagline: "Change the equation.",
    mediaType: "tv",
    seasons: [
      { id: 3572, seasonNumber: 1, name: "Season 1", overview: "High school teacher turns to crime.", episodeCount: 7, posterPath: null },
      { id: 3573, seasonNumber: 2, name: "Season 2", overview: "Walt and Jesse expand distribution.", episodeCount: 13, posterPath: null }
    ]
  },
  {
    tmdbId: 100088,
    imdbId: "tt3581920",
    title: "The Last of Us",
    overview: "Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone.",
    posterPath: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrne.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
    firstAirDate: "2023-01-15",
    numberOfSeasons: 2,
    numberOfEpisodes: 16,
    genres: [{ id: 18, name: "Drama" }, { id: 10765, name: "Sci-Fi & Fantasy" }],
    voteAverage: 8.6,
    status: "Returning Series",
    tagline: "When you're lost in the darkness, look for the light.",
    mediaType: "tv",
    seasons: [
      { id: 144598, seasonNumber: 1, name: "Season 1", overview: "Joel and Ellie journey across America.", episodeCount: 9, posterPath: null }
    ]
  },
  {
    tmdbId: 66732,
    imdbId: "tt4574334",
    title: "Stranger Things",
    overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
    posterPath: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    firstAirDate: "2016-07-15",
    numberOfSeasons: 5,
    numberOfEpisodes: 42,
    genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }, { id: 18, name: "Drama" }, { id: 9648, name: "Mystery" }],
    voteAverage: 8.6,
    status: "Returning Series",
    tagline: "Every ending has a beginning.",
    mediaType: "tv",
    seasons: [
      { id: 77680, seasonNumber: 1, name: "Season 1", overview: "The disappearance of Will Byers.", episodeCount: 8, posterPath: null },
      { id: 85937, seasonNumber: 2, name: "Season 2", overview: "The Mind Flayer emerges.", episodeCount: 9, posterPath: null }
    ]
  },
  {
    tmdbId: 1399,
    imdbId: "tt0944947",
    title: "Game of Thrones",
    overview: "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war.",
    posterPath: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg",
    firstAirDate: "2011-04-17",
    numberOfSeasons: 8,
    numberOfEpisodes: 73,
    genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }, { id: 18, name: "Drama" }],
    voteAverage: 8.4,
    status: "Ended",
    tagline: "Winter Is Coming",
    mediaType: "tv",
    seasons: [
      { id: 3624, seasonNumber: 1, name: "Season 1", overview: "The kingdom of Westeros prepares for upheaval.", episodeCount: 10, posterPath: null },
      { id: 3625, seasonNumber: 2, name: "Season 2", overview: "The War of the Five Kings rages.", episodeCount: 10, posterPath: null }
    ]
  },
  {
    tmdbId: 94605,
    imdbId: "tt11198330",
    title: "Arcane",
    overview: "Set in the utopian region of Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions.",
    posterPath: "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn396mlX3Yq1m.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
    firstAirDate: "2021-11-06",
    numberOfSeasons: 2,
    numberOfEpisodes: 18,
    genres: [{ id: 16, name: "Animation" }, { id: 10765, name: "Sci-Fi & Fantasy" }],
    voteAverage: 8.7,
    status: "Returning Series",
    tagline: "Every legend has a beginning.",
    mediaType: "tv",
    seasons: [
      { id: 134187, seasonNumber: 1, name: "Season 1", overview: "Two sisters fight on rival sides.", episodeCount: 9, posterPath: null }
    ]
  },
  {
    tmdbId: 126308,
    imdbId: "tt2788316",
    title: "Shōgun",
    overview: "In Japan in the year 1600, Lord Yoshii Toranaga is fighting for his life as his enemies on the Council of Regents unite against him.",
    posterPath: "https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/5zmiBoMzeeVdQ62vi5x0W0242.jpg",
    firstAirDate: "2024-02-27",
    numberOfSeasons: 1,
    numberOfEpisodes: 10,
    genres: [{ id: 18, name: "Drama" }, { id: 10768, name: "War & Politics" }],
    voteAverage: 8.5,
    status: "Returning Series",
    tagline: "Destiny is no matter of chance.",
    mediaType: "tv",
    seasons: [
      { id: 196942, seasonNumber: 1, name: "Season 1", overview: "Toranaga navigates feudal power struggles.", episodeCount: 10, posterPath: null }
    ]
  },
  {
    tmdbId: 105248,
    imdbId: "tt12590266",
    title: "Cyberpunk: Edgerunners",
    overview: "A street kid trying to survive in a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an edgerunner: a mercenary outlaw.",
    posterPath: "https://image.tmdb.org/t/p/w500/7jswOc6jWwmfkq552gvd1F1kbg.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/s5XyP1eC42NqQ90bM6s2198031.jpg",
    firstAirDate: "2022-09-13",
    numberOfSeasons: 1,
    numberOfEpisodes: 10,
    genres: [{ id: 16, name: "Animation" }, { id: 878, name: "Sci-Fi" }, { id: 28, name: "Action" }],
    voteAverage: 8.6,
    status: "Ended",
    tagline: "Get chrome or die trying.",
    mediaType: "tv",
    seasons: [
      { id: 154867, seasonNumber: 1, name: "Season 1", overview: "David Martinez enters Night City's underworld.", episodeCount: 10, posterPath: null }
    ]
  },
  {
    tmdbId: 76479,
    imdbId: "tt1190634",
    title: "The Boys",
    overview: "A fun and irreverent take on what happens when superheroes—who are as popular as celebrities, as influential as politicians, and as revered as gods—abuse their superpowers rather than use them for good.",
    posterPath: "https://image.tmdb.org/t/p/w500/2zmTngn1tYC1AvfnPa8r1vngMFn.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/7c9UVPPiTPltouxShY9fQk0fEee.jpg",
    firstAirDate: "2019-07-25",
    numberOfSeasons: 4,
    numberOfEpisodes: 32,
    genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }, { id: 28, name: "Action" }],
    voteAverage: 8.4,
    status: "Returning Series",
    tagline: "Never meet your heroes.",
    mediaType: "tv",
    seasons: [
      { id: 98534, seasonNumber: 1, name: "Season 1", overview: "The vigilantes fight back against Vought.", episodeCount: 8, posterPath: null }
    ]
  },
  {
    tmdbId: 890,
    imdbId: "tt0112159",
    title: "Neon Genesis Evangelion",
    overview: "At the dawn of the 21st century, the secret organization NERV defends the fortress city Tokyo-3 against mysterious alien monsters named Angels using giant bio-mechanical humanoids known as Evangelions.",
    posterPath: "https://image.tmdb.org/t/p/w500/m9Dkd60b1s2O4n1D523i8xG4hU4.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YcWf7j.jpg",
    firstAirDate: "1995-10-04",
    numberOfSeasons: 1,
    numberOfEpisodes: 26,
    genres: [{ id: 16, name: "Animation" }, { id: 10765, name: "Sci-Fi & Fantasy" }, { id: 18, name: "Drama" }],
    voteAverage: 9.1,
    status: "Ended",
    tagline: "Don't run away.",
    mediaType: "tv",
    seasons: [
      { id: 2568, seasonNumber: 1, name: "Season 1", overview: "Shinji Ikari is drafted to pilot Evangelion Unit-01.", episodeCount: 26, posterPath: null }
    ]
  },
  {
    tmdbId: 9323,
    imdbId: "tt0113568",
    title: "Ghost in the Shell",
    overview: "In the year 2029, the barriers of our world have been broken down by the net and by cybernetics, but this brings new vulnerability to humans in the form of brain-hacking.",
    posterPath: "https://image.tmdb.org/t/p/w500/9gC88zC2A9agF1b5Jp6w9d0rXh5.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YcWf7j.jpg",
    releaseDate: "1995-11-18",
    runtime: 83,
    genres: [{ id: 16, name: "Animation" }, { id: 878, name: "Sci-Fi" }, { id: 28, name: "Action" }],
    voteAverage: 8.5,
    status: "Released",
    tagline: "It found a voice... now it needs a body.",
    mediaType: "movie",
  },
  {
    tmdbId: 2190,
    imdbId: "tt0221769",
    title: "Serial Experiments Lain",
    overview: "Lain Iwakura, an awkward and introverted fourteen-year-old girl, is one of the many girls from her school to receive a disturbing email from her classmate Chisa Yomoda.",
    posterPath: "https://image.tmdb.org/t/p/w500/3o8uWd1j0o4n1D523i8xG4hU4.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YcWf7j.jpg",
    firstAirDate: "1998-07-06",
    numberOfSeasons: 1,
    numberOfEpisodes: 13,
    genres: [{ id: 16, name: "Animation" }, { id: 9648, name: "Mystery" }, { id: 10765, name: "Sci-Fi & Fantasy" }],
    voteAverage: 8.7,
    status: "Ended",
    tagline: "Close the world, Open the nExt.",
    mediaType: "tv",
    seasons: [
      { id: 6200, seasonNumber: 1, name: "Layer 01", overview: "Weird messages from the Wired.", episodeCount: 13, posterPath: null }
    ]
  },
  {
    tmdbId: 70523,
    imdbId: "tt5753856",
    title: "Dark",
    overview: "A missing child causes four families to help each other for answers. What they could not imagine is that this mystery would be connected to innumerable other secrets of the small town.",
    posterPath: "https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/3lBDg3i6nn5R2NKICJ4990LIXe.jpg",
    firstAirDate: "2017-12-01",
    numberOfSeasons: 3,
    numberOfEpisodes: 26,
    genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }, { id: 18, name: "Drama" }, { id: 9648, name: "Mystery" }],
    voteAverage: 8.8,
    status: "Ended",
    tagline: "The question is not where, but when.",
    mediaType: "tv",
    seasons: [
      { id: 92837, seasonNumber: 1, name: "Cycle 1", overview: "Secrets spanning across 1953, 1986, and 2019.", episodeCount: 10, posterPath: null }
    ]
  },
  {
    tmdbId: 149,
    imdbId: "tt0094625",
    title: "Akira",
    overview: "A secret military project endangers Neo-Tokyo when it turns a biker gang member into a rampaging psychic psychopath who can only be stopped by a teenager, his gang of friends and a group of psychics.",
    posterPath: "https://image.tmdb.org/t/p/w500/5nT1c60o4n1D523i8xG4hU4.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YcWf7j.jpg",
    releaseDate: "1988-07-16",
    runtime: 124,
    genres: [{ id: 16, name: "Animation" }, { id: 878, name: "Sci-Fi" }, { id: 28, name: "Action" }],
    voteAverage: 8.1,
    status: "Released",
    tagline: "Neo-Tokyo is about to E.X.P.L.O.D.E.",
    mediaType: "movie",
  },
  {
    tmdbId: 95396,
    imdbId: "tt11280740",
    title: "Severance",
    overview: "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.",
    posterPath: "https://image.tmdb.org/t/p/w500/6k9U95Y1j0o4n1D523i8xG4hU4.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/o0K5pl4sl5o4n1D523i8xG4hU4.jpg",
    firstAirDate: "2022-02-17",
    numberOfSeasons: 2,
    numberOfEpisodes: 19,
    genres: [{ id: 18, name: "Drama" }, { id: 9648, name: "Mystery" }, { id: 10765, name: "Sci-Fi & Fantasy" }],
    voteAverage: 8.7,
    status: "Returning Series",
    tagline: "Please do not attempt to adjust your focus.",
    mediaType: "tv",
    seasons: [
      { id: 136195, seasonNumber: 1, name: "Season 1", overview: "The Macrodata Refinement division begins questioning reality.", episodeCount: 9, posterPath: null }
    ]
  },
  {
    tmdbId: 62,
    imdbId: "tt0062622",
    title: "2001: A Space Odyssey",
    overview: "Humanity finds a mysterious object buried beneath the lunar surface and sets off to find its origins with the help of HAL 9000, the world's most advanced supercomputer.",
    posterPath: "https://image.tmdb.org/t/p/w500/9gC88zC2A9agF1b5Jp6w9d0rXh5.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YcWf7j.jpg",
    releaseDate: "1968-04-02",
    runtime: 149,
    genres: [{ id: 878, name: "Sci-Fi" }, { id: 9648, name: "Mystery" }],
    voteAverage: 8.3,
    status: "Released",
    tagline: "An epic drama of adventure and exploration.",
    mediaType: "movie",
  },
  {
    tmdbId: 89632,
    imdbId: "tt10233448",
    title: "Vinland Saga",
    overview: "Thorfinn pursues a journey with his father's killer in order to take revenge and end his life in a duel, while finding himself caught in the middle of a war for the crown of England.",
    posterPath: "https://image.tmdb.org/t/p/w500/3o8uWd1j0o4n1D523i8xG4hU4.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YcWf7j.jpg",
    firstAirDate: "2019-07-07",
    numberOfSeasons: 2,
    numberOfEpisodes: 48,
    genres: [{ id: 16, name: "Animation" }, { id: 28, name: "Action" }, { id: 18, name: "Drama" }],
    voteAverage: 8.8,
    status: "Returning Series",
    tagline: "Beyond the edge of the sea.",
    mediaType: "tv",
    seasons: [
      { id: 124800, seasonNumber: 1, name: "Season 1", overview: "The story of young Thorfinn.", episodeCount: 24, posterPath: null }
    ]
  },
  {
    tmdbId: 264660,
    imdbId: "tt0470752",
    title: "Ex Machina",
    overview: "Caleb, a coder at the world's largest internet company, wins a competition to spend a week at a private mountain retreat belonging to Nathan, the reclusive CEO. But when he arrives, he discovers that he must participate in a strange and fascinating experiment.",
    posterPath: "https://image.tmdb.org/t/p/w500/9gC88zC2A9agF1b5Jp6w9d0rXh5.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YcWf7j.jpg",
    releaseDate: "2015-01-21",
    runtime: 108,
    genres: [{ id: 18, name: "Drama" }, { id: 878, name: "Sci-Fi" }],
    voteAverage: 7.7,
    status: "Released",
    tagline: "There is nothing more human than the will to survive.",
    mediaType: "movie",
  },
  {
    tmdbId: 35848,
    imdbId: "tt0816692",
    title: "Planetes",
    overview: "In the year 2075, mankind has reached a point where journeying between Earth, the space stations and the Moon is a daily reality. However, the consequence of space advancement is the problem of space debris.",
    posterPath: "https://image.tmdb.org/t/p/w500/3o8uWd1j0o4n1D523i8xG4hU4.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YcWf7j.jpg",
    firstAirDate: "2003-10-04",
    numberOfSeasons: 1,
    numberOfEpisodes: 26,
    genres: [{ id: 16, name: "Animation" }, { id: 18, name: "Drama" }, { id: 10765, name: "Sci-Fi & Fantasy" }],
    voteAverage: 8.1,
    status: "Ended",
    tagline: "Orbital debris collection team.",
    mediaType: "tv",
    seasons: [
      { id: 48900, seasonNumber: 1, name: "Season 1", overview: "The Debris Section carries out their duties.", episodeCount: 26, posterPath: null }
    ]
  },
  {
    tmdbId: 62560,
    imdbId: "tt4158110",
    title: "Mr. Robot",
    overview: "A young programmer who works as a cyber-security engineer by day and a vigilante hacker by night finds himself recruited by an underground group of hacktivists.",
    posterPath: "https://image.tmdb.org/t/p/w500/9gC88zC2A9agF1b5Jp6w9d0rXh5.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YcWf7j.jpg",
    firstAirDate: "2015-06-24",
    numberOfSeasons: 4,
    numberOfEpisodes: 45,
    genres: [{ id: 80, name: "Crime" }, { id: 18, name: "Drama" }],
    voteAverage: 8.5,
    status: "Ended",
    tagline: "Our democracy has been hacked.",
    mediaType: "tv",
    seasons: [
      { id: 67345, seasonNumber: 1, name: "Season 1", overview: "Elliot Alderson joins fsociety.", episodeCount: 10, posterPath: null }
    ]
  }
];

// Public Service Methods
export async function getTrending(mediaType: MediaType | "all" = "all", window: "day" | "week" = "day"): Promise<MediaDetail[]> {
  const cacheKey = `tmdb:trending:${mediaType}:${window}`;
  const cached = await cacheGet<MediaDetail[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const endpoint = `/trending/${mediaType}/${window}`;
  const raw = await fetchFromTmdb<{ results: any[] }>(endpoint);

  let results: MediaDetail[] = [];
  if (raw?.results && raw.results.length > 0) {
    results = raw.results
      .filter((item) => item.media_type === "movie" || item.media_type === "tv" || mediaType !== "all")
      .map((item) => {
        const type = item.media_type || mediaType;
        return type === "tv" ? adaptTVDetails(item) : adaptMovieDetails(item);
      });
  } else {
    results = MOCK_MEDIA_LIST.filter((m) => mediaType === "all" || m.mediaType === mediaType);
  }

  await cacheSet(cacheKey, results, 3600); // 1 hour TTL
  return results;
}

export async function getPopular(mediaType: MediaType = "movie"): Promise<MediaDetail[]> {
  const cacheKey = `tmdb:popular:${mediaType}`;
  const cached = await cacheGet<MediaDetail[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const endpoint = `/${mediaType}/popular`;
  const raw = await fetchFromTmdb<{ results: any[] }>(endpoint);

  let results: MediaDetail[] = [];
  if (raw?.results && raw.results.length > 0) {
    results = raw.results.map((item) => (mediaType === "tv" ? adaptTVDetails(item) : adaptMovieDetails(item)));
  } else {
    results = MOCK_MEDIA_LIST.filter((m) => m.mediaType === mediaType);
  }

  await cacheSet(cacheKey, results, 7200); // 2 hour TTL
  return results;
}

export async function getTopRated(mediaType: MediaType = "movie"): Promise<MediaDetail[]> {
  const cacheKey = `tmdb:top_rated:${mediaType}`;
  const cached = await cacheGet<MediaDetail[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const endpoint = `/${mediaType}/top_rated`;
  const raw = await fetchFromTmdb<{ results: any[] }>(endpoint);

  let results: MediaDetail[] = [];
  if (raw?.results && raw.results.length > 0) {
    results = raw.results.map((item) => (mediaType === "tv" ? adaptTVDetails(item) : adaptMovieDetails(item)));
  } else {
    results = MOCK_MEDIA_LIST.filter((m) => m.mediaType === mediaType).sort((a, b) => b.voteAverage - a.voteAverage);
  }

  await cacheSet(cacheKey, results, 7200);
  return results;
}

export async function getMediaDetails(tmdbId: number, mediaType: MediaType): Promise<MediaDetail | null> {
  const cacheKey = `tmdb:${mediaType}:${tmdbId}`;
  const cached = await cacheGet<MediaDetail>(cacheKey);
  if (cached) return cached;

  const raw = await fetchFromTmdb<any>(`/${mediaType}/${tmdbId}`, {
    append_to_response: "external_ids,credits",
  });

  if (!raw) {
    const mock = MOCK_MEDIA_LIST.find((m) => m.tmdbId === tmdbId && m.mediaType === mediaType);
    return mock || null;
  }

  const detailed = mediaType === "tv" ? adaptTVDetails(raw) : adaptMovieDetails(raw);
  const ttl = mediaType === "movie" ? 86400 * 14 : 86400 * 3;
  await cacheSet(cacheKey, detailed, ttl);
  return detailed;
}

export async function getSeasonEpisodes(tmdbId: number, seasonNum: number): Promise<TVEpisode[]> {
  const cacheKey = `tmdb:tv:${tmdbId}:s${seasonNum}`;
  const cached = await cacheGet<TVEpisode[]>(cacheKey);
  if (cached) return cached;

  const raw = await fetchFromTmdb<any>(`/tv/${tmdbId}/season/${seasonNum}`);
  if (!raw) {
    return Array.from({ length: 10 }, (_, i) => ({
      id: 1000 + i,
      episodeNumber: i + 1,
      seasonNumber: seasonNum,
      name: `Episode ${i + 1}`,
      overview: `Summary for episode ${i + 1} of season ${seasonNum}.`,
      stillPath: null,
      airDate: "2024-01-01",
      voteAverage: 8.0,
      runtime: 50,
    }));
  }

  const episodes = adaptSeasonEpisodes(raw);
  await cacheSet(cacheKey, episodes, 86400); // 24h TTL
  return episodes;
}

export async function searchMedia(query: string, type: "all" | MediaType | "anime" = "all"): Promise<MediaDetail[]> {
  const queryHash = Buffer.from(`${query.toLowerCase()}:${type}`).toString("base64");
  const cacheKey = `tmdb:search:${queryHash}`;
  const cached = await cacheGet<MediaDetail[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const endpoint = type === "all" || type === "anime" ? "/search/multi" : `/search/${type}`;
  const raw = await fetchFromTmdb<{ results: any[] }>(endpoint, { query });

  let results: MediaDetail[] = [];
  if (raw?.results && raw.results.length > 0) {
    results = raw.results
      .filter((item) => {
        if (type === "all") return item.media_type === "movie" || item.media_type === "tv";
        if (type === "anime") {
          return (
            (item.media_type === "movie" || item.media_type === "tv") &&
            (item.genre_ids?.includes(16) ||
              item.genres?.some((g: any) => g.id === 16 || g.name === "Animation") ||
              item.original_language === "ja")
          );
        }
        return item.media_type === type;
      })
      .map((item) => {
        const itemType = (item.media_type as MediaType) || (type === "tv" ? "tv" : "movie");
        return itemType === "tv" ? adaptTVDetails(item) : adaptMovieDetails(item);
      });
  } else {
    results = MOCK_MEDIA_LIST.filter((m) => {
      const matchesQuery =
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.overview.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;

      if (type === "anime") {
        return m.genres?.some((g) => g.id === 16 || g.name === "Animation" || g.name === "Anime");
      }
      if (type === "movie") return m.mediaType === "movie";
      if (type === "tv") return m.mediaType === "tv";
      return true;
    });
  }

  await cacheSet(cacheKey, results, 21600); // 6 hours TTL
  return results;
}

export type MovieCategory = "popular" | "now_playing" | "upcoming" | "top_rated";
export type TVCategory = "popular" | "airing_today" | "on_the_air" | "top_rated" | "anime";

export async function getMovieCategory(category: MovieCategory = "popular", page: number = 1): Promise<{ results: MediaDetail[]; totalPages: number; totalResults: number }> {
  const cacheKey = `tmdb:movie:cat:${category}:p${page}`;
  const cached = await cacheGet<{ results: MediaDetail[]; totalPages: number; totalResults: number }>(cacheKey);
  if (cached && cached.results?.length > 0) return cached;

  const endpoint = `/movie/${category}`;
  const raw = await fetchFromTmdb<{ results: any[]; total_pages: number; total_results: number }>(endpoint, { page: String(page) });

  let results: MediaDetail[] = [];
  let totalPages = 1;
  let totalResults = 0;

  if (raw?.results && raw.results.length > 0) {
    results = raw.results.map(adaptMovieDetails);
    totalPages = raw.total_pages || 1;
    totalResults = raw.total_results || results.length;
  } else {
    results = MOCK_MEDIA_LIST.filter((m) => m.mediaType === "movie");
    totalPages = 1;
    totalResults = results.length;
  }

  const data = { results, totalPages, totalResults };
  await cacheSet(cacheKey, data, 3600);
  return data;
}

export async function getTVCategory(category: TVCategory = "popular", page: number = 1): Promise<{ results: MediaDetail[]; totalPages: number; totalResults: number }> {
  if (category === "anime") {
    return getAnimeRail("first_air_date.desc", page);
  }

  const cacheKey = `tmdb:tv:cat:${category}:p${page}`;
  const cached = await cacheGet<{ results: MediaDetail[]; totalPages: number; totalResults: number }>(cacheKey);
  if (cached && cached.results?.length > 0) return cached;

  const endpoint = `/tv/${category}`;
  const raw = await fetchFromTmdb<{ results: any[]; total_pages: number; total_results: number }>(endpoint, { page: String(page) });

  let results: MediaDetail[] = [];
  let totalPages = 1;
  let totalResults = 0;

  if (raw?.results && raw.results.length > 0) {
    results = raw.results.map(adaptTVDetails);
    totalPages = raw.total_pages || 1;
    totalResults = raw.total_results || results.length;
  } else {
    results = MOCK_MEDIA_LIST.filter((m) => m.mediaType === "tv");
    totalPages = 1;
    totalResults = results.length;
  }

  const data = { results, totalPages, totalResults };
  await cacheSet(cacheKey, data, 3600);
  return data;
}

export interface DiscoverOptions {
  sortBy?: string;
  genres?: string;
  year?: string;
  minRating?: number;
  language?: string;
  page?: number;
}

export async function discoverMedia(
  mediaType: MediaType,
  options: DiscoverOptions = {}
): Promise<{ results: MediaDetail[]; totalPages: number; totalResults: number }> {
  const {
    sortBy = "popularity.desc",
    genres,
    year,
    minRating,
    language,
    page = 1,
  } = options;

  const cacheKey = `tmdb:discover:${mediaType}:${sortBy}:${genres || ""}:${year || ""}:${minRating || 0}:${language || ""}:p${page}`;
  const cached = await cacheGet<{ results: MediaDetail[]; totalPages: number; totalResults: number }>(cacheKey);
  if (cached && cached.results?.length > 0) return cached;

  const params: Record<string, string> = {
    sort_by: sortBy,
    page: String(page),
  };

  if (genres) params.with_genres = genres;
  if (language) params.with_original_language = language;

  const todayStr = new Date().toISOString().split("T")[0];

  if (mediaType === "movie") {
    if (year) params.primary_release_year = year;
    if (minRating && minRating > 0) {
      params["vote_average.gte"] = String(minRating);
      params["vote_count.gte"] = "25";
    }
  } else {
    if (year) params.first_air_date_year = year;
    if (minRating && minRating > 0) {
      params["vote_average.gte"] = String(minRating);
      params["vote_count.gte"] = "15";
    }
    // Prevent unreleased placeholder dates from flooding top of first_air_date.desc
    if (sortBy.includes("first_air_date.desc")) {
      params["first_air_date.lte"] = todayStr;
    }
  }

  const raw = await fetchFromTmdb<{ results: any[]; total_pages: number; total_results: number }>(`/discover/${mediaType}`, params);

  let results: MediaDetail[] = [];
  let totalPages = 1;
  let totalResults = 0;

  if (raw?.results && raw.results.length > 0) {
    results = raw.results.map((item) => (mediaType === "tv" ? adaptTVDetails(item) : adaptMovieDetails(item)));
    totalPages = raw.total_pages || 1;
    totalResults = raw.total_results || results.length;
  } else {
    results = MOCK_MEDIA_LIST.filter((m) => m.mediaType === mediaType);
    totalPages = 1;
    totalResults = results.length;
  }

  const data = { results, totalPages, totalResults };
  await cacheSet(cacheKey, data, 1800); // 30 min cache
  return data;
}

export async function getAnimeRail(
  sortBy: string = "first_air_date.desc",
  page: number = 1,
  language?: string
): Promise<{ results: MediaDetail[]; totalPages: number; totalResults: number }> {
  const cacheKey = `tmdb:anime:${sortBy}:${language || "ja"}:p${page}`;
  const cached = await cacheGet<{ results: MediaDetail[]; totalPages: number; totalResults: number }>(cacheKey);
  if (cached && cached.results?.length > 0) return cached;

  const todayStr = new Date().toISOString().split("T")[0];
  const params: Record<string, string> = {
    with_genres: "16", // Animation
    sort_by: sortBy,
    page: String(page),
  };

  if (language) {
    params.with_original_language = language;
  } else {
    // Default to Japanese original language for anime authenticity
    params.with_original_language = "ja";
  }

  if (sortBy.includes("first_air_date.desc")) {
    params["first_air_date.lte"] = todayStr;
  }

  const raw = await fetchFromTmdb<{ results: any[]; total_pages: number; total_results: number }>("/discover/tv", params);

  let results: MediaDetail[] = [];
  let totalPages = 1;
  let totalResults = 0;

  if (raw?.results && raw.results.length > 0) {
    results = raw.results.map(adaptTVDetails);
    totalPages = raw.total_pages || 1;
    totalResults = raw.total_results || results.length;
  } else {
    // Mock anime series
    results = MOCK_MEDIA_LIST.filter((m) => m.mediaType === "tv" && m.genres?.some((g) => g.id === 16));
    totalPages = 1;
    totalResults = results.length;
  }

  const data = { results, totalPages, totalResults };
  await cacheSet(cacheKey, data, 3600);
  return data;
}

export async function getRecommendations(
  tmdbId: number,
  mediaType: MediaType = "movie",
  page: number = 1
): Promise<MediaDetail[]> {
  const cacheKey = `tmdb:recs:${mediaType}:${tmdbId}:p${page}`;
  const cached = await cacheGet<MediaDetail[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const endpoint = `/${mediaType}/${tmdbId}/recommendations`;
  const raw = await fetchFromTmdb<{ results: any[] }>(endpoint, { page: String(page) });

  let results: MediaDetail[] = [];
  if (raw?.results && raw.results.length > 0) {
    results = raw.results
      .filter((item) => item.poster_path || item.backdrop_path)
      .map((item) => (mediaType === "tv" ? adaptTVDetails(item) : adaptMovieDetails(item)));
  }

  // Graceful fallback if empty
  if (results.length === 0) {
    const current = MOCK_MEDIA_LIST.find((m) => m.tmdbId === tmdbId && m.mediaType === mediaType);
    const genreIds = current?.genres?.map((g) => g.id) || [];
    results = MOCK_MEDIA_LIST.filter(
      (m) =>
        m.tmdbId !== tmdbId &&
        m.mediaType === mediaType &&
        (genreIds.length === 0 || m.genres?.some((g) => genreIds.includes(g.id)))
    );
    if (results.length === 0) {
      results = MOCK_MEDIA_LIST.filter((m) => m.tmdbId !== tmdbId && m.mediaType === mediaType);
    }
  }

  await cacheSet(cacheKey, results, 7200); // 2 hours TTL
  return results;
}

export async function getFranchiseRelations(
  tmdbId: number,
  mediaType: MediaType = "movie"
): Promise<MediaDetail[]> {
  const cacheKey = `tmdb:relations:${mediaType}:${tmdbId}:v3`;
  const cached = await cacheGet<MediaDetail[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const detail = await fetchFromTmdb<any>(`/${mediaType}/${tmdbId}`, {
    append_to_response: "belongs_to_collection,keywords,alternative_titles,external_ids",
  });

  if (!detail || !detail.id) return [];

  const relations: MediaDetail[] = [];
  const addedIds = new Set<string>();
  const currentTitle: string = detail.title || detail.name || "";

  // 1. If TV Show: Add all story seasons (Season 1, 2, 3, 4, Specials) as direct story relations
  if (mediaType === "tv" && detail.seasons && detail.seasons.length > 0) {
    const sortedSeasons = [...detail.seasons].sort((a: any, b: any) => {
      // Put regular seasons (1, 2, 3...) first, Specials (0) last
      const numA = a.season_number === 0 ? 999 : a.season_number;
      const numB = b.season_number === 0 ? 999 : b.season_number;
      return numA - numB;
    });

    for (const s of sortedSeasons) {
      if (!s.name) continue;
      const seasonPoster = s.poster_path
        ? (s.poster_path.startsWith("http") ? s.poster_path : `https://image.tmdb.org/t/p/w500${s.poster_path}`)
        : (detail.poster_path ? (detail.poster_path.startsWith("http") ? detail.poster_path : `https://image.tmdb.org/t/p/w500${detail.poster_path}`) : null);

      const seasonItem: MediaDetail & { badgeText?: string; episodeCount?: number; seasonNumber?: number; href?: string } = {
        tmdbId: detail.id,
        title: s.name,
        overview: s.overview || detail.overview || "",
        posterPath: seasonPoster,
        backdropPath: detail.backdrop_path ? (detail.backdrop_path.startsWith("http") ? detail.backdrop_path : `https://image.tmdb.org/t/p/original${detail.backdrop_path}`) : null,
        firstAirDate: s.air_date || detail.first_air_date,
        voteAverage: Math.round((s.vote_average || detail.vote_average || 0) * 10) / 10,
        mediaType: "tv",
        genres: detail.genres?.map((g: any) => ({ id: g.id, name: g.name })) || [],
        badgeText: s.season_number === 0 ? "SPECIALS" : `SEASON ${s.season_number}`,
        episodeCount: s.episode_count || 0,
        seasonNumber: s.season_number,
        href: `/tv/${detail.id}?season=${s.season_number}`,
      };

      relations.push(seasonItem as any);
      addedIds.add(`tv:${detail.id}:s${s.season_number}`);
    }
  }

  // 2. If Movie: Add collection parts (Official Sequels & Prequels)
  if (mediaType === "movie" && detail.belongs_to_collection && detail.belongs_to_collection.id) {
    try {
      const colData = await fetchFromTmdb<any>(`/collection/${detail.belongs_to_collection.id}`);
      if (colData?.parts) {
        const sortedParts = [...colData.parts].sort((a: any, b: any) => {
          const dateA = a.release_date || "9999";
          const dateB = b.release_date || "9999";
          return dateA.localeCompare(dateB);
        });

        for (let idx = 0; idx < sortedParts.length; idx++) {
          const part = sortedParts[idx];
          if (part.id !== tmdbId && (part.poster_path || part.backdrop_path)) {
            const adapted = adaptMovieDetails(part) as any;
            adapted.badgeText = `PART ${idx + 1}`;
            adapted.href = `/movie/${part.id}`;
            relations.push(adapted);
            addedIds.add(`movie:${part.id}`);
          }
        }
      }
    } catch {}
  }

  // 3. Known Franchise Universe Connections
  const KNOWN_SPINOFFS: Record<number, { id: number; type: MediaType; badge?: string }[]> = {
    1396: [{ id: 60059, type: "tv", badge: "PREQUEL SERIES" }, { id: 559969, type: "movie", badge: "SEQUEL MOVIE" }], // Breaking Bad -> Better Call Saul, El Camino
    60059: [{ id: 1396, type: "tv", badge: "SEQUEL SERIES" }, { id: 559969, type: "movie", badge: "SEQUEL MOVIE" }], // Better Call Saul -> Breaking Bad, El Camino
    1399: [{ id: 94997, type: "tv", badge: "PREQUEL SERIES" }], // Game of Thrones -> House of the Dragon
    94997: [{ id: 1399, type: "tv", badge: "SEQUEL SERIES" }], // House of the Dragon -> Game of Thrones
    76479: [{ id: 205715, type: "tv", badge: "SPIN-OFF" }], // The Boys -> Gen V
    205715: [{ id: 76479, type: "tv", badge: "PARENT SERIES" }], // Gen V -> The Boys
    46260: [{ id: 93405, type: "tv", badge: "SEQUEL SERIES" }], // Naruto -> Boruto
    93405: [{ id: 46260, type: "tv", badge: "PREQUEL SERIES" }], // Boruto -> Naruto
  };

  if (KNOWN_SPINOFFS[tmdbId]) {
    for (const entry of KNOWN_SPINOFFS[tmdbId]) {
      const key = `${entry.type}:${entry.id}`;
      if (!addedIds.has(key)) {
        try {
          const res = await fetchFromTmdb<any>(`/${entry.type}/${entry.id}`);
          if (res && res.id) {
            const adapted = (entry.type === "tv" ? adaptTVDetails(res) : adaptMovieDetails(res)) as any;
            adapted.badgeText = entry.badge || (entry.type === "tv" ? "SPIN-OFF" : "MOVIE");
            adapted.href = `/${entry.type}/${entry.id}`;
            relations.push(adapted);
            addedIds.add(key);
          }
        } catch {}
      }
    }
  }

  // 4. Franchise Query Search for other Connected Movies & Spin-off Series
  const cleanTitle = (t: string) =>
    t
      .replace(/\s*[:\-\–\—\(\[\/].*$/, "")
      .replace(/\s*(Season|Part|Chapter|Volume|Arc|Movie|The Movie|\d+nd|\d+rd|\d+th|\d+st|\bII\b|\bIII\b|\bIV\b|\bV\b|\bVI\b)\b.*/i, "")
      .trim();

  const searchQueries = new Set<string>();
  const rawQueries = [
    currentTitle,
    cleanTitle(currentTitle),
  ];

  if (detail.alternative_titles?.results) {
    for (const alt of detail.alternative_titles.results) {
      if (alt.title && alt.title.length >= 4) {
        rawQueries.push(alt.title);
        rawQueries.push(cleanTitle(alt.title));
      }
    }
  }

  for (const q of rawQueries) {
    const trimmed = q.trim();
    if (trimmed.length >= 3 && searchQueries.size < 8) {
      searchQueries.add(trimmed);
    }
  }

  const noiseFilter = /podcast|stage play|on stage|concert|live in concert|the making of|behind the scenes|fortune teller|reunion hosted|auswirkungen|talk show|commentary|stand-up|stand up|creating the|gag reel|bloopers|interview|q&a|review|promo/i;
  const stopwords = new Set(["the", "that", "this", "and", "for", "with", "from", "got", "time", "part", "season", "movie", "show", "all", "into", "over", "a", "an", "of", "in", "to", "is", "my"]);

  const allTokens = new Set<string>();
  for (const q of searchQueries) {
    q.toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((w: string) => w.length >= 3 && !stopwords.has(w))
      .forEach((w: string) => allTokens.add(w));
  }

  for (const query of Array.from(searchQueries).slice(0, 6)) {
    try {
      const searchData = await fetchFromTmdb<{ results: any[] }>("/search/multi", { query });

      if (searchData?.results) {
        for (const item of searchData.results) {
          if (item.id === tmdbId && item.media_type === mediaType) continue;
          if (item.media_type !== "movie" && item.media_type !== "tv") continue;
          if (!item.poster_path && !item.backdrop_path) continue;

          const title = (item.title || item.name || "");
          const lowerTitle = title.toLowerCase();

          if (noiseFilter.test(lowerTitle)) continue;

          const itemTokens = lowerTitle.split(/[^a-z0-9]+/i).filter((w: string) => w.length >= 3 && !stopwords.has(w));
          const hasMatchingToken = itemTokens.some((t: string) => allTokens.has(t));

          if (hasMatchingToken) {
            const key = `${item.media_type}:${item.id}`;
            if (!addedIds.has(key)) {
              const adapted = (item.media_type === "tv" ? adaptTVDetails(item) : adaptMovieDetails(item)) as any;
              adapted.badgeText = item.media_type === "movie" ? "MOVIE" : "SPIN-OFF";
              adapted.href = `/${item.media_type}/${item.id}`;
              relations.push(adapted);
              addedIds.add(key);
            }
          }
        }
      }
    } catch {}
  }

  await cacheSet(cacheKey, relations, 43200); // 12 hours TTL
  return relations;
}

export async function getSimilar(
  tmdbId: number,
  mediaType: MediaType = "movie",
  page: number = 1
): Promise<MediaDetail[]> {
  return getFranchiseRelations(tmdbId, mediaType);
}

export async function getGenres(type: MediaType = "movie"): Promise<{ id: number; name: string }[]> {
  const cacheKey = `tmdb:genre:${type}`;
  const cached = await cacheGet<{ id: number; name: string }[]>(cacheKey);
  if (cached) return cached;

  const endpoint = `/genre/${type}/list`;
  const data = await fetchFromTmdb<{ genres: { id: number; name: string }[] }>(endpoint);

  const fallbackMovieGenres = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 14, name: "Fantasy" },
    { id: 36, name: "History" },
    { id: 27, name: "Horror" },
    { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Science Fiction" },
    { id: 53, name: "Thriller" },
    { id: 10752, name: "War" },
    { id: 37, name: "Western" },
  ];

  const fallbackTVGenres = [
    { id: 10759, name: "Action & Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 10762, name: "Kids" },
    { id: 9648, name: "Mystery" },
    { id: 10763, name: "News" },
    { id: 10764, name: "Reality" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
    { id: 10766, name: "Soap" },
    { id: 10767, name: "Talk" },
    { id: 10768, name: "War & Politics" },
    { id: 37, name: "Western" },
  ];

  const genres = data?.genres || (type === "tv" ? fallbackTVGenres : fallbackMovieGenres);
  await cacheSet(cacheKey, genres, 86400 * 7); // 7 days TTL
  return genres;
}



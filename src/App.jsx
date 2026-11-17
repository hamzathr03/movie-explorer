import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

const TOKEN = import.meta.env.VITE_TMDB_TOKEN;
const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const FAVORITES_KEY = "movie-explorer-favorites";

const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Most popular" },
  { value: "vote_average.desc", label: "Top rated" },
  { value: "date.desc", label: "Newest first" },
  { value: "date.asc", label: "Oldest first" },
];

function itemTitle(item) {
  return item.title || item.name || "Untitled";
}

function itemYear(item) {
  const date = item.release_date || item.first_air_date || "";
  return date ? date.slice(0, 4) : "—";
}

function itemType(item) {
  return item.media_type === "tv" || item.name ? "tv" : "movie";
}

function favKey(item) {
  return `${itemType(item)}-${item.id}`;
}

async function apiRequest(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Could not load data. Check your TMDB API token.");
  }
  return response.json();
}

function findTrailerKey(details) {
  const videos = details?.videos?.results || [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser") ||
    videos.find((v) => v.site === "YouTube");
  return trailer ? trailer.key : null;
}

function App() {
  const [view, setView] = useState("home"); // home | movies | tv | favorites
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
      return saved.map((item) => ({ ...item, media_type: itemType(item) }));
    } catch {
      return [];
    }
  });

  // Home (hero + rows)
  const [heroItems, setHeroItems] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [rows, setRows] = useState([]);
  const [homeLoading, setHomeLoading] = useState(true);

  // Grid (movies / tv views)
  const [gridItems, setGridItems] = useState([]);
  const [gridPage, setGridPage] = useState(1);
  const [gridTotalPages, setGridTotalPages] = useState(1);
  const [gridLoading, setGridLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [genres, setGenres] = useState([]);
  const [genreMap, setGenreMap] = useState({});
  const [selectedGenre, setSelectedGenre] = useState("");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [searchText, setSearchText] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [error, setError] = useState("");

  // Details modal
  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [seasonNumber, setSeasonNumber] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  // Person modal (Pack 2)
  const [person, setPerson] = useState(null);
  const [personLoading, setPersonLoading] = useState(false);

  // Trailer modal
  const [trailerKey, setTrailerKey] = useState(null);
  const [trailerTitle, setTrailerTitle] = useState("");
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState("");

  const gridRequestId = useRef(0);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  // Pack 2: global genre map (movies + series) to label the cards
  useEffect(() => {
    (async () => {
      try {
        const [movieGenres, tvGenres] = await Promise.all([
          apiRequest(`${API}/genre/movie/list?language=en`),
          apiRequest(`${API}/genre/tv/list?language=en`),
        ]);
        const map = {};
        [...(movieGenres.genres || []), ...(tvGenres.genres || [])].forEach(
          (genre) => {
            map[genre.id] = genre.name;
          }
        );
        setGenreMap(map);
      } catch {
        // Cards simply show no genre line without the map.
      }
    })();
  }, []);

  function genresText(item) {
    return (item.genre_ids || [])
      .map((id) => genreMap[id])
      .filter(Boolean)
      .slice(0, 2)
      .join(" · ");
  }

  const isFavorite = useCallback(
    (item) => favorites.some((fav) => favKey(fav) === favKey(item)),
    [favorites]
  );

  function toggleFavorite(item) {
    const normalized = { ...item, media_type: itemType(item) };
    setFavorites((current) =>
      current.some((fav) => favKey(fav) === favKey(normalized))
        ? current.filter((fav) => favKey(fav) !== favKey(normalized))
        : [...current, normalized]
    );
  }

  /* ---------------- Home : hero slider + rows ---------------- */
  useEffect(() => {
    async function loadHome() {
      setHomeLoading(true);
      try {
        const [trending, trendMovies, popularTv, topRated, upcoming] =
          await Promise.all([
            apiRequest(`${API}/trending/all/day?language=en-US`),
            apiRequest(`${API}/trending/movie/week?language=en-US`),
            apiRequest(`${API}/tv/popular?language=en-US&page=1`),
            apiRequest(`${API}/movie/top_rated?language=en-US&page=1`),
            apiRequest(`${API}/movie/upcoming?language=en-US&page=1`),
          ]);
        setHeroItems(
          (trending.results || [])
            .filter((item) => item.backdrop_path && itemType(item))
            .slice(0, 5)
        );
        setRows([
          { id: "trend-movies", title: "🔥 Trending movies", items: trendMovies.results || [] },
          { id: "popular-tv", title: "📺 Popular series", items: (popularTv.results || []).map((i) => ({ ...i, media_type: "tv" })) },
          { id: "top-rated", title: "⭐ Top rated", items: topRated.results || [] },
          { id: "upcoming", title: "🗓️ Upcoming", items: upcoming.results || [] },
        ]);
      } catch (err) {
        setError(err.message);
      } finally {
        setHomeLoading(false);
      }
    }
    loadHome();
  }, []);

  // Auto-rotate the hero slider
  useEffect(() => {
    if (heroItems.length < 2) return undefined;
    const timer = setInterval(
      () => setHeroIndex((index) => (index + 1) % heroItems.length),
      6000
    );
    return () => clearInterval(timer);
  }, [heroItems]);

  /* ---------------- Grid : movies / tv ---------------- */
  const mediaType = view === "tv" ? "tv" : "movie";

  const fetchGrid = useCallback(
    async (page, append) => {
      const requestId = ++gridRequestId.current;
      if (append) setLoadingMore(true);
      else setGridLoading(true);
      setError("");
      try {
        let url;
        const sort =
          sortBy === "date.desc" || sortBy === "date.asc"
            ? `${mediaType === "tv" ? "first_air_date" : "primary_release_date"}.${sortBy.split(".")[1]}`
            : sortBy;
        if (submittedQuery.trim()) {
          url = `${API}/search/${mediaType}?query=${encodeURIComponent(submittedQuery.trim())}&language=en-US&page=${page}`;
        } else {
          url = `${API}/discover/${mediaType}?language=en-US&page=${page}&sort_by=${sort}&vote_count.gte=${sortBy === "vote_average.desc" ? 300 : 0}`;
          if (selectedGenre) url += `&with_genres=${selectedGenre}`;
        }
        const data = await apiRequest(url);
        if (requestId !== gridRequestId.current) return;
        let results = (data.results || []).map((item) => ({
          ...item,
          media_type: mediaType,
        }));
        if (submittedQuery.trim() && selectedGenre) {
          results = results.filter((item) =>
            (item.genre_ids || []).includes(Number(selectedGenre))
          );
        }
        setGridTotalPages(data.total_pages || 1);
        setGridPage(page);
        setGridItems((current) => (append ? [...current, ...results] : results));
      } catch (err) {
        if (requestId === gridRequestId.current) setError(err.message);
      } finally {
        if (requestId === gridRequestId.current) {
          setGridLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [mediaType, selectedGenre, sortBy, submittedQuery]
  );

  // Load genres + first grid page whenever the grid context changes
  useEffect(() => {
    if (view !== "movies" && view !== "tv") return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest(`${API}/genre/${mediaType}/list?language=en`);
        if (!cancelled) setGenres(data.genres || []);
      } catch {
        if (!cancelled) setGenres([]);
      }
    })();
    fetchGrid(1, false);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, mediaType, selectedGenre, sortBy, submittedQuery]);

  /* ---------------- Details + trailer ---------------- */
  async function openDetails(item) {
    const type = itemType(item);
    setSelected(null);
    setDetailsError("");
    setDetailsLoading(true);
    setSeasonNumber(null);
    setEpisodes([]);
    try {
      const data = await apiRequest(
        `${API}/${type}/${item.id}?language=en-US&append_to_response=credits,videos,recommendations,watch/providers`
      );
      setSelected({ ...data, media_type: type });
      if (type === "tv" && data.seasons?.length) {
        const firstRealSeason =
          data.seasons.find((season) => season.season_number > 0) || data.seasons[0];
        loadEpisodes(data.id, firstRealSeason.season_number);
      }
    } catch (err) {
      setDetailsError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function loadEpisodes(tvId, seasonNum) {
    setSeasonNumber(seasonNum);
    setEpisodesLoading(true);
    try {
      const data = await apiRequest(`${API}/tv/${tvId}/season/${seasonNum}?language=en-US`);
      setEpisodes(data.episodes || []);
    } catch {
      setEpisodes([]);
    } finally {
      setEpisodesLoading(false);
    }
  }

  function closeDetails() {
    setSelected(null);
    setDetailsError("");
    setDetailsLoading(false);
    setEpisodes([]);
    setSeasonNumber(null);
  }

  /* ---------------- Person (Pack 2) ---------------- */
  async function openPerson(personId) {
    setPerson(null);
    setPersonLoading(true);
    try {
      const data = await apiRequest(
        `${API}/person/${personId}?language=en-US&append_to_response=combined_credits`
      );
      setPerson(data);
    } catch {
      setPerson(null);
    } finally {
      setPersonLoading(false);
    }
  }

  function closePerson() {
    setPerson(null);
    setPersonLoading(false);
  }

  async function openTrailer(item) {
    const type = itemType(item);
    setTrailerKey(null);
    setTrailerError("");
    setTrailerTitle(itemTitle(item));
    setTrailerLoading(true);
    try {
      const data =
        selected && selected.id === item.id && selected.videos
          ? selected
          : await apiRequest(`${API}/${type}/${item.id}?language=en-US&append_to_response=videos`);
      const key = findTrailerKey(data);
      if (key) setTrailerKey(key);
      else setTrailerError("No trailer available for this title yet.");
    } catch (err) {
      setTrailerError(err.message);
    } finally {
      setTrailerLoading(false);
    }
  }

  function closeTrailer() {
    setTrailerKey(null);
    setTrailerError("");
    setTrailerLoading(false);
  }

  /* ---------------- Navigation / search ---------------- */
  function goTo(nextView) {
    setView(nextView);
    setSelectedGenre("");
    setSortBy("popularity.desc");
    setSubmittedQuery("");
    setSearchText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearch(event) {
    event.preventDefault();
    if (view === "home" || view === "favorites") setView("movies");
    setSubmittedQuery(searchText);
  }

  const hero = heroItems[heroIndex];

  return (
    <main className="app">
      <header className="navbar">
        <a
          className="brand-logo"
          href="#top"
          aria-label="MovieExplorer home"
          onClick={(event) => {
            event.preventDefault();
            goTo("home");
          }}
        >
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10h18v10H3zM3 10l-1-4 17-4 2 4-18 4Z" />
              <path d="m7 5 3 4M13 3.5l3 4M7 10l3 3M14 10l3 3" />
            </svg>
          </span>
          <span className="brand-name">
            Movie<strong>Explorer</strong>
          </span>
        </a>
        <nav className="nav-pill" aria-label="Main navigation">
          <button type="button" className={`nav-pill-link ${view === "home" ? "is-active" : ""}`} onClick={() => goTo("home")}>
            Home
          </button>
          <button type="button" className={`nav-pill-link ${view === "movies" ? "is-active" : ""}`} onClick={() => goTo("movies")}>
            Movies
          </button>
          <button type="button" className={`nav-pill-link ${view === "tv" ? "is-active" : ""}`} onClick={() => goTo("tv")}>
            Series
          </button>
          <button type="button" className={`nav-pill-link ${view === "favorites" ? "is-active" : ""}`} onClick={() => goTo("favorites")}>
            Favorites <span className="nav-count">{favorites.length}</span>
          </button>
        </nav>
      </header>

      {view === "home" && (
        <>
          <section
            className="hero hero-slider"
            style={
              hero?.backdrop_path
                ? { backgroundImage: `linear-gradient(rgba(10,10,14,0.55), rgba(16,16,20,0.96)), url(${IMG}/original${hero.backdrop_path})` }
                : undefined
            }
          >
            <p className="eyebrow">Your next movie night starts here</p>
            <h1>
              {hero ? (
                <>
                  {itemTitle(hero).split(" ").slice(0, -1).join(" ")}{" "}
                  <span className="hero-accent">{itemTitle(hero).split(" ").slice(-1)}</span>
                </>
              ) : (
                <>
                  Every movie has <span className="hero-accent">a universe.</span>
                </>
              )}
            </h1>
            <p className="description">
              {hero?.overview
                ? hero.overview.slice(0, 160) + (hero.overview.length > 160 ? "…" : "")
                : "Explore movies and series, watch trailers, and save your favorites."}
            </p>
            {hero && (
              <div className="hero-actions">
                <button type="button" className="btn-primary" onClick={() => openTrailer(hero)}>
                  ▶ Watch trailer
                </button>
                <button type="button" className="btn-ghost" onClick={() => openDetails(hero)}>
                  View details
                </button>
                <span className="hero-meta">
                  ★ {Number(hero.vote_average || 0).toFixed(1)} · {itemYear(hero)} ·{" "}
                  {itemType(hero) === "tv" ? "Series" : "Movie"}
                </span>
              </div>
            )}
            <form className="search-row" onSubmit={handleSearch}>
              <input
                type="search"
                placeholder="Search for a movie or a series..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
            {heroItems.length > 1 && (
              <div className="hero-dots">
                {heroItems.map((item, index) => (
                  <button
                    key={favKey(item)}
                    type="button"
                    aria-label={`Show ${itemTitle(item)}`}
                    className={index === heroIndex ? "dot is-active" : "dot"}
                    onClick={() => setHeroIndex(index)}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="home-rows">
            {homeLoading && <p className="status-text">Loading...</p>}
            {error && <p className="error-message">{error}</p>}
            {rows.map((row) => (
              <section className="row-section" key={row.id}>
                <h2>{row.title}</h2>
                <div className="row-scroll">
                  {row.items.slice(0, 14).map((item) => (
                    <Card
                      key={favKey(item)}
                      item={item}
                      genresText={genresText(item)}
                      isFavorite={isFavorite(item)}
                      onToggleFavorite={toggleFavorite}
                      onDetails={openDetails}
                      onTrailer={openTrailer}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {(view === "movies" || view === "tv") && (
        <section className="movies-section" id="movies">
          <form className="search-row grid-search" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder={view === "tv" ? "Search for a series..." : "Search for a movie..."}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="section-heading">
            <h2>
              {submittedQuery
                ? `Results for "${submittedQuery}"`
                : view === "tv"
                  ? "Series"
                  : "Movies"}
            </h2>
            <div className="filters">
              <select value={selectedGenre} onChange={(event) => setSelectedGenre(event.target.value)} aria-label="Filter by genre">
                <option value="">All genres</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort by">
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {gridLoading && <p className="status-text">Loading...</p>}
          {error && <p className="error-message">{error}</p>}
          {!gridLoading && !error && gridItems.length === 0 && (
            <p className="status-text">Nothing found. Try another search or genre.</p>
          )}
          {!gridLoading && gridItems.length > 0 && (
            <div className="movie-grid">
              {gridItems.map((item) => (
                <Card
                  key={favKey(item)}
                  item={item}
                  genresText={genresText(item)}
                  isFavorite={isFavorite(item)}
                  onToggleFavorite={toggleFavorite}
                  onDetails={openDetails}
                  onTrailer={openTrailer}
                />
              ))}
            </div>
          )}
          {!gridLoading && gridItems.length > 0 && gridPage < gridTotalPages && (
            <button
              type="button"
              className="btn-primary load-more"
              disabled={loadingMore}
              onClick={() => fetchGrid(gridPage + 1, true)}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </section>
      )}

      {view === "favorites" && (
        <section className="movies-section">
          <div className="section-heading">
            <h2>Your favorites</h2>
          </div>
          {favorites.length === 0 && (
            <p className="status-text">You haven't added any favorites yet.</p>
          )}
          <div className="movie-grid">
            {favorites.map((item) => (
              <Card
                key={favKey(item)}
                item={item}
                genresText={genresText(item)}
                isFavorite
                onToggleFavorite={toggleFavorite}
                onDetails={openDetails}
                onTrailer={openTrailer}
              />
            ))}
          </div>
        </section>
      )}

      {(detailsLoading || detailsError || selected) && (
        <div className="modal-backdrop" onClick={closeDetails}>
          <div className="movie-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeDetails} aria-label="Close details">
              ×
            </button>
            {detailsLoading && <p className="status-text">Loading details...</p>}
            {detailsError && <p className="error-message">{detailsError}</p>}
            {selected && (
              <div className="modal-content">
                {selected.poster_path ? (
                  <img src={`${IMG}/w500${selected.poster_path}`} alt={`${itemTitle(selected)} poster`} />
                ) : (
                  <div className="poster-placeholder">No poster</div>
                )}
                <div>
                  <h2>{itemTitle(selected)}</h2>
                  <p className="modal-meta">
                    ★ {Number(selected.vote_average || 0).toFixed(1)} · {itemYear(selected)}
                    {selected.runtime ? ` · ${selected.runtime} min` : ""}
                    {selected.number_of_seasons
                      ? ` · ${selected.number_of_seasons} season${selected.number_of_seasons > 1 ? "s" : ""}`
                      : ""}
                    {" · "}
                    {selected.media_type === "tv" ? "Series" : "Movie"}
                  </p>
                  {selected.genres?.length > 0 && (
                    <p className="modal-genres">
                      {selected.genres.map((genre) => genre.name).join(" · ")}
                    </p>
                  )}
                  <p>{selected.overview || "No description available."}</p>
                  <div className="modal-actions">
                    <button type="button" className="btn-primary" onClick={() => openTrailer(selected)}>
                      ▶ Watch trailer
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => toggleFavorite(selected)}>
                      {isFavorite(selected) ? "♥ Remove favorite" : "♡ Add to favorites"}
                    </button>
                  </div>
                  <WatchProviders details={selected} />
                  {selected.credits?.cast?.length > 0 && (
                    <>
                      <h3>Cast — tap an actor</h3>
                      <div className="cast-grid">
                        {selected.credits.cast.slice(0, 8).map((actor) => (
                          <button
                            key={actor.id}
                            type="button"
                            className="cast-card"
                            onClick={() => openPerson(actor.id)}
                          >
                            {actor.profile_path ? (
                              <img src={`${IMG}/w185${actor.profile_path}`} alt={actor.name} loading="lazy" />
                            ) : (
                              <span className="cast-placeholder">{actor.name.slice(0, 1)}</span>
                            )}
                            <span className="cast-name">{actor.name}</span>
                            {actor.character ? (
                              <span className="cast-character">{actor.character}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {selected.media_type === "tv" && selected.seasons?.length > 0 && (
                    <div className="seasons">
                      <h3>Episodes</h3>
                      <div className="season-tabs">
                        {selected.seasons
                          .filter((season) => season.season_number > 0)
                          .map((season) => (
                            <button
                              key={season.id}
                              type="button"
                              className={season.season_number === seasonNumber ? "season-tab is-active" : "season-tab"}
                              onClick={() => loadEpisodes(selected.id, season.season_number)}
                            >
                              S{season.season_number}
                            </button>
                          ))}
                      </div>
                      {episodesLoading && <p className="status-text">Loading episodes...</p>}
                      {!episodesLoading && (
                        <ul className="episode-list">
                          {episodes.map((episode) => (
                            <li key={episode.id}>
                              <span className="episode-num">{episode.episode_number}</span>
                              <span className="episode-name">{episode.name}</span>
                              {episode.runtime ? <span className="episode-runtime">{episode.runtime} min</span> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {selected.recommendations?.results?.length > 0 && (
                    <div className="similar">
                      <h3>You may also like</h3>
                      <div className="similar-grid">
                        {selected.recommendations.results
                          .filter((item) => item.poster_path)
                          .slice(0, 8)
                          .map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="similar-card"
                              onClick={() =>
                                openDetails({ ...item, media_type: selected.media_type })
                              }
                            >
                              <img
                                src={`${IMG}/w342${item.poster_path}`}
                                alt={`${itemTitle(item)} poster`}
                                loading="lazy"
                              />
                              <span>{itemTitle(item)}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(personLoading || person) && (
        <div className="modal-backdrop person-backdrop" onClick={closePerson}>
          <div className="trailer-modal person-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closePerson} aria-label="Close actor">
              ×
            </button>
            {personLoading && <p className="status-text">Loading actor...</p>}
            {person && (
              <div className="person-content">
                {person.profile_path ? (
                  <img src={`${IMG}/w342${person.profile_path}`} alt={person.name} />
                ) : (
                  <div className="poster-placeholder">No photo</div>
                )}
                <div>
                  <h2>{person.name}</h2>
                  <p className="modal-meta">
                    {person.birthday ? `Born ${person.birthday}` : ""}
                    {person.place_of_birth ? ` · ${person.place_of_birth}` : ""}
                  </p>
                  <p>
                    {person.biography
                      ? person.biography.slice(0, 420) + (person.biography.length > 420 ? "…" : "")
                      : "No biography available."}
                  </p>
                  {person.combined_credits?.cast?.length > 0 && (
                    <>
                      <h3>Known for</h3>
                      <div className="similar-grid">
                        {[...person.combined_credits.cast]
                          .filter(
                            (item) =>
                              (item.media_type === "movie" || item.media_type === "tv") &&
                              item.poster_path
                          )
                          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                          .filter(
                            (item, index, arr) =>
                              arr.findIndex(
                                (other) =>
                                  other.id === item.id && other.media_type === item.media_type
                              ) === index
                          )
                          .slice(0, 8)
                          .map((item) => (
                            <button
                              key={`${item.media_type}-${item.id}`}
                              type="button"
                              className="similar-card"
                              onClick={() => {
                                closePerson();
                                openDetails(item);
                              }}
                            >
                              <img
                                src={`${IMG}/w342${item.poster_path}`}
                                alt={`${itemTitle(item)} poster`}
                                loading="lazy"
                              />
                              <span>{itemTitle(item)}</span>
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(trailerLoading || trailerError || trailerKey) && (
        <div className="modal-backdrop trailer-backdrop" onClick={closeTrailer}>
          <div className="trailer-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeTrailer} aria-label="Close trailer">
              ×
            </button>
            <h2>{trailerTitle} — Trailer</h2>
            {trailerLoading && <p className="status-text">Loading trailer...</p>}
            {trailerError && <p className="error-message">{trailerError}</p>}
            {trailerKey && (
              <div className="trailer-frame">
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                  title={`${trailerTitle} trailer`}
                  allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function WatchProviders({ details }) {
  const allRegions = details?.["watch/providers"]?.results || {};
  const region = allRegions.MA ? "MA" : allRegions.US ? "US" : null;
  const data = region ? allRegions[region] : null;
  const streaming = data?.flatrate || [];
  const rent = data?.rent || [];
  const buy = data?.buy || [];
  if (!region || (streaming.length === 0 && rent.length === 0 && buy.length === 0)) {
    return (
      <div className="providers">
        <h3>Where to watch</h3>
        <p className="status-text">No streaming info available for Morocco yet.</p>
      </div>
    );
  }
  return (
    <div className="providers">
      <h3>Where to watch {region === "MA" ? "🇲🇦" : "(US)"}</h3>
      {streaming.length > 0 && (
        <div className="provider-row">
          {streaming.map((provider) => (
            <span key={provider.provider_id} className="provider-chip" title={provider.provider_name}>
              {provider.logo_path ? (
                <img src={`${IMG}/w92${provider.logo_path}`} alt={provider.provider_name} />
              ) : null}
              {provider.provider_name}
            </span>
          ))}
        </div>
      )}
      {rent.length > 0 && (
        <p className="provider-alt">Rent: {rent.map((p) => p.provider_name).join(", ")}</p>
      )}
      {buy.length > 0 && (
        <p className="provider-alt">Buy: {buy.map((p) => p.provider_name).join(", ")}</p>
      )}
      <p className="provider-credit">Availability via JustWatch / TMDB</p>
    </div>
  );
}

function Card({ item, genresText, isFavorite, onToggleFavorite, onDetails, onTrailer }) {
  return (
    <article className="movie-card">
      {item.poster_path ? (
        <img src={`${IMG}/w500${item.poster_path}`} alt={`${itemTitle(item)} poster`} loading="lazy" />
      ) : (
        <div className="poster-placeholder">No poster</div>
      )}
      <span className="type-badge">{itemType(item) === "tv" ? "Series" : "Movie"}</span>
      <div className="movie-info">
        <h3 title={itemTitle(item)}>{itemTitle(item)}</h3>
        <p>
          ★ {Number(item.vote_average || 0).toFixed(1)} · {itemYear(item)}
        </p>
        {genresText ? <p className="card-genres">{genresText}</p> : null}
        <button type="button" onClick={() => onTrailer(item)}>
          ▶ Trailer
        </button>
        <button type="button" onClick={() => onDetails(item)}>
          View details
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(item)}
          aria-label={isFavorite ? `Remove ${itemTitle(item)} from favorites` : `Add ${itemTitle(item)} to favorites`}
        >
          {isFavorite ? "♥ Remove favorite" : "♡ Add to favorites"}
        </button>
      </div>
    </article>
  );
}

export default App;

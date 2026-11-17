import { useEffect, useState } from "react";
import "./App.css";

const TOKEN = import.meta.env.VITE_TMDB_TOKEN;
const API = "https://api.themoviedb.org/3";
const FAVORITES_KEY = "movie-explorer-favorites";

function App() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [avengersBackdrop, setAvengersBackdrop] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch {
      return [];
    }
  });

  const [searchText, setSearchText] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [navExpanded, setNavExpanded] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

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

  async function fetchMovies(query = "", genreId = "") {
    setLoading(true);
    setError("");

    try {
      let url;

      if (query.trim()) {
        url = `${API}/search/movie?query=${encodeURIComponent(
          query.trim()
        )}&language=en-US&page=1`;
      } else if (genreId) {
        url = `${API}/discover/movie?with_genres=${genreId}&language=en-US&page=1`;
      } else {
        url = `${API}/movie/popular?language=en-US&page=1`;
      }

      const data = await apiRequest(url);
      let results = data.results || [];

      if (query.trim() && genreId) {
        results = results.filter((movie) =>
          movie.genre_ids.includes(Number(genreId))
        );
      }

      setMovies(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        const data = await apiRequest(`${API}/genre/movie/list?language=en`);
        setGenres(data.genres || []);
      } catch (err) {
        setError(err.message);
      }

      fetchMovies();
    }

    loadInitialData();

    // Official TMDB backdrop for The Avengers (2012). Uses the existing token.
    async function loadAvengersBackdrop() {
      try {
        const movie = await apiRequest(`${API}/movie/24428?language=en-US`);
        if (movie.backdrop_path) {
          setAvengersBackdrop(`https://image.tmdb.org/t/p/original${movie.backdrop_path}`);
        }
      } catch {
        // The rest of Movie Explorer still works without the decorative image.
      }
    }
    loadAvengersBackdrop();
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    setShowFavorites(false);
    fetchMovies(searchText, selectedGenre);
  }

  function handleGenreChange(event) {
    const genreId = event.target.value;
    setSelectedGenre(genreId);
    setShowFavorites(false);
    fetchMovies(searchText, genreId);
  }

  function toggleFavorite(movie) {
    setFavorites((currentFavorites) => {
      const alreadyFavorite = currentFavorites.some(
        (favorite) => favorite.id === movie.id
      );

      if (alreadyFavorite) {
        return currentFavorites.filter((favorite) => favorite.id !== movie.id);
      }

      return [...currentFavorites, movie];
    });
  }

  async function openMovieDetails(movieId) {
    setSelectedMovie(null);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const data = await apiRequest(
        `${API}/movie/${movieId}?language=en-US&append_to_response=credits`
      );
      setSelectedMovie(data);
    } catch (err) {
      setDetailsError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeMovieDetails() {
    setSelectedMovie(null);
    setDetailsError("");
    setDetailsLoading(false);
  }

  const displayedMovies = showFavorites ? favorites : movies;

  return (
    <main
      className="app"
      style={avengersBackdrop ? { "--avengers-image": `url("${avengersBackdrop}")` } : undefined}
    >
      <header className="navbar" id="top">
        <a className="brand-logo" href="#top" aria-label="MovieExplorer home" onClick={() => setShowFavorites(false)}>
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10h18v10H3zM3 10l-1-4 17-4 2 4-18 4Z" />
              <path d="m7 5 3 4M13 3.5l3 4M7 10l3 3M14 10l3 3" />
            </svg>
          </span>
          <span className="brand-name">Movie<strong>Explorer</strong></span>
        </a>
        <nav className={`nav-pill ${navExpanded ? "nav-pill--expanded" : "nav-pill--collapsed"}`} aria-label="Main navigation">
          <button
            className="nav-orbit"
            type="button"
            aria-label={navExpanded ? "Collapse navigation" : "Expand navigation"}
            aria-expanded={navExpanded}
            onClick={() => setNavExpanded((value) => !value)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20.5 3.5 10.5 20.5l-2.1-7-6.9-2.1 19-7.9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </button>
          <div className="nav-pill-links" aria-hidden={!navExpanded}>
            <button type="button" tabIndex={navExpanded ? 0 : -1} className="nav-pill-link" onClick={() => { setShowFavorites(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Home</button>
            <button type="button" tabIndex={navExpanded ? 0 : -1} className="nav-pill-link" onClick={() => { setShowFavorites(false); document.getElementById("movies")?.scrollIntoView({ behavior: "smooth" }); }}>Movies</button>
            <button type="button" tabIndex={navExpanded ? 0 : -1} className={`nav-pill-link ${showFavorites ? "is-active" : ""}`} onClick={() => { setShowFavorites((value) => !value); document.getElementById("movies")?.scrollIntoView({ behavior: "smooth" }); }}>
              Favorites <span className="nav-count">{favorites.length}</span>
            </button>
          </div>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR NEXT MOVIE NIGHT STARTS HERE</p>
        <h1>Every movie has <span className="hero-accent">a universe.</span></h1>
        <p className="description">
          Explore movies, search by title, and save your favorites.
        </p>

        <form className="search-row" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Search for a movie..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="movies-section" id="movies">
        <div className="section-heading">
          <h2>
            {showFavorites
              ? "Your favorites"
              : searchText
                ? "Search results"
                : selectedGenre
                  ? "Movies by genre"
                  : "Popular movies"}
          </h2>

          {!showFavorites && (
            <select value={selectedGenre} onChange={handleGenreChange}>
              <option value="">All genres</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {!showFavorites && loading && <p>Loading movies...</p>}

        {!showFavorites && error && (
          <p className="error-message">{error}</p>
        )}

        {(showFavorites || !loading) &&
          !error &&
          displayedMovies.length === 0 && (
            <p>
              {showFavorites
                ? "You haven’t added any favorites yet."
                : "No movies found. Try another search or genre."}
            </p>
          )}

        {!showFavorites && !loading && error === "" && displayedMovies.length > 0 && (
          <div className="movie-grid">
            {displayedMovies.map((movie) => {
              const isFavorite = favorites.some(
                (favorite) => favorite.id === movie.id
              );

              return (
                <article className="movie-card" key={movie.id}>
                  {movie.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={`${movie.title} poster`}
                    />
                  ) : (
                    <div className="poster-placeholder">No poster</div>
                  )}

                  <div className="movie-info">
                    <h3>{movie.title}</h3>
                    <p>★ {Number(movie.vote_average || 0).toFixed(1)}</p>

                    <button
                      type="button"
                      onClick={() => toggleFavorite(movie)}
                      aria-label={
                        isFavorite
                          ? `Remove ${movie.title} from favorites`
                          : `Add ${movie.title} to favorites`
                      }
                    >
                      {isFavorite
                        ? "♥ Remove favorite"
                        : "♡ Add to favorites"}
                    </button>

                    <button
                      type="button"
                      onClick={() => openMovieDetails(movie.id)}
                    >
                      View details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {showFavorites && favorites.length > 0 && (
          <div className="movie-grid">
            {favorites.map((movie) => (
              <article className="movie-card" key={movie.id}>
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={`${movie.title} poster`}
                  />
                ) : (
                  <div className="poster-placeholder">No poster</div>
                )}

                <div className="movie-info">
                  <h3>{movie.title}</h3>
                  <p>★ {Number(movie.vote_average || 0).toFixed(1)}</p>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(movie)}
                  >
                    ♥ Remove favorite
                  </button>

                  <button
                    type="button"
                    onClick={() => openMovieDetails(movie.id)}
                  >
                    View details
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {(detailsLoading || detailsError || selectedMovie) && (
        <div className="modal-backdrop" onClick={closeMovieDetails}>
          <section
            className="movie-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Movie details"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              onClick={closeMovieDetails}
              aria-label="Close details"
            >
              ×
            </button>

            {detailsLoading && <p>Loading movie details...</p>}

            {detailsError && (
              <p className="error-message">{detailsError}</p>
            )}

            {selectedMovie && (
              <div className="modal-content">
                {selectedMovie.poster_path && (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`}
                    alt={`${selectedMovie.title} poster`}
                  />
                )}

                <div>
                  <h2>{selectedMovie.title}</h2>

                  {selectedMovie.tagline && (
                    <p>{selectedMovie.tagline}</p>
                  )}

                  <p>
                    {selectedMovie.overview ||
                      "No description available."}
                  </p>

                  <p>
                    Release date: {selectedMovie.release_date || "Unknown"}
                  </p>

                  <p>
                    Runtime:{" "}
                    {selectedMovie.runtime
                      ? `${selectedMovie.runtime} min`
                      : "Unknown"}
                  </p>

                  <p>
                    Rating: ★{" "}
                    {Number(selectedMovie.vote_average || 0).toFixed(1)}
                  </p>

                  <p>
                    Genres:{" "}
                    {selectedMovie.genres
                      ?.map((genre) => genre.name)
                      .join(", ") || "Unknown"}
                  </p>



                  <p>
                    Cast:{" "}
                    {selectedMovie.credits?.cast
                      ?.slice(0, 5)
                       .map((person) => person.name)
                       .join(", ") || "Unknown"}
                 </p>

<div className="cast-section">
  <h3>Cast</h3>

  <div className="cast-list">
    {selectedMovie.credits?.cast?.slice(0, 8).map((person) => (
      <div className="cast-member" key={person.id}>
        {person.profile_path ? (
          <img
            className="cast-photo"
            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
            alt={person.name}
          />
        ) : (
          <div className="cast-photo cast-placeholder">
            {person.name.charAt(0)}
          </div>
        )}

        <span className="cast-name">{person.name}</span>
      </div>
    ))}
  </div>
</div>

                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default App;

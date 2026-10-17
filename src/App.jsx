import { useEffect, useState } from "react";
import "./App.css";

const TOKEN = import.meta.env.VITE_TMDB_TOKEN;
const API = "https://api.themoviedb.org/3";
const FAVORITES_KEY = "movie-explorer-favorites";

function App() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      throw new Error("Could not load data. Check your API token.");
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

  const displayedMovies = showFavorites ? favorites : movies;

  return (
    <main className="app">
      <header className="navbar">
        <a className="logo" href="/">
          Movie<span>Explorer</span>
        </a>

        <button
          className="favorites-button"
          type="button"
          onClick={() => setShowFavorites((current) => !current)}
        >
          {showFavorites ? "← Back to movies" : `♥ Favorites (${favorites.length})`}
        </button>
      </header>

      <section className="hero">
        <p className="eyebrow">Discover your next favorite</p>
        <h1>Find a movie worth watching.</h1>
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

      <section className="movies-section">
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

        {!loading && displayedMovies.length === 0 && (
          <p>
            {showFavorites
              ? "You haven’t added any favorites yet."
              : "No movies found. Try another search or genre."}
          </p>
        )}

        {displayedMovies.length > 0 && (
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
                      {isFavorite ? "♥ Remove favorite" : "♡ Add to favorites"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
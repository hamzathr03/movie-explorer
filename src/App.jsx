import { useEffect, useState } from "react";
import "./App.css";


const TOKEN = import.meta.env.VITE_TMDB_TOKEN;
const API = "https://api.themoviedb.org/3";

function App() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        url = `${API}/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1`;
         } else if (genreId) {
        url = `${API}/discover/movie?
        with_genres=${genreId}&language=en-US&page=1`;
      } else {
        url = `${API}/movie/popular?language=en-US&page=1`;
      }

       const data = await apiRequest(url);
      let results = data.results;


      
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
    async function fetchGenres() {
      try {
        const data = await apiRequest(
          `${API}/genre/movie/list?language=en`
        );
        setGenres(data.genres);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchGenres();
    fetchMovies();
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    fetchMovies(searchText, selectedGenre);
  }

  function handleGenreChange(event) {
    const genreId = event.target.value;
    setSelectedGenre(genreId);
    fetchMovies(searchText, genreId);
  }

  return (
    <main className="app">
      <header className="navbar">
        <a className="logo" href="/">
          Movie<span>Explorer</span>
        </a>
        <button className="favorites-button">♡ Favorites</button>
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
          <h2>{searchText ? "Search results" : "Popular movies"}</h2>

          <select value={selectedGenre} onChange={handleGenreChange}>
            <option value="">All genres</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
          </div>

        {loading && <p>Loading movies...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && !error && movies.length === 0 && (
          <p>No movies found. Try another search or genre.</p>
        )}

        {!loading && !error && movies.length > 0 && (
          <div className="movie-grid">
            {movies.map((movie) => (
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
                  <p>⭐ {movie.vote_average.toFixed(1)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;

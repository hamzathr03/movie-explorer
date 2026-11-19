# 🎬 Movie Explorer

A Netflix-style catalogue to discover movies and TV series — browse trending titles, watch official trailers, see where to stream them, and save your favorites. Powered by the TMDB API.

**🌐 Live demo:** https://movie-explorer-eight-lac.vercel.app

## ✨ Features

### Discover
- **Movies & Series tabs** — browse both, with search and genre filters for each
- **Hero slider** — auto-rotating trending titles every 6 seconds, with backdrop, rating and quick actions
- **Home rows** — 🔥 Trending · 📺 Popular series · ⭐ Top rated · 🗓️ Upcoming
- **Load more + sorting** — paginate without reload; sort by popularity, rating or date

### Watch & decide
- **▶ Watch Trailer** — official YouTube trailer on every card, in the hero and in the details modal
- **Where to Watch** — streaming / rent / buy providers for Morocco (US fallback), via TMDB / JustWatch
- **Details modal** — overview, rating, year, runtime, genres, seasons & episodes for series
- **You may also like** — clickable recommendations under every title

### People
- **Clickable cast** — open an actor's page with bio and their known-for titles (also clickable)
- **Genre labels** on every card

### Experience
- **3D tilt cards + spotlight glow** that follows the mouse
- **Animated hero** — crossfade, aurora background, title revealed word by word
- **3D poster marquee** — infinite loop, pauses on hover
- **Animated nav indicator**, zoom-in modals, scroll-reveal rows, shimmer buttons
- **Favorites** saved in the browser (localStorage) — movies and series, compatible with older saves

> Note: "Where to Watch" can show "No streaming info available for Morocco yet" on some titles — that is a gap in TMDB / JustWatch data for those titles, not a bug.

## 🛠️ Tech Stack

- **Frontend:** React 19 · Vite
- **Animations:** Framer Motion 14 (`framer-motion`, `motion-dom`, `motion-utils`)
- **API:** TMDB (The Movie Database) — https://api.themoviedb.org/3

## 🚀 Run locally

1. Create a `.env` file at the project root with your TMDB API read-access token:

```bash
VITE_TMDB_TOKEN=your_tmdb_token_here
```

2. Install and run:

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal (usually http://localhost:5173).

Build for production:

```bash
npm run build
npm run preview
```

> The token is read in `src/App.jsx` as `import.meta.env.VITE_TMDB_TOKEN`. Never commit a real token to GitHub — `.env` is git-ignored.

## 👤 Author

**Hamza Tahiri** — Full-Stack Developer, Rabat, Morocco
Portfolio: https://hamza-portfolio-theta-rose.vercel.app/

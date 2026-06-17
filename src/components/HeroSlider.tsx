import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'

const LANG_TMDB: Record<string, string> = {
    uk: 'uk-UA',
    en: 'en-US',
    ru: 'ru-RU',
}

const GENRES: Record<string, Record<number, string>> = {
    uk: { 28:'Бойовик',12:'Пригоди',16:'Анімація',35:'Комедія',18:'Драма',14:'Фентезі',27:'Жахи',878:'Фантастика',53:'Трилер',10749:'Романтика',80:'Кримінал' },
    en: { 28:'Action',12:'Adventure',16:'Animation',35:'Comedy',18:'Drama',14:'Fantasy',27:'Horror',878:'Sci-Fi',53:'Thriller',10749:'Romance',80:'Crime' },
    ru: { 28:'Боевик',12:'Приключения',16:'Анимация',35:'Комедия',18:'Драма',14:'Фэнтези',27:'Ужасы',878:'Фантастика',53:'Триллер',10749:'Романтика',80:'Криминал' },
}

const LABELS: Record<string, Record<string, string>> = {
    uk: { nowPlaying:'У прокаті зараз', buy:'Купити квиток', more:'Детальніше', prev:'‹', next:'›' },
    en: { nowPlaying:'Now playing', buy:'Buy ticket', more:'More info', prev:'‹', next:'›' },
    ru: { nowPlaying:'Сейчас в кино', buy:'Купить билет', more:'Подробнее', prev:'‹', next:'›' },
}

interface Movie {
    id: number
    title: string
    overview: string
    vote_average: number
    genre_ids: number[]
    backdrop_path: string | null
    poster_path: string | null
}

const BG_FALLBACK = ['#12080a', '#080e1c', '#081208', '#1a1008', '#0e0818']

export default function HeroSlider() {
    const { lang, theme } = useApp()
    const [movies, setMovies] = useState<Movie[]>([])
    const [current, setCurrent] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        setCurrent(0)
        const fetchMovies = async () => {
            try {
                const res = await fetch(
                    `https://api.themoviedb.org/3/movie/now_playing?language=${LANG_TMDB[lang]}&region=UA&page=1`,
                    { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }
                )
                const data = await res.json()
                if (data.results?.length) {
                    const withBg = data.results.filter((m: Movie) => m.backdrop_path)
                    setMovies((withBg.length >= 3 ? withBg : data.results).slice(0, 7))
                }
            } catch {
                // silent fallback — movies stays empty
            } finally {
                setLoading(false)
            }
        }
        fetchMovies()
    }, [lang])

    const goTo = useCallback((idx: number) => {
        setMovies((prev) => {
            const total = prev.length
            if (!total) return prev
            setCurrent(((idx % total) + total) % total)
            return prev
        })
    }, [])

    useEffect(() => {
        if (!movies.length) return
        const timer = setInterval(() => goTo(current + 1), 6000)
        return () => clearInterval(timer)
    }, [current, movies.length, goTo])

    const isDark = theme === 'dark'
    const L = LABELS[lang]
    const G = GENRES[lang]

    if (loading) return <HeroSkeleton isDark={isDark} />
    if (!movies.length) return null

    const movie = movies[current]
    const bgImage = movie.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : null
    const genres = movie.genre_ids.slice(0, 2).map((id) => G[id]).filter(Boolean).join(' · ')
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null

    return (
        <div className="relative w-full h-screen overflow-hidden">

            {/* Фон */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                style={{
                    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                    backgroundColor: bgImage ? undefined : BG_FALLBACK[current % BG_FALLBACK.length],
                }}
            />

            {/* Оверлеи */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

            {/* Инфо */}
            <div className="absolute bottom-24 left-8 max-w-lg z-10">
        <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-black text-xs font-medium px-2.5 py-1 rounded mb-3">
          🔥 {L.nowPlaying}
        </span>
                <h1 className="text-4xl font-semibold leading-tight mb-2 text-white drop-shadow-lg">
                    {movie.title}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-300 mb-3">
                    {genres && <span>{genres}</span>}
                    {rating && <span className="flex items-center gap-1 text-yellow-400 font-medium">⭐ {rating}</span>}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-6 line-clamp-3">{movie.overview}</p>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold px-5 py-2.5 rounded-xl transition-colors">
                        🎟 {L.buy}
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-xl transition-colors text-sm">
                        {L.more}
                    </button>
                </div>
            </div>

            {/* Стрелки */}
            <button
                onClick={() => goTo(current - 1)}
                aria-label={L.prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-white text-xl flex items-center justify-center transition-colors"
            >
                ‹
            </button>
            <button
                onClick={() => goTo(current + 1)}
                aria-label={L.next}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-white text-xl flex items-center justify-center transition-colors"
            >
                ›
            </button>

            {/* Превью снизу */}
            <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-2.5 px-5 pb-3 pt-10 overflow-x-auto scrollbar-hide bg-gradient-to-t from-black/80 to-transparent">
                {movies.map((m, i) => (
                    <button
                        key={m.id}
                        onClick={() => goTo(i)}
                        className={`flex-none w-16 h-11 rounded-lg overflow-hidden border-2 transition-all ${
                            i === current ? 'border-yellow-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                        }`}
                    >
                        {m.poster_path ? (
                            <img src={`https://image.tmdb.org/t/p/w154${m.poster_path}`} alt={m.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">🎬</div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}

function HeroSkeleton({ isDark }: { isDark: boolean }) {
    return (
        <div className={`w-full h-screen animate-pulse flex items-end pb-24 px-8 ${isDark ? 'bg-gray-950' : 'bg-gray-100'}`}>
            <div className="max-w-lg space-y-3 w-full">
                <div className={`h-4 w-24 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-300'}`} />
                <div className={`h-10 w-80 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-300'}`} />
                <div className={`h-4 w-48 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-300'}`} />
                <div className={`h-16 w-full max-w-sm rounded ${isDark ? 'bg-gray-800' : 'bg-gray-300'}`} />
                <div className="flex gap-3">
                    <div className={`h-10 w-36 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-300'}`} />
                    <div className={`h-10 w-28 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-300'}`} />
                </div>
            </div>
        </div>
    )
}
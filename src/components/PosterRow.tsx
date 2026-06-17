import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'

const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }

const GENRES: Record<string, Record<number, string>> = {
    uk: { 28:'Бойовик',12:'Пригоди',16:'Анімація',35:'Комедія',18:'Драма',14:'Фентезі',27:'Жахи',878:'Фантастика',53:'Трилер',10749:'Романтика',80:'Кримінал',10402:'Мюзикл' },
    en: { 28:'Action',12:'Adventure',16:'Animation',35:'Comedy',18:'Drama',14:'Fantasy',27:'Horror',878:'Sci-Fi',53:'Thriller',10749:'Romance',80:'Crime',10402:'Music' },
    ru: { 28:'Боевик',12:'Приключения',16:'Анимация',35:'Комедия',18:'Драма',14:'Фэнтези',27:'Ужасы',878:'Фантастика',53:'Триллер',10749:'Романтика',80:'Криминал',10402:'Мюзикл' },
}

const TITLES: Record<string, string> = {
    uk: 'У прокаті зараз',
    en: 'Now playing',
    ru: 'Сейчас в кино',
}

interface Movie {
    id: number
    title: string
    vote_average: number
    genre_ids: number[]
    poster_path: string | null
}

const AGE_TAGS = ['12+', '14+', '16+', '18+', '0+']

export default function PosterRow() {
    const { lang, theme } = useApp()
    const [movies, setMovies] = useState<Movie[]>([])
    const isDark = theme === 'dark'
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const res = await fetch(
                    `https://api.themoviedb.org/3/movie/now_playing?language=${LANG_TMDB[lang]}&region=UA&page=1`,
                    { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }
                )
                const data = await res.json()
                setMovies(data.results?.slice(0, 12) ?? [])
            } catch {
                setMovies([])
            }
        }
        fetchMovies()
    }, [lang])

    const G = GENRES[lang]

    // Колесо мыши -> горизонтальный скролл
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
            e.preventDefault()
            el.scrollLeft += e.deltaY
        }

        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [])

    return (
        <div className="">
            <div
                ref={scrollRef}
                className="flex h-[100vh] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {movies.map((m, i) => (
                    <PosterCard
                        key={m.id}
                        movieId={m.id}
                        title={m.title}
                        genre={G[m.genre_ids[0]] ?? 'Кіно'}
                        rating={m.vote_average ? m.vote_average.toFixed(1) : '—'}
                        age={AGE_TAGS[i % AGE_TAGS.length]}
                        poster={m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null}
                    />
                ))}
            </div>
        </div>
    )
}

const FORMATS = ['IMAX L 3D SDH', '3D LUX SDH', 'SDH', '3D SDH', 'LUX SDH']

function getNextSessionTime() {
    const hours = [11, 12, 14, 15, 17, 19, 21]
    const h = hours[Math.floor(Math.random() * hours.length)]
    const m = Math.random() > 0.5 ? '00' : '30'
    return `${h}:${m}`
}

function PosterCard({ movieId, title, genre, rating, age, poster }: {
    movieId: number
    title: string
    genre: string
    rating: string
    age: string
    poster: string | null
}) {
    const [hover, setHover] = useState(false)
    const [nextTime] = useState(getNextSessionTime)
    const [format] = useState(() => FORMATS[Math.floor(Math.random() * FORMATS.length)])

    return (
        <div
            className="flex-none w-100 h-full flex flex-col"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div
                className="relative h-full rounded-lg overflow-hidden cursor-pointer bg-[#1a1a20] transition-transform duration-200 hover:-translate-y-1 hover:z-10"
            >
                {poster ? (
                    <img
                        src={poster}
                        alt={title}
                        className={`w-full h-full object-cover transition-all duration-300 ${
                            hover ? 'blur-sm brightness-[0.45] scale-110' : ''
                        }`}
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center text-2xl text-gray-700 bg-gradient-to-br from-[#1a1a20] to-[#252530] transition-all duration-300 ${hover ? 'blur-sm brightness-50' : ''}`}>
                        🎬
                    </div>
                )}

                {/* Название снизу — видно когда нет хавера, ведёт на страницу фильма */}
                <div className={`absolute bottom-0 left-0 right-0 px-1.5 pt-4 pb-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-200 ${hover ? 'opacity-0' : 'opacity-100'}`}>
                    <Link
                        to={`/movie/${movieId}`}
                        className="text-[11px] font-medium text-white leading-tight line-clamp-2 drop-shadow hover:underline"
                    >
                        {title}
                    </Link>
                </div>

                {/* Hover: название (кнопка сверху) + ближайший сеанс + купити квиток */}
                <div className={`absolute inset-0 flex flex-col justify-between p-2 transition-opacity duration-200 ${hover ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <Link
                        to={`/movie/${movieId}`}
                        className="text-[10px] font-semibold text-white leading-tight line-clamp-2 drop-shadow text-center hover:underline"
                    >
                        {title}
                    </Link>

                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] text-gray-300 uppercase tracking-wide">Найближчий сеанс</span>
                        <span className="text-lg font-bold text-white leading-none">{nextTime}</span>
                        <span className="text-[8.5px] text-gray-400">{format}</span>
                    </div>

                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); /* купити квиток — окремий флоу */ }}
                        className="w-full bg-yellow-400 hover:bg-yellow-300 text-black text-[10px] font-semibold py-1.5 rounded transition-colors"
                    >
                        Купити квиток
                    </button>
                </div>
            </div>
        </div>
    )
}
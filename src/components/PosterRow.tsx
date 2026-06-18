import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useApp } from '../context/AppContext'

// ─── TMDB ───────────────────────────────────────────────────────────────────
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'
const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }

const GENRES: Record<string, Record<number, string>> = {
    uk: { 28:'Бойовик',12:'Пригоди',16:'Анімація',35:'Комедія',18:'Драма',14:'Фентезі',27:'Жахи',878:'Фантастика',53:'Трилер',10749:'Романтика',80:'Кримінал',10402:'Мюзикл' },
    en: { 28:'Action',12:'Adventure',16:'Animation',35:'Comedy',18:'Drama',14:'Fantasy',27:'Horror',878:'Sci-Fi',53:'Thriller',10749:'Romance',80:'Crime',10402:'Music' },
    ru: { 28:'Боевик',12:'Приключения',16:'Анимация',35:'Комедия',18:'Драма',14:'Фэнтези',27:'Ужасы',878:'Фантастика',53:'Триллер',10749:'Романтика',80:'Криминал',10402:'Мюзикл' },
}

const UI: Record<string, Record<string, string>> = {
    uk: { section: 'Зараз у кіно', upcoming: 'Найближчі сеанси', noSessions: 'Сеансів немає', buy: 'Купити квиток', today: 'Сьогодні' },
    en: { section: 'Now Playing',  upcoming: 'Upcoming sessions', noSessions: 'No sessions',   buy: 'Buy ticket',   today: 'Today'     },
    ru: { section: 'Сейчас в кино',upcoming: 'Ближайшие сеансы', noSessions: 'Нет сеансов',   buy: 'Купить билет', today: 'Сегодня'   },
}

// ─── Типы ────────────────────────────────────────────────────────────────────
interface TmdbMovie {
    id: number
    title: string
    vote_average: number
    genre_ids: number[]
    poster_path: string | null
}

interface NearSession {
    id: string
    time: string
    date: string
    format: string
}

type SessionMap = Record<number, NearSession[]>

// ─── PosterRow ────────────────────────────────────────────────────────────────
export default function PosterRow() {
    const { lang } = useApp()
    const [tmdbMovies, setTmdbMovies] = useState<TmdbMovie[]>([])
    const [sessionMap, setSessionMap] = useState<SessionMap>({})
    const [cinemaName, setCinemaName] = useState<string>('')
    const scrollRef = useRef<HTMLDivElement>(null)

    const today   = new Date().toISOString().slice(0, 10)
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes()

    // ── 1. Сеансы из Firebase (тот же стиль что на MoviePage) ────────────────
    useEffect(() => {
        getDocs(collection(db, 'cinemas')).then(snapshot => {
            const cinemas = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any))

            // Определяем город по первому кинотеатру у которого есть сеансы сегодня
            let detectedCity: string | null = null
            for (const c of cinemas) {
                const has = (c.sessions ?? []).some((s: any) => s.date === today)
                if (has) { detectedCity = c.city; break }
            }

            const cityCinemas: any[] = detectedCity
                ? cinemas.filter((c: any) => c.city?.toLowerCase() === detectedCity!.toLowerCase())
                : cinemas

            if (cityCinemas.length > 0) setCinemaName(cityCinemas[0].name)

            // Строим map: movieId → ближайшие сеансы
            const map: SessionMap = {}

            for (const cinema of cityCinemas) {
                for (const s of (cinema.sessions ?? [])) {
                    if (s.date < today) continue
                    if (s.date === today) {
                        const [h, m] = (s.time as string).split(':').map(Number)
                        if (h * 60 + m < nowMins) continue
                    }

                    const mid = Number(s.movieId)
                    if (!map[mid]) map[mid] = []
                    map[mid].push({ id: s.id, time: s.time, date: s.date, format: s.format })
                }
            }

            // Сортируем и берём топ-4
            for (const mid in map) {
                map[mid] = map[mid]
                    .sort((a, b) => a.date === b.date
                        ? a.time.localeCompare(b.time)
                        : a.date.localeCompare(b.date))
                    .slice(0, 4)
            }

            setSessionMap(map)
        })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── 2. Фильмы TMDB ───────────────────────────────────────────────────────
    useEffect(() => {
        fetch(
            `https://api.themoviedb.org/3/movie/now_playing?language=${LANG_TMDB[lang]}&region=UA&page=1`,
            { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }
        )
            .then(r => r.json())
            .then(d => setTmdbMovies(d.results ?? []))
            .catch(() => setTmdbMovies([]))
    }, [lang])

    // ── 3. Сортируем: сначала фильмы у которых есть сеансы ───────────────────
    const movies = [...tmdbMovies]
        .sort((a, b) => (sessionMap[a.id] ? 0 : 1) - (sessionMap[b.id] ? 0 : 1))
        .slice(0, 14)

    // ── Горизонтальный скролл колесом ─────────────────────────────────────────
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

    const G = GENRES[lang]
    const t = UI[lang] ?? UI['uk']

    const formatDate = (dateStr: string) => {
        if (dateStr === today) return t.today
        return new Date(dateStr).toLocaleDateString(
            lang === 'uk' ? 'uk-UA' : lang === 'ru' ? 'ru-RU' : 'en-US',
            { day: 'numeric', month: 'short' }
        )
    }

    return (
        <div className="relative">
            {/* Заголовок секции */}
            <div className="absolute top-4 left-5 z-20 flex items-center gap-2 pointer-events-none select-none">
                <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">
                    {t.section}
                </span>
                {cinemaName && (
                    <>
                        <span className="text-white/20 text-xs">·</span>
                        <span className="text-[11px] text-white/30 tracking-wide">{cinemaName}</span>
                    </>
                )}
            </div>

            <div
                ref={scrollRef}
                className="flex h-[100vh] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {movies.map(m => {
                    const sessions    = sessionMap[m.id] ?? []
                    const hasSessions = sessions.length > 0

                    return (
                        <PosterCard
                            key={m.id}
                            movieId={m.id}
                            title={m.title}
                            genre={G[m.genre_ids[0]] ?? 'Кіно'}
                            rating={m.vote_average ? m.vote_average.toFixed(1) : '—'}
                            poster={m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null}
                            sessions={sessions}
                            hasSessions={hasSessions}
                            formatDate={formatDate}
                            labels={t}
                        />
                    )
                })}
            </div>
        </div>
    )
}

// ─── PosterCard ───────────────────────────────────────────────────────────────
function PosterCard({
                        movieId, title, genre, rating, poster,
                        sessions, hasSessions, formatDate, labels,
                    }: {
    movieId: number
    title: string
    genre: string
    rating: string
    poster: string | null
    sessions: NearSession[]
    hasSessions: boolean
    formatDate: (d: string) => string
    labels: Record<string, string>
}) {
    const [hover, setHover] = useState(false)

    return (
        <div
            className="flex-none w-[clamp(140px,14vw,200px)] h-full"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div className="relative h-full overflow-hidden cursor-pointer bg-[#0e0e14] transition-transform duration-300 hover:-translate-y-1 hover:z-10">

                {/* Постер */}
                {poster ? (
                    <img
                        src={poster}
                        alt={title}
                        className={`w-full h-full object-cover transition-all duration-500 ${
                            hover ? 'blur-[2px] brightness-[0.25] scale-105' : 'brightness-90'
                        }`}
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-[#1a1a20] to-[#252530] transition-all duration-300 ${hover ? 'brightness-50' : ''}`}>
                        🎬
                    </div>
                )}

                {/* Пульсирующая точка — есть сеансы */}
                <div className={`absolute top-2 right-2 z-10 transition-opacity duration-200 ${hover || !hasSessions ? 'opacity-0' : 'opacity-100'}`}>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
                    </span>
                </div>

                {/* Рейтинг */}
                <div className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${hover ? 'opacity-0' : 'opacity-100'}`}>
                    <span className="text-[10px] font-bold text-white/60 bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        ★ {rating}
                    </span>
                </div>

                {/* Название снизу — без hover */}
                <div className={`absolute bottom-0 left-0 right-0 px-2 pt-6 pb-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-200 ${hover ? 'opacity-0' : 'opacity-100'}`}>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wide block mb-0.5">{genre}</span>
                    <Link
                        to={`/movie/${movieId}`}
                        className="text-[11px] font-semibold text-white leading-tight line-clamp-2 hover:underline block"
                    >
                        {title}
                    </Link>
                </div>

                {/* HOVER overlay */}
                <div className={`absolute inset-0 flex flex-col justify-between p-3 transition-opacity duration-300 ${hover ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                    {/* Название сверху */}
                    <Link
                        to={`/movie/${movieId}`}
                        className="text-[11px] font-bold text-white leading-snug line-clamp-3 text-center hover:underline"
                    >
                        {title}
                    </Link>

                    {/* Сеансы */}
                    <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[8.5px] text-white/35 uppercase tracking-[0.15em]">
                            {labels.upcoming}
                        </span>

                        {hasSessions ? (
                            <div className="flex flex-col gap-1 w-full">
                                {sessions.map(s => (
                                    <div
                                        key={s.id}
                                        className="flex items-center justify-between bg-white/5 rounded-lg px-2 py-1.5 border border-white/[0.08]"
                                    >
                                        <div className="flex flex-col leading-none">
                                            <span className="text-[15px] font-bold text-white tabular-nums">
                                                {s.time}
                                            </span>
                                            <span className="text-[8px] text-white/35 mt-0.5">
                                                {formatDate(s.date)}
                                            </span>
                                        </div>
                                        <span className="text-[7px] text-yellow-400/70 font-medium text-right max-w-[52px] leading-tight">
                                            {s.format}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-white/25 text-center py-2">
                                {labels.noSessions}
                            </p>
                        )}
                    </div>

                    {/* Кнопка */}
                    <button
                        onClick={e => { e.preventDefault(); e.stopPropagation() }}
                        disabled={!hasSessions}
                        className={`w-full text-[10px] font-bold py-2 rounded-lg transition-all duration-200 ${
                            hasSessions
                                ? 'bg-yellow-400 hover:bg-yellow-300 text-black active:scale-95'
                                : 'bg-white/[0.08] text-white/25 cursor-not-allowed'
                        }`}
                    >
                        {labels.buy}
                    </button>
                </div>
            </div>
        </div>
    )
}
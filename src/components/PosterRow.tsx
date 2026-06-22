import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDoc, getDocs, doc, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useApp } from '../context/AppContext'
import { Star, Film, Ticket, Clock } from 'lucide-react'

const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN
const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }
const PAGE_SIZE = 8
const CARD_WIDTH = '21rem'

const UI: Record<string, Record<string, string>> = {
    uk: { section: 'Зараз у кіно', upcoming: 'Найближчі сеанси', noSessions: 'Сеансів немає', today: 'Сьогодні', tomorrow: 'Завтра' },
    en: { section: 'Now Playing',  upcoming: 'Upcoming',         noSessions: 'No sessions',   today: 'Today',    tomorrow: 'Tomorrow' },
    ru: { section: 'Сейчас в кино',upcoming: 'Ближайшие',        noSessions: 'Нет сеансов',   today: 'Сегодня',  tomorrow: 'Завтра'   },
}

interface TmdbMovie {
    id: number
    title: string
    vote_average: number
    genre: string
    poster_path: string | null
    release_date: string
    runtime: number
}

interface NearSession {
    id: string
    cinemaId: string
    time: string
    date: string
    format: string
}

type SessionMap = Record<number, NearSession[]>

interface PosterRowProps {
    cinemaId?: string
    city?: string
    title?: string
    showHeader?: boolean
    showScrollbar?: boolean
}

// ─── PosterRow ────────────────────────────────────────────────────────────────
export default function PosterRow({
                                      cinemaId,
                                      city,
                                      title: sectionTitle,
                                      showHeader = true,
                                      showScrollbar = true,
                                  }: PosterRowProps) {
    const { lang, theme } = useApp()

    const [allMovies, setAllMovies]     = useState<TmdbMovie[]>([])
    const [visibleMovies, setVisible]   = useState<TmdbMovie[]>([])
    const [sessionMap, setSessionMap]   = useState<SessionMap>({})
    const [cinemaName, setCinemaName]   = useState('')
    const [loading, setLoading]         = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [, setPage]                   = useState(1)
    const [hasMore, setHasMore]         = useState(false)

    const scrollRef        = useRef<HTMLDivElement>(null)
    const sentinelRef      = useRef<HTMLDivElement>(null)
    const targetScrollRef  = useRef(0)
    const currentScrollRef = useRef(0)
    const rafRef           = useRef<number | null>(null)

    const today   = new Date().toISOString().slice(0, 10)
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes()

    useEffect(() => {
        let cancelled = false
        setLoading(true)

        async function load() {
            let cityCinemas: any[] = []

            if (cinemaId) {
                const snap = await getDoc(doc(db, 'cinemas', cinemaId))
                if (snap.exists()) cityCinemas = [{ id: snap.id, ...snap.data() }]
            } else {
                const snapshot = await getDocs(collection(db, 'cinemas'))
                const cinemas  = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any))
                cityCinemas    = city
                    ? cinemas.filter((c: any) => c.city?.toLowerCase() === city.toLowerCase())
                    : cinemas
            }

            if (cancelled) return

            setCinemaName(cityCinemas.length > 0 ? cityCinemas[0].name : '')

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
                    map[mid].push({ id: s.id, cinemaId: cinema.id, time: s.time, date: s.date, format: s.format })
                }
            }
            for (const mid in map) {
                map[mid] = map[mid]
                    .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))
                    .slice(0, 8)
            }
            if (cancelled) return
            setSessionMap(map)

            const movieIds = Object.keys(map).map(Number)
            if (movieIds.length === 0) {
                setAllMovies([]); setVisible([]); setHasMore(false); setLoading(false)
                return
            }

            const headers  = { Authorization: `Bearer ${TMDB_TOKEN}` }
            const results  = await Promise.allSettled(
                movieIds.map(id =>
                    fetch(`https://api.themoviedb.org/3/movie/${id}?language=${LANG_TMDB[lang]}`, { headers })
                        .then(r => r.json())
                )
            )
            if (cancelled) return

            const fetched: TmdbMovie[] = results
                .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value?.id)
                .map(r => ({
                    id:           r.value.id,
                    title:        r.value.title,
                    vote_average: r.value.vote_average,
                    genre:        r.value.genres?.[0]?.name ?? '',
                    poster_path:  r.value.poster_path,
                    release_date: r.value.release_date ?? '',
                    runtime:      r.value.runtime ?? 0,
                }))

            setAllMovies(fetched)
            setVisible(fetched.slice(0, PAGE_SIZE))
            setHasMore(fetched.length > PAGE_SIZE)
            setPage(1)
            setLoading(false)
        }

        load()
        return () => { cancelled = true }
    }, [lang, cinemaId, city])

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        setTimeout(() => {
            setPage(prev => {
                const next  = prev + 1
                const slice = allMovies.slice(0, next * PAGE_SIZE)
                setVisible(slice)
                setHasMore(slice.length < allMovies.length)
                return next
            })
            setLoadingMore(false)
        }, 300)
    }, [loadingMore, hasMore, allMovies])

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) loadMore() },
            { root: scrollRef.current, rootMargin: '600px', threshold: 0 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMore])

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        targetScrollRef.current  = el.scrollLeft
        currentScrollRef.current = el.scrollLeft

        const DURATION = 250
        const easeOut  = (t: number) => 1 - Math.pow(1 - t, 3)

        const animateTo = (target: number) => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
            const start     = currentScrollRef.current
            const diff      = target - start
            const startTime = performance.now()
            const step = (now: number) => {
                const progress = Math.min((now - startTime) / DURATION, 1)
                const next     = start + diff * easeOut(progress)
                el.scrollLeft            = next
                currentScrollRef.current = next
                if (progress < 1) rafRef.current = requestAnimationFrame(step)
                else              rafRef.current = null
            }
            rafRef.current = requestAnimationFrame(step)
        }

        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
            const { scrollWidth, clientWidth } = el
            const maxScroll = scrollWidth - clientWidth
            if ((e.deltaY > 0 && targetScrollRef.current >= maxScroll - 1) ||
                (e.deltaY < 0 && targetScrollRef.current <= 1)) return
            e.preventDefault()
            targetScrollRef.current = Math.min(
                Math.max(targetScrollRef.current + Math.sign(e.deltaY) * 150, 0),
                maxScroll
            )
            animateTo(targetScrollRef.current)
        }

        el.addEventListener('wheel', onWheel, { passive: false })
        return () => {
            el.removeEventListener('wheel', onWheel)
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        }
    }, [loading])

    const t = UI[lang] ?? UI['uk']

    const formatDate = (dateStr: string) => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (dateStr === today) return t.today
        if (dateStr === tomorrow.toISOString().slice(0, 10)) return t.tomorrow
        return new Date(dateStr).toLocaleDateString(
            lang === 'uk' ? 'uk-UA' : lang === 'ru' ? 'ru-RU' : 'en-US',
            { day: 'numeric', month: 'short' }
        )
    }

    // ── Скелетон ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-full" style={{ background: 'var(--surface)' }}>
                {Array(8).fill(0).map((_, i) => (
                    <div
                        key={i}
                        className="flex-none h-full animate-pulse border-r"
                        style={{
                            width: CARD_WIDTH,
                            animationDelay: `${i * 60}ms`,
                            background: 'var(--surface-2)',
                            borderColor: 'var(--border)',
                        }}
                    />
                ))}
            </div>
        )
    }

    // ── Пусто ─────────────────────────────────────────────────────────────────
    if (visibleMovies.length === 0) {
        return (
            <div
                className="flex h-full items-center justify-center"
                style={{ background: 'var(--bg-from)' }}
            >
                <div className="text-center">
                    <Film size={36} className="mx-auto mb-3" style={{ color: 'var(--fg-subtle)' }} />
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Немає фільмів із сеансами
                    </p>
                </div>
            </div>
        )
    }

    // ── Ряд постеров ──────────────────────────────────────────────────────────
    return (
        <div className="relative h-full" style={{ background: 'var(--bg-from)' }}>

            {/* Заголовок */}
            {showHeader && (
                <div className="absolute top-5 left-5 z-20 flex items-center gap-2.5 pointer-events-none select-none">
                    <span
                        className="text-[10px] font-semibold tracking-[0.22em] uppercase"
                        style={{ color: 'var(--fg-subtle)' }}
                    >
                        {sectionTitle ?? t.section}
                    </span>
                    {cinemaName && (
                        <>
                            <span className="w-px h-3" style={{ background: 'var(--border-strong)' }} />
                            <span
                                className="text-[10px] tracking-wide"
                                style={{ color: 'var(--fg-subtle)' }}
                            >
                                {cinemaName}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Fade-края — адаптируются к теме */}
            <div
                className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10"
                style={{ background: 'linear-gradient(to right, var(--bg-from), transparent)' }}
            />
            <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10"
                style={{ background: 'linear-gradient(to left, var(--bg-from), transparent)' }}
            />

            {/* Скролл-ряд */}
            <div
                ref={scrollRef}
                tabIndex={0}
                className={`flex h-full overflow-x-auto poster-row-scroll ${
                    showScrollbar ? 'poster-row-scroll--visible' : 'poster-row-scroll--hidden'
                }`}
            >
                {visibleMovies.map((m, idx) => (
                    <PosterCard
                        key={m.id}
                        movieId={m.id}
                        title={m.title}
                        genre={m.genre}
                        rating={m.vote_average ? m.vote_average.toFixed(1) : '—'}
                        poster={m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null}
                        sessions={sessionMap[m.id] ?? []}
                        formatDate={formatDate}
                        labels={t}
                        index={idx}
                        year={m.release_date ? m.release_date.slice(0, 4) : ''}
                        runtime={m.runtime}
                        theme={theme}
                    />
                ))}

                {loadingMore && (
                    <div
                        className="flex-none flex items-center justify-center"
                        style={{ width: CARD_WIDTH }}
                    >
                        <div
                            className="w-5 h-5 rounded-full border-2 animate-spin"
                            style={{
                                borderColor: 'var(--border-strong)',
                                borderTopColor: 'var(--accent)',
                            }}
                        />
                    </div>
                )}

                {hasMore && !loadingMore && (
                    <div ref={sentinelRef} className="flex-none w-2 h-full" />
                )}
            </div>
        </div>
    )
}

// ─── PosterCard ───────────────────────────────────────────────────────────────
function PosterCard({
                        movieId, title, genre, rating, poster,
                        sessions, formatDate, labels, index, year, runtime, theme,
                    }: {
    movieId: number
    title: string
    genre: string
    rating: string
    poster: string | null
    sessions: NearSession[]
    formatDate: (d: string) => string
    labels: Record<string, string>
    index: number
    year: string
    runtime: number
    theme: 'light' | 'dark'
}) {
    const [hover, setHover] = useState(false)
    const navigate          = useNavigate()
    const hasSessions       = sessions.length > 0
    const firstSession      = sessions[0]

    // В светлой теме постер затемняем меньше; оверлей — из surface
    const isDark = theme === 'dark'

    const byDate = sessions.reduce<Record<string, NearSession[]>>((acc, s) => {
        ;(acc[s.date] ??= []).push(s)
        return acc
    }, {})

    const runtimeStr = runtime ? `${Math.floor(runtime / 60)}г ${runtime % 60}хв` : ''

    return (
        <div
            className="relative flex-none h-full border-r"
            style={{ width: CARD_WIDTH, borderColor: 'var(--border)' }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div className="absolute inset-0 overflow-hidden">

                {/* Постер */}
                {poster ? (
                    <img
                        src={poster}
                        alt={title}
                        loading={index > 4 ? 'lazy' : 'eager'}
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                            hover
                                ? `scale-105 ${isDark ? 'brightness-[0.12]' : 'brightness-[0.18]'}`
                                : `${isDark ? 'brightness-[0.85]' : 'brightness-[0.75]'} scale-100`
                        }`}
                    />
                ) : (
                    <div
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${hover ? 'brightness-50' : ''}`}
                        style={{ background: 'var(--surface-3)' }}
                    >
                        <Film size={32} style={{ color: 'var(--fg-subtle)' }} />
                    </div>
                )}

                {/* Пульс (только без hover и когда есть сеансы) */}
                <div
                    className={`absolute top-3 right-3 z-10 transition-opacity duration-200 ${
                        hover || !hasSessions ? 'opacity-0' : 'opacity-100'
                    }`}
                >
                    <span className="relative flex items-center justify-center" style={{ width: '6rem', height: '6rem' }}>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-10"
                              style={{ background: 'var(--accent)' }} />
                        <span className="absolute inline-flex rounded-full w-full h-full opacity-20"
                              style={{ background: 'var(--accent)' }} />
                        <span className="relative w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                    </span>
                </div>

                {/* Рейтинг-пилюля (без hover) */}
                <div
                    className={`absolute top-3 left-3 z-10 transition-all duration-200 ${
                        hover ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
                    }`}
                >
                    <div
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border"
                        style={{
                            background: isDark ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.55)',
                            backdropFilter: 'blur(8px)',
                            borderColor: 'var(--border-strong)',
                        }}
                    >
                        <Star size={8} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
                        <span
                            className="text-[9px] font-bold tabular-nums"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            {rating}
                        </span>
                    </div>
                </div>

                {/* ── Статичный оверлей (без hover) ── */}
                <div
                    className={`absolute inset-0 flex flex-col justify-between px-3 pt-8 pb-4 transition-all duration-300 ${
                        hover ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                    }`}
                >
                    {/* Жанр — по центру */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {genre && (
                            <div
                                className="text-[2rem] uppercase tracking-[0.15em] font-medium text-center"
                                style={{ color: 'var(--accent)', opacity: 0.35 }}
                            >
                                {genre}
                            </div>
                        )}
                    </div>

                    {/* Рейтинг + год + хронометраж */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                            <Star size={14} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
                            <span
                                className="text-[2rem] font-bold tabular-nums leading-none"
                                style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.95)' }}
                            >
                                {rating}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {year && (
                                <span
                                    className="text-[9px] tabular-nums"
                                    style={{ color: 'rgba(255,255,255,0.4)' }}
                                >
                                    {year}
                                </span>
                            )}
                            {year && runtimeStr && (
                                <span className="w-px h-2.5" style={{ background: 'rgba(255,255,255,0.15)' }} />
                            )}
                            {runtimeStr && (
                                <span
                                    className="flex items-center gap-1 text-[9px]"
                                    style={{ color: 'rgba(255,255,255,0.35)' }}
                                >
                                    <Clock size={8} style={{ color: 'rgba(255,255,255,0.25)' }} />
                                    {runtimeStr}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Название */}
                    <div className="pt-6 -mx-3 px-3">
                        <Link
                            to={`/movie/${movieId}`}
                            onClick={e => e.stopPropagation()}
                            className="text-[2.4rem] font-semibold text-center leading-snug line-clamp-2 block transition-colors"
                            style={{ color: 'rgba(255,255,255,0.95)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.95)')}
                        >
                            {title}
                        </Link>
                    </div>
                </div>

                {/* ── Hover оверлей: название + сеансы ── */}
                <div
                    className={`absolute inset-0 z-20 flex flex-col px-3 pt-4 pb-16 transition-all duration-300 ${
                        hover ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={() => navigate(`/movie/${movieId}`)}
                >
                    <Link
                        to={`/movie/${movieId}`}
                        onClick={e => e.stopPropagation()}
                        className="text-[12px] font-bold leading-snug line-clamp-3 transition-colors text-center block"
                        style={{ color: 'rgba(255,255,255,0.9)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                    >
                        {title}
                    </Link>

                    <div
                        className="flex-1 flex flex-col justify-center gap-2 mt-3"
                        onClick={e => e.stopPropagation()}
                    >
                        <span
                            className="text-[8px] uppercase tracking-[0.18em] text-center"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                            {labels.upcoming}
                        </span>

                        {hasSessions ? (
                            <div className="flex flex-col gap-2">
                                {Object.entries(byDate).map(([date, daySessions]) => (
                                    <div key={date}>
                                        <span
                                            className="text-[8px] uppercase tracking-wide block mb-1 text-center"
                                            style={{ color: 'rgba(255,255,255,0.3)' }}
                                        >
                                            {formatDate(date)}
                                        </span>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {daySessions.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={e => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        navigate(`/cart/${s.cinemaId}_${s.id}/seatplan`)
                                                    }}
                                                    className="w-14 flex flex-col items-center py-1.5 rounded-lg border transition-all duration-150 active:scale-95"
                                                    style={{
                                                        borderColor: 'rgba(255,255,255,0.12)',
                                                        background:  'rgba(255,255,255,0.06)',
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.background    = 'var(--accent-bg)'
                                                        e.currentTarget.style.borderColor   = 'var(--accent-border)'
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.background    = 'rgba(255,255,255,0.06)'
                                                        e.currentTarget.style.borderColor   = 'rgba(255,255,255,0.12)'
                                                    }}
                                                >
                                                    <span
                                                        className="text-[11px] font-bold tabular-nums leading-none"
                                                        style={{ color: 'rgba(255,255,255,0.9)' }}
                                                    >
                                                        {s.time}
                                                    </span>
                                                    {s.format && (
                                                        <span
                                                            className="text-[7px] mt-0.5 leading-none"
                                                            style={{ color: 'rgba(255,255,255,0.3)' }}
                                                        >
                                                            {s.format}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p
                                className="text-[9px] text-center"
                                style={{ color: 'rgba(255,255,255,0.25)' }}
                            >
                                {labels.noSessions}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Кнопка "купить билет" */}
            {firstSession && (
                <div
                    className={`absolute bottom-4 left-0 right-0 z-30 flex justify-center transition-all duration-300 ${
                        hover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                    }`}
                >
                    <button
                        onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            navigate(`/cart/${firstSession.cinemaId}_${firstSession.id}/seatplan`)
                        }}
                        title="Купити квиток"
                        className="w-10 h-10 flex items-center justify-center rounded-xl active:scale-90 transition-all duration-200"
                        style={{
                            background:  'var(--accent)',
                            color:       'var(--accent-fg)',
                            boxShadow:   '0 4px 16px color-mix(in srgb, var(--accent) 35%, transparent)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
                    >
                        <Ticket size={18} strokeWidth={2.2} />
                    </button>
                </div>
            )}
        </div>
    )
}
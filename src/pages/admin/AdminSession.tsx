import { useState, useEffect, useRef, useMemo } from 'react'
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase.ts'
import type { SeatCategory, Seat, Hall, Cinema, Session } from '../../models/cinema'

// ─── Constants ──────────────────────────────────────────────────

const CITIES = ['Київ', 'Дніпро', 'Львів', 'Одеса', 'Харків', 'Запоріжжя', 'Вінниця', 'Полтава']
const FORMATS = ['IMAX L 2D', 'IMAX 3D', 'SDH', 'ATMOS LUX', 'LUX SDH', 'CHILL OUT', 'ScreenX', 'Dolby Atmos']

const DEFAULT_RUNTIME_MINUTES = 120
const MIN_GAP_MINUTES = 5   // жорсткий мінімум — менше = блокуємо збереження
const WARN_GAP_MINUTES = 10 // м'яке попередження — менше = показуємо warning, але дозволяємо

interface CategoryMeta { category: SeatCategory; label: string; color: string; defaultPrice: number }

const CATEGORY_META: CategoryMeta[] = [
    { category: 'STANDARD',  label: 'Стандарт',   color: '#4b5563', defaultPrice: 150 },
    { category: 'LUX',       label: 'Люкс',        color: '#2563eb', defaultPrice: 220 },
    { category: 'SUPER_LUX', label: 'Супер Люкс',  color: '#7c3aed', defaultPrice: 310 },
    { category: 'CHILL_OUT', label: 'Chill Out',   color: '#0891b2', defaultPrice: 280 },
    { category: 'VIP',       label: 'VIP',         color: '#b45309', defaultPrice: 450 },
]

const CATEGORY_COLORS: Record<SeatCategory, string> = CATEGORY_META.reduce((a, m) => ({ ...a, [m.category]: m.color }), {} as Record<SeatCategory, string>)
const CATEGORY_LABELS: Record<SeatCategory, string> = CATEGORY_META.reduce((a, m) => ({ ...a, [m.category]: m.label }), {} as Record<SeatCategory, string>)

function generateSeats(rows: number, seatsPerRow: number): Seat[] {
    const defaultPrice = CATEGORY_META.find(m => m.category === 'STANDARD')!.defaultPrice
    const seats: Seat[] = []
    for (let r = 1; r <= rows; r++) for (let s = 1; s <= seatsPerRow; s++) seats.push({ row: r, seat: s, category: 'STANDARD', price: defaultPrice })
    return seats
}

function getHallDimensions(hall: Hall) {
    const rows = hall.seats.reduce((max, s) => Math.max(max, s.row), 0)
    const seatsPerRow = hall.seats.reduce((max, s) => Math.max(max, s.seat), 0)
    return { rows, seatsPerRow }
}

function toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

// ─── TMDB ───────────────────────────────────────────────────────

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'

interface TMDBMovie { id: number; title: string; poster_path: string | null; release_date: string }

async function searchMovies(query: string): Promise<TMDBMovie[]> {
    if (!query.trim()) return []
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=uk-UA&page=1`, { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } })
    const data = await res.json()
    return data.results?.slice(0, 10) ?? []
}

async function fetchNowPlaying(): Promise<TMDBMovie[]> {
    const res = await fetch(`https://api.themoviedb.org/3/movie/now_playing?language=uk-UA&page=1`, { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } })
    const data = await res.json()
    return data.results?.slice(0, 20) ?? []
}

async function fetchMovieRuntime(movieId: number): Promise<number | null> {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=uk-UA`, { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } })
        const data = await res.json()
        return typeof data.runtime === 'number' && data.runtime > 0 ? data.runtime : null
    } catch {
        return null
    }
}

// ─── Hall Seat Editor ───────────────────────────────────────────

function HallSeatEditor({ hall, onChange }: { hall: Hall; onChange: (h: Hall) => void }) {
    const [selectedCategory, setSelectedCategory] = useState<SeatCategory>('STANDARD')
    const [isDragging, setIsDragging] = useState(false)
    const { rows, seatsPerRow } = getHallDimensions(hall)
    const usedCategories = Array.from(new Set(hall.seats.map(s => s.category)))

    const categoryPrice = (category: SeatCategory) =>
        hall.seats.find(s => s.category === category)?.price ?? CATEGORY_META.find(m => m.category === category)?.defaultPrice ?? 0
    const getSeat = (row: number, seat: number) => hall.seats.find(s => s.row === row && s.seat === seat)

    const paintSeat = (row: number, seat: number) => {
        const price = categoryPrice(selectedCategory)
        onChange({ ...hall, seats: hall.seats.map(s => s.row === row && s.seat === seat ? { ...s, category: selectedCategory, price } : s) })
    }
    const paintRow = (row: number) => {
        const price = categoryPrice(selectedCategory)
        onChange({ ...hall, seats: hall.seats.map(s => s.row === row ? { ...s, category: selectedCategory, price } : s) })
    }
    const updateCategoryPrice = (category: SeatCategory, price: number) =>
        onChange({ ...hall, seats: hall.seats.map(s => s.category === category ? { ...s, price } : s) })

    return (
        <div className="space-y-6" onMouseLeave={() => setIsDragging(false)}>
            <div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Вибрати категорію для малювання</p>
                <div className="flex flex-wrap gap-2">
                    {CATEGORY_META.map(m => (
                        <button key={m.category} onClick={() => setSelectedCategory(m.category)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                style={{ background: selectedCategory === m.category ? m.color : 'transparent', color: selectedCategory === m.category ? '#fff' : '#9ca3af', border: `1.5px solid ${m.color}` }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />{m.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto" onMouseUp={() => setIsDragging(false)}>
                <div className="inline-block min-w-full">
                    <div className="relative mb-6">
                        <div className="h-1 rounded-full mx-8" style={{ background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />
                        <p className="text-center text-xs text-gray-500 mt-1 tracking-widest uppercase">Екран</p>
                    </div>
                    {Array.from({ length: rows }, (_, i) => i + 1).map(row => (
                        <div key={row} className="flex items-center gap-1.5 mb-1">
                            <button onClick={() => paintRow(row)} className="w-6 text-xs text-gray-500 hover:text-white transition-colors text-right flex-shrink-0" title="Заповнити весь ряд">{row}</button>
                            <div className="flex gap-1">
                                {Array.from({ length: seatsPerRow }, (_, j) => j + 1).map(seatNum => {
                                    const s = getSeat(row, seatNum)
                                    const cat = s?.category ?? 'STANDARD'
                                    return (
                                        <button key={seatNum}
                                                onMouseDown={() => { setIsDragging(true); paintSeat(row, seatNum) }}
                                                onMouseEnter={() => isDragging && paintSeat(row, seatNum)}
                                                className="w-5 h-5 rounded-sm transition-all hover:scale-110 flex-shrink-0"
                                                style={{ background: CATEGORY_COLORS[cat], opacity: 0.85 }}
                                                title={`Ряд ${row}, місце ${seatNum} — ${CATEGORY_LABELS[cat]}, ${s?.price ?? 0}₴`} />
                                    )
                                })}
                            </div>
                            <span className="w-6 text-xs text-gray-500 flex-shrink-0">{row}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-xs text-gray-400 mb-3 uppercase tracking-widest">Ціни за категоріями</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {usedCategories.map(cat => {
                        const meta = CATEGORY_META.find(m => m.category === cat)!
                        return (
                            <div key={cat} className="flex items-center gap-2 p-2 rounded-lg border border-gray-700 bg-gray-800/50">
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                                <span className="text-xs text-gray-300 flex-1">{meta.label}</span>
                                <input type="number" value={categoryPrice(cat)} onChange={e => updateCategoryPrice(cat, Number(e.target.value))}
                                       className="w-16 text-xs text-right bg-gray-700 rounded px-1.5 py-0.5 text-white border border-gray-600 focus:outline-none focus:border-red-500" />
                                <span className="text-xs text-gray-500">₴</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─── Hall Form ──────────────────────────────────────────────────

function HallForm({ hall, onSave, onCancel }: { hall: Hall; onSave: (h: Hall) => void; onCancel: () => void }) {
    const [local, setLocal] = useState<Hall>(hall)
    const initialDims = getHallDimensions(hall)
    const [rows, setRows] = useState(initialDims.rows || 8)
    const [seatsPerRow, setSeatsPerRow] = useState(initialDims.seatsPerRow || 14)

    const rebuild = (newRows: number, newSeatsPerRow: number) => {
        setRows(newRows); setSeatsPerRow(newSeatsPerRow)
        setLocal(prev => ({ ...prev, seats: generateSeats(newRows, newSeatsPerRow) }))
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Назва залу</label>
                    <input value={local.name} onChange={e => setLocal({ ...local, name: e.target.value })} placeholder="IMAX зал 1"
                           className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Формат</label>
                    <select value={local.format} onChange={e => setLocal({ ...local, format: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500">
                        {FORMATS.map(f => <option key={f}>{f}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Кількість рядів</label>
                    <input type="number" min={1} max={30} value={rows} onChange={e => rebuild(Number(e.target.value), seatsPerRow)}
                           className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Місць у ряді</label>
                    <input type="number" min={1} max={40} value={seatsPerRow} onChange={e => rebuild(rows, Number(e.target.value))}
                           className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                </div>
            </div>

            <HallSeatEditor hall={local} onChange={setLocal} />

            <div className="flex gap-3 pt-2">
                <button onClick={() => onSave(local)} disabled={!local.name.trim()}
                        className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                    Зберегти зал
                </button>
                <button onClick={onCancel} className="px-5 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
                    Скасувати
                </button>
            </div>
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────────────

type Tab = 'cinemas' | 'sessions'

export default function CinemaAdmin() {
    const [tab, setTab] = useState<Tab>('cinemas')

    const [cinemas, setCinemas] = useState<Cinema[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [editingHall, setEditingHall] = useState<Hall | null>(null)
    const [showCinemaForm, setShowCinemaForm] = useState(false)

    const [newName, setNewName] = useState('')
    const [newCity, setNewCity] = useState(CITIES[0])
    const [newAddress, setNewAddress] = useState('')

    // ── sessions tab state ──
    const [showSessionForm, setShowSessionForm] = useState(false)
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<TMDBMovie[]>([])
    const [nowPlaying, setNowPlaying] = useState<TMDBMovie[]>([])
    const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null)
    const [selectedHallId, setSelectedHallId] = useState('')
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
    const [sessionTime, setSessionTime] = useState('10:00')
    const [sessionFormat, setSessionFormat] = useState('')
    const [saving, setSaving] = useState(false)
    const [posterCache, setPosterCache] = useState<Record<number, string | null>>({})
    const [runtimeCache, setRuntimeCache] = useState<Record<number, number>>({})
    const loadingRuntimeIds = useRef<Set<number>>(new Set())
    const prevHallIdRef = useRef<string>('')

    // ── одна підписка на Firestore для обох табів ──
    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'cinemas'),
            snapshot => {
                setCinemas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Cinema)))
                setLoading(false); setError(null)
            },
            err => { console.error(err); setError(err.message); setLoading(false) }
        )
        return () => unsub()
    }, [])

    useEffect(() => { fetchNowPlaying().then(setNowPlaying) }, [])

    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); return }
        const t = setTimeout(() => searchMovies(searchQuery).then(setSearchResults), 400)
        return () => clearTimeout(t)
    }, [searchQuery])

    // кешуємо постери з усіх фільмів, що бачили в пошуку/прокаті
    useEffect(() => {
        const updates: Record<number, string | null> = {}
        for (const m of [...nowPlaying, ...searchResults]) updates[m.id] = m.poster_path
        if (Object.keys(updates).length) setPosterCache(prev => ({ ...prev, ...updates }))
    }, [nowPlaying, searchResults])

    const selected = cinemas.find(c => c.id === selectedId) ?? null

    // автозаповнення формату з залу — тільки коли реально змінили зал, а не на кожен снепшот Firestore
    useEffect(() => {
        if (!selected || !selectedHallId) return
        if (prevHallIdRef.current === selectedHallId) return
        const hall = selected.halls.find(h => h.id === selectedHallId)
        if (hall) setSessionFormat(hall.format)
        prevHallIdRef.current = selectedHallId
    }, [selectedHallId, selected])

    // довантажуємо тривалість фільмів, потрібних для перевірки накладок
    useEffect(() => {
        const idsNeeded = new Set<number>()
        if (selectedMovie) idsNeeded.add(selectedMovie.id)
        if (selected && selectedHallId && sessionDate) {
            for (const s of selected.sessions ?? []) {
                if (s.hallId === selectedHallId && s.date === sessionDate && s.id !== editingSessionId) {
                    idsNeeded.add(s.movieId)
                }
            }
        }
        idsNeeded.forEach(id => {
            if (id in runtimeCache || loadingRuntimeIds.current.has(id)) return
            loadingRuntimeIds.current.add(id)
            fetchMovieRuntime(id).then(runtime => {
                setRuntimeCache(prev => ({ ...prev, [id]: runtime ?? DEFAULT_RUNTIME_MINUTES }))
            }).finally(() => { loadingRuntimeIds.current.delete(id) })
        })
    }, [selectedMovie, selectedHallId, sessionDate, selected, editingSessionId, runtimeCache])

    // ── cinemas/halls actions ──
    const createCinema = async () => {
        if (!newName.trim()) return
        const cinema: Cinema = { id: crypto.randomUUID(), name: newName.trim(), city: newCity, address: newAddress.trim(), halls: [], sessions: [] }
        try {
            await setDoc(doc(db, 'cinemas', cinema.id), cinema)
            setSelectedId(cinema.id); setNewName(''); setNewAddress(''); setShowCinemaForm(false)
        } catch (err) {
            console.error(err); alert('Не вдалося створити кінотеатр. Дивись консоль і Firestore Rules.')
        }
    }
    const updateCinema = async (updated: Cinema) => { await setDoc(doc(db, 'cinemas', updated.id), updated) }
    const deleteCinema = async (id: string) => { await deleteDoc(doc(db, 'cinemas', id)); if (selectedId === id) setSelectedId(null) }
    const saveHall = async (hall: Hall) => {
        if (!selected) return
        const exists = selected.halls.some(h => h.id === hall.id)
        const halls = exists ? selected.halls.map(h => h.id === hall.id ? hall : h) : [...selected.halls, hall]
        await updateCinema({ ...selected, halls }); setEditingHall(null)
    }
    const deleteHall = async (hallId: string) => { if (selected) await updateCinema({ ...selected, halls: selected.halls.filter(h => h.id !== hallId) }) }
    const newHall = (): Hall => ({ id: crypto.randomUUID(), name: '', format: FORMATS[0], seats: generateSeats(8, 14) })

    // ── sessions actions ──
    const resetSessionForm = () => {
        setEditingSessionId(null)
        setSelectedMovie(null)
        setSelectedHallId('')
        setSessionDate(new Date().toISOString().slice(0, 10))
        setSessionTime('10:00')
        setSessionFormat('')
        setSearchQuery('')
        setSearchResults([])
        setShowSessionForm(false)
        prevHallIdRef.current = ''
    }

    const startEditSession = (s: Session) => {
        prevHallIdRef.current = s.hallId // щоб ефект автозаповнення формату не перетер вже збережений формат
        setEditingSessionId(s.id)
        setSelectedMovie({ id: s.movieId, title: s.movieTitle, poster_path: posterCache[s.movieId] ?? null, release_date: '' })
        setSelectedHallId(s.hallId)
        setSessionDate(s.date)
        setSessionTime(s.time)
        setSessionFormat(s.format)
        setSearchQuery('')
        setShowSessionForm(true)
    }

    // перевірка накладок: блокує перетин і розрив < 5 хв, попереджає при розриві < 10 хв
    const conflict = useMemo(() => {
        if (!selected || !selectedHallId || !sessionDate || !sessionTime || !selectedMovie) {
            return { blocked: false, error: null as string | null, warning: null as string | null }
        }
        const runtime = runtimeCache[selectedMovie.id] ?? DEFAULT_RUNTIME_MINUTES
        const newStart = toMinutes(sessionTime)
        const newEnd = newStart + runtime

        const others = (selected.sessions ?? []).filter(
            s => s.hallId === selectedHallId && s.date === sessionDate && s.id !== editingSessionId
        )

        let minGap = Infinity
        for (const s of others) {
            const otherStart = toMinutes(s.time)
            const otherRuntime = runtimeCache[s.movieId] ?? DEFAULT_RUNTIME_MINUTES
            const otherEnd = otherStart + otherRuntime

            const overlaps = newStart < otherEnd && otherStart < newEnd
            if (overlaps) {
                return { blocked: true, error: `Накладається на сеанс «${s.movieTitle}» о ${s.time}`, warning: null }
            }

            const gap = newStart >= otherEnd ? newStart - otherEnd : otherStart - newEnd
            if (gap < minGap) minGap = gap
        }

        if (minGap !== Infinity && minGap < MIN_GAP_MINUTES) {
            return { blocked: true, error: `Замало часу між сеансами: ${minGap} хв. Потрібно щонайменше ${MIN_GAP_MINUTES} хв.`, warning: null }
        }
        if (minGap !== Infinity && minGap < WARN_GAP_MINUTES) {
            return { blocked: false, error: null, warning: `Між сеансами лише ${minGap} хв — можливо, не вистачить часу на прибирання залу.` }
        }
        return { blocked: false, error: null, warning: null }
    }, [selected, selectedHallId, sessionDate, sessionTime, selectedMovie, editingSessionId, runtimeCache])

    const saveSession = async () => {
        if (!selected || !selectedMovie || !selectedHallId || !sessionDate || !sessionTime || conflict.blocked) return
        setSaving(true)
        const hall = selected.halls.find(h => h.id === selectedHallId)!
        const existing = editingSessionId ? selected.sessions?.find(s => s.id === editingSessionId) : null
        const session: Session = {
            id: editingSessionId ?? crypto.randomUUID(),
            movieId: selectedMovie.id,
            movieTitle: selectedMovie.title,
            hallId: selectedHallId,
            date: sessionDate,
            time: sessionTime,
            format: sessionFormat || hall.format,
            bookedSeats: existing?.bookedSeats ?? [],
        }
        const others = (selected.sessions ?? []).filter(s => s.id !== session.id)
        try {
            await setDoc(doc(db, 'cinemas', selected.id), { ...selected, sessions: [...others, session] })
            resetSessionForm()
        } catch (e) {
            console.error(e); alert('Помилка збереження. Дивись консоль.')
        }
        setSaving(false)
    }

    const deleteSession = async (sessionId: string) => {
        if (!selected) return
        if (editingSessionId === sessionId) resetSessionForm()
        await setDoc(doc(db, 'cinemas', selected.id), { ...selected, sessions: (selected.sessions ?? []).filter(s => s.id !== sessionId) })
    }

    const groupedSessions = (() => {
        if (!selected) return {} as Record<string, Session[]>
        const sessions = [...(selected.sessions ?? [])].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        const grouped: Record<string, Session[]> = {}
        for (const s of sessions) (grouped[s.date] ??= []).push(s)
        return grouped
    })()

    const displayMovies = searchQuery.trim() ? searchResults : nowPlaying

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* ── Header card ── */}
                <div className="p-5 rounded-xl border border-gray-800 bg-gray-900 flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs text-red-500 uppercase tracking-widest mb-1">Адмін панель</p>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {tab === 'cinemas' ? 'Кінотеатри та зали' : 'Управління сеансами'}
                        </h1>
                    </div>
                    {tab === 'cinemas' && (
                        <button onClick={() => setShowCinemaForm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold transition-colors">
                            + Новий кінотеатр
                        </button>
                    )}
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1 mb-6 border-b border-gray-800">
                    {(['cinemas', 'sessions'] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                                className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === t ? 'text-white border-red-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                            {t === 'cinemas' ? 'Кінотеатри та зали' : 'Сеанси'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <p className="text-gray-500 text-sm">Завантаження...</p>
                ) : error ? (
                    <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm">Помилка з'єднання з Firestore: {error}</div>

                ) : tab === 'cinemas' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        <div className="lg:col-span-1 space-y-3">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Список кінотеатрів</p>

                            {showCinemaForm && (
                                <div className="p-4 rounded-xl border border-red-500/30 bg-gray-900 space-y-3">
                                    <p className="text-sm font-semibold text-red-400">Новий кінотеатр</p>
                                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Назва кінотеатру"
                                           className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                                    <select value={newCity} onChange={e => setNewCity(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500">
                                        {CITIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                    <input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Адреса"
                                           className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                                    <div className="flex gap-2">
                                        <button onClick={createCinema} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-semibold transition-colors">Створити</button>
                                        <button onClick={() => setShowCinemaForm(false)} className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">✕</button>
                                    </div>
                                </div>
                            )}

                            {cinemas.length === 0 && !showCinemaForm && (
                                <div className="p-6 rounded-xl border border-dashed border-gray-700 text-center">
                                    <p className="text-gray-500 text-sm">Немає кінотеатрів</p>
                                    <p className="text-gray-600 text-xs mt-1">Натисни «Новий кінотеатр»</p>
                                </div>
                            )}

                            {cinemas.map(cinema => (
                                <div key={cinema.id} onClick={() => { setSelectedId(cinema.id); setEditingHall(null) }}
                                     className="p-4 rounded-xl border cursor-pointer transition-all"
                                     style={{ background: selectedId === cinema.id ? 'rgba(239,68,68,0.08)' : 'rgb(17,24,39)', borderColor: selectedId === cinema.id ? 'rgba(239,68,68,0.4)' : 'rgb(55,65,81)' }}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{cinema.name}</p>
                                            <p className="text-xs text-red-400 mt-0.5">{cinema.city}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{cinema.address}</p>
                                            <p className="text-xs text-gray-600 mt-1">{cinema.halls.length} {cinema.halls.length === 1 ? 'зал' : 'залів'}</p>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); deleteCinema(cinema.id) }} className="text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0 mt-0.5">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="lg:col-span-2">
                            {!selected ? (
                                <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-gray-700">
                                    <p className="text-gray-500 text-sm">Вибери кінотеатр зліва</p>
                                </div>
                            ) : editingHall ? (
                                <div className="p-6 rounded-xl border border-gray-800 bg-gray-900">
                                    <div className="flex items-center gap-3 mb-6">
                                        <button onClick={() => setEditingHall(null)} className="text-gray-500 hover:text-white transition-colors text-sm">← Назад</button>
                                        <h2 className="font-semibold">{editingHall.name || 'Новий зал'}</h2>
                                    </div>
                                    <HallForm hall={editingHall} onSave={saveHall} onCancel={() => setEditingHall(null)} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-5 rounded-xl border border-gray-800 bg-gray-900">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h2 className="text-lg font-bold">{selected.name}</h2>
                                                <p className="text-sm text-gray-400">{selected.city} · {selected.address}</p>
                                            </div>
                                            <button onClick={() => { const name = prompt('Нова назва:', selected.name); if (name) updateCinema({ ...selected, name }) }}
                                                    className="text-xs text-gray-500 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                                                Редагувати
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 uppercase tracking-widest">Зали ({selected.halls.length})</p>
                                        <button onClick={() => setEditingHall(newHall())} className="text-xs text-red-400 hover:text-red-300 transition-colors">+ Додати зал</button>
                                    </div>

                                    {selected.halls.length === 0 && (
                                        <div className="p-8 rounded-xl border border-dashed border-gray-700 text-center">
                                            <p className="text-gray-500 text-sm">Немає залів</p>
                                            <button onClick={() => setEditingHall(newHall())} className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors">+ Створити перший зал</button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {selected.halls.map(hall => {
                                            const { rows, seatsPerRow } = getHallDimensions(hall)
                                            const usedCategories = Array.from(new Set(hall.seats.map(s => s.category)))
                                            return (
                                                <div key={hall.id} className="p-4 rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 transition-colors">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="font-semibold text-sm">{hall.name}</p>
                                                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{hall.format}</span>
                                                        </div>
                                                        <button onClick={() => deleteHall(hall.id)} className="text-gray-600 hover:text-red-400 transition-colors text-xs">✕</button>
                                                    </div>

                                                    <div className="mb-3 overflow-hidden rounded" style={{ height: 64 }}>
                                                        <div className="flex flex-col h-full gap-px">
                                                            {Array.from({ length: rows }, (_, i) => i + 1).map(row => (
                                                                <div key={row} className="flex flex-1 min-h-0 gap-px">
                                                                    {Array.from({ length: seatsPerRow }, (_, j) => j + 1).map(seatNum => {
                                                                        const seatFound = hall.seats.find(s => s.row === row && s.seat === seatNum)
                                                                        return <div key={seatNum} className="flex-1 min-w-0" style={{ background: CATEGORY_COLORS[seatFound?.category ?? 'STANDARD'], opacity: 0.7 }} />
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-gray-500">{rows} рядів · {seatsPerRow} місць</p>
                                                        <button onClick={() => setEditingHall(hall)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Редагувати →</button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-800">
                                                        {usedCategories.map(cat => {
                                                            const meta = CATEGORY_META.find(m => m.category === cat)!
                                                            const price = hall.seats.find(s => s.category === cat)?.price ?? meta.defaultPrice
                                                            return <span key={cat} className="text-xs px-2 py-0.5 rounded-full" style={{ background: meta.color + '22', color: meta.color, border: `1px solid ${meta.color}44` }}>{meta.label} {price}₴</span>
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                ) : (
                    /* ── SESSIONS TAB ── */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        <div className="lg:col-span-1 space-y-3">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Вибери кінотеатр</p>
                            {cinemas.length === 0 && (
                                <div className="p-6 rounded-xl border border-dashed border-gray-700 text-center">
                                    <p className="text-gray-500 text-sm">Спочатку створи кінотеатр та зали</p>
                                </div>
                            )}
                            {cinemas.map(cinema => (
                                <div key={cinema.id} onClick={() => { setSelectedId(cinema.id); resetSessionForm() }}
                                     className="p-4 rounded-xl border cursor-pointer transition-all"
                                     style={{ background: selectedId === cinema.id ? 'rgba(239,68,68,0.08)' : 'rgb(17,24,39)', borderColor: selectedId === cinema.id ? 'rgba(239,68,68,0.4)' : 'rgb(55,65,81)' }}>
                                    <p className="font-semibold text-sm">{cinema.name}</p>
                                    <p className="text-xs text-red-400 mt-0.5">{cinema.city}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{cinema.address}</p>
                                    <p className="text-xs text-gray-600 mt-1">{cinema.halls.length} залів · {(cinema.sessions ?? []).length} сеансів</p>
                                </div>
                            ))}
                        </div>

                        <div className="lg:col-span-2 space-y-4">
                            {!selected ? (
                                <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-gray-700">
                                    <p className="text-gray-500 text-sm">Вибери кінотеатр зліва</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-5 rounded-xl border border-gray-800 bg-gray-900 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold">{selected.name}</h2>
                                            <p className="text-sm text-gray-400">{selected.city} · {selected.address}</p>
                                        </div>
                                        <button onClick={() => { showSessionForm ? resetSessionForm() : setShowSessionForm(true) }}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold transition-colors">
                                            {showSessionForm ? '✕ Скасувати' : '+ Новий сеанс'}
                                        </button>
                                    </div>

                                    {showSessionForm && (
                                        <div className="p-6 rounded-xl border border-red-500/20 bg-gray-900 space-y-5">
                                            <p className="text-sm font-semibold text-red-400 uppercase tracking-widest">
                                                {editingSessionId ? 'Редагування сеансу' : 'Новий сеанс'}
                                            </p>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Пошук фільму (TMDB)</label>
                                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Введи назву фільму..."
                                                       className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors" />

                                                {selectedMovie && (
                                                    <div className="mt-3 flex items-center gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                                                        {selectedMovie.poster_path ? (
                                                            <img src={`https://image.tmdb.org/t/p/w92${selectedMovie.poster_path}`} alt={selectedMovie.title} className="w-10 h-14 object-cover rounded" />
                                                        ) : (
                                                            <div className="w-10 h-14 rounded bg-gray-700 flex items-center justify-center text-gray-500 text-xs flex-shrink-0">🎬</div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold truncate">{selectedMovie.title}</p>
                                                            <p className="text-xs text-gray-400">
                                                                {selectedMovie.release_date?.slice(0, 4) || '—'}
                                                                {' · '}
                                                                {runtimeCache[selectedMovie.id] ? `${runtimeCache[selectedMovie.id]} хв` : 'тривалість завантажується...'}
                                                            </p>
                                                        </div>
                                                        <button onClick={() => setSelectedMovie(null)} className="text-gray-500 hover:text-red-400 text-xs transition-colors">✕</button>
                                                    </div>
                                                )}

                                                {!selectedMovie && displayMovies.length > 0 && (
                                                    <div className="mt-2 rounded-xl border border-gray-700 bg-gray-800 overflow-hidden max-h-72 overflow-y-auto">
                                                        {!searchQuery.trim() && <p className="px-3 pt-2 pb-1 text-xs text-gray-500 uppercase tracking-widest">Зараз у прокаті</p>}
                                                        {displayMovies.map(m => (
                                                            <button key={m.id} onClick={() => { setSelectedMovie(m); setSearchQuery('') }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 transition-colors text-left">
                                                                {m.poster_path ? <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt={m.title} className="w-8 h-11 object-cover rounded flex-shrink-0" /> : <div className="w-8 h-11 rounded bg-gray-700 flex-shrink-0 flex items-center justify-center text-gray-500 text-xs">🎬</div>}
                                                                <div className="min-w-0">
                                                                    <p className="text-sm truncate">{m.title}</p>
                                                                    <p className="text-xs text-gray-500">{m.release_date?.slice(0, 4)}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Зал</label>
                                                    {selected.halls.length === 0 ? (
                                                        <p className="text-xs text-red-400">Спочатку створи зал у кінотеатрі</p>
                                                    ) : (
                                                        <select value={selectedHallId} onChange={e => setSelectedHallId(e.target.value)}
                                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500">
                                                            <option value="">— Вибери зал —</option>
                                                            {selected.halls.map(h => <option key={h.id} value={h.id}>{h.name} ({h.format})</option>)}
                                                        </select>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Дата</label>
                                                    <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                                                           className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Час</label>
                                                    <input type="time" value={sessionTime} onChange={e => setSessionTime(e.target.value)}
                                                           className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Формат показу</label>
                                                <input value={sessionFormat} onChange={e => setSessionFormat(e.target.value)} placeholder="IMAX 2D, Dolby Atmos..."
                                                       className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                                            </div>

                                            {conflict.error && (
                                                <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-xs">
                                                    ⚠ {conflict.error}
                                                </div>
                                            )}
                                            {conflict.warning && !conflict.error && (
                                                <div className="p-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-xs">
                                                    ⚠ {conflict.warning}
                                                </div>
                                            )}

                                            <button onClick={saveSession} disabled={!selectedMovie || !selectedHallId || !sessionDate || !sessionTime || saving || conflict.blocked}
                                                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors">
                                                {saving ? 'Збереження...' : editingSessionId ? '✓ Зберегти зміни' : '✓ Додати сеанс'}
                                            </button>
                                        </div>
                                    )}

                                    {Object.keys(groupedSessions).length === 0 ? (
                                        <div className="p-8 rounded-xl border border-dashed border-gray-700 text-center">
                                            <p className="text-gray-500 text-sm">Немає сеансів</p>
                                            <button onClick={() => setShowSessionForm(true)} className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors">+ Додати перший сеанс</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {Object.entries(groupedSessions).sort(([a], [b]) => a.localeCompare(b)).map(([date, sessions]) => (
                                                <div key={date}>
                                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                                                        📅 {new Date(date + 'T00:00:00').toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                    </p>
                                                    <div className="space-y-2">
                                                        {sessions.map(s => {
                                                            const hallName = selected.halls.find(h => h.id === s.hallId)?.name ?? '—'
                                                            const poster = posterCache[s.movieId]
                                                            return (
                                                                <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 transition-colors">
                                                                    {poster ? (
                                                                        <img src={`https://image.tmdb.org/t/p/w92${poster}`} alt={s.movieTitle} className="w-9 object-cover rounded flex-shrink-0" style={{ height: 52 }} />
                                                                    ) : (
                                                                        <div className="w-9 rounded bg-gray-800 flex-shrink-0 flex items-center justify-center text-gray-600 text-xs" style={{ height: 52 }}>🎬</div>
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-semibold text-sm truncate">{s.movieTitle}</p>
                                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                                            <span className="text-xs text-gray-400">{hallName}</span>
                                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{s.format}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right flex-shrink-0"><p className="text-red-400 font-bold text-lg leading-none">{s.time}</p></div>
                                                                    <button onClick={() => startEditSession(s)} className="text-gray-600 hover:text-blue-400 transition-colors text-xs flex-shrink-0" title="Редагувати сеанс">✎</button>
                                                                    <button onClick={() => deleteSession(s.id)} className="text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0" title="Видалити сеанс">✕</button>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
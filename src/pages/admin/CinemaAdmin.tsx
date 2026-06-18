import { useState, useEffect, useRef } from 'react'
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase.ts'
import type { SeatCategory, Seat, Hall, Cinema, Session } from '../../models/cinema'

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES = ['Київ', 'Дніпро', 'Львів', 'Одеса', 'Харків', 'Запоріжжя', 'Вінниця', 'Полтава']
const FORMATS = ['IMAX L 2D', 'IMAX 3D', 'SDH', 'ATMOS LUX', 'LUX SDH', 'CHILL OUT', 'ScreenX', 'Dolby Atmos']

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'

const MIN_GAP_MINUTES = 5

interface CategoryMeta {
    category: SeatCategory
    label: string
    color: string
    defaultPrice: number
}

const CATEGORY_META: CategoryMeta[] = [
    { category: 'STANDARD',  label: 'Стандарт',  color: '#4b5563', defaultPrice: 150 },
    { category: 'LUX',       label: 'Люкс',       color: '#2563eb', defaultPrice: 220 },
    { category: 'SUPER_LUX', label: 'Супер Люкс', color: '#7c3aed', defaultPrice: 310 },
    { category: 'CHILL_OUT', label: 'Chill Out',  color: '#0891b2', defaultPrice: 280 },
    { category: 'VIP',       label: 'VIP',        color: '#b45309', defaultPrice: 450 },
]

const CATEGORY_COLORS: Record<SeatCategory, string> = CATEGORY_META.reduce(
    (acc, m) => ({ ...acc, [m.category]: m.color }),
    {} as Record<SeatCategory, string>
)

const CATEGORY_LABELS: Record<SeatCategory, string> = CATEGORY_META.reduce(
    (acc, m) => ({ ...acc, [m.category]: m.label }),
    {} as Record<SeatCategory, string>
)

// ─── Session helpers ──────────────────────────────────────────────────────────

function timeToMins(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

function minsToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

interface Conflict {
    type: 'overlap' | 'gap'
    message: string
}

function checkConflicts(
    sessions: Session[],
    hallId: string,
    date: string,
    startMins: number,
    durationMins: number,
    excludeId?: string
): Conflict[] {
    const endMins = startMins + durationMins
    const same = sessions.filter(
        s => s.hallId === hallId && s.date === date && s.id !== excludeId
    )
    const conflicts: Conflict[] = []

    for (const s of same) {
        const sStart = timeToMins(s.time)
        const sEnd = sStart + ((s as any).durationMinutes ?? 0)

        if (startMins < sEnd && endMins > sStart) {
            conflicts.push({
                type: 'overlap',
                message: `Перетинається з "${s.movieTitle}" (${s.time}–${minsToTime(sEnd)})`,
            })
            continue
        }

        const gapBefore = sStart - endMins
        const gapAfter  = startMins - sEnd

        if (gapBefore >= 0 && gapBefore < MIN_GAP_MINUTES) {
            conflicts.push({
                type: 'gap',
                message: `До "${s.movieTitle}" (${s.time}) лише ${gapBefore} хв — мінімум ${MIN_GAP_MINUTES}`,
            })
        }
        if (gapAfter >= 0 && gapAfter < MIN_GAP_MINUTES) {
            conflicts.push({
                type: 'gap',
                message: `Після "${s.movieTitle}" (${minsToTime(sEnd)}) лише ${gapAfter} хв — мінімум ${MIN_GAP_MINUTES}`,
            })
        }
    }
    return conflicts
}

// ─── Hall helpers ─────────────────────────────────────────────────────────────

function generateSeats(rows: number, seatsPerRow: number): Seat[] {
    const defaultPrice = CATEGORY_META.find(m => m.category === 'STANDARD')!.defaultPrice
    const seats: Seat[] = []
    for (let r = 1; r <= rows; r++)
        for (let s = 1; s <= seatsPerRow; s++)
            seats.push({ row: r, seat: s, category: 'STANDARD', price: defaultPrice })
    return seats
}

function getHallDimensions(hall: Hall) {
    const rows = hall.seats.reduce((max, s) => Math.max(max, s.row), 0)
    const seatsPerRow = hall.seats.reduce((max, s) => Math.max(max, s.seat), 0)
    return { rows, seatsPerRow }
}

// ─── HallSeatEditor ───────────────────────────────────────────────────────────

function HallSeatEditor({ hall, onChange }: { hall: Hall; onChange: (h: Hall) => void }) {
    const [selectedCategory, setSelectedCategory] = useState<SeatCategory>('STANDARD')
    const [isDragging, setIsDragging] = useState(false)
    const { rows, seatsPerRow } = getHallDimensions(hall)

    const usedCategories = Array.from(new Set(hall.seats.map(s => s.category)))

    const categoryPrice = (category: SeatCategory) => {
        const seat = hall.seats.find(s => s.category === category)
        return seat?.price ?? CATEGORY_META.find(m => m.category === category)?.defaultPrice ?? 0
    }

    const getSeat = (row: number, seat: number) =>
        hall.seats.find(s => s.row === row && s.seat === seat)

    const paintSeat = (row: number, seat: number) => {
        const price = categoryPrice(selectedCategory)
        const updated = hall.seats.map(s =>
            s.row === row && s.seat === seat ? { ...s, category: selectedCategory, price } : s
        )
        onChange({ ...hall, seats: updated })
    }

    const paintRow = (row: number) => {
        const price = categoryPrice(selectedCategory)
        const updated = hall.seats.map(s =>
            s.row === row ? { ...s, category: selectedCategory, price } : s
        )
        onChange({ ...hall, seats: updated })
    }

    const updateCategoryPrice = (category: SeatCategory, price: number) => {
        const updated = hall.seats.map(s =>
            s.category === category ? { ...s, price } : s
        )
        onChange({ ...hall, seats: updated })
    }

    return (
        <div className="space-y-6" onMouseLeave={() => setIsDragging(false)}>
            <div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Вибрати категорію для малювання</p>
                <div className="flex flex-wrap gap-2">
                    {CATEGORY_META.map(m => (
                        <button key={m.category} onClick={() => setSelectedCategory(m.category)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                style={{
                                    background: selectedCategory === m.category ? m.color : 'transparent',
                                    color: selectedCategory === m.category ? '#fff' : '#9ca3af',
                                    border: `1.5px solid ${m.color}`,
                                }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                            {m.label}
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
                            <button onClick={() => paintRow(row)}
                                    className="w-6 text-xs text-gray-500 hover:text-white transition-colors text-right flex-shrink-0"
                                    title="Заповнити весь ряд">{row}</button>
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
                                                title={`Ряд ${row}, місце ${seatNum} — ${CATEGORY_LABELS[cat]}, ${s?.price ?? 0}₴`}
                                        />
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
                                <input type="number" value={categoryPrice(cat)}
                                       onChange={e => updateCategoryPrice(cat, Number(e.target.value))}
                                       className="w-16 text-xs text-right bg-gray-700 rounded px-1.5 py-0.5 text-white border border-gray-600 focus:outline-none focus:border-red-500"
                                />
                                <span className="text-xs text-gray-500">₴</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─── HallForm ─────────────────────────────────────────────────────────────────

function HallForm({ hall, onSave, onCancel }: { hall: Hall; onSave: (h: Hall) => void; onCancel: () => void }) {
    const [local, setLocal] = useState<Hall>(hall)
    const initialDims = getHallDimensions(hall)
    const [rows, setRows] = useState(initialDims.rows || 8)
    const [seatsPerRow, setSeatsPerRow] = useState(initialDims.seatsPerRow || 14)

    const rebuild = (newRows: number, newSeatsPerRow: number) => {
        setRows(newRows)
        setSeatsPerRow(newSeatsPerRow)
        setLocal(prev => ({ ...prev, seats: generateSeats(newRows, newSeatsPerRow) }))
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Назва залу</label>
                    <input value={local.name} onChange={e => setLocal({ ...local, name: e.target.value })}
                           placeholder="IMAX зал 1"
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
                    <input type="number" min={1} max={30} value={rows}
                           onChange={e => rebuild(Number(e.target.value), seatsPerRow)}
                           className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Місць у ряді</label>
                    <input type="number" min={1} max={40} value={seatsPerRow}
                           onChange={e => rebuild(rows, Number(e.target.value))}
                           className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                </div>
            </div>

            <HallSeatEditor hall={local} onChange={setLocal} />

            <div className="flex gap-3 pt-2">
                <button onClick={() => onSave(local)} disabled={!local.name.trim()}
                        className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                    Зберегти зал
                </button>
                <button onClick={onCancel}
                        className="px-5 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
                    Скасувати
                </button>
            </div>
        </div>
    )
}

// ─── MovieSearch ──────────────────────────────────────────────────────────────

interface MovieResult {
    id: number
    title: string
    release_date?: string
    poster_path?: string | null
    runtime: number
}

function MovieSearch({ onSelect }: { onSelect: (m: MovieResult) => void }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<MovieResult[]>([])
    const [loading, setLoading] = useState(false)
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!query.trim()) { setResults([]); return }
        if (debounce.current) clearTimeout(debounce.current)
        debounce.current = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(
                    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=uk-UA&page=1`,
                    { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }
                ).then(r => r.json())
                setResults((res.results ?? []).slice(0, 6).map((m: any) => ({ ...m, runtime: 0 })))
            } finally {
                setLoading(false)
            }
        }, 350)
    }, [query])

    const pick = async (movie: MovieResult) => {
        const detail = await fetch(
            `https://api.themoviedb.org/3/movie/${movie.id}?language=uk-UA`,
            { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }
        ).then(r => r.json())
        onSelect({ ...movie, runtime: detail.runtime ?? 120 })
        setQuery('')
        setResults([])
    }

    return (
        <div style={{ position: 'relative' }}>
            <input value={query} onChange={e => setQuery(e.target.value)}
                   placeholder="Пошук фільму…"
                   className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors" />
            {loading && <p className="text-xs text-gray-500 mt-1 px-1">Пошук…</p>}
            {results.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#111827', border: '1px solid #374151', borderRadius: 10, marginTop: 4, overflow: 'hidden',
                }}>
                    {results.map(m => (
                        <button key={m.id} onClick={() => pick(m)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-800 transition-colors">
                            {m.poster_path
                                ? <img src={`https://image.tmdb.org/t/p/w45${m.poster_path}`} className="w-8 h-12 object-cover rounded flex-shrink-0" alt="" />
                                : <div className="w-8 h-12 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center text-gray-500 text-xs">🎬</div>
                            }
                            <div className="min-w-0">
                                <p className="text-sm text-white truncate">{m.title}</p>
                                <p className="text-xs text-gray-500">{m.release_date?.slice(0, 4) ?? '—'}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── SessionForm modal ────────────────────────────────────────────────────────

function SessionForm({ halls, sessions, editingSession, onSave, onDelete, onClose }: {
    halls: Hall[]
    sessions: Session[]
    editingSession: Session | null
    onSave: (s: Session & { durationMinutes: number }) => Promise<void>
    onDelete: (id: string) => Promise<void>
    onClose: () => void
}) {
    const today = new Date().toISOString().slice(0, 10)

    const [movie, setMovie] = useState<MovieResult | null>(
        editingSession
            ? { id: editingSession.movieId, title: editingSession.movieTitle, runtime: (editingSession as any).durationMinutes ?? 120 }
            : null
    )
    const [hallId, setHallId] = useState(editingSession?.hallId ?? halls[0]?.id ?? '')
    const [date, setDate]     = useState(editingSession?.date ?? today)
    const [time, setTime]     = useState(editingSession?.time ?? '10:00')
    const [format, setFormat] = useState(editingSession?.format ?? halls[0]?.format ?? '')
    const [saving, setSaving] = useState(false)
    const [conflicts, setConflicts] = useState<Conflict[]>([])

    useEffect(() => {
        const hall = halls.find(h => h.id === hallId)
        if (hall) setFormat(hall.format)
    }, [hallId])

    useEffect(() => {
        if (!movie || !hallId || !date || !time) { setConflicts([]); return }
        setConflicts(checkConflicts(sessions, hallId, date, timeToMins(time), movie.runtime, editingSession?.id))
    }, [movie, hallId, date, time, sessions])

    const hasOverlap = conflicts.some(c => c.type === 'overlap')

    const handleSave = async () => {
        if (!movie || !hallId || !date || !time || hasOverlap) return
        setSaving(true)
        await onSave({
            id: editingSession?.id ?? crypto.randomUUID(),
            movieId: movie.id,
            movieTitle: movie.title,
            hallId, date, time, format,
            durationMinutes: movie.runtime,
            bookedSeats: editingSession?.bookedSeats ?? [],
        })
        setSaving(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{editingSession ? 'Редагувати сеанс' : 'Новий сеанс'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
                </div>

                {/* Фільм */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Фільм</label>
                    {movie ? (
                        <div className="flex items-center gap-3 p-2 rounded-lg border border-gray-700 bg-gray-800">
                            <span className="text-sm text-white flex-1 truncate">{movie.title}</span>
                            <span className="text-xs text-gray-400">{movie.runtime} хв</span>
                            <button onClick={() => setMovie(null)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                        </div>
                    ) : (
                        <MovieSearch onSelect={setMovie} />
                    )}
                </div>

                {/* Зал */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Зал</label>
                    <select value={hallId} onChange={e => setHallId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500">
                        {halls.map(h => <option key={h.id} value={h.id}>{h.name} ({h.format})</option>)}
                    </select>
                </div>

                {/* Дата + Час */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Дата</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                               className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Час початку</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)}
                               className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                    </div>
                </div>

                {/* Превью часу закінчення */}
                {movie && time && (
                    <p className="text-xs text-gray-500">
                        Закінчення: <span className="text-gray-300">{minsToTime(timeToMins(time) + movie.runtime)}</span>
                        {' '}· {movie.runtime} хв
                    </p>
                )}

                {/* Конфлікти */}
                {conflicts.length > 0 && (
                    <div className="space-y-2">
                        {conflicts.map((c, i) => (
                            <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                                 style={{
                                     background: c.type === 'overlap' ? 'rgba(220,38,38,0.15)' : 'rgba(234,179,8,0.12)',
                                     border: `1px solid ${c.type === 'overlap' ? 'rgba(220,38,38,0.4)' : 'rgba(234,179,8,0.3)'}`,
                                     color: c.type === 'overlap' ? '#fca5a5' : '#fde047',
                                 }}>
                                <span>{c.type === 'overlap' ? '🚫' : '⚠️'}</span>
                                <span>{c.message}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-3 pt-1">
                    <button onClick={handleSave}
                            disabled={!movie || !hallId || !date || !time || hasOverlap || saving}
                            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                        {saving ? 'Збереження…' : 'Зберегти'}
                    </button>
                    {editingSession && (
                        <button onClick={async () => { await onDelete(editingSession.id); onClose() }}
                                className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm transition-colors">
                            Видалити
                        </button>
                    )}
                    <button onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
                        Скасувати
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

const HOUR_W = 56
const TIMELINE_COLORS = ['#dc2626','#2563eb','#7c3aed','#0891b2','#b45309','#16a34a','#db2777','#ea580c']

function Timeline({ sessions, halls, date, onEdit }: {
    sessions: Session[]
    halls: Hall[]
    date: string
    onEdit: (s: Session) => void
}) {
    const daySessions = sessions.filter(s => s.date === date)
    const hours = Array.from({ length: 24 }, (_, i) => i)

    const movieColor: Record<number, string> = {}
    let ci = 0
    for (const s of daySessions) {
        if (!(s.movieId in movieColor)) movieColor[s.movieId] = TIMELINE_COLORS[ci++ % TIMELINE_COLORS.length]
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
            <div style={{ minWidth: 24 * HOUR_W + 128 }}>
                {/* Ruler */}
                <div className="flex" style={{ marginLeft: 128 }}>
                    {hours.map(h => (
                        <div key={h} style={{ width: HOUR_W, flexShrink: 0 }}
                             className="text-xs text-gray-600 border-l border-gray-800 px-1 py-1.5">
                            {String(h).padStart(2, '0')}:00
                        </div>
                    ))}
                </div>

                {/* Hall rows */}
                {halls.map(hall => {
                    const hallSessions = daySessions.filter(s => s.hallId === hall.id)
                    return (
                        <div key={hall.id} className="flex items-center border-t border-gray-800" style={{ height: 46 }}>
                            <div className="text-xs text-gray-400 px-3 flex-shrink-0 truncate" style={{ width: 128 }}>
                                {hall.name}
                            </div>
                            <div className="relative flex-1" style={{ height: '100%' }}>
                                {hours.map(h => (
                                    <div key={h} style={{
                                        position: 'absolute', left: h * HOUR_W, top: 0, bottom: 0,
                                        width: 1, background: '#1f2937',
                                    }} />
                                ))}
                                {hallSessions.map(s => {
                                    const start = timeToMins(s.time)
                                    const dur = (s as any).durationMinutes ?? 90
                                    const left = (start / 60) * HOUR_W
                                    const width = Math.max((dur / 60) * HOUR_W, 6)
                                    const color = movieColor[s.movieId] ?? '#dc2626'
                                    return (
                                        <button key={s.id} onClick={() => onEdit(s)}
                                                title={`${s.movieTitle} · ${s.time}–${minsToTime(start + dur)}`}
                                                style={{
                                                    position: 'absolute', left, width, top: 4, bottom: 4,
                                                    background: color + '2e', border: `1px solid ${color}99`,
                                                    borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = color + '55')}
                                                onMouseLeave={e => (e.currentTarget.style.background = color + '2e')}
                                        >
                                            <span style={{
                                                display: 'block', fontSize: 9, padding: '2px 4px',
                                                color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {s.time} {s.movieTitle}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}

                {halls.length === 0 && (
                    <div className="py-8 text-center text-xs text-gray-600 border-t border-gray-800">
                        Спочатку додай зали
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── SessionList ──────────────────────────────────────────────────────────────

function SessionList({ sessions, halls, date, onEdit }: {
    sessions: Session[]
    halls: Hall[]
    date: string
    onEdit: (s: Session) => void
}) {
    const hallMap = Object.fromEntries(halls.map(h => [h.id, h.name]))
    const daySessions = sessions.filter(s => s.date === date).sort((a, b) => a.time.localeCompare(b.time))

    if (daySessions.length === 0)
        return (
            <div className="p-8 rounded-xl border border-dashed border-gray-700 text-center">
                <p className="text-gray-500 text-sm">Немає сеансів на цю дату</p>
            </div>
        )

    return (
        <div className="space-y-2">
            {daySessions.map(s => (
                <div key={s.id} onClick={() => onEdit(s)}
                     className="flex items-center gap-4 p-3 rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 cursor-pointer transition-colors">
                    <div className="text-red-400 font-bold text-sm w-12 flex-shrink-0">{s.time}</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{s.movieTitle}</p>
                        <p className="text-xs text-gray-500">{hallMap[s.hallId] ?? '—'} · {s.format}</p>
                    </div>
                    {(s as any).durationMinutes && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                            до {minsToTime(timeToMins(s.time) + (s as any).durationMinutes)}
                        </span>
                    )}
                    <span className="text-gray-600 text-xs">→</span>
                </div>
            ))}
        </div>
    )
}

// ─── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab({ cinema, onUpdate }: { cinema: Cinema; onUpdate: (c: Cinema) => Promise<void> }) {
    const sessions: Session[] = cinema.sessions ?? []
    const [showForm, setShowForm]           = useState(false)
    const [editingSession, setEditingSession] = useState<Session | null>(null)
    const [viewDate, setViewDate]           = useState(new Date().toISOString().slice(0, 10))
    const [viewMode, setViewMode]           = useState<'timeline' | 'list'>('timeline')

    const saveSession = async (session: Session & { durationMinutes: number }) => {
        const exists = sessions.some(s => s.id === session.id)
        const updated = exists ? sessions.map(s => s.id === session.id ? session : s) : [...sessions, session]
        await onUpdate({ ...cinema, sessions: updated })
    }

    const deleteSession = async (id: string) => {
        await onUpdate({ ...cinema, sessions: sessions.filter(s => s.id !== id) })
    }

    const openEdit = (s: Session) => { setEditingSession(s); setShowForm(true) }
    const openNew  = () => { setEditingSession(null); setShowForm(true) }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)}
                       className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />

                <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
                    {(['timeline', 'list'] as const).map(mode => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                                className="px-3 py-2 transition-colors"
                                style={{
                                    background: viewMode === mode ? '#dc2626' : 'transparent',
                                    color: viewMode === mode ? '#fff' : '#9ca3af',
                                }}>
                            {mode === 'timeline' ? '▤ Таймлайн' : '☰ Список'}
                        </button>
                    ))}
                </div>

                <button onClick={openNew}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold transition-colors">
                    + Новий сеанс
                </button>
            </div>

            <p className="text-xs text-gray-500">
                Сеансів на {viewDate}:{' '}
                <span className="text-white">{sessions.filter(s => s.date === viewDate).length}</span>
            </p>

            {viewMode === 'timeline'
                ? <Timeline sessions={sessions} halls={cinema.halls} date={viewDate} onEdit={openEdit} />
                : <SessionList sessions={sessions} halls={cinema.halls} date={viewDate} onEdit={openEdit} />
            }

            {showForm && (
                <SessionForm
                    halls={cinema.halls}
                    sessions={sessions}
                    editingSession={editingSession}
                    onSave={saveSession}
                    onDelete={deleteSession}
                    onClose={() => setShowForm(false)}
                />
            )}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CinemaAdmin() {
    const [cinemas, setCinemas]           = useState<Cinema[]>([])
    const [loading, setLoading]           = useState(true)
    const [error, setError]               = useState<string | null>(null)
    const [selectedId, setSelectedId]     = useState<string | null>(null)
    const [editingHall, setEditingHall]   = useState<Hall | null>(null)
    const [showCinemaForm, setShowCinemaForm] = useState(false)
    const [tab, setTab]                   = useState<'halls' | 'sessions'>('halls')

    const [newName, setNewName]       = useState('')
    const [newCity, setNewCity]       = useState(CITIES[0])
    const [newAddress, setNewAddress] = useState('')

    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'cinemas'),
            snapshot => {
                setCinemas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Cinema)))
                setLoading(false)
                setError(null)
            },
            err => { setError(err.message); setLoading(false) }
        )
        return () => unsub()
    }, [])

    const selected = cinemas.find(c => c.id === selectedId) ?? null

    const createCinema = async () => {
        if (!newName.trim()) return
        const cinema: Cinema = {
            id: crypto.randomUUID(),
            name: newName.trim(),
            city: newCity,
            address: newAddress.trim(),
            halls: [],
            sessions: [],
        }
        try {
            await setDoc(doc(db, 'cinemas', cinema.id), cinema)
            setSelectedId(cinema.id)
            setNewName(''); setNewAddress('')
            setShowCinemaForm(false)
        } catch (err) {
            console.error(err)
            alert('Не вдалося створити кінотеатр. Дивись консоль і Firestore Rules.')
        }
    }

    const updateCinema = async (updated: Cinema) => {
        await setDoc(doc(db, 'cinemas', updated.id), updated)
    }

    const deleteCinema = async (id: string) => {
        await deleteDoc(doc(db, 'cinemas', id))
        if (selectedId === id) setSelectedId(null)
    }

    const saveHall = async (hall: Hall) => {
        if (!selected) return
        const exists = selected.halls.some(h => h.id === hall.id)
        const halls = exists ? selected.halls.map(h => h.id === hall.id ? hall : h) : [...selected.halls, hall]
        await updateCinema({ ...selected, halls })
        setEditingHall(null)
    }

    const deleteHall = async (hallId: string) => {
        if (!selected) return
        await updateCinema({ ...selected, halls: selected.halls.filter(h => h.id !== hallId) })
    }

    const newHall = (): Hall => ({
        id: crypto.randomUUID(),
        name: '',
        format: FORMATS[0],
        seats: generateSeats(8, 14),
    })

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-xs text-red-500 uppercase tracking-widest mb-1">Адмін панель</p>
                        <h1 className="text-2xl font-bold tracking-tight">Кінотеатри та зали</h1>
                    </div>
                    <button onClick={() => setShowCinemaForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold transition-colors">
                        + Новий кінотеатр
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-500 text-sm">Завантаження...</p>
                ) : error ? (
                    <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm">
                        Помилка з'єднання з Firestore: {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Cinema list */}
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
                                     style={{
                                         background: selectedId === cinema.id ? 'rgba(239,68,68,0.08)' : 'rgb(17,24,39)',
                                         borderColor: selectedId === cinema.id ? 'rgba(239,68,68,0.4)' : 'rgb(55,65,81)',
                                     }}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{cinema.name}</p>
                                            <p className="text-xs text-red-400 mt-0.5">{cinema.city}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{cinema.address}</p>
                                            <p className="text-xs text-gray-600 mt-1">{cinema.halls.length} {cinema.halls.length === 1 ? 'зал' : 'залів'}</p>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); deleteCinema(cinema.id) }}
                                                className="text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0 mt-0.5">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right panel */}
                        <div className="lg:col-span-2">
                            {!selected ? (
                                <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-gray-700">
                                    <p className="text-gray-500 text-sm">Вибери кінотеатр зліва</p>
                                </div>
                            ) : editingHall && tab === 'halls' ? (
                                <div className="p-6 rounded-xl border border-gray-800 bg-gray-900">
                                    <div className="flex items-center gap-3 mb-6">
                                        <button onClick={() => setEditingHall(null)} className="text-gray-500 hover:text-white transition-colors text-sm">← Назад</button>
                                        <h2 className="font-semibold">{editingHall.name || 'Новий зал'}</h2>
                                    </div>
                                    <HallForm hall={editingHall} onSave={saveHall} onCancel={() => setEditingHall(null)} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Cinema info */}
                                    <div className="p-5 rounded-xl border border-gray-800 bg-gray-900">
                                        <div className="flex items-center justify-between mb-1">
                                            <div>
                                                <h2 className="text-lg font-bold">{selected.name}</h2>
                                                <p className="text-sm text-gray-400">{selected.city} · {selected.address}</p>
                                            </div>
                                            <button
                                                onClick={() => { const name = prompt('Нова назва:', selected.name); if (name) updateCinema({ ...selected, name }) }}
                                                className="text-xs text-gray-500 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                                                Редагувати
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex rounded-xl border border-gray-800 overflow-hidden text-sm">
                                        {(['halls', 'sessions'] as const).map(t => (
                                            <button key={t} onClick={() => { setTab(t); setEditingHall(null) }}
                                                    className="flex-1 py-2.5 font-medium transition-colors"
                                                    style={{
                                                        background: tab === t ? 'rgba(239,68,68,0.12)' : 'transparent',
                                                        color: tab === t ? '#ef4444' : '#6b7280',
                                                        borderBottom: tab === t ? '2px solid #ef4444' : '2px solid transparent',
                                                    }}>
                                                {t === 'halls' ? `Зали (${selected.halls.length})` : `Сеанси (${(selected.sessions ?? []).length})`}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab content */}
                                    {tab === 'halls' ? (
                                        <div className="space-y-4">
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
                                                                                const s = hall.seats.find(s => s.row === row && s.seat === seatNum)
                                                                                return (
                                                                                    <div key={seatNum} className="flex-1 min-w-0"
                                                                                         style={{ background: CATEGORY_COLORS[s?.category ?? 'STANDARD'], opacity: 0.7 }} />
                                                                                )
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
                                                                    return (
                                                                        <span key={cat} className="text-xs px-2 py-0.5 rounded-full"
                                                                              style={{ background: meta.color + '22', color: meta.color, border: `1px solid ${meta.color}44` }}>
                                                                            {meta.label} {price}₴
                                                                        </span>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <SessionsTab cinema={selected} onUpdate={updateCinema} />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
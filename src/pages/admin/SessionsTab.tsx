// src/pages/admin/SessionsTab.tsx
import { useState, useEffect, useRef } from 'react'
import type { Hall, Cinema, Session } from '../../models/cinema'

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'
const MIN_GAP_MINUTES = 5
const HOUR_W = 56
const TIMELINE_COLORS = ['#dc2626','#2563eb','#7c3aed','#0891b2','#b45309','#16a34a','#db2777','#ea580c']

function timeToMins(time: string) { const [h, m] = time.split(':').map(Number); return h * 60 + m }
function minsToTime(mins: number) { const h = Math.floor(mins / 60) % 24; const m = mins % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` }

interface Conflict { type: 'overlap' | 'gap'; message: string }
interface MovieResult { id: number; title: string; release_date?: string; poster_path?: string | null; runtime: number }

function checkConflicts(sessions: Session[], hallId: string, date: string, startMins: number, durationMins: number, excludeId?: string): Conflict[] {
    const endMins = startMins + durationMins
    const same = sessions.filter(s => s.hallId === hallId && s.date === date && s.id !== excludeId)
    const conflicts: Conflict[] = []
    for (const s of same) {
        const sStart = timeToMins(s.time)
        const sEnd = sStart + ((s as any).durationMinutes ?? 0)
        if (startMins < sEnd && endMins > sStart) { conflicts.push({ type: 'overlap', message: `Перетинається з "${s.movieTitle}" (${s.time}–${minsToTime(sEnd)})` }); continue }
        const gapBefore = sStart - endMins; const gapAfter = startMins - sEnd
        if (gapBefore >= 0 && gapBefore < MIN_GAP_MINUTES) conflicts.push({ type: 'gap', message: `До "${s.movieTitle}" (${s.time}) лише ${gapBefore} хв — мінімум ${MIN_GAP_MINUTES}` })
        if (gapAfter  >= 0 && gapAfter  < MIN_GAP_MINUTES) conflicts.push({ type: 'gap', message: `Після "${s.movieTitle}" (${minsToTime(sEnd)}) лише ${gapAfter} хв — мінімум ${MIN_GAP_MINUTES}` })
    }
    return conflicts
}

// ─── MovieSearch ──────────────────────────────────────────────────────────────

function MovieSearch({ onSelect }: { onSelect: (m: MovieResult) => void }) {
    const [query, setQuery] = useState(''); const [results, setResults] = useState<MovieResult[]>([]); const [loading, setLoading] = useState(false)
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
        if (!query.trim()) { setResults([]); return }
        if (debounce.current) clearTimeout(debounce.current)
        debounce.current = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=uk-UA&page=1`, { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }).then(r => r.json())
                setResults((res.results ?? []).slice(0, 6).map((m: any) => ({ ...m, runtime: 0 })))
            } finally { setLoading(false) }
        }, 350)
    }, [query])
    const pick = async (movie: MovieResult) => {
        const detail = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?language=uk-UA`, { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }).then(r => r.json())
        onSelect({ ...movie, runtime: detail.runtime ?? 120 }); setQuery(''); setResults([])
    }
    return (
        <div style={{ position: 'relative' }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Пошук фільму…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors" />
            {loading && <p className="text-xs text-gray-500 mt-1 px-1">Пошук…</p>}
            {results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#111827', border: '1px solid #374151', borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                    {results.map(m => (
                        <button key={m.id} onClick={() => pick(m)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-800 transition-colors">
                            {m.poster_path ? <img src={`https://image.tmdb.org/t/p/w45${m.poster_path}`} className="w-8 h-12 object-cover rounded flex-shrink-0" alt="" /> : <div className="w-8 h-12 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center text-gray-500 text-xs">🎬</div>}
                            <div className="min-w-0"><p className="text-sm text-white truncate">{m.title}</p><p className="text-xs text-gray-500">{m.release_date?.slice(0, 4) ?? '—'}</p></div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── SessionForm ──────────────────────────────────────────────────────────────

function SessionForm({ halls, sessions, editingSession, onSave, onDelete, onClose }: {
    halls: Hall[]; sessions: Session[]; editingSession: Session | null
    onSave: (s: Session & { durationMinutes: number }) => Promise<void>
    onDelete: (id: string) => Promise<void>; onClose: () => void
}) {
    const today = new Date().toISOString().slice(0, 10)
    const [movie, setMovie] = useState<MovieResult | null>(editingSession ? { id: editingSession.movieId, title: editingSession.movieTitle, runtime: (editingSession as any).durationMinutes ?? 120 } : null)
    const [hallId, setHallId] = useState(editingSession?.hallId ?? halls[0]?.id ?? '')
    const [date, setDate]     = useState(editingSession?.date ?? today)
    const [time, setTime]     = useState(editingSession?.time ?? '10:00')
    const [format, setFormat] = useState(editingSession?.format ?? halls[0]?.format ?? '')
    const [saving, setSaving] = useState(false)
    const [conflicts, setConflicts] = useState<Conflict[]>([])

    useEffect(() => { const hall = halls.find(h => h.id === hallId); if (hall) setFormat(hall.format) }, [hallId])
    useEffect(() => {
        if (!movie || !hallId || !date || !time) { setConflicts([]); return }
        setConflicts(checkConflicts(sessions, hallId, date, timeToMins(time), movie.runtime, editingSession?.id))
    }, [movie, hallId, date, time, sessions])

    const hasOverlap = conflicts.some(c => c.type === 'overlap')
    const handleSave = async () => {
        if (!movie || !hallId || !date || !time || hasOverlap) return
        setSaving(true)
        await onSave({ id: editingSession?.id ?? crypto.randomUUID(), movieId: movie.id, movieTitle: movie.title, hallId, date, time, format, durationMinutes: movie.runtime, bookedSeats: editingSession?.bookedSeats ?? [] })
        setSaving(false); onClose()
    }

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{editingSession ? 'Редагувати сеанс' : 'Новий сеанс'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Фільм</label>
                    {movie ? (
                        <div className="flex items-center gap-3 p-2 rounded-lg border border-gray-700 bg-gray-800">
                            <span className="text-sm text-white flex-1 truncate">{movie.title}</span>
                            <span className="text-xs text-gray-400">{movie.runtime} хв</span>
                            <button onClick={() => setMovie(null)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                        </div>
                    ) : <MovieSearch onSelect={setMovie} />}
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Зал</label>
                    <select value={hallId} onChange={e => setHallId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500">
                        {halls.map(h => <option key={h.id} value={h.id}>{h.name} ({h.format})</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Дата</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">Час початку</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                    </div>
                </div>
                {movie && time && <p className="text-xs text-gray-500">Закінчення: <span className="text-gray-300">{minsToTime(timeToMins(time) + movie.runtime)}</span> · {movie.runtime} хв</p>}
                {conflicts.length > 0 && (
                    <div className="space-y-2">
                        {conflicts.map((c, i) => (
                            <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                                 style={{ background: c.type === 'overlap' ? 'rgba(220,38,38,0.15)' : 'rgba(234,179,8,0.12)', border: `1px solid ${c.type === 'overlap' ? 'rgba(220,38,38,0.4)' : 'rgba(234,179,8,0.3)'}`, color: c.type === 'overlap' ? '#fca5a5' : '#fde047' }}>
                                <span>{c.type === 'overlap' ? '🚫' : '⚠️'}</span><span>{c.message}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex gap-3 pt-1">
                    <button onClick={handleSave} disabled={!movie || !hallId || !date || !time || hasOverlap || saving}
                            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                        {saving ? 'Збереження…' : 'Зберегти'}
                    </button>
                    {editingSession && (
                        <button onClick={async () => { await onDelete(editingSession.id); onClose() }}
                                className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm transition-colors">Видалити</button>
                    )}
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Скасувати</button>
                </div>
            </div>
        </div>
    )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ sessions, halls, date, onEdit }: { sessions: Session[]; halls: Hall[]; date: string; onEdit: (s: Session) => void }) {
    const daySessions = sessions.filter(s => s.date === date)
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const movieColor: Record<number, string> = {}; let ci = 0
    for (const s of daySessions) if (!(s.movieId in movieColor)) movieColor[s.movieId] = TIMELINE_COLORS[ci++ % TIMELINE_COLORS.length]

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
            <div style={{ minWidth: 24 * HOUR_W + 128 }}>
                <div className="flex" style={{ marginLeft: 128 }}>
                    {hours.map(h => <div key={h} style={{ width: HOUR_W, flexShrink: 0 }} className="text-xs text-gray-600 border-l border-gray-800 px-1 py-1.5">{String(h).padStart(2,'0')}:00</div>)}
                </div>
                {halls.map(hall => {
                    const hallSessions = daySessions.filter(s => s.hallId === hall.id)
                    return (
                        <div key={hall.id} className="flex items-center border-t border-gray-800" style={{ height: 46 }}>
                            <div className="text-xs text-gray-400 px-3 flex-shrink-0 truncate" style={{ width: 128 }}>{hall.name}</div>
                            <div className="relative flex-1" style={{ height: '100%' }}>
                                {hours.map(h => <div key={h} style={{ position: 'absolute', left: h * HOUR_W, top: 0, bottom: 0, width: 1, background: '#1f2937' }} />)}
                                {hallSessions.map(s => {
                                    const start = timeToMins(s.time); const dur = (s as any).durationMinutes ?? 90
                                    const left = (start / 60) * HOUR_W; const width = Math.max((dur / 60) * HOUR_W, 6)
                                    const color = movieColor[s.movieId] ?? '#dc2626'
                                    return (
                                        <button key={s.id} onClick={() => onEdit(s)} title={`${s.movieTitle} · ${s.time}–${minsToTime(start + dur)}`}
                                                style={{ position: 'absolute', left, width, top: 4, bottom: 4, background: color + '2e', border: `1px solid ${color}99`, borderRadius: 6, overflow: 'hidden', cursor: 'pointer' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = color + '55')}
                                                onMouseLeave={e => (e.currentTarget.style.background = color + '2e')}>
                                            <span style={{ display: 'block', fontSize: 9, padding: '2px 4px', color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.time} {s.movieTitle}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
                {halls.length === 0 && <div className="py-8 text-center text-xs text-gray-600 border-t border-gray-800">Спочатку додай зали</div>}
            </div>
        </div>
    )
}

// ─── SessionList ──────────────────────────────────────────────────────────────

function SessionList({ sessions, halls, date, onEdit }: { sessions: Session[]; halls: Hall[]; date: string; onEdit: (s: Session) => void }) {
    const hallMap = Object.fromEntries(halls.map(h => [h.id, h.name]))
    const daySessions = sessions.filter(s => s.date === date).sort((a, b) => a.time.localeCompare(b.time))
    if (daySessions.length === 0) return <div className="p-8 rounded-xl border border-dashed border-gray-700 text-center"><p className="text-gray-500 text-sm">Немає сеансів на цю дату</p></div>
    return (
        <div className="space-y-2">
            {daySessions.map(s => (
                <div key={s.id} onClick={() => onEdit(s)} className="flex items-center gap-4 p-3 rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 cursor-pointer transition-colors">
                    <div className="text-red-400 font-bold text-sm w-12 flex-shrink-0">{s.time}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{s.movieTitle}</p><p className="text-xs text-gray-500">{hallMap[s.hallId] ?? '—'} · {s.format}</p></div>
                    {(s as any).durationMinutes && <span className="text-xs text-gray-500 flex-shrink-0">до {minsToTime(timeToMins(s.time) + (s as any).durationMinutes)}</span>}
                    <span className="text-gray-600 text-xs">→</span>
                </div>
            ))}
        </div>
    )
}

// ─── SessionsTab (export) ─────────────────────────────────────────────────────

export function SessionsTab({ cinema, onUpdate }: { cinema: Cinema; onUpdate: (c: Cinema) => Promise<void> }) {
    const sessions: Session[] = cinema.sessions ?? []
    const [showForm, setShowForm]             = useState(false)
    const [editingSession, setEditingSession] = useState<Session | null>(null)
    const [viewDate, setViewDate]             = useState(new Date().toISOString().slice(0, 10))
    const [viewMode, setViewMode]             = useState<'timeline' | 'list'>('timeline')

    const saveSession = async (session: Session & { durationMinutes: number }) => {
        const exists = sessions.some(s => s.id === session.id)
        const updated = exists ? sessions.map(s => s.id === session.id ? session : s) : [...sessions, session]
        await onUpdate({ ...cinema, sessions: updated })
    }
    const deleteSession = async (id: string) => { await onUpdate({ ...cinema, sessions: sessions.filter(s => s.id !== id) }) }
    const openEdit = (s: Session) => { setEditingSession(s); setShowForm(true) }
    const openNew  = () => { setEditingSession(null); setShowForm(true) }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
                    {(['timeline', 'list'] as const).map(mode => (
                        <button key={mode} onClick={() => setViewMode(mode)} className="px-3 py-2 transition-colors"
                                style={{ background: viewMode === mode ? '#dc2626' : 'transparent', color: viewMode === mode ? '#fff' : '#9ca3af' }}>
                            {mode === 'timeline' ? '▤ Таймлайн' : '☰ Список'}
                        </button>
                    ))}
                </div>
                <button onClick={openNew} className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold transition-colors">+ Новий сеанс</button>
            </div>
            <p className="text-xs text-gray-500">Сеансів на {viewDate}: <span className="text-white">{sessions.filter(s => s.date === viewDate).length}</span></p>
            {viewMode === 'timeline'
                ? <Timeline sessions={sessions} halls={cinema.halls} date={viewDate} onEdit={openEdit} />
                : <SessionList sessions={sessions} halls={cinema.halls} date={viewDate} onEdit={openEdit} />
            }
            {showForm && <SessionForm halls={cinema.halls} sessions={sessions} editingSession={editingSession} onSave={saveSession} onDelete={deleteSession} onClose={() => setShowForm(false)} />}
        </div>
    )
}
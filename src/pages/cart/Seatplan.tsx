// src/pages/cart/SeatPlan.tsx
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import type { Cinema, Session, Hall, Seat, SeatCategory } from '../../models/cinema.ts'
import CartPageLayout from '../../layouts/CartPageLayout.tsx'

const CATEGORY_META: { category: SeatCategory; label: string; color: string }[] = [
    { category: 'STANDARD',  label: 'Стандарт',  color: '#4b5563' },
    { category: 'LUX',       label: 'Люкс',       color: '#2563eb' },
    { category: 'SUPER_LUX', label: 'Супер Люкс', color: '#7c3aed' },
    { category: 'CHILL_OUT', label: 'Chill Out',  color: '#0891b2' },
    { category: 'VIP',       label: 'VIP',        color: '#b45309' },
]

const CAT_COLORS = Object.fromEntries(
    CATEGORY_META.map(m => [m.category, m.color])
) as Record<SeatCategory, string>

const CAT_LABELS = Object.fromEntries(
    CATEGORY_META.map(m => [m.category, m.label])
) as Record<SeatCategory, string>

const ROW_LABELS = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'.split('')

interface SelectedSeat {
    row:      number
    seat:     number
    category: SeatCategory
    price:    number
    label:    string
}

function minsToTime(mins: number) {
    return `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

function sessionEndTime(time: string, duration: number) {
    const [h, m] = time.split(':').map(Number)
    return minsToTime(h * 60 + m + duration)
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ background: color }} />
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</span>
        </div>
    )
}

function SeatBtn({ seat, isBooked, isSelected, onMouseDown, onMouseEnter }: {
    seat:         Seat
    isBooked:     boolean
    isSelected:   boolean
    onMouseDown:  () => void
    onMouseEnter: () => void
}) {
    const color = CAT_COLORS[seat.category]
    let bg      = color + '55'
    let border  = color + '66'
    let opacity = 1

    if (isBooked)        { bg = 'var(--surface-3)'; border = 'var(--border-strong)'; opacity = 0.4 }
    else if (isSelected) { bg = 'var(--accent)'; border = 'var(--accent)' }

    return (
        <button
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
            disabled={isBooked}
            title={isBooked ? 'Зайнято' : `${CAT_LABELS[seat.category]} · ${seat.price}₴`}
            className="w-6 h-6 rounded-sm flex-shrink-0 transition-all duration-100
                       hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: bg, border: `1.5px solid ${border}`, opacity }}
        />
    )
}

export default function SeatPlan() {
    const { orderId } = useParams<{ orderId: string }>()
    const navigate    = useNavigate()
    const [cinemaId, sessionId] = (orderId ?? '').split('_')

    const [cinema,  setCinema]  = useState<Cinema | null>(null)
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState<string | null>(null)
    const [selected,   setSelected]   = useState<SelectedSeat[]>([])
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        if (!cinemaId) { setError('Невірне посилання'); setLoading(false); return }
        getDoc(doc(db, 'cinemas', cinemaId))
            .then(snap => {
                if (!snap.exists()) { setError('Кінотеатр не знайдено'); return }
                setCinema({ id: snap.id, ...snap.data() } as Cinema)
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [cinemaId])

    const session = useMemo<(Session & { durationMinutes?: number }) | null>(() =>
            cinema ? (cinema.sessions ?? []).find(s => s.id === sessionId) ?? null : null
        , [cinema, sessionId])

    const hall = useMemo<Hall | null>(() =>
            cinema && session ? cinema.halls.find(h => h.id === session.hallId) ?? null : null
        , [cinema, session])

    const { rows, cols } = useMemo(() => !hall ? { rows: 0, cols: 0 } : {
        rows: hall.seats.reduce((m, s) => Math.max(m, s.row),  0),
        cols: hall.seats.reduce((m, s) => Math.max(m, s.seat), 0),
    }, [hall])

    const bookedSet  = useMemo(() =>
            new Set((session?.bookedSeats ?? []).map(b => `${b.row}_${b.seat}`))
        , [session])

    const selectedSet = useMemo(() =>
            new Set(selected.map(s => `${s.row}_${s.seat}`))
        , [selected])

    const total          = selected.reduce((s, seat) => s + seat.price, 0)
    const usedCategories = hall ? Array.from(new Set(hall.seats.map(s => s.category))) : []

    function toggleSeat(row: number, seatNum: number) {
        if (!hall) return
        const key = `${row}_${seatNum}`
        if (bookedSet.has(key)) return
        const seatData = hall.seats.find(s => s.row === row && s.seat === seatNum)
        if (!seatData) return
        const label = `${ROW_LABELS[row - 1] ?? row}${seatNum}`
        setSelected(prev =>
            prev.find(s => s.row === row && s.seat === seatNum)
                ? prev.filter(s => !(s.row === row && s.seat === seatNum))
                : [...prev, { row, seat: seatNum, category: seatData.category, price: seatData.price, label }]
        )
    }

    function paintDrag(row: number, seatNum: number) {
        if (!isDragging || !hall) return
        const key = `${row}_${seatNum}`
        if (bookedSet.has(key) || selectedSet.has(key)) return
        const seatData = hall.seats.find(s => s.row === row && s.seat === seatNum)
        if (!seatData) return
        const label = `${ROW_LABELS[row - 1] ?? row}${seatNum}`
        setSelected(prev => [...prev, { row, seat: seatNum, category: seatData.category, price: seatData.price, label }])
    }

    function handleContinue() {
        if (!selected.length || !cinema || !session || !hall) return
        const endTime = session.durationMinutes
            ? sessionEndTime(session.time, session.durationMinutes)
            : null
        sessionStorage.setItem('cart_seats', JSON.stringify({ cinemaId, sessionId, seats: selected }))
        sessionStorage.setItem('cart_session_meta', JSON.stringify({
            movieTitle: session.movieTitle,
            cinemaName: cinema.name,
            hallName:   hall.name,
            date:       session.date,
            time:       session.time,
            endTime,
            format:     session.format,
        }))
        navigate(`/cart/${orderId}/concession`)
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center text-sm animate-pulse"
             style={{ color: 'var(--fg-muted)' }}>
            Завантаження залу…
        </div>
    )

    if (error || !cinema || !session || !hall) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4"
             style={{ color: 'var(--fg-muted)' }}>
            <span className="text-4xl">⚠️</span>
            <p className="text-sm">{error ?? 'Сеанс або зал не знайдено'}</p>
            <Link to="/cinemas" className="text-sm transition-colors"
                  style={{ color: 'var(--accent)' }}>
                ← До кінотеатрів
            </Link>
        </div>
    )

    const endTime = session.durationMinutes
        ? sessionEndTime(session.time, session.durationMinutes)
        : null

    // ── Sidebar ───────────────────────────────────────────────────────────────
    const sidebarContent = selected.length === 0 ? (
        <div className="py-6 text-center text-xs" style={{ color: 'var(--fg-subtle)' }}>
            <span className="block text-2xl mb-2">🎭</span>
            Натисніть на місце щоб обрати
        </div>
    ) : (
        <div className="space-y-1.5">
            {[...selected]
                .sort((a, b) => a.row - b.row || a.seat - b.seat)
                .map(s => (
                    <div key={`${s.row}_${s.seat}`}
                         className="flex items-center justify-between text-sm py-1 border-b"
                         style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: CAT_COLORS[s.category] }} />
                            <span className="font-mono font-semibold" style={{ color: 'var(--fg)' }}>
                                {s.label}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {CAT_LABELS[s.category]}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{s.price}₴</span>
                            <button
                                onClick={() => setSelected(prev =>
                                    prev.filter(p => !(p.row === s.row && p.seat === s.seat))
                                )}
                                className="text-xs transition-colors"
                                style={{ color: 'var(--fg-subtle)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-subtle)'}
                            >✕</button>
                        </div>
                    </div>
                ))}
        </div>
    )

    const sessionInfo = {
        movieTitle: session.movieTitle,
        cinemaName: cinema.name,
        hallName:   hall.name,
        date:       session.date,
        time:       session.time,
        endTime,
        format:     session.format,
        backHref:   `/cinema/${cinemaId}`,
    }

    return (
        <CartPageLayout
            session={sessionInfo}
            sidebar={{
                content:     sidebarContent,
                total,
                ctaLabel:    selected.length === 0 ? 'Оберіть місця' : `Далі → ${total}₴`,
                onCta:       handleContinue,
                ctaDisabled: selected.length === 0,
                note:        'Місця утримуються 10 хвилин',
            }}
            mobileBar={selected.length > 0 ? (
                <div className="fixed bottom-0 inset-x-0 lg:hidden backdrop-blur
                                border-t px-4 py-3 flex items-center gap-3 z-30"
                     style={{
                         background: 'color-mix(in srgb, var(--surface) 95%, transparent)',
                         borderColor: 'var(--border)',
                     }}>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                            {selected.length} місць · {selected.map(s => s.label).join(', ')}
                        </p>
                        <p className="text-base font-bold" style={{ color: 'var(--fg)' }}>{total}₴</p>
                    </div>
                    <button
                        onClick={handleContinue}
                        className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                        style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                        Далі →
                    </button>
                </div>
            ) : undefined}
        >
            <div
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
            >
                {/* Экран */}
                <div className="mb-6 text-center">
                    <div className="h-1.5 rounded-full mx-auto max-w-xs"
                         style={{ background: 'linear-gradient(90deg, transparent, var(--accent) 30%, var(--accent) 70%, transparent)' }} />
                    <p className="text-[0.6875rem] mt-1.5 uppercase tracking-widest"
                       style={{ color: 'var(--fg-subtle)' }}>Екран</p>
                </div>

                {/* Grid */}
                <div className="overflow-x-auto pb-2">
                    <div className="inline-block">
                        {Array.from({ length: rows }, (_, i) => i + 1).map(row => (
                            <div key={row} className="flex items-center gap-1.5 mb-1">
                                <span className="w-5 text-[0.6875rem] text-right flex-shrink-0 select-none font-mono"
                                      style={{ color: 'var(--fg-subtle)' }}>
                                    {ROW_LABELS[row - 1] ?? row}
                                </span>
                                <div className="flex gap-1">
                                    {Array.from({ length: cols }, (_, j) => j + 1).map(seatNum => {
                                        const seatData = hall.seats.find(s => s.row === row && s.seat === seatNum)
                                        if (!seatData) return <div key={seatNum} className="w-6 h-6 flex-shrink-0" />
                                        const key = `${row}_${seatNum}`
                                        return (
                                            <SeatBtn
                                                key={seatNum}
                                                seat={seatData}
                                                isBooked={bookedSet.has(key)}
                                                isSelected={selectedSet.has(key)}
                                                onMouseDown={() => { setIsDragging(true); toggleSeat(row, seatNum) }}
                                                onMouseEnter={() => paintDrag(row, seatNum)}
                                            />
                                        )
                                    })}
                                </div>
                                <span className="w-5 text-[0.6875rem] flex-shrink-0 select-none font-mono"
                                      style={{ color: 'var(--fg-subtle)' }}>
                                    {ROW_LABELS[row - 1] ?? row}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4"
                     style={{ borderColor: 'var(--border)' }}>
                    <LegendDot color="var(--accent)" label="Вибрано" />
                    <LegendDot color="var(--surface-3)" label="Зайнято" />
                    {usedCategories.map(cat => (
                        <LegendDot key={cat} color={CAT_COLORS[cat]} label={CAT_LABELS[cat]} />
                    ))}
                </div>

                {/* Category prices */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {usedCategories.map(cat => {
                        const price = hall.seats.find(s => s.category === cat)?.price ?? 0
                        return (
                            <span key={cat}
                                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs"
                                  style={{
                                      borderColor: CAT_COLORS[cat] + '44',
                                      background:  CAT_COLORS[cat] + '18',
                                      color:       CAT_COLORS[cat],
                                  }}>
                                <span className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ background: CAT_COLORS[cat] }} />
                                {CAT_LABELS[cat]} · {price}₴
                            </span>
                        )
                    })}
                </div>
            </div>
        </CartPageLayout>
    )
}
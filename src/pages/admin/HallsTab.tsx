// src/pages/admin/HallsTab.tsx
import { useState } from 'react'
import type { SeatCategory, Seat, Hall } from '../../models/cinema'

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMATS = ['IMAX L 2D', 'IMAX 3D', 'SDH', 'ATMOS LUX', 'LUX SDH', 'CHILL OUT', 'ScreenX', 'Dolby Atmos']

interface CategoryMeta { category: SeatCategory; label: string; color: string; defaultPrice: number }

const CATEGORY_META: CategoryMeta[] = [
    { category: 'STANDARD',  label: 'Стандарт',  color: '#4b5563', defaultPrice: 150 },
    { category: 'LUX',       label: 'Люкс',       color: '#2563eb', defaultPrice: 220 },
    { category: 'SUPER_LUX', label: 'Супер Люкс', color: '#7c3aed', defaultPrice: 310 },
    { category: 'CHILL_OUT', label: 'Chill Out',  color: '#0891b2', defaultPrice: 280 },
    { category: 'VIP',       label: 'VIP',        color: '#b45309', defaultPrice: 450 },
]

const CATEGORY_COLORS: Record<SeatCategory, string> = CATEGORY_META.reduce(
    (acc, m) => ({ ...acc, [m.category]: m.color }), {} as Record<SeatCategory, string>
)
const CATEGORY_LABELS: Record<SeatCategory, string> = CATEGORY_META.reduce(
    (acc, m) => ({ ...acc, [m.category]: m.label }), {} as Record<SeatCategory, string>
)

// ─── Helpers (exported for CinemaAdmin) ──────────────────────────────────────

export function generateSeats(rows: number, seatsPerRow: number): Seat[] {
    const defaultPrice = CATEGORY_META.find(m => m.category === 'STANDARD')!.defaultPrice
    const seats: Seat[] = []
    for (let r = 1; r <= rows; r++)
        for (let s = 1; s <= seatsPerRow; s++)
            seats.push({ row: r, seat: s, category: 'STANDARD', price: defaultPrice })
    return seats
}

export function getHallDimensions(hall: Hall) {
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
    const getSeat = (row: number, seat: number) => hall.seats.find(s => s.row === row && s.seat === seat)
    const paintSeat = (row: number, seat: number) => {
        const price = categoryPrice(selectedCategory)
        onChange({ ...hall, seats: hall.seats.map(s =>
                s.row === row && s.seat === seat ? { ...s, category: selectedCategory, price } : s
            )})
    }
    const paintRow = (row: number) => {
        const price = categoryPrice(selectedCategory)
        onChange({ ...hall, seats: hall.seats.map(s =>
                s.row === row ? { ...s, category: selectedCategory, price } : s
            )})
    }
    const updateCategoryPrice = (category: SeatCategory, price: number) => {
        onChange({ ...hall, seats: hall.seats.map(s =>
                s.category === category ? { ...s, price } : s
            )})
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

// ─── HallForm ─────────────────────────────────────────────────────────────────

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

// ─── HallsTab (export) ────────────────────────────────────────────────────────

interface HallsTabProps {
    selected: { halls: Hall[] }
    editingHall: Hall | null
    setEditingHall: (h: Hall | null) => void
    onSaveHall: (h: Hall) => Promise<void>
    onDeleteHall: (id: string) => Promise<void>
    onNewHall: () => Hall
}

export function HallsTab({ selected, editingHall, setEditingHall, onSaveHall, onDeleteHall, onNewHall }: HallsTabProps) {
    if (editingHall) {
        return (
            <div className="p-6 rounded-xl border border-gray-800 bg-gray-900">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setEditingHall(null)} className="text-gray-500 hover:text-white transition-colors text-sm">← Назад</button>
                    <h2 className="font-semibold">{editingHall.name || 'Новий зал'}</h2>
                </div>
                <HallForm hall={editingHall} onSave={onSaveHall} onCancel={() => setEditingHall(null)} />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Зали ({selected.halls.length})</p>
                <button onClick={() => setEditingHall(onNewHall())} className="text-xs text-red-400 hover:text-red-300 transition-colors">+ Додати зал</button>
            </div>

            {selected.halls.length === 0 && (
                <div className="p-8 rounded-xl border border-dashed border-gray-700 text-center">
                    <p className="text-gray-500 text-sm">Немає залів</p>
                    <button onClick={() => setEditingHall(onNewHall())} className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors">+ Створити перший зал</button>
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
                                <button onClick={() => onDeleteHall(hall.id)} className="text-gray-600 hover:text-red-400 transition-colors text-xs">✕</button>
                            </div>

                            <div className="mb-3 overflow-hidden rounded" style={{ height: 64 }}>
                                <div className="flex flex-col h-full gap-px">
                                    {Array.from({ length: rows }, (_, i) => i + 1).map(row => (
                                        <div key={row} className="flex flex-1 min-h-0 gap-px">
                                            {Array.from({ length: seatsPerRow }, (_, j) => j + 1).map(seatNum => {
                                                const s = hall.seats.find(s => s.row === row && s.seat === seatNum)
                                                return <div key={seatNum} className="flex-1 min-w-0" style={{ background: CATEGORY_COLORS[s?.category ?? 'STANDARD'], opacity: 0.7 }} />
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
    )
}
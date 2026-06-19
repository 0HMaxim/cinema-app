// src/pages/admin/CinemaAdmin.tsx
import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase.ts'
import type { Hall, Cinema } from '../../models/cinema'
import { HallsTab, generateSeats } from './HallsTab.tsx'
import { SessionsTab } from './SessionsTab.tsx'
import { ConcessionTab } from './ConcessionTab.tsx'

const CITIES  = ['Київ', 'Дніпро', 'Львів', 'Одеса', 'Харків', 'Запоріжжя', 'Вінниця', 'Полтава']
const FORMATS = ['IMAX L 2D', 'IMAX 3D', 'SDH', 'ATMOS LUX', 'LUX SDH', 'CHILL OUT', 'ScreenX', 'Dolby Atmos']

export default function CinemaAdmin() {
    const [cinemas,        setCinemas]        = useState<Cinema[]>([])
    const [loading,        setLoading]        = useState(true)
    const [error,          setError]          = useState<string | null>(null)
    const [selectedId,     setSelectedId]     = useState<string | null>(null)
    const [editingHall,    setEditingHall]    = useState<Hall | null>(null)
    const [showCinemaForm, setShowCinemaForm] = useState(false)
    const [tab,            setTab]            = useState<'halls' | 'sessions' | 'concession'>('halls')
    const [newName,        setNewName]        = useState('')
    const [newCity,        setNewCity]        = useState(CITIES[0])
    const [newAddress,     setNewAddress]     = useState('')

    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'cinemas'),
            snapshot => { setCinemas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Cinema))); setLoading(false); setError(null) },
            err => { setError(err.message); setLoading(false) }
        )
        return () => unsub()
    }, [])

    const selected = cinemas.find(c => c.id === selectedId) ?? null

    const updateCinema = async (updated: Cinema) => { await setDoc(doc(db, 'cinemas', updated.id), updated) }

    const createCinema = async () => {
        if (!newName.trim()) return
        const cinema: Cinema = { id: crypto.randomUUID(), name: newName.trim(), city: newCity, address: newAddress.trim(), halls: [], sessions: [] }
        try {
            await setDoc(doc(db, 'cinemas', cinema.id), cinema)
            setSelectedId(cinema.id); setNewName(''); setNewAddress(''); setShowCinemaForm(false)
        } catch (err) { console.error(err); alert('Не вдалося створити кінотеатр. Дивись консоль і Firestore Rules.') }
    }

    const deleteCinema = async (id: string) => { await deleteDoc(doc(db, 'cinemas', id)); if (selectedId === id) setSelectedId(null) }

    const onSaveHall = async (hall: Hall) => {
        if (!selected) return
        const exists = selected.halls.some(h => h.id === hall.id)
        const halls = exists ? selected.halls.map(h => h.id === hall.id ? hall : h) : [...selected.halls, hall]
        await updateCinema({ ...selected, halls }); setEditingHall(null)
    }

    const onDeleteHall = async (hallId: string) => {
        if (!selected) return
        await updateCinema({ ...selected, halls: selected.halls.filter(h => h.id !== hallId) })
    }

    const onNewHall = (): Hall => ({ id: crypto.randomUUID(), name: '', format: FORMATS[0], seats: generateSeats(8, 14) })

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-xs text-red-500 uppercase tracking-widest mb-1">Адмін панель</p>
                        <h1 className="text-2xl font-bold tracking-tight">Кінотеатри та зали</h1>
                    </div>
                    <button onClick={() => setShowCinemaForm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold transition-colors">
                        + Новий кінотеатр
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-500 text-sm">Завантаження...</p>
                ) : error ? (
                    <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm">Помилка з'єднання з Firestore: {error}</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Cinema list */}
                        <div className="lg:col-span-1 space-y-3">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Список кінотеатрів</p>

                            {showCinemaForm && (
                                <div className="p-4 rounded-xl border border-red-500/30 bg-gray-900 space-y-3">
                                    <p className="text-sm font-semibold text-red-400">Новий кінотеатр</p>
                                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Назва кінотеатру" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                                    <select value={newCity} onChange={e => setNewCity(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500">
                                        {CITIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                    <input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Адреса" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
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

                        {/* Right panel */}
                        <div className="lg:col-span-2">
                            {!selected ? (
                                <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-gray-700">
                                    <p className="text-gray-500 text-sm">Вибери кінотеатр зліва</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Cinema info */}
                                    <div className="p-5 rounded-xl border border-gray-800 bg-gray-900">
                                        <div className="flex items-center justify-between">
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

                                    {/* Tabs */}
                                    <div className="flex rounded-xl border border-gray-800 overflow-hidden text-sm">
                                        {(['halls', 'sessions', 'concession'] as const).map(t => (
                                            <button key={t} onClick={() => { setTab(t); setEditingHall(null) }}
                                                    className="flex-1 py-2.5 font-medium transition-colors"
                                                    style={{ background: tab === t ? 'rgba(239,68,68,0.12)' : 'transparent', color: tab === t ? '#ef4444' : '#6b7280', borderBottom: tab === t ? '2px solid #ef4444' : '2px solid transparent' }}>
                                                {t === 'halls' ? `Зали (${selected.halls.length})` : t === 'sessions' ? `Сеанси (${(selected.sessions ?? []).length})` : 'Товари'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab content */}
                                    {tab === 'halls' && (
                                        <HallsTab
                                            selected={selected}
                                            editingHall={editingHall}
                                            setEditingHall={setEditingHall}
                                            onSaveHall={onSaveHall}
                                            onDeleteHall={onDeleteHall}
                                            onNewHall={onNewHall}
                                        />
                                    )}
                                    {tab === 'sessions' && (
                                        <SessionsTab cinema={selected} onUpdate={updateCinema} />
                                    )}
                                    {tab === 'concession' && (
                                        <ConcessionTab />
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
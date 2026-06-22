// src/components/admin/CityPickerModal.tsx
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { X, Plus, Trash2 } from 'lucide-react'

interface CityNames { [lang: string]: string }

interface City {
    id: string
    key: string
    names: CityNames
}

interface Props {
    open: boolean
    onClose: () => void
    onSelect: (city: City) => void
    selectedKey?: string
}

const LANGS = [
    { code: 'uk', label: 'UA' },
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' },
]

export default function CityPickerModal({ open, onClose, onSelect, selectedKey }: Props) {
    const [cities, setCities]   = useState<City[]>([])
    const [loading, setLoading] = useState(false)
    const [adding, setAdding]   = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [names, setNames]     = useState<CityNames>({ uk: '', en: '', ru: '' })

    useEffect(() => {
        if (!open) return
        setLoading(true)
        getDocs(collection(db, 'cities')).then(snap => {
            setCities(snap.docs.map(d => ({ id: d.id, ...d.data() } as City)))
        }).finally(() => setLoading(false))
    }, [open])

    const addCity = async () => {
        const ukName = names.uk.trim()
        if (!ukName) return
        setAdding(true)

        // Генерируем key из украинского названия
        const key = ukName.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/і/g, 'i').replace(/ї/g, 'yi')
            .replace(/є/g, 'ye').replace(/ґ/g, 'g')
            .replace(/[^a-z0-9_]/g, '')

        // Заполняем пустые поля украинским названием как fallback
        const finalNames: CityNames = {}
        LANGS.forEach(l => {
            finalNames[l.code] = names[l.code].trim() || ukName
        })

        const ref = await addDoc(collection(db, 'cities'), { key, names: finalNames })
        setCities(prev => [...prev, { id: ref.id, key, names: finalNames }])
        setNames({ uk: '', en: '', ru: '' })
        setShowForm(false)
        setAdding(false)
    }

    const removeCity = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        await deleteDoc(doc(db, 'cities', id))
        setCities(prev => prev.filter(c => c.id !== id))
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-bold text-white">Вибір міста</h2>
                    <button onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:text-white">
                        <X size={13} />
                    </button>
                </div>

                {/* Форма добавления */}
                {showForm ? (
                    <div className="space-y-2 p-3 rounded-xl border border-gray-700 bg-gray-800/50">
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Нове місто</p>
                        {LANGS.map(l => (
                            <div key={l.code} className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-500 w-6 shrink-0">{l.label}</span>
                                <input
                                    value={names[l.code] ?? ''}
                                    onChange={e => setNames(prev => ({ ...prev, [l.code]: e.target.value }))}
                                    placeholder={l.code === 'uk' ? 'Київ *' : l.code === 'en' ? 'Kyiv' : 'Киев'}
                                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
                                />
                            </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={addCity}
                                disabled={adding || !names.uk.trim()}
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-lg text-xs font-semibold text-white transition-colors"
                            >
                                {adding ? 'Додавання...' : 'Додати'}
                            </button>
                            <button
                                onClick={() => { setShowForm(false); setNames({ uk: '', en: '', ru: '' }) }}
                                className="px-3 py-1.5 border border-gray-700 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                            >
                                Скасувати
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                    >
                        <Plus size={14} />
                        Додати місто
                    </button>
                )}

                {/* Список городов */}
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-10 rounded-lg animate-pulse bg-gray-800" />
                        ))
                    ) : cities.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-4">Міст поки немає</p>
                    ) : cities.map(city => (
                        <div
                            key={city.id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                            style={{
                                background: selectedKey === city.key ? 'rgba(239,68,68,0.12)' : 'rgb(31,41,55)',
                                border: `1px solid ${selectedKey === city.key ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
                            }}
                            onClick={() => { onSelect(city); onClose() }}
                        >
                            <div className="min-w-0">
                                <p className="text-sm text-white font-medium">{city.names?.uk ?? city.key}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                    {LANGS.filter(l => l.code !== 'uk').map(l => city.names?.[l.code]).filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <button
                                onClick={e => removeCity(city.id, e)}
                                className="text-gray-600 hover:text-red-400 transition-colors p-1 shrink-0"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
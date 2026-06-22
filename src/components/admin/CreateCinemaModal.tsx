// src/components/admin/CreateCinemaModal.tsx
import { useState } from 'react'
import { X, MapPin } from 'lucide-react'
import type { Cinema } from '../../models/cinema'
import CityPickerModal from './CityPickerModal'
import {useApp} from "../../context/AppContext.tsx";


interface City { id: string; key: string; names: Record<string, string> }

interface Props {
    open: boolean
    onClose: () => void
    onCreate: (cinema: Omit<Cinema, 'halls' | 'sessions'>) => Promise<void>
}

export default function CreateCinemaModal({ open, onClose, onCreate }: Props) {
    const { lang } = useApp()  // ← добавь

    const [name,        setName]        = useState('')
    const [address,     setAddress]     = useState('')
    const [city,        setCity]        = useState<City | null>(null)
    const [saving,      setSaving]      = useState(false)
    const [cityPicker,  setCityPicker]  = useState(false)

    if (!open) return null

    const handleCreate = async () => {
        if (!name.trim() || !city) return
        setSaving(true)
        await onCreate({
            id:      crypto.randomUUID(),
            name:    name.trim(),
            city: city.names[lang] ?? city.names['uk'],
            cityKey: city.key,
            address: address.trim(),
        })
        setName(''); setAddress(''); setCity(null)
        setSaving(false)
        onClose()
    }

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                 style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">

                    <div className="flex items-center justify-between">
                        <h2 className="text-[15px] font-bold text-white">Новий кінотеатр</h2>
                        <button onClick={onClose}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:text-white">
                            <X size={13} />
                        </button>
                    </div>

                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Назва кінотеатру"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    />

                    {/* Выбор города */}
                    <button
                        onClick={() => setCityPicker(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 border rounded-lg text-sm transition-all"
                        style={{
                            borderColor: city ? 'rgba(239,68,68,0.5)' : 'rgb(55,65,81)',
                            color: city ? 'white' : 'rgb(107,114,128)',
                        }}
                    >
                        <MapPin size={14} className={city ? 'text-red-400' : 'text-gray-600'} />
                        {city ? city.names[lang] ?? city.names['uk'] : 'Вибрати місто...'}
                    </button>

                    <input
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Адреса"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    />

                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleCreate}
                            disabled={saving || !name.trim() || !city}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-lg text-sm font-semibold text-white transition-colors"
                        >
                            {saving ? 'Створення...' : 'Створити'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Скасувати
                        </button>
                    </div>
                </div>
            </div>

            <CityPickerModal
                open={cityPicker}
                onClose={() => setCityPicker(false)}
                onSelect={setCity}
                selectedKey={city?.key}
            />
        </>
    )
}
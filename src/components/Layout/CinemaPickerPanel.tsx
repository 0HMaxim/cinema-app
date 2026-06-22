    import { useRef } from 'react'
    import {Link, useNavigate} from 'react-router-dom'
    import { X, MapPin, Film, Check, Clapperboard, ChevronRight } from 'lucide-react'
    import {useApp} from "../../context/AppContext.tsx";
    import type {Cinema} from "../../models/cinema.ts";

    interface CinemaPanelProps {
        open: boolean
        onClose: () => void
        cinemas: Cinema []
        cinemasLoading: boolean
        selectedCinemaId: string | null
        setSelectedCinemaId: (id: string) => void
        selectedCity: string | null
        setSelectedCity: (city: string) => void
        mode?: 'panel' | 'modal'
    }

    export default function CinemaPickerPanel({ open, onClose, cinemas, cinemasLoading,
                                                  selectedCinemaId, setSelectedCinemaId, selectedCity, setSelectedCity,  mode = 'panel' }: CinemaPanelProps) {
        const panelRef = useRef<HTMLDivElement>(null)
        const navigate = useNavigate()

        const { tCity, t } = useApp()
        const cities = Array.from(new Set(cinemas.map(c => c.cityKey))).sort()
        const filteredCinemas = selectedCity ? cinemas.filter(c => c.cityKey === selectedCity) : cinemas


        return (
            <>
                <div
                    onClick={onClose}
                    className={`fixed inset-0 z-[98] backdrop-blur-sm transition-opacity duration-300
                                ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                />

                {/* Panel или Modal */}
                <div
                    ref={panelRef}
                    className={
                        mode === 'modal'
                            // Центрированная модалка
                            ? `fixed z-[99] w-full max-w-md flex flex-col rounded-3xl border shadow-2xl
                               transition-all duration-300
                               ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`
                            // Оригинальная боковая панель
                            : `fixed top-0 right-0 bottom-0 z-[99] w-[360px] flex flex-col
                               border-l shadow-[-24px_0_64px_rgba(0,0,0,0.4)]
                               transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                               ${open ? 'translate-x-0' : 'translate-x-full'}`
                    }
                    style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        // Только для модалки — позиционирование по центру
                        ...(mode === 'modal' && {
                            top: '50%',
                            left: '50%',
                            transform: open
                                ? 'translate(-50%, -50%) scale(1)'
                                : 'translate(-50%, -50%) scale(0.95)',
                            maxHeight: '85vh',
                        }),
                    }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b"
                         style={{ borderColor: 'var(--border)' }}>
                        <div>
                            <h2 className="text-[17px] font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
                                {t('cinemaPickerTitle')}
                            </h2>
                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                {t('cinemaPickerSub')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all hover:opacity-80"
                            style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-2)', color: 'var(--fg-muted)' }}
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* City tabs */}
                    {cities.length > 0 && (
                        <div className="flex gap-2 px-4 py-3 border-b overflow-x-auto [&::-webkit-scrollbar]:hidden shrink-0"
                             style={{ borderColor: 'var(--border)' }}>
                            {cities.map(cityKey  => (
                                <button
                                    key={cityKey }
                                    onClick={() => setSelectedCity(cityKey )}
                                    className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-150"
                                    style={selectedCity === cityKey
                                        ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' }
                                        : { borderColor: 'var(--border-strong)', background: 'var(--surface-2)', color: 'var(--fg-muted)' }
                                    }
                                >
                                    {tCity(cityKey)}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Cinema list */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                        {cinemasLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-[76px] rounded-2xl animate-pulse"
                                     style={{ background: 'var(--surface-2)' }} />
                            ))
                        ) : filteredCinemas.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16"
                                 style={{ color: 'var(--fg-subtle)' }}>
                                <Clapperboard size={36} />
                                <p className="text-[13px]">Кінотеатрів не знайдено</p>
                            </div>
                        ) : (
                            filteredCinemas.map(cinema => {
                                const isSelected = cinema.id === selectedCinemaId
                                return (
                                    <button
                                        key={cinema.id}
                                        onClick={() => {
                                            setSelectedCinemaId(cinema.id)
                                            setSelectedCity(cinema.cityKey)
                                            onClose()
                                            navigate(`/cinema/${cinema.id}`)
                                        }}
                                        className="w-full text-left px-4 py-3.5 rounded-2xl border flex items-center gap-3 transition-all duration-150"
                                        style={isSelected
                                            ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }
                                            : { borderColor: 'var(--border)', background: 'var(--surface-2)' }
                                        }
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                             style={{
                                                 background: isSelected ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--surface-3)',
                                                 color: isSelected ? 'var(--accent)' : 'var(--fg-muted)',
                                             }}>
                                            <Film size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-semibold truncate"
                                               style={{ color: isSelected ? 'var(--accent)' : 'var(--fg)' }}>
                                                {cinema.name}
                                            </p>
                                            <p className="text-[12px] mt-0.5 flex items-center gap-1 truncate"
                                               style={{ color: 'var(--fg-muted)' }}>
                                                <MapPin size={10} className="shrink-0" />
                                                {cinema.address}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                 style={{ background: 'var(--accent)' }}>
                                                <Check size={11} strokeWidth={3} style={{ color: 'var(--accent-fg)' }} />
                                            </div>
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {selectedCinemaId && (
                        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                            <Link
                                to={`/cinema/${selectedCinemaId}`}
                                onClick={onClose}
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                                           text-[14px] font-semibold transition-colors"
                                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                            >
                                <Clapperboard size={16} />
                                {t('cinemaPickerGo')}
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    )}
                </div>
            </>
        )
    }
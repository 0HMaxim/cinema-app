import { useRef } from 'react'
import {Link, useNavigate} from 'react-router-dom'
import { X, MapPin, Film, Check, Clapperboard, ChevronRight } from 'lucide-react'

interface CinemaItem {
    id: string
    name: string
    city: string
    address: string
}

interface CinemaPanelProps {
    open: boolean
    onClose: () => void
    cinemas: CinemaItem[]
    cinemasLoading: boolean
    selectedCinemaId: string | null
    setSelectedCinemaId: (id: string) => void
    selectedCity: string | null
    setSelectedCity: (city: string) => void
}

export default function CinemaPickerPanel({
                                              open,
                                              onClose,
                                              cinemas,
                                              cinemasLoading,
                                              selectedCinemaId,
                                              setSelectedCinemaId,
                                              selectedCity,
                                              setSelectedCity,
                                          }: CinemaPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

    const cities          = Array.from(new Set(cinemas.map(c => c.city))).sort()
    const filteredCinemas = selectedCity ? cinemas.filter(c => c.city === selectedCity) : cinemas

    const navigate = useNavigate()

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                className={`fixed inset-0 z-[98] bg-black/60 backdrop-blur-sm
                            transition-opacity duration-300
                            ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-0 right-0 bottom-0 z-[99] w-[360px]
                             flex flex-col bg-zinc-950 border-l border-white/[0.07]
                             shadow-[-24px_0_64px_rgba(0,0,0,0.6)]
                             transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                             ${open ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
                    <div>
                        <h2 className="text-[17px] font-bold text-white tracking-tight">Кінотеатр</h2>
                        <p className="text-[12px] text-zinc-500 mt-0.5">Оберіть місто та кінотеатр</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center
                                   border border-white/10 bg-white/5 text-zinc-400
                                   hover:bg-white/10 hover:text-white transition-all"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* City tabs */}
                {cities.length > 0 && (
                    <div className="flex gap-2 px-4 py-3 border-b border-white/[0.07] overflow-x-auto
                                    [&::-webkit-scrollbar]:hidden shrink-0">
                        {cities.map(city => (
                            <button
                                key={city}
                                onClick={() => setSelectedCity(city)}
                                className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium
                                            border transition-all duration-150
                                            ${selectedCity === city
                                    ? 'bg-red-600 border-red-600 text-white'
                                    : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {city}
                            </button>
                        ))}
                    </div>
                )}

                {/* Cinema list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2
                                [&::-webkit-scrollbar]:w-1
                                [&::-webkit-scrollbar-track]:bg-transparent
                                [&::-webkit-scrollbar-thumb]:bg-white/10
                                [&::-webkit-scrollbar-thumb]:rounded-full">
                    {cinemasLoading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-[76px] rounded-2xl bg-white/5 animate-pulse" />
                        ))
                    ) : filteredCinemas.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-zinc-600">
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
                                        setSelectedCity(cinema.city)
                                        onClose()
                                        navigate(`/cinema/${cinema.id}`)
                                    }}
                                    className={`w-full text-left px-4 py-3.5 rounded-2xl border
                                                flex items-center gap-3 transition-all duration-150 group
                                                ${isSelected
                                        ? 'border-red-500/50 bg-red-500/10'
                                        : 'border-white/[0.07] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                                     ${isSelected ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-zinc-500 group-hover:text-zinc-300'}`}>
                                        <Film size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[14px] font-semibold truncate
                                                       ${isSelected ? 'text-red-400' : 'text-white'}`}>
                                            {cinema.name}
                                        </p>
                                        <p className="text-[12px] text-zinc-500 mt-0.5 flex items-center gap-1 truncate">
                                            <MapPin size={10} className="shrink-0" />
                                            {cinema.address}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                            <Check size={11} strokeWidth={3} className="text-white" />
                                        </div>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>

                {/* Footer */}
                {selectedCinemaId && (
                    <div className="px-4 py-3 border-t border-white/[0.07]">
                        <Link
                            to={`/cinema/${selectedCinemaId}`}
                            onClick={onClose}
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                                       bg-red-600 hover:bg-red-500 text-white text-[14px] font-semibold
                                       transition-colors"
                        >
                            <Clapperboard size={16} />
                            Перейти до кінотеатру
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                )}
            </div>
        </>
    )
}
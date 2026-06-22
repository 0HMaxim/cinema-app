import { useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'

interface BookingButtonProps {
    cinemaId: string
    sessionId: string
    className?: string
}

export default function BookingButton({ cinemaId, sessionId, className = '' }: BookingButtonProps) {
    const navigate = useNavigate()

    return (
        <button
            onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                navigate(`/cart/${cinemaId}_${sessionId}/seatplan`)
            }}
            title="Купити квиток"
            className={`
                w-10 h-10 flex items-center justify-center rounded-xl
                bg-amber-400 hover:bg-amber-300 active:scale-90
                text-black transition-all duration-200
                shadow-lg shadow-amber-400/20
                ${className}
            `}
        >
            <Ticket size={18} strokeWidth={2.2} />
        </button>
    )
}
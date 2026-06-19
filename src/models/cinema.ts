// ✅ cinema.ts хранится внутри Cinema

export type SeatCategory = 'STANDARD' | 'LUX' | 'SUPER_LUX' | 'CHILL_OUT' | 'VIP'
export interface Cinema {
    id: string
    name: string
    city: string
    address: string
    halls: Hall[]
    sessions: Session[]   // ✅ Session хранится внутри Cinema
}

export interface Hall {
    id: string
    name: string
    format: string        // "IMAX L 2D", "SDH", "ATMOS LUX"
    seats: Seat[]         // все места — каждое со своей категорией и ценой
}

export interface Session {
    id: string
    movieId: number
    movieTitle: string
    hallId: string
    date: string
    time: string
    format: string
    bookedSeats: {        // какие места уже куплены
        row: number
        seat: number
    }[]
}

export interface Seat {
    row: number
    seat: number
    category: SeatCategory
    price: number
}
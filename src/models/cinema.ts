// cinema.ts
import type {Hall} from "./hall.ts";

// cinema.ts
export interface Cinema {
    id: string
    name: string
    city: string
    cityKey: string
    address: string
    halls: Hall[]
    sessions: Session[]
}

export interface Session {
    id: string
    movieId: number
    movieTitle: string
    hallId: string
    date: string
    time: string
    format: string
    bookedSeats: {        // Bought seets
        row: number
        seat: number
    }[]
}

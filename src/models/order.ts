import type {SeatCategory} from "./cinema.ts";

export interface Order {
    id: string

    cinemaId: string
    sessionId: string

    customer: {
        name: string
        email: string
        phone: string
    }

    tickets: {
        row: number
        seat: number
        category: SeatCategory
        price: number
    }[]

    concessions: ConcessionItem[]

    total: number

    paymentMethod: 'card' | 'applepay'

    status:
        | 'pending'
        | 'paid'
        | 'cancelled'

    createdAt: number
}

export interface ConcessionItem {
    id: string
    name: string
    price: number
    image?: string

    quantity: number
}
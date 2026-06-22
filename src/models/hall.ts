import type {Seat} from "./seat.ts";

export interface Hall {
    id: string
    name: string
    format: string        // "IMAX L 2D", "SDH", "ATMOS LUX"
    seats: Seat[]
}
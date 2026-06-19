import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar.tsx'

export default function DefaultLayout() {
    return (
        <div className="h-screen overflow-hidden flex flex-col">
            <Navbar />
            <main className="flex-1 overflow-hidden">
                <Outlet />
            </main>
        </div>
    )
}
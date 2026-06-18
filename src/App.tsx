// App.tsx
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import MoviePage from './pages/MoviePage'
import Movies from './pages/Movies'
import Home from './pages/Home'
import CinemaPage from './pages/CinemaPage.tsx'
import Cinemas from './pages/Cinemas.tsx'
import CinemaAdmin from './pages/admin/CinemaAdmin.tsx'
import AdminSession from './pages/admin/AdminSession.tsx'
import SeatPlan from "./pages/cart/Seatplan.tsx";
import Checkout from "./pages/cart/Checkout.tsx";
import Concession from "./pages/cart/Concession.tsx";


function AdminLayout() {
    return (
        <div className="min-h-screen bg-gray-950">
            {/* Admin top bar */}
            <main className="pt-14">
                <Routes>
                    <Route path="*"        element={<CinemaAdmin />} />
                    <Route path="cinemas"  element={<CinemaAdmin />} />
                    <Route path="sessions" element={<AdminSession />} />
                </Routes>
            </main>
        </div>
    )
}

function CartLayout() {
    return (
        <div className="min-h-screen bg-gray-950">
            {/* Admin top bar */}
            <main className="pt-14">
                <Routes>
                    <Route path="/:orderId/seatplan"    element={<SeatPlan />} />
                    <Route path="/:orderId/concession"  element={<Concession />} />
                    <Route path="/:orderId/checkout"    element={<Checkout />} />
                </Routes>
            </main>
        </div>
    )
}

// ─── Public layout ────────────────────────────────────────────────────────────

function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { theme } = useApp()

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
    }, [theme])

    return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(v => !v)} />
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main style={{ paddingTop: 64, minHeight: '100vh' }}>
                <Routes>
                    <Route path="/"           element={<Home />} />
                    <Route path="/movies"     element={<Movies />} />
                    <Route path="/movie/:id"  element={<MoviePage />} />
                    <Route path="/cinemas"    element={<Cinemas />} />
                    <Route path="/cinema/:id" element={<CinemaPage />} />

                </Routes>
            </main>
        </div>
    )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/*"       element={<Layout />} />

                    <Route path="/admin/*" element={<AdminLayout />} />
                    <Route path="/cart/*" element={<CartLayout />} />
                </Routes>
            </BrowserRouter>
        </AppProvider>
    )
}
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import MoviePage from './pages/MoviePage'
import Movies from './pages/Movies'
import Home from './pages/Home'
import CinemaPage from "./pages/CinemaPage.tsx";
import Cinemas from "./pages/Cinemas.tsx";

function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { theme } = useApp()

    // Синхронизируем класс .dark на <html> — включает CSS-переменные тёмной темы.
    // useEffect здесь правильное место: нам нужен доступ к контексту,
    // а AppProvider находится снаружи (в App). В index.html/main.tsx контекста нет.
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
    }, [theme])

    return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen(v => !v)}
            />
            <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <main style={{ paddingTop: 64, minHeight: '100vh' }}>
                <Routes>
                    <Route path="/"          element={<Home />} />
                    <Route path="/movies"     element={<Movies />} />
                    <Route path="/movie/:id" element={<MoviePage />} />

                    <Route path="/cinemas" element={<Cinemas />} />
                    <Route path="/cinema/:id" element={<CinemaPage />} />
                </Routes>
            </main>
        </div>
    )
}

export default function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        </AppProvider>
    )
}
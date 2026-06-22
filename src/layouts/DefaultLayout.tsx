// DefaultLayout.tsx
import Navbar from "../components/Layout/Navbar.tsx";
import {Outlet} from "react-router-dom";
import CinemaPickerPanel from "../components/Layout/CinemaPickerPanel.tsx";
import {useApp} from "../context/AppContext.tsx";
import {useState} from "react";

export default function DefaultLayout() {
    const { isThemeChanging, showWelcome, setShowWelcome,
        selectedCinemaId, setSelectedCinemaId,
        cinemas, cinemasLoading } = useApp()

    const [selectedCity, setSelectedCity] = useState<string | null>(null)

    // Убери весь useEffect с getDocs — данные уже в контексте

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />  {/* без пропсов */}
            <main className="flex-1 relative">
                <Outlet />
                {isThemeChanging && (
                    <div className="fixed inset-0 z-[9999] pointer-events-none"
                         style={{ background: 'var(--bg-from)', opacity: 0.15 }} />
                )}
            </main>

            <CinemaPickerPanel
                mode="modal"
                open={showWelcome}
                onClose={() => setShowWelcome(false)}
                cinemas={cinemas}
                cinemasLoading={cinemasLoading}
                selectedCinemaId={selectedCinemaId}
                setSelectedCinemaId={(id) => {
                    setSelectedCinemaId(id)
                    setShowWelcome(false)
                }}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
            />
        </div>
    )
}
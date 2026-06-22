// src/layouts/CartLayout.tsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Layout/Navbar.tsx'
import Sidebar from '../components/Sidebar'

// CartLayout.tsx
export default function CartLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    return (
        <div
            className="min-h-screen"
        >
            <Navbar />
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="pt-16"><Outlet /></main>
        </div>
    )
}
// src/layouts/AdminLayout.tsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Layout/Navbar.tsx'
import Sidebar from '../components/Sidebar'

// AdminLayout.tsx
export default function AdminLayout() {
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
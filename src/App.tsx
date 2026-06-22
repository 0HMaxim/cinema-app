// App.tsx
import { AppProvider } from './context/AppContext'

import AdminLayout   from './layouts/AdminLayout.tsx'
import CartLayout    from './layouts/CartLayout.tsx'
import DefaultLayout from "./layouts/DefaultLayout.tsx";

import MoviePage   from './pages/MoviePage'
import Movies      from './pages/Movies'
import Home        from './pages/Home'
import CinemaPage  from './pages/CinemaPage.tsx'
import Cinemas     from './pages/Cinemas.tsx'
import CinemaAdmin from './pages/admin/CinemaAdmin.tsx'
import SeatPlan    from './pages/cart/Seatplan.tsx'
import Checkout    from './pages/cart/Checkout.tsx'
import Concession  from './pages/cart/Concession.tsx'
import {HashRouter, Route, Routes} from "react-router-dom";
// в AppContext — добавь в стейт

export default function App() {


    return (
        <AppProvider>
            <HashRouter>
                <Routes>
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index    element={<CinemaAdmin />} />
                        <Route path="*" element={<CinemaAdmin />} />
                    </Route>

                    <Route path="/cart" element={<CartLayout />}>
                        <Route path=":orderId/seatplan"   element={<SeatPlan />} />
                        <Route path=":orderId/concession" element={<Concession />} />
                        <Route path=":orderId/checkout"   element={<Checkout />} />
                    </Route>

                    <Route element={<DefaultLayout />}>
                        <Route path="/movie/:id"  element={<MoviePage />} />
                        <Route path="/cinema/:id" element={<CinemaPage />} />
                        <Route path="/cinemas"    element={<Cinemas />} />
                        <Route path="/movies"     element={<Movies />} />
                        <Route path="/"           element={<Home />} />
                    </Route>
                </Routes>
            </HashRouter>
        </AppProvider>
    )
}
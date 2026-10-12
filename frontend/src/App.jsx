import { Route, Routes, useLocation } from "react-router-dom";

import Footer from "./components/layout/Footer.jsx";
import Navbar from "./components/layout/Navbar.jsx";
import BackToTop from "./components/fx/BackToTop.jsx";

import AboutPage from "./pages/AboutPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import ServicesPage from "./pages/ServicesPage.jsx";
import SubmitPage from "./pages/SubmitPage.jsx";

export default function App() {
  const location = useLocation();

  return (
    <div className="app">
      <Navbar />

      {/* key on pathname replays the enter animation on every route change */}
      <main className="app-main" key={location.pathname}>
        <div className="page-enter">
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/submit" element={<SubmitPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
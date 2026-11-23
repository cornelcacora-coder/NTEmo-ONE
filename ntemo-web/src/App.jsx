import React, { useState, useEffect } from "react";
import KioskView from "./components/kiosk/KioskView";
import AdminLogin from "./components/admin/AdminLogin";
import AdminPortal from "./components/admin/AdminPortal";

export default function App() {
  const [currentView, setCurrentView] = useState("kiosk"); // 'kiosk' | 'login' | 'admin'
  const [activeAdmin, setActiveAdmin] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ntemo_active_admin");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          setActiveAdmin(parsed);
        }
      }
    } catch (_) {}
  }, []);

  const handleOpenAdminFromKiosk = () => {
    if (activeAdmin) {
      setCurrentView("admin");
    } else {
      setCurrentView("login");
    }
  };

  const handleLoginSuccess = (user) => {
    setActiveAdmin(user);
    setCurrentView("admin");
  };

  const handleLogout = () => {
    localStorage.removeItem("ntemo_active_admin");
    setActiveAdmin(null);
    setCurrentView("login");
  };

  return (
    <div className="min-h-screen">
      {currentView === "kiosk" && (
        <KioskView onOpenAdmin={handleOpenAdminFromKiosk} />
      )}

      {currentView === "login" && (
        <AdminLogin 
          onLoginSuccess={handleLoginSuccess}
          onBackToKiosk={() => setCurrentView("kiosk")}
        />
      )}

      {currentView === "admin" && (
        <AdminPortal 
          currentAdmin={activeAdmin}
          onOpenKiosk={() => setCurrentView("kiosk")}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

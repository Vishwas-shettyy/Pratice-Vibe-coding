import React, { useState, useEffect } from "react";
import logoSrc from "../assets/image.png";
import OfficerProfileModal from "./OfficerProfileModal";
import { authApi } from "../utils/authApi";

const getNavIcon = (id) => {
  switch (id) {
    case "overview": return <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>;
    case "map": return <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>;
    case "redzones": return <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>;
    case "safesites": return <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
    case "relocation": return <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>; // or routing icon
    case "analytics": return <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
    case "resources": return <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>;
    case "simulator": return <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>;
    default: return null;
  }
};

function HeaderTopbar({ 
  activeTab, setActiveTab, alertCount,
  title, subtitle, onTriggerEmergency, onExportReport, latestAlert, backendOnline, isHarshCaseActive, onToggleHarshCase
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [officerProfile, setOfficerProfile] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Auth states
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSuccess, setGeoSuccess] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (event.target.closest('.sign-in-modal-overlay')) return;
        setProfileOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [profileOpen]);

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        const res = await authApi.me();
        if (res.ok && mounted) {
          handleSaveProfile(res.data);
        } else {
          // fallback to localStorage
          try {
            const saved = localStorage.getItem("resq_officer_profile");
            if (saved && mounted) setOfficerProfile(JSON.parse(saved));
          } catch(e) {}
        }
      } catch (err) {
        // network error
        try {
          const saved = localStorage.getItem("resq_officer_profile");
          if (saved && mounted) setOfficerProfile(JSON.parse(saved));
        } catch(e) {}
      }
    };
    initAuth();
    return () => mounted = false;
  }, []);

  const handleSaveProfile = async (data) => {
    localStorage.setItem("resq_officer_profile", JSON.stringify(data));
    setOfficerProfile(data);
    
    // Also save to backend
    try {
      await authApi.updateProfile(data);
    } catch(e) {}
  };

  const handleLogout = async () => {
    setOfficerProfile(null);
    setProfileOpen(false);
    try {
      await authApi.logout();
    } catch(e) {}
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      if (isLoginMode) {
        const res = await authApi.login(authEmail, authPassword);
        if (res.ok) {
          handleSaveProfile(res.data);
        } else {
          setAuthError(res.error?.message || "Login failed");
        }
      } else {
        const res = await authApi.register({ email: authEmail, password: authPassword, full_name: authName });
        if (res.ok) {
          const loginRes = await authApi.login(authEmail, authPassword);
          if (loginRes.ok) {
            handleSaveProfile(loginRes.data);
          }
        } else {
          setAuthError(res.error?.message || "Registration failed");
        }
      }
    } catch(err) {
      setAuthError("Network error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (officerProfile) {
          const updated = {
            ...officerProfile,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          };
          handleSaveProfile(updated);
        }
        setGeoLoading(false);
        setGeoSuccess(true);
        setTimeout(() => setGeoSuccess(false), 3000);
      },
      (error) => {
        setGeoLoading(false);
      }
    );
  };

  const getInitials = (name) => {
    if (!name) return 'US';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll-container");
    if (!scrollContainer) return;
    
    const handleScroll = (e) => {
      setIsScrolled(e.target.scrollTop > 10);
    };
    
    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = [
    { id: "overview", label: "Dashboard" },
    { id: "map", label: "Risk Map" },
    { id: "redzones", label: "Red Zones", badge: alertCount },
    { id: "safesites", label: "Safe Sites" },
    { id: "relocation", label: "AI Route" },
    { id: "analytics", label: "Reports" },
    { id: "resources", label: "Resources" },
    { id: "simulator", label: "Simulator" }
  ];

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 1000, padding: "16px 24px 0", pointerEvents: "none" }}>
      <style>{`
        @keyframes profileDropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .profile-dropdown {
          animation: profileDropdownFadeIn 0.2s ease-out forwards;
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUpFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <header 
        style={{ 
          pointerEvents: "auto",
          background: isScrolled ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.62)",
          backdropFilter: isScrolled ? "blur(32px) saturate(160%)" : "blur(24px) saturate(150%)", 
          WebkitBackdropFilter: isScrolled ? "blur(32px) saturate(160%)" : "blur(24px) saturate(150%)",
          border: isScrolled ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.65)",
          boxShadow: isScrolled ? "0 4px 20px rgba(30, 50, 80, 0.05)" : "0 10px 35px rgba(30, 50, 80, 0.08)",
          borderRadius: "24px",
          padding: "14px 20px 10px",
          display: "flex", flexDirection: "column", gap: "16px",
          transition: "all 0.3s ease",
          width: "100%", margin: "0 auto",
          position: "relative"
        }}
      >
        {/* Very subtle glass highlight at the top edge */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)", zIndex: 0 }} />
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          
          {/* LEFT: Logo & Title (Grouped closely) */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="resq-logo-interactive" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => setActiveTab("overview")}>
              <div style={{ width: "26px", height: "26px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                 <img src={logoSrc} alt="RESQ Symbol" style={{ width: "100%", height: "100%", objectFit: 'contain' }} />
              </div>
              <div style={{
                color: "var(--text-primary)", fontFamily: "var(--font-display)", fontSize: "20px",
                fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase", lineHeight: "1"
              }}>RESQ</div>
            </div>

            <div style={{ width: "1px", height: "32px", background: "rgba(148, 163, 184, 0.3)", margin: "0 4px" }} />

            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", transition: "opacity 0.2s" }}>
              <h1 className="title-interactive" style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)", lineHeight: "1.2", cursor: "default" }}>
                Disaster Intelligence Command Center
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: backendOnline ? "var(--accent-safe)" : "var(--accent-warning)", letterSpacing: "0.5px" }}>
                <span style={{ fontSize: "8px" }}>●</span>
                {backendOnline ? "System Online - Flask Backend Connected" : "System Offline - Local Fallback Data"}
              </div>
            </div>
          </div>

          {/* RIGHT: Controls & Metadata */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            
            {/* Action Buttons Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button className="action-btn emergency-btn" style={{
                background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--accent-critical)",
                padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px"
              }} 
              onClick={onTriggerEmergency}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Emergency Broadcast
              </button>
              
              <button className="action-btn" style={{
                background: "#ffffff", border: "1px solid var(--border-color)", color: "var(--text-secondary)",
                padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
              }} 
              onClick={onExportReport}>
                <svg className="btn-icon-right" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export GIS
              </button>
              
              <button className="action-btn harsh-case-btn" style={{
                background: isHarshCaseActive ? "var(--accent-critical)" : "#172033", 
                border: isHarshCaseActive ? "1px solid var(--accent-critical)" : "1px solid #172033", 
                color: "#fff",
                padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px",
                boxShadow: isHarshCaseActive ? "0 2px 8px rgba(220,38,38,0.2)" : "0 2px 4px rgba(0,0,0,0.05)"
              }} 
              onClick={onToggleHarshCase}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff", display: "inline-block", boxShadow: isHarshCaseActive ? "0 0 4px #fff" : "none" }}></span>
                {isHarshCaseActive ? "HARSH CASE ON" : "HARSH CASE"}
              </button>

              {/* Profile Icon with Dropdown */}
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <button 
                  title="Profile"
                  className="action-btn profile-btn-hover"
                  onClick={() => setProfileOpen(!profileOpen)}
                  style={{
                    background: "linear-gradient(135deg, var(--bg-secondary) 0%, #e2e8f0 100%)", border: "1px solid rgba(148, 163, 184, 0.4)", color: "var(--text-primary)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    borderRadius: "20px", padding: "4px 12px 4px 6px", marginLeft: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)", transition: "transform 0.15s ease, box-shadow 0.15s ease"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.15)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.4)"; }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: "50%", width: "24px", height: "24px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)" }}>
                    {officerProfile?.profileImage ? (
                      <img src={officerProfile.profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    )}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "700" }}>{officerProfile ? getInitials(officerProfile.fullName) : "US"}</span>
                </button>

                {profileOpen && officerProfile && (
                  <div className="profile-dropdown" style={{
                    position: "absolute", top: "calc(100% + 12px)", right: 0,
                    background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(148, 163, 184, 0.25)", borderRadius: "16px",
                    boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
                    width: "340px", padding: "16px", zIndex: 2000,
                    display: "flex", flexDirection: "column"
                  }}>
                    <>
                      <div style={{ padding: "0 4px", color: "var(--text-secondary)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Officer Profile</div>
                      <div style={{ display: "flex", gap: "12px", marginTop: "12px", padding: "0 4px" }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", border: "1px solid rgba(148,163,184,0.2)" }}>
                          {officerProfile.profileImage ? (
                            <img src={officerProfile.profileImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{getInitials(officerProfile.fullName)}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{officerProfile.fullName}</div>
                          <div style={{ fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{officerProfile.designation || "Officer"}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>{officerProfile.officerId || "ID NOT SET"}</div>
                        </div>
                      </div>
                      
                      <div style={{ background: "rgba(15,23,42,0.02)", borderRadius: "10px", padding: "10px 12px", marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>{officerProfile.department || "Department not set"}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ opacity: 0.8 }}>📍</span> {officerProfile.location || "Location not set"}
                        </div>
                        {(officerProfile.district || officerProfile.state) && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "22px" }}>
                            {[officerProfile.district, officerProfile.state].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>

                      <div style={{ borderTop: "1px solid var(--border-color-subtle)", margin: "12px 0" }} />

                      <div style={{ padding: "0 4px", color: "var(--text-secondary)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Account</div>
                      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ opacity: 0.6 }}>✉️</span> {officerProfile.email || "No email"}
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ opacity: 0.6 }}>📞</span> {officerProfile.phone || "No phone"}
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid var(--border-color-subtle)", margin: "12px 0" }} />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <button className="action-btn" onClick={() => { setProfileModalOpen(true); setProfileOpen(false); }} style={{ padding: "8px", fontSize: "12px", borderRadius: "8px", justifyContent: "center" }}>View Profile</button>
                        <button className="action-btn" onClick={() => { setProfileModalOpen(true); setProfileOpen(false); }} style={{ padding: "8px", fontSize: "12px", borderRadius: "8px", justifyContent: "center" }}>Edit Profile</button>
                      </div>

                      <button className="action-btn" onClick={handleGetCurrentLocation} style={{ padding: "8px", fontSize: "12px", borderRadius: "8px", justifyContent: "center", width: "100%", marginTop: "8px" }}>
                        {geoLoading ? "Obtaining Location..." : geoSuccess ? "Location Saved ✓" : "Use Current Location"}
                      </button>

                      <button className="action-btn" onClick={handleLogout} style={{ padding: "8px", fontSize: "12px", borderRadius: "8px", justifyContent: "center", width: "100%", marginTop: "8px", color: "var(--accent-critical)", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        Log Out
                      </button>
                    </>
                  </div>
                )}
              </div>
            </div>

            {/* LOCATION + DATE ROW */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", paddingRight: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px", opacity: 0.8 }}>📍</span> Kodagu, Karnataka
              </div>
              <span style={{ color: "rgba(148, 163, 184, 0.4)" }}>|</span>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px", opacity: 0.8 }}>📅</span> {formatDate(currentTime)}
              </div>
              <span style={{ color: "rgba(148, 163, 184, 0.4)" }}>|</span>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px", opacity: 0.8 }}>🕘</span> {formatTime(currentTime)}
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM NAV BAR */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {menuItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-pill ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background: isActive ? "rgba(59, 130, 246, 0.12)" : "transparent",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: isActive ? "0 0 0 1px rgba(59,130,246,0.15), 0 4px 14px rgba(59,130,246,0.18)" : "none"
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.7, display: "flex" }}>{getNavIcon(item.id)}</span>
                {item.label}
                {item.badge ? (
                  <span style={{
                    fontSize: "10px", fontWeight: "700", padding: "2px 6px", marginLeft: "2px",
                    borderRadius: "999px", background: isActive ? "var(--accent-blue)" : "var(--accent-critical)", color: "#fff"
                  }}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </header>

      {/* ALERT STRIP */}
      {latestAlert && (
        <div style={{ 
          background: "rgba(255, 255, 255, 0.9)", 
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(239, 68, 68, 0.2)", 
          borderTop: "none",
          borderRadius: "0 0 16px 16px",
          padding: "10px 24px", 
          display: "flex", alignItems: "flex-start", gap: "16px",
          margin: "0 20px",
          boxShadow: "0 4px 15px rgba(239, 68, 68, 0.05)",
          pointerEvents: "auto"
        }}>
          <div style={{ background: "var(--accent-red)", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "6px", letterSpacing: "1px", flexShrink: 0, marginTop: "2px" }}>
            {latestAlert.severity?.toUpperCase() || "LIVE ALERT"}
          </div>
          {latestAlert.id && !latestAlert.id.startsWith("ALT-SIM-") && (
            <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "6px", letterSpacing: "1px", flexShrink: 0, marginTop: "2px" }}>
              DEMO DATA
            </div>
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ color: "var(--accent-red)", fontSize: "14px", fontWeight: 700 }}>
              {latestAlert.title}
              {latestAlert.area && <span style={{ color: "var(--text-secondary)", fontWeight: 600, marginLeft: "8px" }}>— {latestAlert.area}</span>}
            </div>
            <div style={{ color: "var(--text-primary)", fontSize: "12px", fontWeight: 500 }}>
              {latestAlert.message}
            </div>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, flexShrink: 0, marginTop: "4px" }}>
            {latestAlert.time || "Just now"}
          </div>
        </div>
      )}

      {/* OFFICER PROFILE MODAL */}
      <OfficerProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profile={officerProfile}
        setProfile={handleSaveProfile}
      />

      {/* SIGN IN MODAL OVERLAY */}
      {profileOpen && !officerProfile && (
        <div 
          className="sign-in-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999, // High enough to cover everything
            background: "rgba(15, 23, 42, 0.12)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: "backdropFadeIn 200ms ease-out forwards",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto"
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setProfileOpen(false);
            }
          }}
        >
          <div style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 24px 70px rgba(15,23,42,0.18)",
            borderRadius: "16px",
            width: "340px",
            padding: "24px",
            animation: "modalSlideUpFadeIn 200ms ease-out forwards",
            position: "relative",
            zIndex: 10000
          }}>
            <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>
                {isLoginMode ? "Sign in to ResQ" : "Create Account"}
              </div>
              {authError && <div style={{ color: "var(--accent-critical)", fontSize: "12px", background: "rgba(239,68,68,0.1)", padding: "6px 8px", borderRadius: "6px" }}>{authError}</div>}
              
              {!isLoginMode && (
                <input type="text" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "13px", background: "rgba(255,255,255,0.8)" }} />
              )}
              <input type="email" placeholder="Email Address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "13px", background: "rgba(255,255,255,0.8)" }} />
              <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "13px", background: "rgba(255,255,255,0.8)" }} />
              
              <button type="submit" className="action-btn primary" disabled={authLoading}
                style={{ width: "100%", padding: "10px", textAlign: "center", background: "var(--accent-blue)", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#fff", cursor: authLoading ? "not-allowed" : "pointer", marginTop: "4px" }}>
                {authLoading ? "Please wait..." : isLoginMode ? "Sign In" : "Register"}
              </button>
              
              <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", cursor: "pointer" }} onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(""); }}>
                {isLoginMode ? "Need an account? Register" : "Already have an account? Sign in"}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeaderTopbar;

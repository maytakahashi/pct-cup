import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./Layout";
import Login from "./Login";

import Dashboard from "./Dashboard";
import Schedule from "./Schedule";
import LeaderboardPage from "./LeaderboardPage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Never serve admin pages from bro frontend */}
        <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

        {/* App (protected by Layout, which must render <Outlet />) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="calendar" element={<Schedule />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

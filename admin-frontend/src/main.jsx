import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import AdminLayout from "./AdminLayout";
import AdminEvents from "./AdminEvents";
import AdminAttendance from "./AdminAttendance";
import AdminAlerts from "./AdminAlerts";
import AdminCheckpoints from "./AdminCheckpoints";
import AdminRequirements from "./AdminRequirements";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename="/control">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route path="/checkpoints" element={<AdminCheckpoints />} />
          <Route path="/requirements" element={<AdminRequirements />} />
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<AdminEvents />} />
          <Route path="/attendance" element={<AdminAttendance />} />
          <Route path="/alerts" element={<AdminAlerts />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

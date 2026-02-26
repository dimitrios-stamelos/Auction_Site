import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function AdminRoute() {
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")||"null"); } catch { return null; } })();
  if (!user || user.role !== 'ADMIN') return <Navigate to="/app" replace />;
  return <Outlet />;
}


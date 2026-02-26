import React, { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Typography, Box, Button, Badge } from "@mui/material";
import api from "../api/axiosClient";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")||"null"); } catch { return null; } })();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let t;
    const poll = async () => {
      try { const r = await api.get('/messages/unreadCount'); setUnread(r.data.count || 0); } catch {}
      t = setTimeout(poll, 10000);
    };
    poll();
    return () => t && clearTimeout(t);
  }, []);
  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const isDashboardActive = user?.role === 'ADMIN'
    ? location.pathname.startsWith('/app/admin') || location.pathname === '/app'
    : location.pathname === '/app';

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: "1px solid #e5e7eb" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Auction App</Typography>
          <Button component={Link} to="/app" color={isDashboardActive ? "primary" : "inherit"}>
            {user?.role === 'ADMIN' ? 'Admin Dashboard' : 'Dashboard'}
          </Button>
          <Button component={Link} to="/app/auctions" color={location.pathname.startsWith("/app/auctions") ? "primary" : "inherit"}>Auctions</Button>

          {/* Role-based actions */}
          {user?.role === 'SELLER' && (
            <Button component={Link} to="/app/new" color={location.pathname === "/app/new" ? "primary" : "inherit"}>New Auction</Button>
          )}
          {user?.role === 'SELLER' && (
            <Button component={Link} to="/app/my-auctions" color={location.pathname.startsWith("/app/my-auctions") ? "primary" : "inherit"}>My Auctions</Button>
          )}
          {user?.role === 'BIDDER' && (
            <Button component={Link} to="/app/my-bids" color={location.pathname.startsWith("/app/my-bids") ? "primary" : "inherit"}>My Bids</Button>
          )}
          {(user?.role === 'BIDDER' || user?.role === 'SELLER') && (
            <Button component={Link} to="/app/messages" color={location.pathname.startsWith("/app/messages") ? "primary" : "inherit"}>
              <Badge color="error" badgeContent={unread} invisible={!unread}>Messages</Badge>
            </Button>
          )}
          {/* Admin tab removed since dashboard points to admin landing for admins */}
          <Button onClick={logout} color="inherit">Logout</Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

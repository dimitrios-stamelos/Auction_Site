import React, { useEffect, useMemo, useState } from "react";
import { Typography, Box, Card, CardContent } from "@mui/material";
import api from "../api/axiosClient";
import { Link } from "react-router-dom";
import AuctionCard from "../components/AuctionCard";

export default function DashboardPage() {
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")||"null"); } catch { return null; } })();
  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Welcome{user?.username ? `, ${user.username}` : ""}
      </Typography>
      <Typography color="text.secondary">
        Use the top navigation to create auctions, browse, or check messages.
      </Typography>
      <Recommendations />
    </Box>
  );
}

function Recommendations() {
  const [items, setItems] = useState([]);
  const [myStatuses, setMyStatuses] = useState({});
  const [now, setNow] = useState(Date.now());
  useEffect(() => { (async () => { try { const r = await api.get('/auctions/recommendations'); const sorted = (r.data || []).slice().sort((a,b)=> new Date(a.endDate) - new Date(b.endDate)); setItems(sorted); } catch {} })(); }, []);
  useEffect(() => { (async () => { try { const r = await api.get('/auctions/my-bids'); const map = {}; for (const a of r.data || []) map[a.id] = a.isWinningForMe ? 'winning' : 'outbid'; setMyStatuses(map);} catch {} })(); }, []);
  // Tick every second to keep countdowns fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatRemaining = (end) => {
    const endMs = new Date(end).getTime();
    let diff = Math.floor((endMs - now) / 1000);
    if (isNaN(diff)) return "";
    if (diff <= 0) return "Ended";
    const w = Math.floor(diff / 604800); diff %= 604800;
    const d = Math.floor(diff / 86400); diff %= 86400;
    const h = Math.floor(diff / 3600); diff %= 3600;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    if (w === 0 && d === 0 && h === 0 && m === 0) return `${s}s`;
    const parts = [];
    if (w) parts.push(`${w}w`);
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    return parts.slice(0, 2).join(" ");
  };
  if (!items.length) return null;
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>Recommended for you</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', alignItems: 'stretch' }}>
        {items.map((a)=> (
          <AuctionCard key={a.id} auction={a} status={myStatuses[a.id]} />
        ))}
      </Box>
    </Box>
  );
}

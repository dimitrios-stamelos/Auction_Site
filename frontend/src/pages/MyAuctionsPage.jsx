import React, { useEffect, useState } from "react";
import api from "../api/axiosClient";
import { Box, Button, Card, CardContent, Typography, Alert } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import AuctionCard from "../components/AuctionCard";

export default function MyAuctionsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setErr("");
    try {
      const res = await api.get("/auctions/mine");
      setItems(res.data);
    } catch (e) { setErr(e.response?.data?.message || "Failed to load"); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try { await api.delete(`/auctions/${id}`); await load(); } catch (e) { setErr(e.response?.data?.message || "Delete failed"); }
  };
  const remaining = (end) => {
    const endMs = new Date(end).getTime();
    const diff = Math.floor((endMs - Date.now()) / 1000);
    if (diff <= 0) return "Ended";
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const d = Math.floor(diff / 86400);
    const pad = (n) => String(n).padStart(2, '0');
    return (d ? `${d}d ` : "") + `${pad(h)}:${pad(m)}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>My Auctions</Typography>
        <Button component={Link} to="/app/new" variant="contained">New Auction</Button>
      </Box>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {items.length ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {items.map((a)=> (
            <AuctionCard
              key={a.id}
              auction={a}
              showOwnerActions
              onDelete={() => remove(a.id)}
            />
          ))}
        </Box>
      ) : (
        <EmptyState
          title="No auctions created"
          description="You haven't created any auctions yet. Start by creating your first one."
          actionLabel="Create auction"
          href="/app/new"
        />
      )}
    </Box>
  );
}

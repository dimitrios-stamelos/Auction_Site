import React, { useEffect, useState } from "react";
import api from "../api/axiosClient";
import { Box, Typography, Alert, Button, Divider } from "@mui/material";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import AuctionCard from "../components/AuctionCard";

export default function MyBidsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const res = await api.get("/auctions/my-bids");
      setItems(res.data);
    } catch (e) { setErr(e.response?.data?.message || "Failed to load"); }
  };
  useEffect(() => { load(); }, []);

  const now = Date.now();
  const isEnded = (a) => new Date(a.endDate).getTime() <= now;
  const won = items.filter((a) => a.isWinningForMe && isEnded(a));
  const rest = items.filter((a) => !(a.isWinningForMe && isEnded(a)));

  const messageSeller = async (auction) => {
    try {
      const content = window.prompt(`Message to seller ${auction?.seller?.username || ''}`);
      if (!content) return;
      await api.post('/messages', { toUserId: auction.seller.id, content });
      alert('Message sent');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to send message');
    }
  };

  const remaining = (end) => {
    const endMs = new Date(end).getTime();
    const diff = Math.floor((endMs - Date.now()) / 1000);
    if (diff <= 0) return "Ended";
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const pad = (n) => String(n).padStart(2, '0');
    return (d ? `${d}d ` : "") + `${pad(h)}:${pad(m)}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>My Bids</Typography>
        <Button component={Link} to="/app/auctions" variant="outlined">Browse Auctions</Button>
      </Box>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {items.length ? (
        <>
          {won.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Won Auctions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2, justifyContent: 'center', alignItems: 'stretch' }}>
                {won.map((a)=> (
                  <AuctionCard key={`won-${a.id}`} auction={a} status={'winning'} messageSellerAction={() => messageSeller(a)} />
                ))}
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          <Typography variant="h6" sx={{ mb: 1 }}>
            Other Bids
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', alignItems: 'stretch' }}>
            {rest.map((a)=> (
              <AuctionCard key={a.id} auction={a} status={a.isWinningForMe ? 'winning' : 'outbid'} />
            ))}
          </Box>
        </>
      ) : (
        <EmptyState
          title="No bids yet"
          description="You haven't placed any bids yet. Explore auctions to start bidding."
          actionLabel="Explore auctions"
          href="/app/auctions"
        />
      )}
    </Box>
  );
}

import React, { useEffect, useState } from "react";
import api from "../api/axiosClient";
import { Box, TextField, Typography, Button, Autocomplete } from "@mui/material";
import { Link } from "react-router-dom";
import AuctionCard from "../components/AuctionCard";
import EmptyState from "../components/EmptyState";

export default function AuctionsListPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [minPrice, setMin] = useState("");
  const [maxPrice, setMax] = useState("");
  const [location, setLocation] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const pageSize = 9;
  const [myStatuses, setMyStatuses] = useState({}); // id -> 'winning'|'outbid'

  const load = async () => {
    const params = {};
    if (q) params.q = q;
    if (category) params.category = category;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (location) params.location = location;
    params.page = page;
    params.pageSize = pageSize;
    const res = await api.get("/auctions", { params });
    if (Array.isArray(res.data)) {
      setItems(res.data);
      setTotal(null);
    } else {
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    }
    // Also load my bid statuses (ignore errors if unauthorized)
    try {
      const r = await api.get("/auctions/my-bids");
      const map = {};
      for (const a of r.data || [])
        map[a.id] = a.isWinningForMe ? "winning" : "outbid";
      setMyStatuses(map);
    } catch {}
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { (async () => { try { const r = await api.get('/auctions/categories'); setCategories(r.data || []); } catch {} })(); }, []);
  const formatRemaining = (end) => {
    const endMs = new Date(end).getTime();
    const diff = Math.floor((endMs - Date.now()) / 1000);
    if (diff <= 0) return "Ended";
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const pad = (n) => String(n).padStart(2, "0");
    return (d ? `${d}d ` : "") + `${pad(h)}:${pad(m)}`;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 8,
          mb: 2,
          alignItems: "center",
        }}
      >
        <TextField
          label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
        />
        <Autocomplete
          options={categories}
          freeSolo
          value={category}
          onInputChange={(_, v)=> setCategory(v)}
          renderInput={(params)=> <TextField {...params} label="Category" size="small" />}
        />
        <TextField
          label="Min Price"
          type="number"
          value={minPrice}
          onChange={(e) => setMin(e.target.value)}
          size="small"
        />
        <TextField
          label="Max Price"
          type="number"
          value={maxPrice}
          onChange={(e) => setMax(e.target.value)}
          size="small"
        />
        <TextField
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          size="small"
        />
        <Button
          variant="contained"
          onClick={() => {
            setPage(1);
            load();
          }}
        >
          Search
        </Button>
      </Box>
      {items.length ? (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            justifyContent: 'center',
            alignItems: 'stretch',
          }}
        >
          {items.map((a) => (
            <AuctionCard key={a.id} auction={a} status={myStatuses[a.id]} />
          ))}
        </Box>
      ) : (
        <EmptyState
          title="No auctions found"
          description="Try adjusting your filters or search query."
          actionLabel="Clear filters"
          onAction={() => {
            setQ("");
            setCategory("");
            setMin("");
            setMax("");
            setLocation("");
            setPage(1);
            load();
          }}
        />
      )}
      {total != null && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            mt: "auto",
            pt: 2,
          }}
        >
          <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <Typography>
            Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </Typography>
          <Button
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </Box>
      )}
    </Box>
  );
}

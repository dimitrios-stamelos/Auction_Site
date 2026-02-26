import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axiosClient";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Stack,
  Paper,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Container,
  Grid,
  IconButton,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const IMAGE_ROTATION_MS = 5000;

class PageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('AuctionDetail crashed:', error, info); }
  render() {
    if (this.state.hasError) return <Box><Alert severity="error">Failed to render auction. Please go back.</Alert></Box>;
    return this.props.children;
  }
}

function AuctionDetailInner() {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")||"null"); } catch { return null; } })();

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/auctions/${id}`);
      setAuction(res.data);
    } catch {
      setErr("Failed to load auction");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Tick every second to update countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeLeft = useMemo(() => {
    if (!auction) return null;
    if (!auction.endDate) return null;
    const end = new Date(auction.endDate).getTime();
    const diff = Math.max(0, Math.floor((end - now) / 1000));
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return diff <= 0 ? "Ended" : (d ? `${d}d ` : "") + `${pad(h)}:${pad(m)}:${pad(s)}`;
  }, [auction, now]);

  // Compute current once based on auction
  const current = useMemo(() => Number(auction?.currentPrice ?? auction?.startPrice ?? 0), [auction?.currentPrice, auction?.startPrice]);
  // Suggest next bid when auction/current changes
  useEffect(() => {
    if (!auction) return;
    const suggested = Number(current) + 1;
    setAmount(String(suggested));
  }, [auction, current]);

  const bid = async () => {
    setMsg(""); setErr("");
    try {
      if (!window.confirm("Submit this bid? This action cannot be undone.")) return;
      await api.post(`/auctions/${id}/bids`, { amount: Number(amount) });
      setMsg("Bid placed.");
      setAmount("");
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || "Bid failed");
    }
  };

  const isEnded = useMemo(() => {
    if (!auction?.endDate) return false;
    return new Date(auction.endDate).getTime() <= now;
  }, [auction, now]);

  const isWinner = useMemo(() => {
    if (!auction || !Array.isArray(auction.bids) || !user) return false;
    let top = null;
    for (const b of auction.bids) {
      if (!top || Number(b.amount) > Number(top.amount)) top = b;
    }
    return top && top.bidderId === user.id;
  }, [auction, user]);

  const messageSeller = async () => {
    try {
      const content = window.prompt(`Message to seller ${auction?.seller?.username || ''}`);
      if (!content) return;
      await api.post('/messages', { toUserId: auction.seller.id, content });
      alert('Message sent');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to send message');
    }
  };

  const images = useMemo(() => (Array.isArray(auction?.images) ? auction.images.filter(Boolean) : []), [auction?.images]);
  const [activeImage, setActiveImage] = useState(0);
  const heroImage = images.length ? images[Math.min(activeImage, images.length - 1)] : null;

  useEffect(() => {
    if (images.length < 2) return undefined;
    const timer = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % images.length);
    }, IMAGE_ROTATION_MS);
    return () => clearInterval(timer);
  }, [images.length]);
  const bidsCount = auction?.bids?.length || 0;
  const statusVariant = useMemo(() => {
    if (timeLeft === "Ended") return { label: "Auction ended", color: "error" };
    if (!auction?.endDate) return { label: "No end date", color: "default" };
    return { label: `Time left: ${timeLeft}`, color: "primary" };
  }, [auction?.endDate, timeLeft]);
  const hasMap = auction?.latitude != null && auction?.longitude != null;

  if (!auction) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ display: "flex", flexDirection: "column", gap: 3.5, py: { xs: 2.5, md: 4 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          background: (theme) => `linear-gradient(130deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: (theme) => theme.palette.getContrastText(theme.palette.primary.main),
          overflow: "hidden",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={{ xs: 2, md: 3 }} alignItems={{ xs: "flex-start", md: "center" }}>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 1 }}>
              Lot #{auction.id}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ maxWidth: 720 }}>
              {auction.title}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
              <Chip
                label={auction.category || "Uncategorized"}
                color="secondary"
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.22)", color: "#fff" }}
              />
              {auction.location && (
                <Chip
                  label={auction.location}
                  variant="outlined"
                  size="small"
                  sx={{ borderColor: "rgba(255,255,255,0.35)", color: "#fff" }}
                />
              )}
              {auction.condition && (
                <Chip
                  label={auction.condition}
                  variant="outlined"
                  size="small"
                  sx={{ borderColor: "rgba(255,255,255,0.35)", color: "#fff" }}
                />
              )}
              <Chip
                label={statusVariant.label}
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", border: 0 }}
              />
            </Stack>
          </Box>
          <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={0.5}>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Seller
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 44, height: 44, bgcolor: "rgba(255,255,255,0.24)", color: "inherit" }}>
                {auction?.seller?.username?.slice(0, 1)?.toUpperCase() || "?"}
              </Avatar>
              <Typography fontWeight={600}>{auction?.seller?.username || "Unknown seller"}</Typography>
            </Stack>
            {auction?.seller?.rating && (
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                Rating: {Number(auction.seller.rating).toFixed(1)} ★
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gap: { xs: 3, md: 4 },
          gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', height: { xs: 220, md: 320 }, bgcolor: '#f3f4f6' }}>
              {heroImage ? (
                <Box
                  key={heroImage}
                  component="img"
                  src={heroImage}
                  alt="Primary auction item"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'opacity 400ms ease',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.disabled',
                    border: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Typography>No imagery provided for this lot.</Typography>
                </Box>
              )}
            </Box>
            {images.length > 1 && (
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                <IconButton size="small" onClick={() => setActiveImage((prev) => (prev - 1 + images.length) % images.length)} aria-label="Previous image">
                  <ChevronLeftIcon />
                </IconButton>
                <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, maxWidth: '100%' }}>
                  {images.map((src, i) => (
                    <Box
                      key={i}
                      component="img"
                      src={src}
                      alt={`Preview ${i + 1}`}
                      onClick={() => setActiveImage(i)}
                      sx={{
                        width: 72,
                        height: 72,
                        objectFit: "cover",
                        borderRadius: 2,
                        border: activeImage === i ? '2px solid' : '1px solid',
                        borderColor: activeImage === i ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        transition: 'transform 150ms ease',
                        '&:hover': {
                          transform: 'scale(1.04)',
                        },
                      }}
                    />
                  ))}
                </Stack>
                <IconButton size="small" onClick={() => setActiveImage((prev) => (prev + 1) % images.length)} aria-label="Next image">
                  <ChevronRightIcon />
                </IconButton>
              </Stack>
            )}
          </Paper>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, height: "100%", borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="h6" sx={{ mb: 1.25 }}>
                  Description
                </Typography>
                <Typography color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                  {auction.description || "No description was provided for this auction."}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, height: "100%", borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="h6" sx={{ mb: 1.25 }}>
                  Quick facts
                </Typography>
                <Stack spacing={1.1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Ends</Typography>
                    <Typography>{auction.endDate ? new Date(auction.endDate).toLocaleString() : "Not specified"}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Location</Typography>
                    <Typography>{auction.location || "Unknown"}</Typography>
                  </Stack>
                  {auction?.shippingDetails && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Shipping</Typography>
                      <Typography>{auction.shippingDetails}</Typography>
                    </Stack>
                  )}
                  {auction?.paymentDetails && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Payment</Typography>
                      <Typography>{auction.paymentDetails}</Typography>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Grid>

            {hasMap && (
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="h6" sx={{ mb: 1.25 }}>
                    Pickup location
                  </Typography>
                  <Box sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", height: { xs: 180, md: 200 } }}>
                    {(() => {
                      const lat = Number(auction.latitude);
                      const lon = Number(auction.longitude);
                      const d = 0.02;
                      const bbox = [lon - d, lat - d, lon + d, lat + d].join('%2C');
                      const marker = `${lat}%2C${lon}`;
                      const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
                      return <iframe title="map" width="100%" height="100%" frameBorder="0" src={src}></iframe>;
                    })()}
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Stack>

        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              background: (theme) => theme.palette.mode === "light" ? "rgba(38,103,255,0.06)" : theme.palette.background.paper,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 0.5, opacity: 0.8 }}>
              Current offer
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              ${Number(current).toFixed(2)}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Starting price
                </Typography>
                <Typography fontWeight={600}>${Number(auction.startPrice || 0).toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Bids placed
                </Typography>
                <Typography fontWeight={600}>{bidsCount}</Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.5}>
              <TextField
                label="Your bid"
                type="number"
                value={amount}
                onChange={(e)=>setAmount(e.target.value)}
                fullWidth
                inputProps={{ min: Number(current) + 1, step: 1 }}
                onFocus={(e)=> e.target.select()}
              />
              <Button size="large" variant="contained" onClick={bid} disabled={timeLeft === 'Ended'}>
                {timeLeft === 'Ended' ? 'Bidding closed' : 'Place my bid'}
              </Button>
              <Typography variant="caption" color="text.secondary">
                Minimum next bid: ${Number(current + 1).toFixed(2)}
              </Typography>
            </Stack>

            {msg && <Alert sx={{ mt: 2 }} severity="success">{msg}</Alert>}
            {err && <Alert sx={{ mt: 2 }} severity="error">{err}</Alert>}
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6" sx={{ mb: 1.25 }}>
              Recent bids
            </Typography>
            {bidsCount ? (
              <List dense disablePadding>
                {auction.bids.map((b, index) => (
                  <React.Fragment key={b.id}>
                    <ListItem sx={{ px: 0, py: 0.4 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: "rgba(38,103,255,0.12)", color: "primary.main", fontWeight: 600 }}>
                          {index + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`$${Number(b.amount).toFixed(2)}`}
                        secondary={new Date(b.time).toLocaleString()}
                      />
                    </ListItem>
                    {index !== bidsCount - 1 && <Divider component="div" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No bids yet. Be the first to make an offer.</Typography>
            )}
          </Paper>

          {isEnded && isWinner && auction?.seller && (
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Congratulations!
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                You placed the winning bid. Reach out to the seller to arrange payment and delivery.
              </Typography>
              <Button fullWidth variant="outlined" onClick={messageSeller}>
                Message seller
              </Button>
            </Paper>
          )}
        </Stack>
      </Box>
    </Container>
  );
}

export default function AuctionDetailPage() {
  return (
    <PageErrorBoundary>
      <AuctionDetailInner />
    </PageErrorBoundary>
  );
}

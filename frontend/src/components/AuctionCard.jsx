import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, Typography, Box, Chip, Button, CardActions } from "@mui/material";
import { Link } from "react-router-dom";

// Compact two-unit remaining time: weeks/days/hours/minutes; seconds only under 1m
function useRemaining(endDate) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return useMemo(() => {
    if (!endDate) return { text: "", ended: false };
    let diff = Math.floor((new Date(endDate).getTime() - now) / 1000);
    if (diff <= 0 || isNaN(diff)) return { text: "Ended", ended: true };
    const w = Math.floor(diff / 604800);
    diff %= 604800;
    const d = Math.floor(diff / 86400);
    diff %= 86400;
    const h = Math.floor(diff / 3600);
    diff %= 3600;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    if (w === 0 && d === 0 && h === 0 && m === 0)
      return { text: `${s}s`, ended: false };
    const parts = [];
    if (w) parts.push(`${w}w`);
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    return { text: parts.slice(0, 2).join(" "), ended: false };
  }, [endDate, now]);
}

export default function AuctionCard({ auction, status, showOwnerActions = false, onDelete, messageSellerAction }) {
  const { text, ended } = useRemaining(auction.endDate);
  const startPrice = Number(auction.startPrice ?? 0);
  const currentPrice = Number(auction.currentPrice ?? 0);
  const hasBids = currentPrice > startPrice;
  const image =
    Array.isArray(auction.images) && auction.images.length > 0
      ? auction.images[0]
      : null;

  // Fixed sizing for all cards
  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 380; // includes image + content + actions

  // Neutral base card; only the inner surface is status-tinted
  const baseCardStyle = () => ({
    textDecoration: "none",
    borderRadius: 3,
    bgcolor: '#ffffff',
    border: "1px solid rgba(0,0,0,0.08)",
    overflow: "hidden",
    transition: "transform 200ms ease, box-shadow 200ms ease, filter 200ms ease",
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    "&:hover": {
      transform: "translateY(-6px)",
      boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
      filter: "saturate(1.04)",
    },
  });

  const surfaceStyle = () => {
    if (status === "winning") {
      return {
        background:
          "linear-gradient(180deg, rgba(16,185,129,0.18), rgba(16,185,129,0.10))",
        border: "1px solid rgba(16,185,129,0.35)",
        boxShadow: "0 8px 26px rgba(16,185,129,0.20)",
        borderRadius: 8,
        padding: "1.6rem",
      };
    }
    if (status === "outbid") {
      return {
        background:
          "linear-gradient(180deg, rgba(245,158,11,0.20), rgba(245,158,11,0.12))",
        border: "1px solid rgba(245,158,11,0.40)",
        boxShadow: "0 8px 26px rgba(245,158,11,0.22)",
        borderRadius: 8,
        padding: "1.6rem",
      };
    }
    return { borderRadius: 8, padding: "1.6rem" };
  };

  const canMessageSeller = Boolean(messageSellerAction);
  const isWinOverlay = canMessageSeller && status === "winning" && ended;

  return (
    <Box sx={(theme) => ({
      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
      borderRadius: 3,
      p: 1.2,
      width: CARD_WIDTH,
    })}>
    <Card
      component={Link}
      to={`/app/auctions/${auction.id}`}
      sx={{
        ...baseCardStyle(),
        height: CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover .won-action': isWinOverlay ? {
          opacity: 1,
          transform: 'scale(1)',
          pointerEvents: 'auto',
        } : undefined,
      }}
    >
      <Box sx={{ position: "relative", height: 160, bgcolor: "#f3f4f6", overflow: 'hidden', flex: '0 0 auto' }}>
        {image ? (
          <Box
            component="img"
            src={image}
            alt="auction"
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #eef2ff, #f1f5f9)",
            }}
          />
        )}
        {/* subtle gradient overlay for better text contrast */}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 100%)' }} />
        {status && (
          <Chip
            label={status === "winning" ? (ended ? "Won" : "Winning") : "Outbid"}
            color={status === "winning" ? "success" : "warning"}
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              left: 8,
              fontWeight: 700,
              backdropFilter: "blur(2px)",
            }}
          />
        )}
        <Chip
          label={text || ""}
          color={ended ? "default" : "primary"}
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: ended ? "error.light" : undefined,
            fontWeight: 700,
            backdropFilter: "blur(2px)",
          }}
        />
      </Box>
      <CardContent sx={{ p: 2, flex: '1 1 auto' }}>
        <Box sx={{ ...surfaceStyle(), textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 0.5 }}>
            {auction.category}
          </Typography>
          <Typography variant="subtitle1" fontWeight={900} gutterBottom noWrap>
            {auction.title}
          </Typography>
          {auction?.seller?.username && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Created by {auction.seller.username}
            </Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 4, mt: 1 }}>
            <Box sx={{ minWidth: 80 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'none' }}>Start Price</Typography>
              <Typography variant="subtitle1" fontWeight={800}>${startPrice.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ minWidth: 80 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'none' }}>Current Bid</Typography>
              <Typography variant="h6" fontWeight={800}>{hasBids ? `$${currentPrice.toFixed(2)}` : '-'}</Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
      {showOwnerActions && (
        <CardActions sx={{ px: 1.5, pt: 0, pb: 3, gap: 1.2, mt: 'auto', justifyContent: 'center' }} onClick={(e)=>e.stopPropagation()}>
          <Button size="small" variant="outlined" component={Link} to={`/app/auctions/${auction.id}/edit`}>Edit</Button>
          <Button size="small" color="error" variant="outlined" onClick={(e)=>{ e.preventDefault(); onDelete && onDelete(); }}>Delete</Button>
          <Button size="small" component={Link} to={`/app/auctions/${auction.id}`}>View</Button>
        </CardActions>
      )}
      {isWinOverlay && (
        <Box
          className="won-action"
          sx={{
            position: 'absolute',
            inset: 0,
            transform: 'scale(0.96)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: { xs: 1, sm: 0 },
            pointerEvents: { xs: 'auto', sm: 'none' },
            transition: 'opacity 220ms ease, transform 220ms ease',
            backdropFilter: 'blur(4px)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.35))',
            border: '1px solid rgba(255,255,255,0.45)',
            borderRadius: 3,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
            padding: { xs: 2, sm: 2.5 },
          }}
        >
          <Button
            size="small"
            fullWidth
            variant="contained"
            onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); messageSellerAction(); }}
            sx={{
              fontWeight: 700,
              boxShadow: '0 16px 28px rgba(38,103,255,0.24)',
              maxWidth: 220,
              zIndex: 1,
            }}
          >
            Message seller
          </Button>
        </Box>
      )}
    </Card>
    </Box>
  );
}

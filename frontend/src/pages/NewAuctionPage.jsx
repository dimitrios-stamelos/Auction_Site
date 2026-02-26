import React, { useState } from "react";
import api from "../api/axiosClient";
import {
  Box,
  TextField,
  Button,
  Alert,
  IconButton,
  Typography,
  Stack,
  Paper,
  Divider,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ImageIcon from "@mui/icons-material/Image";

export default function NewAuctionPage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    startPrice: "",
    buyPrice: "",
    startDate: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    location: "",
    latitude: "",
    longitude: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  // Build previews when files change
  React.useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const removeAt = (i) => setFiles((arr) => arr.filter((_, idx) => idx !== i));
  const clearAll = () => setFiles([]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      const payload = { ...form, startPrice: Number(form.startPrice || 0), buyPrice: form.buyPrice ? Number(form.buyPrice) : undefined, startDate: new Date(form.startDate), endDate: new Date(form.endDate), latitude: form.latitude ? Number(form.latitude) : undefined, longitude: form.longitude ? Number(form.longitude) : undefined };
      const res = await api.post("/auctions", payload);
      const created = res.data;
      // Upload images if any
      if (files.length) {
        const fd = new FormData();
        files.forEach((f) => fd.append("images", f));
        await api.post(`/auctions/${created.id}/images`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setMsg("Auction created.");
      setForm((f) => ({ ...f, title: "", description: "", category: "", startPrice: "", buyPrice: "", location: "", latitude: "", longitude: "" }));
      setFiles([]);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to create auction");
    }
  };

  return (
    <Stack spacing={4} sx={{ py: 3 }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid", borderColor: "divider", background: (theme) => theme.palette.background.paper }}>
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Chip label="New listing" color="primary" variant="outlined" sx={{ alignSelf: 'flex-start', fontWeight: 600 }} />
          <Typography variant="h4" fontWeight={800}>Create a new auction</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 640 }}>
            Share the essentials buyers need: clear title, rich description, accurate pricing, and high-quality imagery. You can always update the listing later.
          </Typography>
        </Stack>

        <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Title" name="title" value={form.title} onChange={onChange} required fullWidth helperText="Give buyers a concise, compelling headline." />
              <TextField label="Category" name="category" value={form.category} onChange={onChange} fullWidth helperText="Optional but recommended for discoverability." />
            </Stack>
            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={onChange}
              fullWidth
              multiline
              minRows={4}
              placeholder="Highlight key features, condition, and any extras included with the item."
            />
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>Pricing & availability</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Start price" name="startPrice" value={form.startPrice} onChange={onChange} type="number" fullWidth inputProps={{ min: 0, step: '0.01' }} />
              <TextField label="Buy now price" name="buyPrice" value={form.buyPrice} onChange={onChange} type="number" fullWidth inputProps={{ min: 0, step: '0.01' }} helperText="Optional immediate purchase price" />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Start date" name="startDate" value={form.startDate} onChange={onChange} type="datetime-local" fullWidth />
              <TextField label="End date" name="endDate" value={form.endDate} onChange={onChange} type="datetime-local" fullWidth />
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>Item location</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Location" name="location" value={form.location} onChange={onChange} fullWidth placeholder="e.g. Athens, Greece" helperText="We will centre the map on this location if coordinates are not provided." />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Latitude" name="latitude" value={form.latitude} onChange={onChange} type="number" inputProps={{ step: 'any' }} fullWidth helperText="Optional precise coordinate" />
              <TextField label="Longitude" name="longitude" value={form.longitude} onChange={onChange} type="number" inputProps={{ step: 'any' }} fullWidth helperText="Optional precise coordinate" />
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>Gallery</Typography>
            <Box
              sx={{
                position: 'relative',
                border: '1px dashed',
                borderColor: previews.length ? 'divider' : 'primary.main',
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(38,103,255,0.05), rgba(161,98,247,0.05))',
                p: { xs: 3, md: 4 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 1.5,
              }}
            >
              <CloudUploadIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography fontWeight={600}>Drag & drop images or click to upload</Typography>
              <Typography variant="body2" color="text.secondary">PNG, JPG up to 5MB each. Include multiple angles for buyer confidence.</Typography>
              <Button
                variant="outlined"
                startIcon={<ImageIcon />}
                component="label"
              >
                Select images
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </Button>
              {!!previews.length && (
                <Stack spacing={1} sx={{ width: '100%', mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {previews.map((src, i) => (
                      <Box key={i} sx={{ position: 'relative', width: 120, height: 120 }}>
                        <img src={src} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.35)' }} />
                        <IconButton size="small" onClick={() => removeAt(i)} sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', boxShadow: 2 }} aria-label="remove image">
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                  <Button size="small" color="secondary" onClick={clearAll} sx={{ alignSelf: 'center' }}>Remove all</Button>
                </Stack>
              )}
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Button type="submit" variant="contained" size="large" sx={{ minWidth: 180 }}>Publish auction</Button>
            <Typography variant="body2" color="text.secondary">
              You can edit or pause the listing after submission via My Auctions.
            </Typography>
          </Stack>

          {msg && <Alert sx={{ mt: 1 }} severity="success">{msg}</Alert>}
          {err && <Alert sx={{ mt: 1 }} severity="error">{err}</Alert>}
        </Box>
      </Paper>
    </Stack>
  );
}

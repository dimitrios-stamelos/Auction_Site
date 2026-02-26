import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axiosClient";
import { Box, TextField, Button, Alert } from "@mui/material";
import Grid from "@mui/material/Grid";

export default function EditAuctionPage() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const load = async () => {
    setErr("");
    try {
      const res = await api.get(`/auctions/${id}`);
      const a = res.data;
      setForm({
        title: a.title,
        description: a.description || "",
        category: a.category || "",
        startPrice: a.startPrice,
        buyPrice: a.buyPrice ?? "",
        startDate: new Date(a.startDate).toISOString().slice(0,16),
        endDate: new Date(a.endDate).toISOString().slice(0,16),
        location: a.location || "",
      });
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load");
    }
  };
  useEffect(() => { load(); }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      const payload = { ...form, startPrice: Number(form.startPrice || 0), buyPrice: form.buyPrice ? Number(form.buyPrice) : undefined, startDate: new Date(form.startDate), endDate: new Date(form.endDate) };
      await api.patch(`/auctions/${id}`, payload);
      setMsg("Auction updated.");
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to update auction");
    }
  };

  if (!form) return null;
  return (
    <Box component="form" onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label="Title" name="title" value={form.title} onChange={onChange} fullWidth required />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label="Category" name="category" value={form.category} onChange={onChange} fullWidth />
        </Grid>
        <Grid size={12}>
          <TextField label="Description" name="description" value={form.description} onChange={onChange} fullWidth multiline rows={3} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField label="Start Price" name="startPrice" value={form.startPrice} onChange={onChange} fullWidth type="number" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField label="Buy Price" name="buyPrice" value={form.buyPrice} onChange={onChange} fullWidth type="number" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField label="Location" name="location" value={form.location} onChange={onChange} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label="Start Date" name="startDate" value={form.startDate} onChange={onChange} fullWidth type="datetime-local" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label="End Date" name="endDate" value={form.endDate} onChange={onChange} fullWidth type="datetime-local" />
        </Grid>
      </Grid>
      <Button type="submit" variant="contained" sx={{ mt: 2 }}>Save</Button>
      {msg && <Alert sx={{ mt: 2 }} severity="success">{msg}</Alert>}
      {err && <Alert sx={{ mt: 2 }} severity="error">{err}</Alert>}
    </Box>
  );
}


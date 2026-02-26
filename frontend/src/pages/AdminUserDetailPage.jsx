import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import { Box, Typography, Grid, TextField, Chip, Button, Alert, MenuItem, Stack } from "@mui/material";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [role, setRole] = useState("");
  const [changed, setChanged] = useState(false);
  const displayName = user => {
    if (!user) return "";
    const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return full || user.username || `User #${user.id}`;
  };

  const load = async () => {
    setErr(""); setMsg("");
    try {
      const res = await api.get(`/admin/users/${id}`);
      setUser(res.data);
      setRole(res.data.role);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load user");
    }
  };
  useEffect(() => { load(); }, [id]);

  const approve = async () => {
    setErr(""); setMsg("");
    try { await api.patch(`/admin/users/${id}/approve`, { role }); await load(); setMsg("User approved."); setChanged(true); } catch (e) { setErr(e.response?.data?.message || "Failed to approve"); }
  };
  const saveRole = async () => {
    setErr(""); setMsg("");
    try { await api.patch(`/admin/users/${id}/approve`, { role }); await load(); setMsg("Role updated."); setChanged(true); } catch (e) { setErr(e.response?.data?.message || "Failed to update role"); }
  };
  const removeUser = async () => {
    setErr(""); setMsg("");
    const ok = window.confirm(`Delete user "${user?.username}" and all related data? This cannot be undone.`);
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${id}`);
      navigate('/app/admin/users', { replace: true, state: { reload: Date.now() } });
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to delete user");
    }
  };

  if (!user) return null;

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Button variant="text" onClick={() => navigate('/app/admin/users', { replace: true, state: { reload: Date.now() } })}>Back</Button>
        <Typography variant="h5" fontWeight={800}>{displayName(user)}</Typography>
        <Chip label={user.approved ? 'Approved' : 'Pending'} color={user.approved ? 'success' : 'default'} size="small" />
      </Stack>

      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}><TextField label="Username" value={user.username||''} fullWidth InputProps={{ readOnly: true }} /></Grid>
        <Grid item xs={12} md={4}><TextField label="Email" value={user.email||''} fullWidth InputProps={{ readOnly: true }} /></Grid>
        <Grid item xs={12} md={4}>
          <TextField
            select
            fullWidth
            label="Role"
            value={role}
            onChange={(e)=>setRole(e.target.value)}
            disabled={user.role === 'ADMIN'}
          >
            <MenuItem value="VISITOR">VISITOR</MenuItem>
            <MenuItem value="BIDDER">BIDDER</MenuItem>
            <MenuItem value="SELLER">SELLER</MenuItem>
            <MenuItem value="ADMIN">ADMIN</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}><TextField label="First Name" value={user.firstName||''} fullWidth InputProps={{ readOnly: true }} /></Grid>
        <Grid item xs={12} md={4}><TextField label="Last Name" value={user.lastName||''} fullWidth InputProps={{ readOnly: true }} /></Grid>
        <Grid item xs={12} md={4}><TextField label="Phone" value={user.phone||''} fullWidth InputProps={{ readOnly: true }} /></Grid>
        <Grid item xs={12} md={4}><TextField label="Address" value={user.address||''} fullWidth InputProps={{ readOnly: true }} /></Grid>
        <Grid item xs={12} md={4}><TextField label="City" value={user.city||''} fullWidth InputProps={{ readOnly: true }} /></Grid>
        <Grid item xs={12} md={4}><TextField label="Country" value={user.country||''} fullWidth InputProps={{ readOnly: true }} /></Grid>
        <Grid item xs={12} md={4}><TextField label="AFM" value={user.afm||''} fullWidth InputProps={{ readOnly: true }} /></Grid>
        <Grid item xs={12} md={4}><TextField label="Rating" value={user.rating||0} fullWidth InputProps={{ readOnly: true }} /></Grid>
      </Grid>

      <Stack direction="row" spacing={1}>
        {!user.approved && (
          <Button variant="contained" onClick={approve}>Approve</Button>
        )}
        {user.role !== 'ADMIN' && (
          <Button variant="outlined" onClick={saveRole}>Save Role</Button>
        )}
        {user.role !== 'ADMIN' && (
          <Button color="error" variant="outlined" onClick={removeUser}>Delete User</Button>
        )}
      </Stack>
    </Box>
  );
}

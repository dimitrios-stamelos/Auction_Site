import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Chip, Alert, Select, MenuItem, Box, Stack, TextField, Typography } from "@mui/material";
import EmptyState from "../components/EmptyState";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [approved, setApproved] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const pageSize = 10;
  const location = useLocation();
  const navigate = useNavigate();

  const load = async () => {
    setErr("");
    try {
      const params = { page, pageSize, _ts: Date.now() }; // bust any intermediary caches
      if (q) params.q = q;
      if (role) params.role = role;
      if (approved !== "") params.approved = approved;
      const res = await api.get("/admin/users", { params });
      if (Array.isArray(res.data)) { setUsers(res.data); setTotal(null); }
      else { setUsers(res.data.items || []); setTotal(res.data.total || 0); }
    } catch (e) {
      setErr(e.response?.data?.message || "Not authorized or failed to load");
    }
  };
  // Reload when page changes or when we navigate back to this route
  useEffect(() => { load(); }, [page, location.key]);
  // Also react to explicit reload signals via navigation state
  useEffect(() => { if (location.state?.reload) load(); }, [location.state?.reload]);

  const approve = async (id) => {
    try { await api.patch(`/admin/users/${id}/approve`, {}); await load(); } catch {}
  };
  const removeUser = async (id, username) => {
    setErr("");
    const ok = window.confirm(`Delete user "${username}" and all related data? This cannot be undone.`);
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${id}`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to delete user");
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={async ()=>{
          try { const r = await api.get('/export/auctions.json', { responseType: 'blob' }); const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'auctions.json'; a.click(); URL.revokeObjectURL(url);} catch {}
        }}>Export JSON</Button>
        <Button variant="outlined" onClick={async ()=>{
          try { const r = await api.get('/export/auctions.xml', { responseType: 'blob' }); const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'auctions.xml'; a.click(); URL.revokeObjectURL(url);} catch {}
        }}>Export XML</Button>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField size="small" label="Search" value={q} onChange={(e)=>setQ(e.target.value)} />
        <Select size="small" value={role} onChange={(e)=>setRole(e.target.value)} displayEmpty>
          <MenuItem value=""><em>All roles</em></MenuItem>
          <MenuItem value="VISITOR">VISITOR</MenuItem>
          <MenuItem value="BIDDER">BIDDER</MenuItem>
          <MenuItem value="SELLER">SELLER</MenuItem>
          <MenuItem value="ADMIN">ADMIN</MenuItem>
        </Select>
        <Select size="small" value={approved} onChange={(e)=>setApproved(e.target.value)} displayEmpty>
          <MenuItem value=""><em>All statuses</em></MenuItem>
          <MenuItem value="true">Approved</MenuItem>
          <MenuItem value="false">Pending</MenuItem>
        </Select>
        <Button variant="contained" onClick={() => { setPage(1); load(); }}>Filter</Button>
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Username</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Approved</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <EmptyState title="No users found" description="Try changing your filters or check back later." />
              </TableCell>
            </TableRow>
          ) : users.map((u) => (
            <TableRow key={u.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/app/admin/users/${u.id}`)}>
              <TableCell>{u.id}</TableCell>
              <TableCell>{u.username}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>{u.approved ? <Chip size="small" label="Yes" color="success"/> : <Chip size="small" label="No"/>}</TableCell>
              <TableCell align="right">
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  {!u.approved && (
                    <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); approve(u.id); }}>Approve</Button>
                  )}
                  <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); navigate(`/app/admin/users/${u.id}`); }}>Manage</Button>
                  {u.role !== 'ADMIN' && (
                    <Button size="small" color="error" variant="outlined" onClick={(e) => { e.stopPropagation(); removeUser(u.id, u.username); }}>Delete</Button>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {total != null && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 'auto', pt: 2 }}>
          <Button disabled={page<=1} onClick={()=>setPage((p)=>p-1)}>Prev</Button>
          <Typography>Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</Typography>
          <Button disabled={page>=Math.ceil(total / pageSize)} onClick={()=>setPage((p)=>p+1)}>Next</Button>
        </Box>
      )}
    </Box>
  );
}

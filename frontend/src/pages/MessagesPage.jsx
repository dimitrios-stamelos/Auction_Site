import React, { useEffect, useState } from "react";
import api from "../api/axiosClient";
import { Box, Typography, TextField, Button, Alert, List, ListItemButton, ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from "@mui/material";
import EmptyState from "../components/EmptyState";

export default function MessagesPage() {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null); // conversation id
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [initialMsg, setInitialMsg] = useState("");
  const [err, setErr] = useState("");

  const me = (() => { try { return JSON.parse(localStorage.getItem("user")||"null"); } catch { return null; } })();

  const loadChats = async () => {
    try { const r = await api.get('/chats'); setChats(r.data || []); } catch (e) { setErr(e.response?.data?.message || 'Failed to load chats'); }
  };
  const loadMessages = async (id) => {
    try { const r = await api.get(`/chats/${id}/messages`); setMessages(r.data || []); setActive(id); } catch (e) { setErr(e.response?.data?.message || 'Failed to load messages'); }
  };
  useEffect(() => { loadChats(); }, []);

  // Poll active chat every 3s for simple live feel
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => loadMessages(active), 3000);
    return () => clearInterval(t);
  }, [active]);

  const sendToActive = async () => {
    if (!active || !draft.trim()) return;
    try { await api.post(`/chats/${active}/messages`, { content: draft }); setDraft(""); await loadMessages(active); await loadChats(); } catch (e) { setErr(e.response?.data?.message || 'Send failed'); }
  };

  const startChat = async () => {
    if (!selectedUser) return;
    try {
      const r = await api.post('/chats/start', { toUserId: selectedUser.id, content: initialMsg || undefined });
      setSelectedUser(null); setInitialMsg(""); setOpenNew(false);
      await loadChats();
      await loadMessages(r.data.id);
    } catch (e) { setErr(e.response?.data?.message || 'Start chat failed'); }
  };

  let searchTimer = null;
  const searchUsers = (q) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      if (!q) { setUserOptions([]); return; }
      try { const r = await api.get('/users/search', { params: { q } }); setUserOptions(r.data || []); } catch {}
    }, 250);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>Messages</Typography>
        <Button variant="contained" onClick={()=>setOpenNew(true)}>New Chat</Button>
      </Box>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 2, minHeight: 420 }}>
          <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
            <List dense disablePadding>
              {chats.length ? chats.map((c)=> (
                <ListItemButton key={c.id} selected={active===c.id} onClick={()=>loadMessages(c.id)}>
                  <ListItemText
                    primary={c.other?.username || `User ${c.other?.id}`}
                    primaryTypographyProps={{ fontWeight: 800, fontSize: 16 }}
                    secondary={(c.last?.content || '').slice(0, 60)}
                  />
                  {c.unread ? <Box sx={{ ml: 1, bgcolor: 'primary.main', color: '#fff', px: 1, borderRadius: 1, fontSize: 12 }}>{c.unread}</Box> : null}
                </ListItemButton>
              )) : <Box sx={{ p: 2 }}><EmptyState title="No chats" description="Start a chat to begin messaging." /></Box>}
            </List>
          </Box>
          <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: '1 1 auto', p: 2, overflowY: 'auto' }}>
              {messages.length ? messages.map((m)=> (
                <Box key={m.id} sx={{ display: 'flex', justifyContent: m.senderId === me?.id ? 'flex-end' : 'flex-start', mb: 1 }}>
                  <Box sx={{ px: 1.2, py: 0.8, borderRadius: 2, bgcolor: m.senderId === me?.id ? 'primary.main' : '#f3f4f6', color: m.senderId === me?.id ? '#fff' : 'inherit' }}>
                    {m.content}
                  </Box>
                </Box>
              )) : <Typography color="text.secondary">Select a chat to view messages.</Typography>}
            </Box>
            <Divider />
            <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
              <TextField fullWidth size="small" placeholder="Type a message" value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') sendToActive(); }} />
              <Button variant="contained" onClick={sendToActive} disabled={!active || !draft.trim()}>Send</Button>
            </Box>
          </Box>
        </Box>

      <Dialog open={openNew} onClose={()=>setOpenNew(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start a new chat</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={userOptions}
            getOptionLabel={(o)=> o?.username || ''}
            onInputChange={(_, v)=> searchUsers(v)}
            onChange={(_, v)=> setSelectedUser(v)}
            renderInput={(params)=> <TextField {...params} label="User" margin="dense" />}
          />
          <TextField label="Message (optional)" fullWidth multiline minRows={2} margin="dense" value={initialMsg} onChange={(e)=>setInitialMsg(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenNew(false)}>Cancel</Button>
          <Button variant="contained" onClick={startChat} disabled={!selectedUser}>Start</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

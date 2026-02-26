import React from "react";
import { Box, Typography, Button } from "@mui/material";

export default function EmptyState({ title = "Nothing here yet", description = "There is no content to display.", actionLabel, onAction, href }) {
  return (
    <Box sx={{
      minHeight: 240,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      border: '1px dashed #e5e7eb',
      borderRadius: 2,
      px: 3,
      py: 6,
      bgcolor: (t) => t.palette.mode === 'dark' ? 'background.default' : '#fafafa',
    }}>
      <Box>
        <Typography variant="h6" fontWeight={800} gutterBottom>{title}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>
        {(actionLabel && (onAction || href)) && (
          <Button variant="contained" onClick={onAction} href={href}>
            {actionLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}


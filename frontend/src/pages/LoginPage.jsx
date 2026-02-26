import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Alert } from "@mui/material";
import { Login } from "../components/AuthComponents";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const registeredJustNow = Boolean(location.state?.registered);

  return (
    <Box>
      {registeredJustNow && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Η εγγραφή ολοκληρώθηκε. Περιμένετε έγκριση από διαχειριστή για να συνδεθείτε.
        </Alert>
      )}
      <Login
        onToggle={() => navigate("/register")}
        onSuccess={() => navigate("/app", { replace: true })}
      />
    </Box>
  );
}

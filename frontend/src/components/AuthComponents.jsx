import React, { useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  useTheme,
  //useMediaQuery,
  LinearProgress,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocationCityOutlinedIcon from "@mui/icons-material/LocationCityOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";

/**
 * Drop-in responsive Register & Login screens built with MUI + framer-motion.
 * - Animated card on mount and subtle hover
 * - Responsive split layout (illustration panel collapses on mobile)
 * - Inline form validation (email format, basic password strength)
 * - Loading states with LoadingButton
 * - Accessible labels & helper text
 *
 * USAGE
 * -------
 * import { Register, Login } from "./AuthPages";
 * <Route path="/register" element={<Register apiUrl={"http://localhost:5000"} />} />
 * <Route path="/login" element={<Login apiUrl={"http://localhost:5000"} onSuccess={(u)=>{ /* navigate */

const API_FALLBACK = import.meta?.env?.VITE_API_URL || "http://localhost:5050"; // sync with backend PORT

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const hoverScale = {
  scale: 1.01,
  transition: { type: "spring", stiffness: 200, damping: 18 },
};

function AuthLayout({ title, subtitle, children, showHero = true }) {
  const theme = useTheme();
  //const upMd = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <Box
      sx={{
        height: "100dvh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        bgcolor: "background.default",
        background: "linear-gradient(120deg, #e0e7ff 0%, #f5f7fb 100%)",
      }}
    >
      {/* Top badge removed to free vertical space */}
      <Container maxWidth="lg" sx={{ py: { xs: 1, md: 2 } }}>
        <Grid container spacing={2} alignItems="center" justifyContent="center">
          {showHero && (
            <Grid
              item
              xs={12}
              lg={6}
              sx={{ display: { xs: "none", lg: "block" } }}
            >
              <Paper
                component={motion.div}
                whileHover={hoverScale}
                elevation={12}
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: 5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  color: "primary.contrastText",
                  boxShadow: "0 8px 32px rgba(60,60,120,0.18)",
                  mb: { xs: 2, md: 0 },
                }}
              >
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight={900} gutterBottom>
                    Site Δημοπρασιών
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ opacity: 0.95, mb: 1.5 }}
                    gutterBottom
                  >
                    Ασφαλής εγγραφή & είσοδος. Ξεκίνα να πουλάς και να
                    πλειοδοτείς άμεσα.
                  </Typography>
                  <Divider
                    sx={{ my: 3, borderColor: "rgba(255,255,255,0.35)" }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.92, maxWidth: 520, mx: "auto" }}
                  >
                    • Κρυπτογράφηση, έγκριση χρήστη από διαχειριστή, ρόλοι &
                    δικαιώματα.
                    <br />• Αναζήτηση, κατηγορίες, προσφορές, χάρτης τοποθεσίας,
                    μηνύματα.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          )}
          <Grid item xs={12} lg={showHero ? 6 : 8}>
            <Paper
              component={motion.div}
              variants={cardVariants}
              initial="hidden"
              animate="show"
              whileHover={hoverScale}
              elevation={8}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 5,
                boxShadow: "0 4px 24px rgba(60,60,120,0.10)",
              }}
            >
              <Typography variant="h4" fontWeight={800} gutterBottom>
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {subtitle}
                </Typography>
              )}
              {children}
            </Paper>
          </Grid>
        </Grid>
      </Container>
      {/* Footer */}
      <Box
        sx={{
          position: "absolute",
          bottom: 12,
          width: "100%",
          textAlign: "center",
          color: "text.secondary",
          fontSize: 14,
        }}
      >
        &copy; {new Date().getFullYear()} Auction App. All rights reserved.
      </Box>
    </Box>
  );
}

function usePasswordStrength(password) {
  return useMemo(() => {
    // very simple heuristic: length + character variety
    const lengthScore = Math.min(10, password.length) * 5; // 0..50
    const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].reduce(
      (acc, r) => acc + (r.test(password) ? 1 : 0),
      0
    );
    const varietyScore = variety * 12.5; // 0..50
    const score = Math.min(100, Math.round(lengthScore + varietyScore));
    let label = "Weak";
    if (score >= 75) label = "Strong";
    else if (score >= 50) label = "Medium";
    return { score, label };
  }, [password]);
}

function EmailField({ value, onChange, errorText }) {
  return (
    <TextField
      label="Email"
      name="email"
      value={value}
      onChange={onChange}
      type="email"
      autoComplete="email"
      fullWidth
      margin="normal"
      required
      error={Boolean(errorText)}
      helperText={errorText}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <EmailIcon fontSize="small" />
          </InputAdornment>
        ),
      }}
    />
  );
}

export function Register({ apiUrl = API_FALLBACK, onToggle }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    afm: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const { score, label } = usePasswordStrength(form.password);

  const emailError = useMemo(() => {
    if (!form.email) return "";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    return ok ? "" : "Invalid email format";
  }, [form.email]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.post(`${apiUrl}/auth/register`, form);
      setSuccess(res.data?.message || "Registration successful.");
      setForm({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        city: "",
        country: "",
        afm: "",
      });
      // After successful registration, send user to login to await approval
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const disabled =
    !form.username ||
    !form.email ||
    !form.password ||
    !form.firstName ||
    !form.lastName ||
    !!emailError;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Συμπλήρωσε τα στοιχεία σου για να ξεκινήσεις."
      showHero={false}
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Username"
          name="username"
          value={form.username}
          onChange={handleChange}
          autoComplete="username"
          fullWidth
          margin="normal"
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutlineIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <EmailField
          value={form.email}
          onChange={handleChange}
          errorText={emailError}
        />

        <Box sx={{ position: "relative", mt: 1 }}>
          <TextField
            label="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            fullWidth
            margin="normal"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPass((s) => !s)}
                    edge="end"
                  >
                    {showPass ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText={`Strength: ${label}`}
          />
          <LinearProgress
            variant="determinate"
            value={score}
            sx={{ height: 6, borderRadius: 999, mt: -1 }}
          />
        </Box>

        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="First name"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              fullWidth
              required
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BadgeOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Last name"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              autoComplete="family-name"
              fullWidth
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              fullWidth
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIphoneIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="AFM"
              name="afm"
              value={form.afm}
              onChange={handleChange}
              autoComplete="off"
              fullWidth
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              autoComplete="street-address"
              fullWidth
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HomeOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
              autoComplete="address-level2"
              fullWidth
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationCityOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Country"
              name="country"
              value={form.country}
              onChange={handleChange}
              autoComplete="country-name"
              fullWidth
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PublicOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>

        <LoadingButton
          loading={loading}
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2, py: 1.2, fontWeight: 700 }}
          disabled={disabled}
        >
          Create account
        </LoadingButton>

        {success && (
          <Alert
            component={motion.div}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            severity="success"
            sx={{ mt: 2 }}
          >
            {success}
          </Alert>
        )}
        {error && (
          <Alert
            component={motion.div}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            severity="error"
            sx={{ mt: 2 }}
          >
            {error}
          </Alert>
        )}

        <Box textAlign="center" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Έχεις ήδη λογαριασμό;{" "}
            <span
              style={{ color: "#1976d2", cursor: "pointer", fontWeight: 600 }}
              onClick={onToggle}
            >
              Είσοδος
            </span>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
}

export function Login({ apiUrl = API_FALLBACK, onSuccess, onToggle }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emailError = useMemo(() => {
    if (!email) return "";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return ok ? "" : "Invalid email format";
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.post(`${apiUrl}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      if (res.data.user) {
        try {
          localStorage.setItem("user", JSON.stringify(res.data.user));
        } catch (err) {
          setError(err.response?.data?.message);
        }
      }
      setSuccess("Login successful!");
      if (onSuccess) onSuccess(res.data.user);
      // Navigate to the protected area
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const disabled = !email || !password || !!emailError;

  return (
    <AuthLayout title="Welcome back" subtitle="Κάνε είσοδο για να συνεχίσεις.">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <EmailField
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          errorText={emailError}
        />
        <TextField
          label="Password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type={showPass ? "text" : "password"}
          autoComplete="current-password"
          fullWidth
          margin="normal"
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="button"
                  aria-label="toggle password visibility"
                  onClick={() => setShowPass((s) => !s)}
                  edge="end"
                >
                  {showPass ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <LoadingButton
          loading={loading}
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2, py: 1.2, fontWeight: 700 }}
          disabled={disabled}
        >
          Sign in
        </LoadingButton>

        {success && (
          <Alert
            component={motion.div}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            severity="success"
            sx={{ mt: 2 }}
          >
            {success}
          </Alert>
        )}
        {error && (
          <Alert
            component={motion.div}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            severity="error"
            sx={{ mt: 2 }}
          >
            {error}
          </Alert>
        )}

        <Box textAlign="center" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Δεν έχεις λογαριασμό;{" "}
            <span
              style={{ color: "#1976d2", cursor: "pointer", fontWeight: 600 }}
              onClick={onToggle}
            >
              Εγγραφή
            </span>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
}

// Main AuthScreen: toggles between Login and Register
export default function AuthScreen({ apiUrl = API_FALLBACK, onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  return (
    <Box
      sx={{
        bgcolor: (t) => (t.palette.mode === "dark" ? "#0b0f14" : "#f5f7fb"),
        height: "100dvh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {mode === "login" ? (
        <>
          <Login
            apiUrl={apiUrl}
            onSuccess={onLoginSuccess}
            onToggle={() => setMode("register")}
          />
        </>
      ) : (
        <>
          <Register apiUrl={apiUrl} onToggle={() => setMode("login")} />
        </>
      )}
    </Box>
  );
}

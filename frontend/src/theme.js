import { createTheme } from "@mui/material/styles";

// Central MUI theme for palette, typography, component defaults and global CSS.
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2667ff" },
    secondary: { main: "#a855f7" },
    background: {
      default: "#f5f7fb",
      paper: "#ffffff",
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    h3: { fontWeight: 900 },
    h4: { fontWeight: 800 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        "html, body, #root": { height: "100%" },
        body: {
          background: theme.palette.background.default,
        },
        // Remove browser autofill background tint so it matches MUI fields
        "input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus,\n        textarea:-webkit-autofill, select:-webkit-autofill,\n        .MuiInputBase-input:-webkit-autofill, .MuiInputBase-input:-webkit-autofill:hover, .MuiInputBase-input:-webkit-autofill:focus": {
          WebkitTextFillColor: theme.palette.text.primary,
          caretColor: theme.palette.text.primary,
          transition: "background-color 9999s ease-in-out 0s",
          boxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset`,
        },
      }),
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        fullWidth: true,
        margin: "normal",
      },
    },
    MuiButton: {
      defaultProps: { size: "medium" },
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 16 } },
    },
  },
});

export default theme;


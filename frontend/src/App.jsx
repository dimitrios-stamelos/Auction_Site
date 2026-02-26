import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./pages/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AuctionsListPage from "./pages/AuctionsListPage";
import AuctionDetailPage from "./pages/AuctionDetailPage";
import NewAuctionPage from "./pages/NewAuctionPage";
import MessagesPage from "./pages/MessagesPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminRoute from "./routes/AdminRoute";
import AdminUserDetailPage from "./pages/AdminUserDetailPage";
import MyAuctionsPage from "./pages/MyAuctionsPage";
import EditAuctionPage from "./pages/EditAuctionPage";
import MyBidsPage from "./pages/MyBidsPage";

function App() {
  // Route that lands admins on Admin dashboard, others on standard dashboard
  const DefaultLanding = () => {
    const user = (() => { try { return JSON.parse(localStorage.getItem("user")||"null"); } catch { return null; } })();
    if (user?.role === 'ADMIN') {
      return <Navigate to="/app/admin/users" replace />;
    }
    return <DashboardPage />;
  };
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/app" element={<DefaultLanding />} />
            <Route path="/app/auctions" element={<AuctionsListPage />} />
            <Route path="/app/auctions/:id" element={<AuctionDetailPage />} />
            <Route path="/app/auctions/:id/edit" element={<EditAuctionPage />} />
            <Route path="/app/new" element={<NewAuctionPage />} />
            <Route path="/app/my-auctions" element={<MyAuctionsPage />} />
            <Route path="/app/my-bids" element={<MyBidsPage />} />
            <Route path="/app/messages" element={<MessagesPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/app/admin/users" element={<AdminUsersPage />} />
              <Route path="/app/admin/users/:id" element={<AdminUserDetailPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

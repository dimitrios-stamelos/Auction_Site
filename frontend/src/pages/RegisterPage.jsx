import React from "react";
import { useNavigate } from "react-router-dom";
import { Register } from "../components/AuthComponents";

export default function RegisterPage() {
  const navigate = useNavigate();
  return <Register onToggle={() => navigate("/login")} />;
}


import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./platform/engine/context/AuthContext";
import { ToastProvider } from "./platform/engine/context/ToastContext";
import App from "./app/App.jsx";
import "./styles/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
);

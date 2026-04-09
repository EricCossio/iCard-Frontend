import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Itinerario from "./pages/Itinerario";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");
  const refresh = localStorage.getItem("refresh_token");
  return (token && refresh) ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/itinerario"
        element={
          <PrivateRoute>
            <Itinerario />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

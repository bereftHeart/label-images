import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import AuthGuard from "./guards/AuthGuard";
import GuessGuard from "./guards/GuessGuard";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFoundPage from "./pages/NotFound";
import Register from "./pages/Register";
import Verification from "./pages/Verification";

function App() {
  return (
    <Router>
      <div className="relative h-screen overflow-y-scroll no-scrollbar ">
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={
            <GuessGuard>
              <Login />
            </GuessGuard>
          } />
          <Route path="/register" element={
            <GuessGuard>
              <Register />
            </GuessGuard>
          } />
          <Route path="/verify" element={
            <GuessGuard>
              <Verification />
            </GuessGuard>
          } />
          <Route path="/upload-images" element={<AuthGuard>
            <Dashboard />
          </AuthGuard>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

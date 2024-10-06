import './App.css';

import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Tariff from './components/Tariff';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Logout from './components/Logout';

function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token') || null);

  const PrivateRoute = ({ children }) => {
    return authToken ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login setAuthToken={setAuthToken} />} />
        <Route path="/tariff" element={
          <PrivateRoute>
            <Tariff authToken={authToken} />
          </PrivateRoute>
        } />
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard authToken={authToken} />
          </PrivateRoute>
        } />
        <Route path="/logout" element={<Logout setAuthToken={setAuthToken} />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;

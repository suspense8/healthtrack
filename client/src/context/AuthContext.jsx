import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import api, { TOKEN_KEYS, setRoleToken, clearRoleToken, clearAllTokens } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [sessions, setSessions] = useState({}); // { admin: user, doctor: user, ... }
  const [loading, setLoading] = useState(true);

  // Load all existing sessions on mount
  useEffect(() => {
    const loadedSessions = {};
    Object.entries(TOKEN_KEYS).forEach(([role, tokenKey]) => {
      const token = localStorage.getItem(tokenKey);
      if (token) {
        try {
          const decoded = jwtDecode(token);
          // Verify token role matches expected role
          if (decoded.role === role) {
            loadedSessions[role] = decoded;
          } else {
            // Token role doesn't match - remove it
            localStorage.removeItem(tokenKey);
          }
        } catch (e) {
          localStorage.removeItem(tokenKey);
        }
      }
    });
    setSessions(loadedSessions);
    setLoading(false);
  }, []);

  // Login for a specific role
  const login = async (username, password, expectedRole) => {
    try {
      // Use api instance which now points to /api/auth/login correctly
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data;
      
      // Verify the user has the expected role
      if (user.role !== expectedRole) {
        return { 
          success: false, 
          error: `Access denied. You are logged in as ${user.role}, but this portal requires ${expectedRole} access.` 
        };
      }

      // Store token under the role-specific key
      setRoleToken(user.role, token);
      
      // Update sessions state
      setSessions(prev => ({ ...prev, [user.role]: user }));
      
      return { success: true, user };
    } catch (error) {
      console.error("Login failed", error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Invalid credentials' 
      };
    }
  };

  // Logout from a specific role
  const logout = (role) => {
    clearRoleToken(role);
    setSessions(prev => {
      const updated = { ...prev };
      delete updated[role];
      return updated;
    });
  };

  // Logout from all sessions
  const logoutAll = () => {
    clearAllTokens();
    setSessions({});
  };

  // Check if logged in for a specific role
  const isLoggedIn = (role) => {
    return !!sessions[role];
  };

  // Get session for a specific role
  const getSession = (role) => {
    return sessions[role] || null;
  };

  // Update user data in session (e.g., after profile update)
  const updateUser = (updatedUserData) => {
    const role = updatedUserData.role;
    if (role && sessions[role]) {
      setSessions(prev => ({
        ...prev,
        [role]: { ...prev[role], ...updatedUserData }
      }));
    }
  };

  // Get current user (from any session - returns first available)
  const getCurrentUser = () => {
    const sessionRoles = Object.keys(sessions);
    if (sessionRoles.length > 0) {
      return sessions[sessionRoles[0]];
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ 
      sessions, 
      login, 
      logout, 
      logoutAll, 
      isLoggedIn, 
      getSession,
      updateUser,
      user: getCurrentUser(), // Current user object
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


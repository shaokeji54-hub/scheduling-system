import React, { createContext, useContext, useState, ReactNode } from "react";
import api from "../api/client";

interface AuthUser {
  token: string;
  employeeId: number;
  role: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return {
      token,
      employeeId: Number(localStorage.getItem("employeeId")),
      role: localStorage.getItem("role") || "",
      name: localStorage.getItem("name") || "",
    };
  });

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const data = res.data;
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("employeeId", String(data.employee_id));
    localStorage.setItem("role", data.role);
    localStorage.setItem("name", data.name);
    setUser({
      token: data.access_token,
      employeeId: data.employee_id,
      role: data.role,
      name: data.name,
    });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
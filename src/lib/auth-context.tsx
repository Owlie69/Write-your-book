"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { User } from "@supabase/supabase-js";
import type { PlanType } from "./constants";
import { clearAllUserData } from "./storage";
interface AuthState {
  user: User | null;
  plan: PlanType;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  plan: "free",
  loading: true,
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
  resetPassword: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchPlan(session.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPlan(session.user.id);
      } else {
        setPlan("free");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchPlan(userId: string) {
    if (!isSupabaseConfigured()) return;
    const { data } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();
    if (data?.plan) {
      setPlan(data.plan as PlanType);
    }
  }

  async function signIn(
    email: string,
    password: string
  ): Promise<string | null> {
    if (!isSupabaseConfigured()) return "Supabase is not configured";
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return error.message;
    return null;
  }

  async function signUp(
    email: string,
    password: string
  ): Promise<string | null> {
    if (!isSupabaseConfigured()) return "Supabase is not configured";
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  }

  async function resetPassword(email: string): Promise<string | null> {
    if (!isSupabaseConfigured()) return "Supabase is not configured";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/reset-password`,
    });
    return error?.message ?? null;
  }

  async function signOut() {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
    clearAllUserData();
    setUser(null);
    setPlan("free");
    // Hard redirect to home so stale data is never visible
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, plan, loading, signIn, signUp, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

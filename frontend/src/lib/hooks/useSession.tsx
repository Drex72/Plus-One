"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Session, Tenant, Event } from "@/lib/types";

interface SessionContextValue {
  session: Session | null;
  setSession: (s: Session | null) => void;
  selectedEvent: Event | null;
  setSelectedEvent: (e: Event | null) => void;
  apiKey: string;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({
  initial,
  children,
}: {
  initial: Session | null;
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(initial);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const apiKey = session?.apiKey ?? "";

  return (
    <SessionContext.Provider
      value={{ session, setSession, selectedEvent, setSelectedEvent, apiKey }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be inside <SessionProvider>");
  return ctx;
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface InventoryItem {
  item_id: string;
  item_type: string;
  status: string;
}

/**
 * Verified (server-side) inventory for the signed-in player.
 * - Runs the recovery sync on sign-in (retries with backoff on failure).
 * - Listens for live inventory changes so unlocks/revocations apply instantly.
 */
export function useInventory() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lastChange, setLastChange] = useState<InventoryItem | null>(null);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const sync = useCallback(async (attempt = 0) => {
    if (retryRef.current) window.clearTimeout(retryRef.current);
    const { data, error } = await supabase.functions.invoke("sync-inventory", { body: {} });
    if (error || !data?.items) {
      if (attempt < 5) retryRef.current = window.setTimeout(() => sync(attempt + 1), 2000 * 2 ** attempt);
      return;
    }
    setItems(data.items);
  }, []);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    sync();
    const channel = supabase
      .channel(`inventory-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "player_inventory", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as InventoryItem;
          if (!row?.item_id) return;
          setItems((prev) => [...prev.filter((p) => p.item_id !== row.item_id), row]);
          setLastChange(row);
        })
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      if (retryRef.current) window.clearTimeout(retryRef.current);
    };
  }, [user, sync]);

  return { user, items, lastChange, sync };
}

/** Applies verified inventory to a locally stored owned list (adds active, removes revoked). */
export function applyInventory(owned: string[], items: InventoryItem[], type: string): string[] {
  const active = items.filter((i) => i.item_type === type && i.status === "active").map((i) => i.item_id);
  const revoked = new Set(items.filter((i) => i.item_type === type && i.status !== "active").map((i) => i.item_id));
  const next = Array.from(new Set([...owned.filter((id) => !revoked.has(id)), ...active]));
  return next;
}

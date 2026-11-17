import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Loader2 } from "lucide-react";

const GoogleLogo = () => (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
  reason?: string;
}

export const AccountDialog = ({ open, onClose, user, reason }: Props) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast({ title: "Check your email", description: "Tap the link we sent to finish creating your account." });
        else onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Signed in", description: "Your purchases are synced to this device." });
        onClose();
      }
    } catch (err) {
      toast({ title: "Sign-in problem", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast({ title: "Google sign-in failed", description: String(r.error.message ?? r.error), variant: "destructive" });
    else if (!r.redirected) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{user ? "Your Account" : mode === "signin" ? "Sign In" : "Create Account"}</DialogTitle>
          <DialogDescription>
            {user ? `Signed in as ${user.email}` : reason ?? "Sign in to buy items and keep them on every device."}
          </DialogDescription>
        </DialogHeader>
        {user ? (
          <Button variant="outline" className="min-h-11" onClick={async () => { await supabase.auth.signOut(); onClose(); }}>
            Sign out
          </Button>
        ) : (
          <div className="space-y-3">
            <Button type="button" onClick={google}
              className="w-full min-h-11 gap-[10px] px-3 border border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F2F2F2]">
              <GoogleLogo /> Continue with Google
            </Button>
            <div className="text-center text-xs text-muted-foreground">or</div>
            <form onSubmit={submit} className="space-y-2">
              <Input type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input type="password" required minLength={6} placeholder="Password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" className="w-full min-h-11" disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {mode === "signin" ? "Sign In" : "Create Account"}
              </Button>
            </form>
            <button type="button" className="w-full text-sm text-muted-foreground underline min-h-11"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "New player? Create an account" : "Have an account? Sign in"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

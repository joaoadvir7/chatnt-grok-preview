import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCrmStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode = "signin" | "signup";

function LoginPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const agents = useCrmStore((s) => s.agents);
  const setActiveAgent = useCrmStore((s) => s.setActiveAgent);

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authEnabled) {
    return <Navigate to="/painel" />;
  }
  if (isPending) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#031c45] text-white">
        <p className="text-[15px] opacity-80">Carregando sessão…</p>
      </div>
    );
  }
  if (user && !user.isDevFallback) {
    return <Navigate to="/painel" />;
  }

  async function afterAuth(userEmail: string, displayName?: string | null) {
    const match = agents.find(
      (a) => a.email.toLowerCase() === userEmail.toLowerCase(),
    );
    if (match) {
      setActiveAgent(match.id);
    }
    toast.success(
      displayName
        ? `Bem-vindo(a), ${displayName}`
        : "Login realizado com sucesso",
    );
    await navigate({ to: "/painel" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const em = email.trim().toLowerCase();
    const pw = password;
    if (!em || !pw) {
      setError("Informe e-mail e senha");
      return;
    }
    if (pw.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const nm = name.trim() || em.split("@")[0] || "Atendente";
        const { error: err } = await authClient.signUp.email({
          email: em,
          password: pw,
          name: nm,
        });
        if (err) {
          setError(err.message ?? "Não foi possível criar a conta");
          return;
        }
        await afterAuth(em, nm);
      } else {
        const { error: err } = await authClient.signIn.email({
          email: em,
          password: pw,
        });
        if (err) {
          setError(err.message ?? "E-mail ou senha inválidos");
          return;
        }
        const session = await authClient.getSession();
        const u = session.data?.user;
        await afterAuth(u?.email ?? em, u?.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#031c45] pt-[var(--grok-banner-h,0px)]">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-[400px] rounded-3xl bg-white p-7 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src="/chatnt-logo-full.png"
              alt="ChatNT"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/chatnt-mark.png";
              }}
            />
            <h1 className="mt-4 text-[20px] font-semibold text-[#1a2744]">
              {mode === "signin" ? "Entrar no ChatNT" : "Criar conta"}
            </h1>
            <p className="mt-1 text-[13.5px] text-[#5a6780]">
              Acesso com e-mail real. Cada atendente tem o próprio login.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-[#f0f3f8] p-1">
            <button
              type="button"
              className={cn(
                "rounded-lg py-2 text-[13.5px] font-medium transition",
                mode === "signin"
                  ? "bg-white text-[#031c45] shadow-sm"
                  : "text-[#5a6780]",
              )}
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg py-2 text-[13.5px] font-medium transition",
                mode === "signup"
                  ? "bg-white text-[#031c45] shadow-sm"
                  : "text-[#5a6780]",
              )}
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="mb-1 block text-[12.5px] font-medium text-[#5a6780]">
                  Nome completo
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  disabled={busy}
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-[12.5px] font-medium text-[#5a6780]">
                E-mail
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@escolabiblica.org"
                autoComplete="email"
                required
                disabled={busy}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12.5px] font-medium text-[#5a6780]">
                Senha
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={8}
                disabled={busy}
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "Aguarde…"
                : mode === "signin"
                  ? "Entrar"
                  : "Criar conta e entrar"}
            </Button>
          </form>

          <p className="mt-5 text-center text-[12px] leading-relaxed text-[#8b95a8]">
            Cadastros ficam na base de autenticação do ChatNT (Better Auth).
            Tokens da Meta e dados do CRM não são expostos nesta tela.
          </p>
        </div>
      </div>
    </div>
  );
}

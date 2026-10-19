import type { ReactNode } from "react";
import { BrandName, LogoSlot } from "./Brand";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md overflow-hidden">
        <div className="racing-line" />
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <LogoSlot size={64} />
            <BrandName />
          </div>
          <h1 className="text-2xl font-bold uppercase">{title}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-metal">{label}</span>
      <input className="field" {...props} />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function FormError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</div>;
}

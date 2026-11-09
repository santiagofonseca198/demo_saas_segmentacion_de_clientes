import { AppShell } from "@/components/shell/app-shell";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

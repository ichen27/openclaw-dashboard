import { ThemeProvider } from "@/components/theme-provider";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background flex items-center justify-center">
        {children}
      </div>
    </ThemeProvider>
  );
}

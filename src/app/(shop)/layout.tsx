import { ShopHeader } from "@/components/ShopHeader";

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background">
      <ShopHeader />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {children}
      </div>
    </div>
  );
}

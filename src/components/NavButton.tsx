import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = {
  icon: LucideIcon;
  label: string;
  href: string;
};

export default function NavButton({ icon: Icon, label, href }: Props) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className="rounded-full"
      asChild
    >
      href ? (
      <Link href={href}>
        <Icon className="h-5 w-5" />
      </Link>
      ) : (
      <Icon className="h-5 w-5" />)
    </Button>
  );
}

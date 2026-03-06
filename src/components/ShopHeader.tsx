"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  House,
  LayoutGrid,
  Package,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  dispatchCartUpdated,
  fetchMyCart,
  subscribeCartUpdated,
} from "@/lib/cart";

type AppUser = {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
};

export function ShopHeader() {
  const [user, setUser] = useState<AppUser | null>(() => {
    if (typeof window === "undefined") return null;

    const userRaw = localStorage.getItem("user");
    if (!userRaw) return null;

    try {
      return JSON.parse(userRaw) as AppUser;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });
  const [cartItemsCount, setCartItemsCount] = useState(0);

  const displayName = useMemo(() => {
    if (!user) return "";
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return fullName || user.email;
  }, [user]);

  const onLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setCartItemsCount(0);
    dispatchCartUpdated(0);
  };

  useEffect(() => {
    const syncCartCount = async () => {
      try {
        const cart = await fetchMyCart();
        const totalItems = cart?.totalItems ?? 0;
        setCartItemsCount(totalItems);
      } catch {
        setCartItemsCount(0);
      }
    };

    void syncCartCount();

    const unsubscribe = subscribeCartUpdated((totalItems) => {
      setCartItemsCount(totalItems);
    });

    return unsubscribe;
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/home" className="inline-flex items-center gap-2">
              <House className="size-4" />
              Trang chủ
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/category" className="inline-flex items-center gap-2">
              <LayoutGrid className="size-4" />
              Danh mục
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/products" className="inline-flex items-center gap-2">
              <Package className="size-4" />
              Sản phẩm
            </Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2"
            >
              <ShoppingCart className="size-4" />
              Giỏ hàng
              {cartItemsCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                  {cartItemsCount}
                </span>
              ) : null}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                className="inline-flex items-center gap-2"
              >
                <UserRound className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {!user ? (
                <>
                  <DropdownMenuLabel>Chưa đăng nhập</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/auth/register">Đăng ký</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/login">Đăng nhập</Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  <DropdownMenuItem className="text-xs text-muted-foreground focus:text-muted-foreground">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs text-muted-foreground focus:text-muted-foreground">
                    Vai trò: {user.role}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {user.role === "ADMIN" ? (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Trang quản trị</Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={onLogout}>
                    Đăng xuất
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

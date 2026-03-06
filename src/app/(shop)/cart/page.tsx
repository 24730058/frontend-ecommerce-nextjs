"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { LoaderCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dispatchCartUpdated,
  fetchMyCart,
  getAuthHeaders,
  type Cart,
} from "@/lib/cart";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type CartEnvelope = {
  success: boolean;
  message: string;
  data: Cart;
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const syncCart = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const currentCart = await fetchMyCart();
      setCart(currentCart);
      dispatchCartUpdated(currentCart?.totalItems ?? 0);
    } catch {
      setError("Vui lòng đăng nhập để xem giỏ hàng.");
      setCart(null);
      dispatchCartUpdated(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void syncCart();
  }, [syncCart]);

  const handleApiError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const message = err.response?.data?.message;
      if (Array.isArray(message)) return message[0] ?? fallback;
      if (typeof message === "string") return message;
    }
    return fallback;
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;

    setUpdatingItemId(itemId);
    setActionMessage("");

    try {
      const { data } = await axios.patch<CartEnvelope>(
        `${API_BASE_URL}/carts/me/items/${itemId}`,
        { quantity },
        { headers: getAuthHeaders() },
      );

      setCart(data.data);
      dispatchCartUpdated(data.data.totalItems);
    } catch (err: unknown) {
      setActionMessage(handleApiError(err, "Không thể cập nhật số lượng."));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdatingItemId(itemId);
    setActionMessage("");

    try {
      const { data } = await axios.delete<CartEnvelope>(
        `${API_BASE_URL}/carts/me/items/${itemId}`,
        { headers: getAuthHeaders() },
      );

      setCart(data.data);
      dispatchCartUpdated(data.data.totalItems);
      setActionMessage("Đã xóa sản phẩm khỏi giỏ hàng.");
    } catch (err: unknown) {
      setActionMessage(handleApiError(err, "Không thể xóa sản phẩm."));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const clearCart = async () => {
    setIsClearing(true);
    setActionMessage("");

    try {
      const { data } = await axios.delete<CartEnvelope>(
        `${API_BASE_URL}/carts/me`,
        {
          headers: getAuthHeaders(),
        },
      );

      setCart(data.data);
      dispatchCartUpdated(data.data.totalItems);
      setActionMessage("Đã xóa toàn bộ giỏ hàng.");
    } catch (err: unknown) {
      setActionMessage(handleApiError(err, "Không thể làm trống giỏ hàng."));
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Đang tải giỏ hàng...
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button asChild>
          <Link href="/auth/login">Đăng nhập</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="w-full space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Giỏ hàng</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tổng số lượng: {cart?.totalItems ?? 0}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/products">Tiếp tục mua hàng</Link>
            </Button>
            <Button asChild disabled={!cart || cart.cartItems.length === 0}>
              <Link href="/payment">Thanh toán</Link>
            </Button>
            <Button
              variant="destructive"
              onClick={() => void clearCart()}
              disabled={isClearing || !cart || cart.cartItems.length === 0}
            >
              {isClearing ? "Đang xóa..." : "Xóa giỏ hàng"}
            </Button>
          </div>
        </div>

        {actionMessage ? (
          <p className="mt-3 text-sm text-muted-foreground">{actionMessage}</p>
        ) : null}
      </div>

      {!cart || cart.cartItems.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Giỏ hàng đang trống.
        </div>
      ) : (
        <div className="space-y-3">
          {cart.cartItems.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="grid gap-3 sm:grid-cols-[88px_1fr_auto] sm:items-center">
                <div className="h-22 w-22 overflow-hidden rounded-lg bg-muted p-1">
                  {item.product?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Không có hình
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-base font-semibold">
                    {item.product?.name || "Sản phẩm không tồn tại"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.product?.sku || "-"}
                  </p>
                  <p className="text-sm font-medium">
                    {item.product?.price.toLocaleString("vi-VN") || 0} VND
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="min-w-28 text-right text-xl font-medium">
                    Tổng: {item.subtotal.toLocaleString("vi-VN")} VND
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingItemId === item.id || item.quantity <= 1}
                    onClick={() =>
                      void updateQuantity(item.id, item.quantity - 1)
                    }
                  >
                    -
                  </Button>
                  <span className="min-w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingItemId === item.id}
                    onClick={() =>
                      void updateQuantity(item.id, item.quantity + 1)
                    }
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={updatingItemId === item.id}
                    onClick={() => void removeItem(item.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))}

          <div className="rounded-2xl border border-border/70 bg-card p-4 text-right">
            <div className="text-sm text-muted-foreground">Tổng thanh toán</div>
            <div className="text-xl font-semibold">
              {cart.totalAmount.toLocaleString("vi-VN")} VND
            </div>
            <div className="mt-3">
              <Button asChild>
                <Link href="/payment">Tiến hành thanh toán</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

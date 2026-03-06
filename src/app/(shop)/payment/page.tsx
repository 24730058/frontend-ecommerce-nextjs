"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dispatchCartUpdated,
  fetchMyCart,
  getAuthHeaders,
  type Cart,
} from "@/lib/cart";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type PaymentProvider =
  | "COD"
  | "BANK_TRANSFER"
  | "MOMO"
  | "ZALOPAY"
  | "VNPAY"
  | "STRIPE";

type OrderResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
  };
};

type PaymentResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    orderId: string;
    amount: number;
    status: string;
    provider: PaymentProvider;
    transactionId: string | null;
  };
};

export default function PaymentPage() {
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [shippingAddress, setShippingAddress] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("COD");
  const [externalId, setExternalId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      setError("");

      try {
        const currentCart = await fetchMyCart();
        if (!currentCart || currentCart.cartItems.length === 0) {
          setError(
            "Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.",
          );
          setCart(currentCart);
          return;
        }
        setCart(currentCart);
      } catch {
        setError("Vui lòng đăng nhập để thanh toán.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadCart();
  }, []);

  const totalAmountText = useMemo(() => {
    return `${(cart?.totalAmount ?? 0).toLocaleString("vi-VN")} VND`;
  }, [cart]);

  const handleApiError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const message = err.response?.data?.message;
      if (Array.isArray(message)) return message[0] ?? fallback;
      if (typeof message === "string") return message;
    }
    return fallback;
  };

  const handleCheckout = async () => {
    if (!cart || cart.cartItems.length === 0) {
      setError("Giỏ hàng trống, không thể thanh toán.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const { data: orderRes } = await axios.post<OrderResponse>(
        `${API_BASE_URL}/orders`,
        {
          cartId: cart.id,
          shippingAddress: shippingAddress || undefined,
        },
        {
          headers: getAuthHeaders(),
        },
      );

      const orderId = orderRes.data.id;

      const { data: paymentIntentRes } = await axios.post<PaymentResponse>(
        `${API_BASE_URL}/payments/intent`,
        {
          orderId,
          provider,
        },
        {
          headers: getAuthHeaders(),
        },
      );

      await axios.post<PaymentResponse>(
        `${API_BASE_URL}/payments/${paymentIntentRes.data.id}/confirm`,
        {
          externalId: externalId || undefined,
        },
        {
          headers: getAuthHeaders(),
        },
      );

      setSuccessMessage(
        `Thanh toán thành công. Đơn hàng #${orderRes.data.orderNumber} đã được tạo.`,
      );
      setCart((prev) =>
        prev
          ? {
              ...prev,
              cartItems: [],
              totalAmount: 0,
              totalItems: 0,
            }
          : prev,
      );
      dispatchCartUpdated(0);

      setTimeout(() => {
        router.push("/home");
      }, 1500);
    } catch (err: unknown) {
      setError(handleApiError(err, "Không thể hoàn tất thanh toán."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Đang tải thông tin thanh toán...
      </section>
    );
  }

  return (
    <section className="w-full space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Thanh toán</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Xác nhận thông tin và thanh toán từ giỏ hàng.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Sản phẩm trong giỏ hàng</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kiểm tra lại mặt hàng trước khi xác nhận thanh toán.
            </p>

            <div className="mt-4 space-y-3">
              {cart?.cartItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-xl border border-border/60 bg-background/40 p-3 sm:grid-cols-[64px_1fr_auto] sm:items-center"
                >
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-muted p-1">
                    {item.product?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.imageUrl}
                        alt={item.product?.name || "Sản phẩm"}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                        Không có hình
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {item.product?.name || "Sản phẩm"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.product?.sku || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Số lượng: {item.quantity}
                    </p>
                  </div>

                  <div className="text-sm font-medium text-right">
                    {item.subtotal.toLocaleString("vi-VN")} VND
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Thông tin giao hàng</h2>
            <div className="mt-3 space-y-3">
              <textarea
                value={shippingAddress}
                onChange={(event) => setShippingAddress(event.target.value)}
                placeholder="Nhập địa chỉ giao hàng (tùy chọn)"
                className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Phương thức</span>
                  <select
                    value={provider}
                    onChange={(event) =>
                      setProvider(event.target.value as PaymentProvider)
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="COD">COD</option>
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    <option value="MOMO">MOMO</option>
                    <option value="ZALOPAY">ZALOPAY</option>
                    <option value="VNPAY">VNPAY</option>
                    <option value="STRIPE">STRIPE</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span>Mã giao dịch (tùy chọn)</span>
                  <input
                    value={externalId}
                    onChange={(event) => setExternalId(event.target.value)}
                    placeholder="Nhập mã tham chiếu từ cổng thanh toán"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </label>
              </div>
            </div>
          </article>
        </div>

        <aside className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Số item</span>
              <span>{cart?.totalItems ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tổng tiền</span>
              <span className="font-medium text-foreground">
                {totalAmountText}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Button
              className="w-full"
              disabled={isSubmitting || !cart || cart.cartItems.length === 0}
              onClick={() => void handleCheckout()}
            >
              {isSubmitting
                ? "Đang xử lý thanh toán..."
                : "Xác nhận thanh toán"}
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/cart">Quay lại giỏ hàng</Link>
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}

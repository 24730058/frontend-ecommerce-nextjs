"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { LoaderCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/cart";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    imageUrl: string | null;
  } | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: string | null;
  orderItems: OrderItem[];
  createdAt: string;
};

type OrderListResponse = {
  success: boolean;
  message: string;
  data: Order[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const statusOptions: Array<{ label: string; value: "ALL" | OrderStatus }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "PENDING", value: "PENDING" },
  { label: "PROCESSING", value: "PROCESSING" },
  { label: "SHIPPED", value: "SHIPPED" },
  { label: "DELIVERED", value: "DELIVERED" },
  { label: "CANCELLED", value: "CANCELLED" },
];

function statusClass(status: OrderStatus) {
  switch (status) {
    case "DELIVERED":
      return "bg-green-100 text-green-700";
    case "SHIPPED":
      return "bg-blue-100 text-blue-700";
    case "PROCESSING":
      return "bg-amber-100 text-amber-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function OrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | OrderStatus>("ALL");

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Vui lòng đăng nhập để xem đơn hàng.");
      setIsLoading(false);
      setOrders([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data } = await axios.get<OrderListResponse>(
        `${API_BASE_URL}/orders/my-orders`,
        {
          headers: getAuthHeaders(),
          params: {
            page,
            limit: 10,
            status: status === "ALL" ? undefined : status,
            search: search || undefined,
          },
        },
      );

      setOrders(data.data || []);
      if (data.meta) {
        setMeta(data.meta);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(
          Array.isArray(message)
            ? message[0]
            : typeof message === "string"
              ? message
              : "Không tải được danh sách đơn hàng.",
        );
      } else {
        setError("Không tải được danh sách đơn hàng.");
      }
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOrders();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchOrders]);

  return (
    <section className="w-full space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Đơn hàng</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lịch sử đơn hàng của bạn.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã đơn hàng"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "ALL" | OrderStatus);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            onClick={() => void fetchOrders()}
            disabled={isLoading}
          >
            Tải lại
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          Đang tải đơn hàng...
        </div>
      ) : error ? (
        <div className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <p>{error}</p>
          <Button asChild>
            <Link href="/auth/login">Đăng nhập</Link>
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Chưa có đơn hàng nào.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">
                    #{order.orderNumber}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>

                <span
                  className={`rounded-md px-2 py-1 text-xs ${statusClass(order.status)}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Tổng tiền: </span>
                  <span className="font-medium">
                    {order.totalAmount.toLocaleString("vi-VN")} VND
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Số mặt hàng: </span>
                  <span className="font-medium">{order.orderItems.length}</span>
                </div>
                <div className="text-sm sm:col-span-2 lg:col-span-1">
                  <span className="text-muted-foreground">Địa chỉ: </span>
                  <span className="font-medium">
                    {order.shippingAddress || "Chưa cập nhật"}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-border/60 bg-background/50 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Danh sách sản phẩm
                </p>
                <ul className="space-y-1 text-sm">
                  {order.orderItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="truncate">
                        {item.product?.name || "Sản phẩm"} x {item.quantity}
                      </span>
                      <span className="text-muted-foreground">
                        {item.price.toLocaleString("vi-VN")} VND
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Trước
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {meta.page} / {Math.max(meta.totalPages, 1)}
            </span>
            <Button
              variant="outline"
              disabled={page >= Math.max(meta.totalPages, 1) || isLoading}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

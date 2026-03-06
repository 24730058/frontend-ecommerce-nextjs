"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dispatchCartUpdated, getAuthHeaders } from "@/lib/cart";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  sku: string;
  imageUrl: string | null;
  isActive: boolean;
  categoryId: string;
  category: { id: string; name: string; slug: string | null } | null;
};

export default function ProductSlugPage() {
  const params = useParams<{ slug: string }>();
  const productId = typeof params.slug === "string" ? params.slug : "";

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadProduct = useCallback(async () => {
    if (!productId) return;

    setIsLoading(true);
    setError("");

    try {
      const { data } = await axios.get<Product>(
        `${API_BASE_URL}/products/${productId}`,
      );
      setProduct(data);
    } catch {
      setError("Không tải được chi tiết sản phẩm.");
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const addToCart = async () => {
    if (!product) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setActionMessage("Vui lòng đăng nhập để thêm giỏ hàng.");
      return;
    }

    setIsAdding(true);
    setActionMessage("");

    try {
      const { data } = await axios.post<{
        success: boolean;
        message: string;
        data: { totalItems: number };
      }>(
        `${API_BASE_URL}/carts/me/items`,
        {
          productId: product.id,
          quantity: 1,
        },
        {
          headers: getAuthHeaders(),
        },
      );

      dispatchCartUpdated(data.data.totalItems);
      setActionMessage("Đã thêm vào giỏ hàng.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setActionMessage(
          Array.isArray(message)
            ? message[0]
            : typeof message === "string"
              ? message
              : "Không thể thêm vào giỏ hàng.",
        );
      } else {
        setActionMessage("Không thể thêm vào giỏ hàng.");
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/products" className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Quay lại sản phẩm
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          Đang tải chi tiết sản phẩm...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : !product ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Sản phẩm không tồn tại.
        </div>
      ) : (
        <article className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="flex min-h-[260px] items-center justify-center bg-muted p-4 sm:min-h-[360px] sm:p-6">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="max-h-[70vh] w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Không có hình sản phẩm
              </div>
            )}
          </div>

          <div className="space-y-3 p-6">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {product.name}
              </h1>
              <span
                className={`rounded-md px-2 py-0.5 text-xs ${product.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
              >
                {product.isActive ? "Đang bán" : "Ngừng bán"}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              {product.description || "Không có mô tả."}
            </p>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="font-medium">Giá:</span>{" "}
                {product.price.toLocaleString("vi-VN")} VND
              </div>
              <div>
                <span className="font-medium">Tồn kho:</span> {product.stock}
              </div>
              <div>
                <span className="font-medium">SKU:</span> {product.sku}
              </div>
              <div>
                <span className="font-medium">Danh mục:</span>{" "}
                {product.category?.name || "Không rõ"}
              </div>
            </div>

            {product.category?.slug ? (
              <Button asChild variant="outline">
                <Link href={`/category/${product.category.slug}`}>
                  Xem danh mục của sản phẩm
                </Link>
              </Button>
            ) : null}

            <Button onClick={() => void addToCart()} disabled={isAdding}>
              {isAdding ? "Đang thêm..." : "Thêm vào giỏ"}
            </Button>

            {actionMessage ? (
              <p className="text-sm text-muted-foreground">{actionMessage}</p>
            ) : null}
          </div>
        </article>
      )}
    </section>
  );
}

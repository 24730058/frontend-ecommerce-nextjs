"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { LoaderCircle, RefreshCw, Search } from "lucide-react";

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

type ProductListResponse = {
  data: Product[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type Category = {
  id: string;
  name: string;
};

type CategoryListResponse = {
  data: Category[];
};

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await axios.get<CategoryListResponse>(
        `${API_BASE_URL}/categories`,
        {
          params: {
            page: 1,
            limit: 200,
            isActive: true,
          },
        },
      );

      setCategories(data.data || []);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const { data } = await axios.get<ProductListResponse>(
        `${API_BASE_URL}/products`,
        {
          params: {
            page: 1,
            limit: 50,
            search: searchTerm || undefined,
            isActive: showActiveOnly,
            categoryId: selectedCategoryId || undefined,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
          },
        },
      );

      setProducts(data.data || []);
    } catch {
      setError("Không tải được danh sách sản phẩm. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }, [maxPrice, minPrice, searchTerm, selectedCategoryId, showActiveOnly]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProducts();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadProducts]);

  const addToCart = async (productId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    setAddingProductId(productId);
    setActionMessage("");

    try {
      const { data } = await axios.post<{
        success: boolean;
        message: string;
        data: { totalItems: number };
      }>(
        `${API_BASE_URL}/carts/me/items`,
        { productId, quantity: 1 },
        { headers: getAuthHeaders() },
      );

      dispatchCartUpdated(data.data.totalItems);
      setActionMessage("Đã thêm sản phẩm vào giỏ hàng.");
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
      setAddingProductId(null);
    }
  };

  return (
    <section className="w-full space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sản phẩm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Danh sách sản phẩm trong hệ thống.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên, mô tả, SKU"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="Giá thấp nhất"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Giá cao nhất"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(event) => setShowActiveOnly(event.target.checked)}
            />
            Chỉ hiển thị đang hoạt động
          </label>

          <Button
            variant="outline"
            onClick={() => void loadProducts()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Tải lại
          </Button>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Tổng sản phẩm: {products.length}
        </div>
        {actionMessage ? (
          <div className="mt-2 text-xs text-muted-foreground">
            {actionMessage}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          Đang tải sản phẩm...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Chưa có sản phẩm nào.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
            >
              <div className="flex aspect-[4/3] items-center justify-center bg-muted p-2">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Không có hình ảnh
                  </div>
                )}
              </div>

              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold">{product.name}</h2>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs ${product.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
                  >
                    {product.isActive ? "Đang bán" : "Ngừng bán"}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {product.description || "Không có mô tả."}
                </p>

                <div className="text-sm font-medium">
                  Giá: {product.price.toLocaleString("vi-VN")} VND
                </div>
                <div className="text-xs text-muted-foreground">
                  Tồn kho: {product.stock} | SKU: {product.sku}
                </div>
                <div className="text-xs text-muted-foreground">
                  Danh mục: {product.category?.name || "Không rõ"}
                </div>

                <Button asChild size="sm" className="mt-2 w-full">
                  <Link href={`/products/${product.id}`}>Xem chi tiết</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={addingProductId === product.id}
                  onClick={() => void addToCart(product.id)}
                >
                  {addingProductId === product.id
                    ? "Đang thêm..."
                    : "Thêm vào giỏ"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

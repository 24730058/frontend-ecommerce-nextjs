"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { LoaderCircle, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type Category = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  imageUrl: string | null;
  isActive: boolean;
  productCount: number;
};

type CategoryListResponse = {
  data: Category[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const { data } = await axios.get<CategoryListResponse>(
        `${API_BASE_URL}/categories`,
        {
          params: {
            page: 1,
            limit: 50,
            isActive: showActiveOnly,
            search: searchTerm || undefined,
          },
        },
      );

      setCategories(data.data || []);
    } catch {
      setError("Không tải được danh sách danh mục. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, showActiveOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCategories();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadCategories]);

  const activeCount = useMemo(
    () => categories.filter((item) => item.isActive).length,
    [categories],
  );

  return (
    <section className="w-full space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Danh mục</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Danh sách danh mục hiện có trong hệ thống.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm danh mục theo tên hoặc mô tả"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>

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
            onClick={() => {
              void loadCategories();
            }}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Tải lại
          </Button>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Tổng: {categories.length} danh mục, Đang hoạt động: {activeCount}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          Đang tải danh mục...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Chưa có danh mục nào.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article
              key={category.id}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
            >
              <div className="flex aspect-[4/3] items-center justify-center bg-muted p-2">
                {category.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.imageUrl}
                    alt={category.name}
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
                  <h2 className="text-base font-semibold">{category.name}</h2>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs ${category.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
                  >
                    {category.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {category.description || "Không có mô tả."}
                </p>

                <div className="text-xs text-muted-foreground">
                  Số sản phẩm: {category.productCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  Slug: {category.slug || "(không có)"}
                </div>

                {category.slug ? (
                  <Button asChild size="sm" className="mt-2 w-full">
                    <Link href={`/category/${category.slug}`}>
                      Xem chi tiết
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" className="mt-2 w-full" disabled>
                    Chưa có slug
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

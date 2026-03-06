"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, LoaderCircle } from "lucide-react";

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

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  sku: string;
  imageUrl: string | null;
  isActive: boolean;
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

export default function CategorySlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCategoryAndProducts = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);
    setError("");

    try {
      const categoryRes = await axios.get<Category>(
        `${API_BASE_URL}/categories/slug/${slug}`,
      );

      setCategory(categoryRes.data);

      const productsRes = await axios.get<ProductListResponse>(
        `${API_BASE_URL}/products`,
        {
          params: {
            page: 1,
            limit: 30,
            isActive: true,
            categoryId: categoryRes.data.id,
          },
        },
      );

      setProducts(productsRes.data.data || []);
    } catch {
      setError("Không tải được danh mục theo slug này.");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadCategoryAndProducts();
  }, [loadCategoryAndProducts]);

  return (
    <section className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/category" className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Quay lại danh mục
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          Đang tải chi tiết danh mục...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : !category ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Danh mục không tồn tại.
        </div>
      ) : (
        <>
          <article className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="flex min-h-[220px] items-center justify-center bg-muted p-3 sm:min-h-[300px] sm:p-5">
              {category.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="max-h-[65vh] w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Không có hình danh mục
                </div>
              )}
            </div>

            <div className="space-y-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {category.name}
                </h1>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs ${category.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
                >
                  {category.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                {category.description || "Không có mô tả."}
              </p>
              <div className="text-xs text-muted-foreground">
                Slug: {category.slug || "(không có)"}
              </div>
              <div className="text-xs text-muted-foreground">
                Tổng sản phẩm: {category.productCount}
              </div>
            </div>
          </article>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Sản phẩm trong danh mục</h2>
            {products.length === 0 ? (
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
                    <div className="h-36 bg-muted">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Không có hình ảnh
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 p-4">
                      <h3 className="text-base font-semibold">
                        {product.name}
                      </h3>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {product.description || "Không có mô tả."}
                      </p>
                      <div className="text-sm font-medium">
                        Giá: {product.price.toLocaleString("vi-VN")} VND
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Tồn kho: {product.stock} | SKU: {product.sku}
                      </div>

                      <Button asChild size="sm" className="mt-2 w-full">
                        <Link href={`/products/${product.id}`}>
                          Xem chi tiết sản phẩm
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

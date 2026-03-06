"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, LoaderCircle, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type AppUser = {
  role: string;
};

type Category = {
  id: string;
  name: string;
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
  categoryId: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  sku: string;
  imageUrl: string;
  categoryId: string;
  isActive: boolean;
};

type CategoryListResponse = {
  data: Category[];
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price: "",
    stock: "0",
    sku: "",
    imageUrl: "",
    categoryId: "",
    isActive: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
  });

  const refreshAuthSession = async () => {
    const refreshToken = localStorage.getItem("refreshToken") || "";
    if (!refreshToken) return false;

    try {
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; role: string };
      }>(`${API_BASE_URL}/auth/refresh`, null, {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      return true;
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      router.replace("/auth/login");
      return false;
    }
  };

  const parseApiErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const apiMessage = err.response?.data?.message;
      if (typeof apiMessage === "string") return apiMessage;
      if (Array.isArray(apiMessage) && typeof apiMessage[0] === "string") {
        return apiMessage[0];
      }
    }

    return fallback;
  };

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");

    if (!token || !rawUser) {
      router.replace("/auth/login");
      return;
    }

    try {
      const user = JSON.parse(rawUser) as AppUser;
      if (user.role !== "ADMIN") {
        router.replace("/");
        return;
      }
    } catch {
      router.replace("/auth/login");
      return;
    } finally {
      setIsCheckingAccess(false);
    }
  }, [router]);

  useEffect(() => {
    if (isCheckingAccess || !slug) return;

    const loadData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [productRes, categoriesRes] = await Promise.all([
          axios.get<Product>(`${API_BASE_URL}/products/${slug}`),
          axios.get<CategoryListResponse>(`${API_BASE_URL}/categories`, {
            params: { page: 1, limit: 200 },
          }),
        ]);

        setProduct(productRes.data);
        setCategories(categoriesRes.data.data || []);

        setForm({
          name: productRes.data.name,
          description: productRes.data.description || "",
          price: String(productRes.data.price),
          stock: String(productRes.data.stock),
          sku: productRes.data.sku,
          imageUrl: productRes.data.imageUrl || "",
          categoryId: productRes.data.categoryId,
          isActive: productRes.data.isActive,
        });

        setImagePreview(productRes.data.imageUrl || "");
      } catch (err: unknown) {
        setError(parseApiErrorMessage(err, "Không tải được sản phẩm cần sửa."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [isCheckingAccess, slug]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      setImagePreview(form.imageUrl);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Vui lòng chọn file ảnh hợp lệ.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMessage("");
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;

    setIsSubmitting(true);
    setMessage("");

    const submitUpdate = async () => {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("price", form.price);
      formData.append("stock", form.stock || "0");
      formData.append("sku", form.sku);
      formData.append("categoryId", form.categoryId);
      formData.append("isActive", String(form.isActive));

      if (form.description) formData.append("description", form.description);
      if (imageFile) {
        formData.append("image", imageFile);
      } else if (form.imageUrl) {
        formData.append("imageUrl", form.imageUrl);
      }

      await axios.patch(`${API_BASE_URL}/products/${product.id}`, formData, {
        headers: getAuthHeaders(),
      });
    };

    try {
      await submitUpdate();

      setMessage("Cập nhật sản phẩm thành công.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        const refreshed = await refreshAuthSession();
        if (refreshed) {
          try {
            await submitUpdate();
            setMessage("Cập nhật sản phẩm thành công.");
            return;
          } catch (retryErr: unknown) {
            setMessage(
              parseApiErrorMessage(retryErr, "Không thể cập nhật sản phẩm."),
            );
            return;
          }
        }
      }

      setMessage(parseApiErrorMessage(err, "Không thể cập nhật sản phẩm."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    const ok = window.confirm(
      `Bạn chắc chắn muốn xóa sản phẩm \"${product.name}\"?`,
    );
    if (!ok) return;

    setIsDeleting(true);
    setMessage("");

    const submitDelete = async () => {
      await axios.delete(`${API_BASE_URL}/products/${product.id}`, {
        headers: getAuthHeaders(),
      });
    };

    try {
      await submitDelete();

      router.push("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        const refreshed = await refreshAuthSession();
        if (refreshed) {
          try {
            await submitDelete();
            router.push("/dashboard");
            return;
          } catch (retryErr: unknown) {
            setMessage(
              parseApiErrorMessage(retryErr, "Không thể xóa sản phẩm."),
            );
            return;
          }
        }
      }

      setMessage(parseApiErrorMessage(err, "Không thể xóa sản phẩm."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isCheckingAccess || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Đang tải trang chỉnh sửa sản phẩm...
      </div>
    );
  }

  if (error || !product) {
    return (
      <section className="space-y-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Quay lại dashboard
          </Link>
        </Button>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error || "Không tìm thấy sản phẩm."}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <Button variant="outline" asChild>
        <Link href="/dashboard" className="inline-flex items-center gap-2">
          <ArrowLeft className="size-4" />
          Quay lại dashboard
        </Link>
      </Button>

      <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Sửa sản phẩm: {product.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Route động `[slug]` hiện đang dùng ID sản phẩm: {slug}
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleUpdate}>
          <input
            required
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Tên sản phẩm"
          />
          <input
            required
            value={form.sku}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sku: e.target.value }))
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="SKU"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              type="number"
              min={1}
              value={form.price}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, price: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Giá"
            />
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, stock: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Tồn kho"
            />
          </div>

          <select
            required
            value={form.categoryId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, categoryId: e.target.value }))
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            value={form.imageUrl}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Image URL"
          />

          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5"
            />
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="Preview"
                className="h-28 w-28 rounded-md border border-border/70 bg-muted p-1 object-contain"
              />
            ) : null}
          </div>

          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Mô tả"
          />

          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            Kích hoạt
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              {isDeleting ? "Đang xóa..." : "Xóa sản phẩm"}
            </Button>
          </div>

          {message ? (
            <p className="text-xs text-muted-foreground">{message}</p>
          ) : null}
        </form>
      </article>
    </section>
  );
}

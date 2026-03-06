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
  description: string | null;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
};

type CategoryForm = {
  name: string;
  description: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
};

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [category, setCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>({
    name: "",
    description: "",
    slug: "",
    imageUrl: "",
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

    const loadCategory = async () => {
      setIsLoading(true);
      setError("");

      try {
        const { data } = await axios.get<Category>(
          `${API_BASE_URL}/categories/slug/${slug}`,
        );

        setCategory(data);
        setForm({
          name: data.name,
          description: data.description || "",
          slug: data.slug,
          imageUrl: data.imageUrl || "",
          isActive: data.isActive,
        });
        setImagePreview(data.imageUrl || "");
      } catch (err: unknown) {
        setError(parseApiErrorMessage(err, "Không tải được danh mục cần sửa."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadCategory();
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
    if (!category) return;

    setIsSubmitting(true);
    setMessage("");

    const submitUpdate = async () => {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("isActive", String(form.isActive));

      if (form.description) formData.append("description", form.description);
      if (form.slug) formData.append("slug", form.slug);

      if (imageFile) {
        formData.append("image", imageFile);
      } else if (form.imageUrl) {
        formData.append("imageUrl", form.imageUrl);
      }

      await axios.patch(`${API_BASE_URL}/categories/${category.id}`, formData, {
        headers: getAuthHeaders(),
      });
    };

    try {
      await submitUpdate();

      setMessage("Cập nhật danh mục thành công.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        const refreshed = await refreshAuthSession();
        if (refreshed) {
          try {
            await submitUpdate();
            setMessage("Cập nhật danh mục thành công.");
            return;
          } catch (retryErr: unknown) {
            setMessage(
              parseApiErrorMessage(retryErr, "Không thể cập nhật danh mục."),
            );
            return;
          }
        }
      }

      setMessage(parseApiErrorMessage(err, "Không thể cập nhật danh mục."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;

    const ok = window.confirm(
      `Bạn chắc chắn muốn xóa danh mục \"${category.name}\"?`,
    );
    if (!ok) return;

    setIsDeleting(true);
    setMessage("");

    const submitDelete = async () => {
      await axios.delete(`${API_BASE_URL}/categories/${category.id}`, {
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
              parseApiErrorMessage(retryErr, "Không thể xóa danh mục."),
            );
            return;
          }
        }
      }

      setMessage(parseApiErrorMessage(err, "Không thể xóa danh mục."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isCheckingAccess || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Đang tải trang chỉnh sửa danh mục...
      </div>
    );
  }

  if (error || !category) {
    return (
      <section className="space-y-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Quay lại dashboard
          </Link>
        </Button>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error || "Không tìm thấy danh mục."}
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
        <h1 className="text-xl font-semibold">Sửa danh mục: {category.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Route động hiện tại: `[slug]` = {slug}
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleUpdate}>
          <input
            required
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Tên danh mục"
          />
          <input
            value={form.slug}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, slug: e.target.value }))
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Slug"
          />
          <input
            value={form.imageUrl}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Image URL (fallback nếu không upload file)"
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
                alt="Category preview"
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
              {isDeleting ? "Đang xóa..." : "Xóa danh mục"}
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

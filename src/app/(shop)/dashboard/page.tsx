"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  FolderOpen,
  LoaderCircle,
  PackageSearch,
  Plus,
  ReceiptText,
  ShieldCheck,
  SquarePen,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type AppUser = {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  productCount?: number;
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
  category?: { id: string; name: string; slug: string | null } | null;
};

type CategoryListResponse = {
  data: Category[];
};

type ProductListResponse = {
  data: Product[];
};

type CategoryForm = {
  name: string;
  description: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
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

type FormMessage = {
  text: string;
  isError: boolean;
};

type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

type AdminOrdersResponse = {
  success: boolean;
  message: string;
  data: AdminOrder[];
};

type DashboardSection = "categories" | "products" | "orders";

const initialCategoryForm: CategoryForm = {
  name: "",
  description: "",
  slug: "",
  imageUrl: "",
  isActive: true,
};

const initialProductForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  stock: "0",
  sku: "",
  imageUrl: "",
  categoryId: "",
  isActive: true,
};

export default function DashboardPage() {
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("categories");

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const [categoryForm, setCategoryForm] =
    useState<CategoryForm>(initialCategoryForm);
  const [productForm, setProductForm] =
    useState<ProductForm>(initialProductForm);

  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );

  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState("");

  const [categoryMessage, setCategoryMessage] = useState<FormMessage | null>(
    null,
  );
  const [productMessage, setProductMessage] = useState<FormMessage | null>(
    null,
  );
  const [ordersError, setOrdersError] = useState("");

  const [orderStatusFilter, setOrderStatusFilter] = useState<
    "ALL" | OrderStatus
  >("ALL");

  const getAccessToken = () => localStorage.getItem("accessToken") || "";

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${getAccessToken()}`,
  });

  const parseApiErrorMessage = (error: unknown, fallbackMessage: string) => {
    if (axios.isAxiosError(error)) {
      const apiMessage = error.response?.data?.message;
      if (typeof apiMessage === "string") return apiMessage;
      if (Array.isArray(apiMessage) && typeof apiMessage[0] === "string") {
        return apiMessage[0];
      }
    }

    return fallbackMessage;
  };

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const { data } = await axios.get<CategoryListResponse>(
        `${API_BASE_URL}/categories`,
        {
          params: { page: 1, limit: 200 },
        },
      );

      const items = data.data || [];
      setCategories(items);
      setProductForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || items[0]?.id || "",
      }));
    } catch (error: unknown) {
      setCategoryMessage({
        text: parseApiErrorMessage(error, "Không tải được danh mục."),
        isError: true,
      });
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const { data } = await axios.get<ProductListResponse>(
        `${API_BASE_URL}/products`,
        {
          params: { page: 1, limit: 200 },
        },
      );
      setProducts(data.data || []);
    } catch (error: unknown) {
      setProductMessage({
        text: parseApiErrorMessage(error, "Không tải được sản phẩm."),
        isError: true,
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    setOrdersError("");

    try {
      const { data } = await axios.get<AdminOrdersResponse>(
        `${API_BASE_URL}/orders`,
        {
          headers: getAuthHeaders(),
          params: {
            page: 1,
            limit: 20,
            status: orderStatusFilter === "ALL" ? undefined : orderStatusFilter,
          },
        },
      );

      setOrders(data.data || []);
    } catch (error: unknown) {
      setOrdersError(parseApiErrorMessage(error, "Không tải được đơn hàng."));
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    const userRaw = localStorage.getItem("user");
    const accessToken = getAccessToken();

    if (!accessToken || !userRaw) {
      router.replace("/auth/login");
      return;
    }

    try {
      const user = JSON.parse(userRaw) as AppUser;
      if (user.role !== "ADMIN") {
        router.replace("/");
        return;
      }

      setIsAuthorized(true);
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      router.replace("/auth/login");
      return;
    } finally {
      setIsCheckingAccess(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    void loadCategories();
    void loadProducts();
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || activeSection !== "orders") return;
    void loadOrders();
  }, [activeSection, isAuthorized, orderStatusFilter]);

  const handleProductImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      setProductImageFile(null);
      setProductImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProductMessage({
        text: "Vui lòng chọn file ảnh hợp lệ (jpg/png/webp...).",
        isError: true,
      });
      event.target.value = "";
      return;
    }

    setProductImageFile(file);
    setProductImagePreview(URL.createObjectURL(file));
    setProductMessage(null);
  };

  const handleCategoryImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      setCategoryImageFile(null);
      setCategoryImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setCategoryMessage({
        text: "Vui lòng chọn file ảnh hợp lệ (jpg/png/webp...).",
        isError: true,
      });
      event.target.value = "";
      return;
    }

    setCategoryImageFile(file);
    setCategoryImagePreview(URL.createObjectURL(file));
    setCategoryMessage(null);
  };

  const handleCreateCategory = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsSubmittingCategory(true);
    setCategoryMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", categoryForm.name);
      formData.append("isActive", String(categoryForm.isActive));

      if (categoryForm.description)
        formData.append("description", categoryForm.description);
      if (categoryForm.slug) formData.append("slug", categoryForm.slug);

      if (categoryImageFile) {
        formData.append("image", categoryImageFile);
      } else if (categoryForm.imageUrl) {
        formData.append("imageUrl", categoryForm.imageUrl);
      }

      await axios.post(`${API_BASE_URL}/categories`, formData, {
        headers: getAuthHeaders(),
      });

      setCategoryForm(initialCategoryForm);
      setCategoryImageFile(null);
      setCategoryImagePreview("");
      setCategoryMessage({ text: "Thêm danh mục thành công.", isError: false });
      await loadCategories();
    } catch (error: unknown) {
      setCategoryMessage({
        text: parseApiErrorMessage(error, "Không thể thêm danh mục."),
        isError: true,
      });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleCreateProduct = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!productForm.categoryId) {
      setProductMessage({ text: "Vui lòng chọn danh mục.", isError: true });
      return;
    }

    setIsSubmittingProduct(true);
    setProductMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", productForm.name);
      formData.append("price", productForm.price);
      formData.append("stock", productForm.stock || "0");
      formData.append("sku", productForm.sku);
      formData.append("categoryId", productForm.categoryId);
      formData.append("isActive", String(productForm.isActive));

      if (productForm.description)
        formData.append("description", productForm.description);
      if (productImageFile) {
        formData.append("image", productImageFile);
      } else if (productForm.imageUrl) {
        formData.append("imageUrl", productForm.imageUrl);
      }

      await axios.post(`${API_BASE_URL}/products`, formData, {
        headers: getAuthHeaders(),
      });

      setProductMessage({ text: "Thêm sản phẩm thành công.", isError: false });
      setProductForm((prev) => ({
        ...initialProductForm,
        categoryId: prev.categoryId,
      }));
      setProductImageFile(null);
      setProductImagePreview("");
      await loadProducts();
    } catch (error: unknown) {
      setProductMessage({
        text: parseApiErrorMessage(error, "Không thể thêm sản phẩm."),
        isError: true,
      });
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    const ok = window.confirm(
      `Bạn chắc chắn muốn xóa danh mục \"${category.name}\"?`,
    );
    if (!ok) return;

    setDeletingCategoryId(category.id);
    setCategoryMessage(null);

    try {
      await axios.delete(`${API_BASE_URL}/categories/${category.id}`, {
        headers: getAuthHeaders(),
      });

      setCategoryMessage({ text: "Xóa danh mục thành công.", isError: false });
      await loadCategories();
      await loadProducts();
    } catch (error: unknown) {
      setCategoryMessage({
        text: parseApiErrorMessage(error, "Không thể xóa danh mục."),
        isError: true,
      });
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const ok = window.confirm(
      `Bạn chắc chắn muốn xóa sản phẩm \"${product.name}\"?`,
    );
    if (!ok) return;

    setDeletingProductId(product.id);
    setProductMessage(null);

    try {
      await axios.delete(`${API_BASE_URL}/products/${product.id}`, {
        headers: getAuthHeaders(),
      });

      setProductMessage({ text: "Xóa sản phẩm thành công.", isError: false });
      await loadProducts();
    } catch (error: unknown) {
      setProductMessage({
        text: parseApiErrorMessage(error, "Không thể xóa sản phẩm."),
        isError: true,
      });
    } finally {
      setDeletingProductId(null);
    }
  };

  if (isCheckingAccess) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang kiểm tra quyền truy cập...
        </div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main className="w-full">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Bảng điều khiển quản trị
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý toàn bộ danh mục, sản phẩm và đơn hàng.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
            <nav className="space-y-2">
              <Button
                variant={activeSection === "categories" ? "default" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setActiveSection("categories")}
              >
                <FolderOpen className="size-4" />
                Tất cả danh mục
              </Button>
              <Button
                variant={activeSection === "products" ? "default" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setActiveSection("products")}
              >
                <PackageSearch className="size-4" />
                Tất cả sản phẩm
              </Button>
              <Button
                variant={activeSection === "orders" ? "default" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setActiveSection("orders")}
              >
                <ReceiptText className="size-4" />
                Đơn hàng
              </Button>
            </nav>
          </aside>

          <section className="space-y-4">
            {activeSection === "categories" ? (
              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Tất cả danh mục</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Admin có thể thêm, sửa, xóa danh mục. Khi sửa sẽ chuyển sang
                  trang động `[slug]`.
                </p>

                <form
                  className="mt-4 grid gap-3"
                  onSubmit={handleCreateCategory}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      required
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Tên danh mục"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <input
                      value={categoryForm.slug}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          slug: e.target.value,
                        }))
                      }
                      placeholder="Slug (tùy chọn)"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={categoryForm.imageUrl}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          imageUrl: e.target.value,
                        }))
                      }
                      placeholder="Image URL (fallback nếu không upload file)"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={categoryForm.isActive}
                        onChange={(e) =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
                        }
                      />
                      Kích hoạt
                    </label>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCategoryImageChange}
                      className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5"
                    />
                    {categoryImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={categoryImagePreview}
                        alt="Category preview"
                        className="h-28 w-28 rounded-md border border-border/70 bg-muted p-1 object-contain"
                      />
                    ) : null}
                  </div>

                  <textarea
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Mô tả (tùy chọn)"
                    className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />

                  <Button
                    type="submit"
                    className="w-full sm:w-fit"
                    disabled={isSubmittingCategory}
                  >
                    {isSubmittingCategory ? (
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 size-4" />
                    )}
                    {isSubmittingCategory ? "Đang thêm..." : "Thêm danh mục"}
                  </Button>
                </form>

                {categoryMessage ? (
                  <p
                    className={`mt-3 text-xs ${categoryMessage.isError ? "text-destructive" : "text-green-600"}`}
                  >
                    {categoryMessage.text}
                  </p>
                ) : null}

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-muted-foreground">
                        <th className="px-2 py-2">Tên</th>
                        <th className="px-2 py-2">Slug</th>
                        <th className="px-2 py-2">Trạng thái</th>
                        <th className="px-2 py-2">Sản phẩm</th>
                        <th className="px-2 py-2 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingCategories ? (
                        <tr>
                          <td
                            className="px-2 py-4 text-muted-foreground"
                            colSpan={5}
                          >
                            Đang tải danh mục...
                          </td>
                        </tr>
                      ) : categories.length === 0 ? (
                        <tr>
                          <td
                            className="px-2 py-4 text-muted-foreground"
                            colSpan={5}
                          >
                            Chưa có danh mục.
                          </td>
                        </tr>
                      ) : (
                        categories.map((category) => (
                          <tr
                            key={category.id}
                            className="border-b border-border/40"
                          >
                            <td className="px-2 py-2 font-medium">
                              {category.name}
                            </td>
                            <td className="px-2 py-2">{category.slug}</td>
                            <td className="px-2 py-2">
                              {category.isActive ? "Hoạt động" : "Tạm ẩn"}
                            </td>
                            <td className="px-2 py-2">
                              {category.productCount ?? 0}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex justify-end gap-2">
                                <Button asChild size="sm" variant="outline">
                                  <Link
                                    href={`/dashboard/categories/${category.slug}`}
                                  >
                                    <SquarePen className="mr-1 size-3.5" />
                                    Sửa
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    void handleDeleteCategory(category)
                                  }
                                  disabled={deletingCategoryId === category.id}
                                >
                                  <Trash2 className="mr-1 size-3.5" />
                                  {deletingCategoryId === category.id
                                    ? "Đang xóa"
                                    : "Xóa"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {activeSection === "products" ? (
              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Tất cả sản phẩm</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Admin có thể thêm, sửa, xóa sản phẩm. Sửa sẽ đi qua route động
                  `[slug]`.
                </p>

                <form className="mt-4 space-y-3" onSubmit={handleCreateProduct}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      required
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Tên sản phẩm"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <input
                      required
                      value={productForm.sku}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          sku: e.target.value,
                        }))
                      }
                      placeholder="SKU"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      required
                      type="number"
                      min={1}
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="Giá"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                    <input
                      type="number"
                      min={0}
                      value={productForm.stock}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          stock: e.target.value,
                        }))
                      }
                      placeholder="Tồn kho"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <select
                    required
                    value={productForm.categoryId}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        categoryId: e.target.value,
                      }))
                    }
                    disabled={categories.length === 0}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    {categories.length === 0 ? (
                      <option value="">Chưa có danh mục</option>
                    ) : (
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>

                  <input
                    value={productForm.imageUrl}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        imageUrl: e.target.value,
                      }))
                    }
                    placeholder="Image URL (fallback nếu không upload file)"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />

                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageChange}
                      className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5"
                    />
                    {productImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={productImagePreview}
                        alt="Preview"
                        className="h-28 w-28 rounded-md border border-border/70 bg-muted p-1 object-contain"
                      />
                    ) : null}
                  </div>

                  <textarea
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Mô tả (tùy chọn)"
                    className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />

                  <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={productForm.isActive}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                    />
                    Kích hoạt
                  </label>

                  <Button
                    type="submit"
                    className="w-full sm:w-fit"
                    disabled={isSubmittingProduct || categories.length === 0}
                  >
                    {isSubmittingProduct ? (
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 size-4" />
                    )}
                    {isSubmittingProduct ? "Đang thêm..." : "Thêm sản phẩm"}
                  </Button>
                </form>

                {productMessage ? (
                  <p
                    className={`mt-3 text-xs ${productMessage.isError ? "text-destructive" : "text-green-600"}`}
                  >
                    {productMessage.text}
                  </p>
                ) : null}

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-muted-foreground">
                        <th className="px-2 py-2">Tên</th>
                        <th className="px-2 py-2">SKU</th>
                        <th className="px-2 py-2">Giá</th>
                        <th className="px-2 py-2">Tồn</th>
                        <th className="px-2 py-2">Danh mục</th>
                        <th className="px-2 py-2 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingProducts ? (
                        <tr>
                          <td
                            className="px-2 py-4 text-muted-foreground"
                            colSpan={6}
                          >
                            Đang tải sản phẩm...
                          </td>
                        </tr>
                      ) : products.length === 0 ? (
                        <tr>
                          <td
                            className="px-2 py-4 text-muted-foreground"
                            colSpan={6}
                          >
                            Chưa có sản phẩm.
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr
                            key={product.id}
                            className="border-b border-border/40"
                          >
                            <td className="px-2 py-2 font-medium">
                              {product.name}
                            </td>
                            <td className="px-2 py-2">{product.sku}</td>
                            <td className="px-2 py-2">
                              {Number(product.price).toLocaleString("vi-VN")}{" "}
                              VND
                            </td>
                            <td className="px-2 py-2">{product.stock}</td>
                            <td className="px-2 py-2">
                              {product.category?.name || "N/A"}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex justify-end gap-2">
                                <Button asChild size="sm" variant="outline">
                                  <Link
                                    href={`/dashboard/products/${product.id}`}
                                  >
                                    <SquarePen className="mr-1 size-3.5" />
                                    Sửa
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    void handleDeleteProduct(product)
                                  }
                                  disabled={deletingProductId === product.id}
                                >
                                  <Trash2 className="mr-1 size-3.5" />
                                  {deletingProductId === product.id
                                    ? "Đang xóa"
                                    : "Xóa"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {activeSection === "orders" ? (
              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Đơn hàng toàn hệ thống
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Danh sách đơn hàng của tất cả người dùng.
                    </p>
                  </div>

                  <select
                    value={orderStatusFilter}
                    onChange={(e) =>
                      setOrderStatusFilter(
                        e.target.value as "ALL" | OrderStatus,
                      )
                    }
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="PENDING">PENDING</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                {isLoadingOrders ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Đang tải đơn hàng...
                  </div>
                ) : ordersError ? (
                  <p className="mt-4 text-sm text-destructive">{ordersError}</p>
                ) : orders.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Không có đơn hàng nào.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/70 text-left text-muted-foreground">
                          <th className="px-2 py-2">Mã đơn</th>
                          <th className="px-2 py-2">Người dùng</th>
                          <th className="px-2 py-2">Trạng thái</th>
                          <th className="px-2 py-2">Tổng tiền</th>
                          <th className="px-2 py-2">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr
                            key={order.id}
                            className="border-b border-border/40"
                          >
                            <td className="px-2 py-2 font-medium">
                              #{order.orderNumber}
                            </td>
                            <td className="px-2 py-2">
                              <div>{order.user?.email || "N/A"}</div>
                              <div className="text-xs text-muted-foreground">
                                {`${order.user?.firstName || ""} ${order.user?.lastName || ""}`.trim() ||
                                  "Chưa có tên"}
                              </div>
                            </td>
                            <td className="px-2 py-2">{order.status}</td>
                            <td className="px-2 py-2">
                              {order.totalAmount.toLocaleString("vi-VN")} VND
                            </td>
                            <td className="px-2 py-2 text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString(
                                "vi-VN",
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

const CART_UPDATED_EVENT = "cart-updated";

export type CartItem = {
  id: string;
  quantity: number;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    imageUrl: string | null;
    isActive: boolean;
  } | null;
  subtotal: number;
};

export type Cart = {
  id: string;
  userId: string;
  checkedOut: boolean;
  cartItems: CartItem[];
  totalAmount: number;
  totalItems: number;
  createdAt: string;
  updatedAt: string;
};

type CartApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export function getAccessToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("accessToken") || "";
}

export function getAuthHeaders() {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function dispatchCartUpdated(totalItems: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CART_UPDATED_EVENT, {
      detail: { totalItems },
    }),
  );
}

export function subscribeCartUpdated(callback: (totalItems: number) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ totalItems?: number }>;
    callback(customEvent.detail?.totalItems ?? 0);
  };

  window.addEventListener(CART_UPDATED_EVENT, handler);
  return () => window.removeEventListener(CART_UPDATED_EVENT, handler);
}

export async function fetchMyCart() {
  const token = getAccessToken();
  if (!token) return null;

  const { data } = await axios.get<CartApiResponse<Cart>>(
    `${API_BASE_URL}/carts/me`,
    {
      headers: getAuthHeaders(),
    },
  );

  return data.data;
}

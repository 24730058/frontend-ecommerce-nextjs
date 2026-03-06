"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { Button } from "@/components/ui/button";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type LoginFormState = {
  email: string;
  password: string;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
  };
};

const initialForm: LoginFormState = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginFormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  const onFieldChange = (field: keyof LoginFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const { data } = await axios.post<LoginResponse>(
        `${API_BASE_URL}/auth/login`,
        {
          email: form.email,
          password: form.password,
        },
      );

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage({
        text: "Đăng nhập thành công! Đang chuyển hướng...",
        isError: false,
      });
      setForm(initialForm);

      setTimeout(() => {
        router.push("/home");
      }, 1000);
    } catch (error: unknown) {
      let errorMsg: string | string[] = "Có lỗi xảy ra khi đăng nhập.";

      if (axios.isAxiosError(error)) {
        const apiMessage = error.response?.data?.message;
        if (typeof apiMessage === "string" || Array.isArray(apiMessage)) {
          errorMsg = apiMessage;
        }
      }

      setMessage({
        text: Array.isArray(errorMsg) ? errorMsg[0] : errorMsg,
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-1px)] overflow-hidden bg-gradient-to-b from-muted/40 via-background to-background px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,oklch(0.97_0_0),transparent_35%),radial-gradient(circle_at_80%_20%,oklch(0.93_0_0),transparent_30%)]" />

      <section className="relative mx-auto w-full max-w-md rounded-2xl border border-border/60 bg-card/90 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl border border-border bg-secondary p-2">
            <LogIn className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Chào mừng bạn quay trở lại.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              placeholder="you@example.com"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => onFieldChange("password", e.target.value)}
                placeholder="Nhập mật khẩu"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : null}
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>

          {message && (
            <p
              className={`text-center text-xs ${message.isError ? "text-destructive" : "text-green-500"}`}
            >
              {message.text}
            </p>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Đăng ký ngay
          </Link>
        </p>
      </section>
    </main>
  );
}

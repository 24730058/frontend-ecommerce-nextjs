"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, LoaderCircle, MailCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { Button } from "@/components/ui/button";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type FormState = {
  fullName: string;
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
};

type RegisterResponse = {
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

const initialForm: FormState = {
  fullName: "",
  email: "",
  otp: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const router = useRouter(); // Khởi tạo router
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  const passwordError = useMemo(() => {
    if (!form.confirmPassword) return "";
    return form.password === form.confirmPassword
      ? ""
      : "Mật khẩu xác nhận chưa khớp.";
  }, [form.password, form.confirmPassword]);

  const onFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const onRequestOtp = async () => {
    if (!form.email.trim()) {
      setMessage({
        text: "Vui lòng nhập email trước khi lấy mã OTP.",
        isError: true,
      });
      return;
    }

    setIsSendingOtp(true);
    setMessage(null);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/request-otp?type=register`,
        {
          email: form.email.trim(),
        },
      );

      setMessage({
        text: data?.message ?? "Đã gửi OTP. Vui lòng kiểm tra email.",
        isError: false,
      });
    } catch (error: unknown) {
      let errorMsg: string | string[] = "Không thể gửi OTP.";

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
      setIsSendingOtp(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.otp.trim()) {
      setMessage({
        text: "Vui lòng nhập mã OTP để hoàn tất đăng ký.",
        isError: true,
      });
      return;
    }

    if (passwordError) {
      setMessage({ text: "Vui lòng kiểm tra lại mật khẩu.", isError: true });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const nameParts = form.fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";

      const { data } = await axios.post<RegisterResponse>(
        `${API_BASE_URL}/auth/register`,
        {
          email: form.email.trim(),
          password: form.password,
          firstName,
          lastName,
          otp: form.otp.trim(),
        },
      );

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage({
        text: "Đăng ký thành công! Đang đăng nhập...",
        isError: false,
      });
      setForm(initialForm);

      setTimeout(() => {
        router.push("/home");
      }, 1000);
    } catch (error: unknown) {
      let errorMsg: string | string[] = "Có lỗi xảy ra khi đăng ký.";

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
            <UserPlus className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Tạo tài khoản
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Đăng ký nhanh để bắt đầu mua sắm.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium">
              Họ và tên
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={form.fullName}
              onChange={(e) => onFieldChange("fullName", e.target.value)}
              placeholder="Nguyen Van A"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div className="flex gap-2">
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => onFieldChange("email", e.target.value)}
                placeholder="you@example.com"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={onRequestOtp}
                disabled={isSendingOtp || isSubmitting}
              >
                {isSendingOtp ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <MailCheck className="mr-2 size-4" />
                )}
                {isSendingOtp ? "Đang gửi" : "Lấy OTP"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Nhấn "Lấy OTP" để nhận mã xác thực qua email.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="otp" className="text-sm font-medium">
              Mã OTP
            </label>
            <input
              id="otp"
              type="text"
              required
              value={form.otp}
              onChange={(e) =>
                onFieldChange("otp", e.target.value.toUpperCase())
              }
              placeholder="Nhập 6 ký tự OTP"
              maxLength={6}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm uppercase outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password">Mật khẩu</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => onFieldChange("password", e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={form.confirmPassword}
                onChange={(e) =>
                  onFieldChange("confirmPassword", e.target.value)
                }
                placeholder="Nhập lại mật khẩu"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin mr-2" />
            ) : null}
            {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
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
          Đã có tài khoản?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}

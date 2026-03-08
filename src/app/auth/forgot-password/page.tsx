"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  KeyRound,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type MessageState = {
  text: string;
  isError: boolean;
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

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [resetToken, setResetToken] = useState<string | null>(null);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [message, setMessage] = useState<MessageState | null>(null);

  const passwordError = useMemo(() => {
    if (!confirmPassword) return "";
    return newPassword === confirmPassword
      ? ""
      : "Mật khẩu xác nhận chưa khớp.";
  }, [newPassword, confirmPassword]);

  const onRequestOtp = async () => {
    if (!email.trim()) {
      setMessage({ text: "Vui lòng nhập email để lấy mã OTP.", isError: true });
      return;
    }

    setMessage(null);
    setIsSendingOtp(true);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/request-otp?type=reset-password`,
        {
          email: email.trim(),
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

  const onVerifyOtp = async () => {
    if (!email.trim() || !otp.trim()) {
      setMessage({ text: "Vui lòng nhập đầy đủ email và OTP.", isError: true });
      return;
    }

    setMessage(null);
    setIsVerifyingOtp(true);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/verify-reset-otp`,
        {
          email: email.trim(),
          otp: otp.trim().toUpperCase(),
        },
      );

      setResetToken(data?.resetToken ?? null);
      setMessage({
        text:
          data?.message ??
          "Xác thực OTP thành công. Bạn có thể đặt mật khẩu mới.",
        isError: false,
      });
    } catch (error: unknown) {
      setResetToken(null);

      let errorMsg: string | string[] = "OTP không hợp lệ hoặc đã hết hạn.";

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
      setIsVerifyingOtp(false);
    }
  };

  const onResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resetToken) {
      setMessage({
        text: "Vui lòng xác thực OTP trước khi đổi mật khẩu.",
        isError: true,
      });
      return;
    }

    if (passwordError) {
      setMessage({ text: "Vui lòng kiểm tra lại mật khẩu.", isError: true });
      return;
    }

    setMessage(null);
    setIsResettingPassword(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        resetToken,
        newPassword,
      });

      const { data } = await axios.post<LoginResponse>(
        `${API_BASE_URL}/auth/login`,
        {
          email: email.trim(),
          password: newPassword,
        },
      );

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage({
        text: "Đổi mật khẩu thành công! Đang đăng nhập...",
        isError: false,
      });

      setTimeout(() => {
        router.push("/home");
      }, 1200);
    } catch (error: unknown) {
      let errorMsg: string | string[] = "Không thể đổi mật khẩu.";

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
      setIsResettingPassword(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-1px)] overflow-hidden bg-gradient-to-b from-muted/40 via-background to-background px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,oklch(0.97_0_0),transparent_35%),radial-gradient(circle_at_80%_20%,oklch(0.93_0_0),transparent_30%)]" />

      <section className="relative mx-auto w-full max-w-md rounded-2xl border border-border/60 bg-card/90 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl border border-border bg-secondary p-2">
            <ShieldQuestion className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Quen mat khau
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Xac thuc OTP va dat lai mat khau moi.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div className="flex gap-2">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResetToken(null);
                }}
                placeholder="you@example.com"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={onRequestOtp}
                disabled={isSendingOtp || isVerifyingOtp || isResettingPassword}
              >
                {isSendingOtp ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <MailCheck className="mr-2 size-4" />
                )}
                {isSendingOtp ? "Dang gui" : "Gui OTP"}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="otp" className="text-sm font-medium">
              Ma OTP
            </label>
            <div className="flex gap-2">
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.toUpperCase());
                  setResetToken(null);
                }}
                placeholder="Nhap 6 ky tu OTP"
                maxLength={6}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm uppercase outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={onVerifyOtp}
                disabled={isVerifyingOtp || isSendingOtp || isResettingPassword}
              >
                {isVerifyingOtp ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 size-4" />
                )}
                {isVerifyingOtp ? "Dang xac thuc" : "Xac thuc"}
              </Button>
            </div>
          </div>
        </div>

        {resetToken ? (
          <form className="mt-4 space-y-4" onSubmit={onResetPassword}>
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="text-sm font-medium">
                Mat khau moi
              </label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Toi thieu 8 ky tu"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Xac nhan mat khau moi
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhap lai mat khau moi"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              {passwordError ? (
                <p className="text-xs text-destructive">{passwordError}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isResettingPassword || isVerifyingOtp || isSendingOtp}
            >
              {isResettingPassword ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 size-4" />
              )}
              {isResettingPassword ? "Dang cap nhat" : "Dat lai mat khau"}
            </Button>
          </form>
        ) : null}

        {message ? (
          <p
            className={`mt-4 text-center text-xs ${message.isError ? "text-destructive" : "text-green-500"}`}
          >
            {message.text}
          </p>
        ) : null}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Da nho mat khau?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Dang nhap
          </Link>
        </p>
      </section>
    </main>
  );
}

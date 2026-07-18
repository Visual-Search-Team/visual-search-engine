import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiLock, FiMail } from "react-icons/fi";
import { login } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { PasswordInput } from "../components/ui/PasswordInput";

const getTokenPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
};

const getRoleFromResponse = (response, token) => {
  const payload = getTokenPayload(token);
  const role =
    response?.data?.user?.role ||
    response?.data?.role ||
    response?.user?.role ||
    response?.role ||
    payload?.role ||
    payload?.authorities?.[0] ||
    payload?.roles?.[0] ||
    "USER";

  return String(role).replace("ROLE_", "").toUpperCase();
};

const getUserFromResponse = (response, usernameOrEmail, role) => {
  const responseUser = response?.data?.user || response?.user || {};

  return {
    ...responseUser,
    email: responseUser.email || (usernameOrEmail.includes("@") ? usernameOrEmail : ""),
    username: responseUser.username || (!usernameOrEmail.includes("@") ? usernameOrEmail : ""),
    role,
  };
};

const getApiErrorMessage = (err) => {
  const status = err?.response?.status;
  const responseError = err?.response?.data?.error;
  const validationMessage = err?.response?.data?.message;

  if (responseError?.message) return responseError.message;
  if (validationMessage) return validationMessage;
  if (status === 502 || status === 503) {
    return "Dịch vụ đăng nhập đang tạm thời không khả dụng. Vui lòng kiểm tra backend và thử lại.";
  }
  if (err?.message) return err.message;

  return "Không thể đăng nhập";
};

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginSuccess } = useAuth();
  const [form, setForm] = useState({ usernameOrEmail: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        usernameOrEmail: form.usernameOrEmail.trim(),
        password: form.password,
      };
      const response = await login(payload);

      if (response?.success === false) {
        throw new Error(response?.error?.message || "Đăng nhập thất bại");
      }

      const token = response?.data?.accessToken || response?.accessToken || response?.token;
      if (!token) {
        throw new Error("API chưa trả về access token");
      }

      const role = getRoleFromResponse(response, token);
      loginSuccess({
        token,
        user: getUserFromResponse(response, payload.usernameOrEmail, role),
      });

      const fromPath = location.state?.from?.pathname || null;
      let finalPath = "/";

      if (role === "ADMIN") {
        finalPath = fromPath?.startsWith("/admin") ? fromPath : "/admin";
      } else {
        finalPath = (fromPath && fromPath !== "/login" && !fromPath?.startsWith("/admin")) ? fromPath : "/";
      }

      navigate(finalPath, { replace: true });

    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] flex flex-col gap-7">
      <div className="text-center">
        <h1 className="text-4xl font-bold leading-tight text-indigo-700">Visual Search</h1>
        <p className="mt-2 text-base text-gray-700">Trí tuệ nhân tạo, mở rộng tầm nhìn.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col gap-5 overflow-hidden rounded-xl border border-gray-200 bg-white p-8 shadow-md"
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 bg-linear-30 from-indigo-700/5 to-indigo-700/0" />

        <h2 className="text-center text-3xl font-semibold leading-10 text-zinc-900">Đăng nhập</h2>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {location.state?.message && !error && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {location.state.message}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Username hoặc Email
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="usernameOrEmail"
              type="text"
              value={form.usernameOrEmail}
              onChange={handleChange}
              placeholder="ví dụ: quannh08 hoặc ten@email.com"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Mật khẩu
          <PasswordInput
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          {/* <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
            />
          </div> */}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-indigo-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p className="text-center text-base text-gray-700">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="text-sm font-medium text-indigo-700 hover:underline">
            Đăng ký
          </Link>
        </p>
      </form>
    </div>
  );
};

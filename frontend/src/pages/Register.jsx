import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLock, FiMail, FiUser } from "react-icons/fi";
import { register } from "../services/authService";

const getApiErrorMessage = (err) => {
  const status = err?.response?.status;
  const responseError = err?.response?.data?.error;
  const validationMessage = err?.response?.data?.message;

  if (responseError?.message) return responseError.message;
  if (validationMessage) return validationMessage;
  if (status === 409) return "Username hoặc email đã tồn tại.";
  if (status === 502 || status === 503) {
    return "Dịch vụ đăng ký đang tạm thời không khả dụng. Vui lòng kiểm tra backend và thử lại.";
  }
  if (err?.message) return err.message;

  return "Không thể đăng ký";
};

export const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
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

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu nhập lại chưa khớp");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      if (response?.success === false) {
        throw new Error(response?.error?.message || "Đăng ký thất bại");
      }

      navigate("/login", {
        replace: true,
        state: { message: "Đăng ký thành công, vui lòng đăng nhập." },
      });
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

        <h2 className="text-center text-3xl font-semibold leading-10 text-zinc-900">
          Đăng ký tài khoản
        </h2>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Tên người dùng
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="ví dụ: quannh08"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Email
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ví dụ: ten@email.com"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Mật khẩu
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <span className="text-xs font-normal text-gray-700">Mật khẩu nên có ít nhất 8 ký tự.</span>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Nhập lại mật khẩu
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-indigo-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>

        <p className="text-center text-base text-gray-700">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-sm font-medium text-indigo-700 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
};

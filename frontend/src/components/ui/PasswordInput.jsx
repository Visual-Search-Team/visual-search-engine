import { useState } from 'react';
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export const PasswordInput = (props) => {

    const { name, value, onChange } = props;

    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    name={name}
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none"
                >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
            </div>
        </>
    )
}
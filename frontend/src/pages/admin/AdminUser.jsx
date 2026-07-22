import { getAdminUsers } from "../../services/adminUserService"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { data } from "react-router-dom";

const PAGE_SIZE = 20;

export const AdminUser = () => {

    const [page, setPage] = useState(0);
    const dataUser = useQuery({
        queryKey: ["admin-user", page],
        queryFn: () => getAdminUsers({
            page,
            size: PAGE_SIZE
        }),
        placeholderData: keepPreviousData,
    })

    // console.log("Chi tiết lỗi Axios:", dataUser.error);

    console.log("data minh dung: ", dataUser.data)

    const listUser = dataUser.data?.content || [];
    // console.log(listUser)
    const totalPages = dataUser.data?.totalPages;
    // console.log(totalPages) 
    const totalElements = dataUser.data?.totalElements;
    // console.log(totalElements)

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Quản lý người dùng</h1>
                        <p className="text-sm text-gray-500 mt-1">Danh sách tài khoản hệ thống</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-4 py-1.5 rounded-full shadow-sm">
                        Tổng số: {totalElements} user
                    </span>
                </div>

                <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold">ID</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Username</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Email</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Role</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Ngày tạo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {dataUser.isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-medium">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : listUser.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-medium">
                                        Không tìm thấy dữ liệu người dùng
                                    </td>
                                </tr>
                            ) : (
                                listUser.map((user) => (
                                    <tr key={user.id} className="bg-white hover:bg-gray-50 transition-colors duration-150">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {user.id}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-800">
                                            {user.username}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${user.role === 'ADMIN'
                                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2.5 w-2.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'
                                                    }`}></div>
                                                <span className={`font-medium ${user.status === 'ACTIVE' ? 'text-green-700' : 'text-red-700'
                                                    }`}>
                                                    {user.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {formatDate(user.createdAt)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <button
                        onClick={() => setPage(old => Math.max(old - 1, 0))}
                        disabled={page === 0}
                        className="cursor-pointer px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                    >
                        &larr; Trang trước
                    </button>

                    <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                        Trang <span className="font-bold text-gray-900">{page + 1}</span> / <span className="font-bold text-gray-900">{totalPages === 0 ? 1 : totalPages}</span>
                    </div>

                    <button
                        onClick={() => setPage(old => old + 1)}
                        disabled={page >= totalPages - 1}
                        className="cursor-pointer px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                    >
                        Trang sau &rarr;
                    </button>
                </div>
            </div>
        </>
    )
}
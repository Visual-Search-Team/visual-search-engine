import apiClient from "./apiClient";

const unwrapResponse = (respone) => respone.data.data;

export const getAdminUsers = async ({page, size}) => {
    const respone = await apiClient.get("/admin/users", {
        params: {page, size}
    });
    console.log("Axios Response đầy đủ:", respone);
    console.log("Nội dung response.data:", respone.data);
    return unwrapResponse(respone);

}
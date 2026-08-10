export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  const safeDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  const date = new Date(safeDateString);

  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('vi-VN');
};
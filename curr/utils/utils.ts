export const isValidDate = (date: any): boolean => {
  if (!date) return false;
  const today = new Date();
  const num_date = parseInt(date);
  // console.log(
  //   today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  // );
  // console.log(num_date);
  return (
    num_date >=
    today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate()
  );
};
export const isValidLat = (lat: any): boolean => {
  const num = Number(lat);
  return !isNaN(num) && -90 <= num && num <= 90;
};
export const isValidLng = (lng: any): boolean => {
  const num = Number(lng);
  return !isNaN(num) && -180 <= num && num <= 180;
};

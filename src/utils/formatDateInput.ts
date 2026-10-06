/** Mask free-typed digits as DD/MM/YYYY, inserting slashes as the user types. */
export const formatDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, "").substring(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4)
    return `${digits.substring(0, 2)}/${digits.substring(2)}`;
  return `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4)}`;
};

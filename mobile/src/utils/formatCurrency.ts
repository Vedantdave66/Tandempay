/**
 * Safely formats any numeric value (including strings, nulls, or undefined
 * that may arrive from the API) into a fixed-decimal string.
 *
 * @param value   - The raw value to format (any type)
 * @param decimals - Number of decimal places (default: 2)
 * @returns A formatted string like "12.50", or "0.00" if the value is not numeric
 */
export const formatCurrency = (value: any, decimals = 2): string => {
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(decimals);
};

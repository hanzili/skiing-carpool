// utils/date-utils.js

/**
 * Format a date to locale string in Chinese format (MM-DD HH:MM)
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date string
 */
const formatToLocaleString = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '-');
};

/**
 * Format a date to YYYY-MM-DD format without time
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date string YYYY-MM-DD
 */
const formatToDateOnly = (date) => {
  if (!date) return '';
  
  // First check if it's already in YYYY-MM-DD format
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return date; // Already in the correct format, return as is
  }
  
  // Check if it's in MM-DD format (like "04-15")
  if (typeof date === 'string' && date.match(/^(\d{2})-(\d{2})$/)) {
    const [, month, day] = date.match(/^(\d{2})-(\d{2})$/);
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${month}-${day}`;
  }
  
  // Handle date objects or other string formats
  let year, month, day;
  
  if (typeof date === 'string') {
    // Handle Chinese date formats with 下午/上午
    if (date.includes('下午') || date.includes('上午')) {
      const parts = date.split(/下午|上午/);
      if (parts.length > 0) {
        const datePart = parts[0].trim();
        // Extract month and day from MM-DD format
        const dateMatch = datePart.match(/(\d{2})-(\d{2})/);
        if (dateMatch) {
          // Use current year with the extracted month and day
          year = new Date().getFullYear();
          month = parseInt(dateMatch[1]);
          day = parseInt(dateMatch[2]);
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    
    // Try to extract date components from other string formats
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      // Use UTC methods to avoid timezone shifts
      year = dateObj.getUTCFullYear();
      month = dateObj.getUTCMonth() + 1; // Months are 0-indexed
      day = dateObj.getUTCDate();
      
      // Adjust for local timezone if needed
      const localDate = new Date(date);
      if (localDate.getDate() !== dateObj.getUTCDate()) {
        // The date changed due to timezone, use local date instead
        year = localDate.getFullYear();
        month = localDate.getMonth() + 1;
        day = localDate.getDate();
      }
      
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } else if (date instanceof Date) {
    // Handle Date objects directly
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  return ''; // Return empty string if we can't format the date
};

/**
 * Checks if a departure date has expired (is before today)
 * @param {Date|string} departureDate - The departure date to check
 * @returns {boolean} - True if expired, false otherwise
 */
const isDateExpired = (departureDate) => {
  if (!departureDate) return false;
  
  const depDate = new Date(departureDate);
  if (isNaN(depDate.getTime())) return false;
  
  // Reset times to beginning of day for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Make a copy to not mutate the input
  const depDateCopy = new Date(depDate);
  depDateCopy.setHours(0, 0, 0, 0);
  
  return depDateCopy < today;
};

/**
 * Convert various date formats to ISO string
 * @param {string} dateInput - The date input to convert
 * @returns {string} - ISO date string
 */
const formatToISO = (dateInput) => {
  try {
    // Handle undefined/null cases
    if (!dateInput) {
      return new Date().toISOString();
    }
    
    // If it's already a valid ISO date string, return it directly
    if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
      return dateInput;
    }
    
    // If it's a YYYY-MM-DD date string, add time component
    if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Use UTC date to avoid timezone issues
      const [year, month, day] = dateInput.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.toISOString();
    }
    
    // If it's a MM-DD format (like "04-15"), add current year and time
    if (typeof dateInput === 'string' && dateInput.match(/^(\d{2})-(\d{2})$/)) {
      const [, month, day] = dateInput.match(/^(\d{2})-(\d{2})$/);
      const currentYear = new Date().getFullYear();
      const date = new Date(Date.UTC(currentYear, parseInt(month) - 1, parseInt(day)));
      return date.toISOString();
    }
    
    // Handle Chinese date formats (MM-DD-HH-MM)
    if (typeof dateInput === 'string') {
      // If we find Chinese characters like 上午/下午 (AM/PM), adjust the time accordingly
      let hour = 0;
      let isPM = false;
      
      if (dateInput.includes('下午') || dateInput.includes('晚上')) {
        isPM = true;
      }
      
      // Clean up the date string to extract numbers
      const cleanDateInput = dateInput.replace(/[^0-9\/\-: ]/g, '').trim();
      
      // Extract date components using regex patterns
      const dateParts = cleanDateInput.match(/(\d{1,2})[-\/](\d{1,2})(.*?)(\d{1,2})[:](\d{1,2})/);
      
      if (dateParts) {
        const currentYear = new Date().getFullYear();
        // Ensure these are numbers and in the correct range
        const month = Math.min(12, Math.max(1, parseInt(dateParts[1]))); // 1-12
        const day = Math.min(31, Math.max(1, parseInt(dateParts[2]))); // 1-31
        hour = Math.min(23, Math.max(0, parseInt(dateParts[4]))); // 0-23
        
        // Adjust hour for PM
        if (isPM && hour < 12) {
          hour += 12;
        }
        
        const minute = Math.min(59, Math.max(0, parseInt(dateParts[5]))); // 0-59
        
        // Create a new date with the extracted components using UTC
        const date = new Date(Date.UTC(currentYear, month - 1, day, hour, minute, 0));
        return date.toISOString();
      }
    }
    
    // Last resort, try to create a Date object and get ISO string
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      // Create a Date using UTC from the components to avoid timezone shifts
      const utcDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      ));
      return utcDate.toISOString();
    }
    
    // If all else fails, return current date
    return new Date().toISOString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toISOString();
  }
};

module.exports = {
  formatToLocaleString,
  formatToDateOnly,
  isDateExpired,
  formatToISO
}; 
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
  
  let dateObj;
  
  if (typeof date === 'string') {
    // Handle Chinese date formats
    if (date.includes('下午') || date.includes('上午')) {
      const parts = date.split(/下午|上午/);
      if (parts.length > 0) {
        const datePart = parts[0].trim();
        const currentYear = new Date().getFullYear();
        dateObj = new Date(`${currentYear}-${datePart}`);
      }
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = new Date(date);
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.getFullYear() + '-' + 
         String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
         String(dateObj.getDate()).padStart(2, '0');
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
      return `${dateInput}T00:00:00.000Z`;
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
        
        // Create a new date with the extracted components
        const date = new Date(currentYear, month - 1, day, hour, minute, 0);
        return date.toISOString();
      }
    }
    
    // Last resort, try to create a Date object and get ISO string
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
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
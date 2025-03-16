import apiConfig from '../config/api.js';
import AuthService from './auth.js';

// Helper function for HTTP requests
const request = async (url, method = 'GET', data = {}, requireAuth = false) => {
  console.log(`Making ${method} request to: ${apiConfig.baseUrl}${url}`);
  
  // 准备请求头
  const header = {
    'content-type': 'application/json'
  };
  
  // 如果需要认证，添加令牌到请求头并确保令牌有效
  if (requireAuth) {
    // Ensure we have a valid token before proceeding
    const isValid = await AuthService.ensureValidToken();
    if (!isValid) {
      console.error('Failed to get valid auth token for request to:', url);
      return Promise.reject(new Error('AUTH_INVALID'));
    }
    
    const token = AuthService.getToken();
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    } else {
      console.error('Auth token missing for request to:', url);
      return Promise.reject(new Error('AUTH_TOKEN_MISSING'));
    }
  }
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiConfig.baseUrl}${url}`,
      method,
      data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          console.error(`Request to ${url} failed with status: ${res.statusCode}`);
          
          // Handle specific error cases
          if (res.statusCode === 401) {
            // Auth token is expired or invalid, use AuthService to handle
            AuthService.handleAuthError();
            reject(new Error('AUTH_TOKEN_EXPIRED'));
          } else if (res.statusCode === 400 && res.data && res.data.error) {
            // Specific backend error message
            console.error('Bad Request Error:', res.data.error);
            reject(new Error(res.data.error));
          } else if (res.statusCode === 500 && res.data && res.data.error) {
            // Server error with details
            console.error('Server Error:', res.data.error);
            reject(new Error(`SERVER_ERROR: ${res.data.error}`));
          } else {
            // General error
            reject(new Error(`API_ERROR_${res.statusCode}`));
          }
        }
      },
      fail: (err) => {
        console.error(`Network request to ${url} failed:`, err);
        // Network error (no connection, timeout, etc.)
        reject(new Error('NETWORK_ERROR'));
      }
    });
  });
};

// Helper to get a fresh login code
const getFreshLoginCode = async () => {
  try {
    const result = await new Promise((resolve, reject) => {
      wx.login({
        success: res => resolve(res),
        fail: err => reject(err)
      });
    });
    
    if (!result.code) {
      throw new Error('Failed to get WeChat login code');
    }
    
    return result.code;
  } catch (err) {
    console.error('Error getting fresh login code:', err);
    throw err;
  }
};

const ApiService = {
  // Get base URL for troubleshooting
  getBaseUrl: () => {
    return apiConfig.baseUrl;
  },
  
  // Test endpoints
  healthCheck: () => {
    return request(apiConfig.endpoints.healthCheck);
  },
  
  dbTest: () => {
    return request(apiConfig.endpoints.dbTest);
  },
  
  // Token refresh endpoint - ADD THIS TO YOUR BACKEND
  refreshToken: () => {
    // This makes a request to refresh the token
    // Pass the current token in the Authorization header
    // The endpoint should validate the old token and issue a new one
    return request(apiConfig.endpoints.refreshToken || '/api/auth/refresh-token', 'POST', {}, true);
  },
  
  // Carpool endpoints
  getAllCarpools: () => {
    return request(apiConfig.endpoints.getAllCarpools);
  },
  
  // Get a single carpool by ID
  getCarpoolById: (id) => {
    if (!id) {
      console.error('getCarpoolById called with no ID');
      return Promise.reject(new Error('Missing carpool ID'));
    }
    return request(`${apiConfig.endpoints.getCarpoolById}/${id}`);
  },
  
  // New filter endpoints
  getNeedCarCarpools: (page = 1, pageSize = 10) => {
    return request(`${apiConfig.endpoints.needCarCarpools}?page=${page}&pageSize=${pageSize}`);
  },
  
  getNeedPeopleCarpools: (page = 1, pageSize = 10) => {
    return request(`${apiConfig.endpoints.needPeopleCarpools}?page=${page}&pageSize=${pageSize}`);
  },
  
  getTodayCarpools: (page = 1, pageSize = 10) => {
    return request(`${apiConfig.endpoints.todayCarpools}?page=${page}&pageSize=${pageSize}`);
  },
  
  getThisWeekCarpools: (page = 1, pageSize = 10) => {
    return request(`${apiConfig.endpoints.thisWeekCarpools}?page=${page}&pageSize=${pageSize}`);
  },
  
  // Search endpoint
  searchCarpools: (query, page = 1, pageSize = 10) => {
    if (!query) {
      return Promise.reject(new Error('Search query cannot be empty'));
    }
    return request(`${apiConfig.endpoints.searchCarpools}?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`);
  },
  
  createCarpool: (carpoolData) => {
    return request(apiConfig.endpoints.createCarpool, 'POST', carpoolData, true);
  },
  
  updateCarpool: (id, carpoolData) => {
    if (!id) {
      console.error('updateCarpool called with no ID');
      return Promise.reject(new Error('Missing carpool ID'));
    }
  
    console.log('updateCarpool - Raw data before request:', JSON.stringify(carpoolData));
    
    // Ensure the date is in valid ISO format by parsing and reformatting
    if (carpoolData.departureTime) {
      try {
        console.log('Original departure time (before processing):', carpoolData.departureTime);
        
        // CRITICAL: Extract the actual date components regardless of format
        let year, month, day, hour = 0, minute = 0;
        
        // If it's in "MM-DD" format like "04-15"
        if (typeof carpoolData.departureTime === 'string' && carpoolData.departureTime.match(/^(\d{2})-(\d{2})$/)) {
          const [, mm, dd] = carpoolData.departureTime.match(/^(\d{2})-(\d{2})$/);
          year = new Date().getFullYear();
          month = parseInt(mm, 10);
          day = parseInt(dd, 10);
          console.log(`Parsed MM-DD format: Year=${year}, Month=${month}, Day=${day}`);
        }
        // If it's in "YYYY-MM-DD" format
        else if (typeof carpoolData.departureTime === 'string' && carpoolData.departureTime.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [yyyy, mm, dd] = carpoolData.departureTime.split('-').map(num => parseInt(num, 10));
          year = yyyy;
          month = mm;
          day = dd;
          console.log(`Parsed YYYY-MM-DD format: Year=${year}, Month=${month}, Day=${day}`);
        }
        // If it's a Chinese format like "04-07下午08:00"
        else if (typeof carpoolData.departureTime === 'string' && 
                (carpoolData.departureTime.includes('上午') || carpoolData.departureTime.includes('下午'))) {
          
          // Extract date part (MM-DD)
          const dateMatch = carpoolData.departureTime.match(/(\d{2})-(\d{2})/);
          if (dateMatch) {
            month = parseInt(dateMatch[1], 10);
            day = parseInt(dateMatch[2], 10);
            year = new Date().getFullYear();
            
            // Extract time if available
            const timeMatch = carpoolData.departureTime.match(/(\d{2}):(\d{2})/);
            if (timeMatch) {
              hour = parseInt(timeMatch[1], 10);
              minute = parseInt(timeMatch[2], 10);
              
              // Adjust for PM
              if (carpoolData.departureTime.includes('下午') && hour < 12) {
                hour += 12;
              }
            }
            console.log(`Parsed Chinese format: Year=${year}, Month=${month}, Day=${day}, Hour=${hour}, Minute=${minute}`);
          }
        }
        // Already in ISO format
        else if (carpoolData.departureTime.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
          console.log('Already in ISO format, will use as is');
          // No processing needed
        }
        // Other formats - try to extract date components
        else {
          // Create a local date object
          const localDate = new Date(carpoolData.departureTime);
          if (!isNaN(localDate.getTime())) {
            year = localDate.getFullYear();
            month = localDate.getMonth() + 1; // JavaScript months are 0-indexed
            day = localDate.getDate();
            hour = localDate.getHours();
            minute = localDate.getMinutes();
            console.log(`Parsed from Date object: Year=${year}, Month=${month}, Day=${day}, Hour=${hour}, Minute=${minute}`);
          } else {
            // If all parsing methods fail, use current date/time
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth() + 1;
            day = now.getDate();
            hour = now.getHours();
            minute = now.getMinutes();
            console.warn('Failed to parse date, using current date/time');
          }
        }
        
        // If we extracted valid date components, create an ISO string that preserves the local date
        if (year && month && day) {
          // CRITICAL: Set the hour to noon (12) in UTC to ensure the local date remains the same
          // This prevents date shifts due to timezone conversion
          const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
          carpoolData.departureTime = utcDate.toISOString();
          console.log('Final ISO date (with noon UTC to preserve local date):', carpoolData.departureTime);
        }
      } catch (error) {
        console.error('Date parsing error in updateCarpool:', error);
        carpoolData.departureTime = new Date().toISOString();
      }
    }
    
    console.log('updateCarpool - Sanitized data after processing:', JSON.stringify(carpoolData));
    
    return request(`${apiConfig.endpoints.updateCarpool}/${id}`, 'PUT', carpoolData, true);
  },
  
  deleteCarpool: (id) => {
    if (!id) {
      console.error('deleteCarpool called with no ID');
      return Promise.reject(new Error('Missing carpool ID'));
    }
    return request(`${apiConfig.endpoints.deleteCarpool}/${id}`, 'DELETE', {}, true);
  },
  
  // 用户相关接口
  login: async (code, userInfo, retryCount = 0) => {
    try {
      console.log('[API SVC] Starting login with credentials');
      
      // Max retry attempts
      const MAX_RETRIES = 2;
      
      // Use the provided code for first attempt
      const requestBody = { 
        code, 
        nickName: userInfo?.nickName,
        avatarUrl: userInfo?.avatarUrl
      };
      
      return await request(apiConfig.endpoints.login, 'POST', requestBody);
    } catch (error) {
      console.error('[API SVC] Login error:', error.message);
      
      // If the error is due to code already being used and we haven't exceeded retry limit
      if (error.message && 
          (error.message.includes('LOGIN_CODE_USED') || 
           error.message.includes('INVALID_LOGIN_CODE') ||
           error.message.includes('code been used')) && 
          retryCount < 2) {
        
        console.log(`[API SVC] Login code error, refreshing code (attempt ${retryCount + 1})`);
        
        // Get a fresh login code
        const freshCode = await getFreshLoginCode();
        
        // Retry with the fresh code
        return ApiService.login(freshCode, userInfo, retryCount + 1);
      }
      
      // If not a code issue or exceeded retries, rethrow the error
      throw error;
    }
  },
  
  // 获取当前登录用户信息
  getMyInfo: () => {
    return request(apiConfig.endpoints.myInfo, 'GET', {}, true);
  },
  
  // 获取用户自己发布的帖子 (使用JWT认证)
  getMyPosts: (archived = false) => {
    const url = `${apiConfig.endpoints.myPosts}?archived=${String(archived)}`;
    console.log(`[ApiService] Calling myPosts with URL: ${url}`);
    return request(url, 'GET', {}, true);
  },
  
  // Test endpoint for debugging date filtering
  testDateFilter: () => {
    return request('/api/carpools/testDateFilter', 'GET', {}, true);
  },
  
  // 获取用户拼车统计信息
  getUserCarpoolStats: (userId) => {
    return request(`${apiConfig.endpoints.userCarpoolStats}/${userId}`);
  }
};

export default ApiService; 
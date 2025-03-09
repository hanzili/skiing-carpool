import apiConfig from '../config/api.js';

// Helper function for HTTP requests
const request = (url, method = 'GET', data = {}, requireAuth = false) => {
  console.log(`Making ${method} request to: ${apiConfig.baseUrl}${url}`, JSON.stringify(data));
  
  // 准备请求头
  const header = {
    'content-type': 'application/json'
  };
  
  // 如果需要认证，添加令牌到请求头
  if (requireAuth) {
    const token = wx.getStorageSync('auth_token') || wx.getStorageSync('token');
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
      console.log('Using auth token:', token.substring(0, 15) + '...');
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
        console.log(`Response from ${url}:`, JSON.stringify(res.data));
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          console.error(`Request to ${url} failed with status: ${res.statusCode}`, res.data);
          
          // Handle specific error cases
          if (res.statusCode === 401) {
            // Auth token might be expired or invalid
            wx.removeStorageSync('auth_token');
            wx.removeStorageSync('token');
            
            if (url !== apiConfig.endpoints.login) {
              // Prompt re-login for non-login endpoints
              wx.showModal({
                title: '登录已过期',
                content: '您的登录已过期，请重新登录',
                showCancel: false,
                success: () => {
                  // Redirect to a page that handles login (e.g., home or profile)
                  wx.reLaunch({
                    url: '/pages/my-posts/my-posts'
                  });
                }
              });
            }
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
  
  // Carpool endpoints
  getAllCarpools: () => {
    return request(apiConfig.endpoints.getAllCarpools);
  },
  
  // Get a single carpool by ID
  getCarpoolById: (id) => {
    return request(`${apiConfig.endpoints.getCarpoolById}${id}`);
  },
  
  // New filter endpoints
  getNeedCarCarpools: () => {
    return request(apiConfig.endpoints.needCarCarpools);
  },
  
  getNeedPeopleCarpools: () => {
    return request(apiConfig.endpoints.needPeopleCarpools);
  },
  
  getTodayCarpools: () => {
    return request(apiConfig.endpoints.todayCarpools);
  },
  
  getThisWeekCarpools: () => {
    return request(apiConfig.endpoints.thisWeekCarpools);
  },
  
  // Search endpoint
  searchCarpools: (query) => {
    return request(`${apiConfig.endpoints.searchCarpools}?query=${encodeURIComponent(query)}`);
  },
  
  createCarpool: (carpoolData) => {
    return request(apiConfig.endpoints.createCarpool, 'POST', carpoolData, true);
  },
  
  updateCarpool: (id, carpoolData) => {
    console.log('updateCarpool - Raw data before request:', JSON.stringify(carpoolData));
    
    // Ensure the date is in valid ISO format by parsing and reformatting
    if (carpoolData.departureTime) {
      try {
        // Remove any non-ISO characters and try to construct a valid date
        const sanitizedDate = carpoolData.departureTime.replace(/[^0-9\-:T.Z]/g, '');
        const date = new Date(sanitizedDate);
        if (!isNaN(date.getTime())) {
          carpoolData.departureTime = date.toISOString();
        } else {
          // If date parsing fails, use current time
          carpoolData.departureTime = new Date().toISOString();
        }
      } catch (error) {
        console.error('Date parsing error in updateCarpool:', error);
        carpoolData.departureTime = new Date().toISOString();
      }
    }
    
    console.log('updateCarpool - Sanitized data after processing:', JSON.stringify(carpoolData));
    
    return request(`${apiConfig.endpoints.updateCarpool}${id}`, 'PUT', carpoolData, true);
  },
  
  deleteCarpool: (id) => {
    return request(`${apiConfig.endpoints.deleteCarpool}${id}`, 'DELETE', {}, true);
  },
  
  // 用户相关接口
  login: async (code, userInfo, retryCount = 0) => {
    try {
      // Max retry attempts
      const MAX_RETRIES = 2;
      
      // Use the provided code for first attempt
      return await request(apiConfig.endpoints.login, 'POST', { 
        code, 
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      });
    } catch (error) {
      // If the error is due to code already being used and we haven't exceeded retry limit
      if (error.message && 
          (error.message.includes('LOGIN_CODE_USED') || 
           error.message.includes('INVALID_LOGIN_CODE') ||
           error.message.includes('code been used')) && 
          retryCount < 2) {
        
        console.log(`Login code error detected, refreshing code and retrying (attempt ${retryCount + 1})...`);
        
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
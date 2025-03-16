/**
 * Authentication Service
 * Handles user authentication with consistent methods across the app
 */
import ApiService from './api';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_INFO_KEY = 'userInfo';
const USER_ID_KEY = 'user_id';
const USER_OPENID_KEY = 'user_openid';
const TOKEN_EXPIRY_KEY = 'token_expiry';

class AuthService {
  /**
   * Check if the user is currently logged in
   * @returns {boolean} Whether the user is logged in
   */
  isLoggedIn() {
    try {
      const token = wx.getStorageSync(AUTH_TOKEN_KEY);
      const userInfo = wx.getStorageSync(USER_INFO_KEY);
      
      console.log('[AUTH SVC] isLoggedIn check:', { 
        tokenPresent: !!token, 
        userInfoPresent: !!userInfo 
      });
      
      return !!token && !!userInfo;
    } catch (error) {
      console.error('[AUTH SVC] Error in isLoggedIn check:', error);
      return false;
    }
  }
  
  /**
   * Get the currently logged in user info
   * @returns {Object|null} The user info or null if not logged in
   */
  getUserInfo() {
    try {
      const userInfo = wx.getStorageSync(USER_INFO_KEY);
      return userInfo ? userInfo : null;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }
  
  /**
   * Get the authentication token
   * @returns {string|null} The auth token or null if not logged in
   */
  getToken() {
    return wx.getStorageSync(AUTH_TOKEN_KEY);
  }
  
  /**
   * Get the user ID
   * @returns {string|null} The user ID or null if not logged in
   */
  getUserId() {
    return wx.getStorageSync(USER_ID_KEY);
  }
  
  /**
   * Get the user's WeChat openid
   * @returns {string|null} The user's openid or null if not available
   */
  getUserOpenid() {
    return wx.getStorageSync(USER_OPENID_KEY);
  }
  
  /**
   * Check if token is expired or about to expire
   * @returns {boolean} Whether token needs to be refreshed
   */
  isTokenExpired() {
    try {
      const expiryTime = wx.getStorageSync(TOKEN_EXPIRY_KEY);
      if (!expiryTime) return true;
      
      // Consider token expired if less than 5 minutes remaining
      const fiveMinutes = 5 * 60 * 1000;
      return new Date().getTime() > (expiryTime - fiveMinutes);
    } catch (error) {
      console.error('[AUTH SVC] Error checking token expiry:', error);
      return true;
    }
  }
  
  /**
   * Refresh the authentication token
   * @returns {Promise<boolean>} Whether refresh was successful
   */
  async refreshToken() {
    try {
      if (!this.isLoggedIn()) {
        return false;
      }
      
      console.log('[AUTH SVC] Refreshing auth token');
      
      // Call an API endpoint to refresh the token
      const result = await ApiService.refreshToken();
      
      if (result && result.token) {
        console.log('[AUTH SVC] Token refresh successful');
        
        // Store the new token and update expiry
        wx.setStorageSync(AUTH_TOKEN_KEY, result.token);
        
        // Set token expiry time from server response, or use default if not provided
        if (result.expiryTime) {
          wx.setStorageSync(TOKEN_EXPIRY_KEY, result.expiryTime);
          console.log('[AUTH SVC] Using server-provided token expiry time');
        } else {
          // Fallback to 24-hour expiry if server doesn't provide it
          const defaultExpiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
          wx.setStorageSync(TOKEN_EXPIRY_KEY, defaultExpiryTime);
          console.log('[AUTH SVC] Using default token expiry time (24h)');
        }
        
        return true;
      } else {
        console.error('[AUTH SVC] Token refresh failed - invalid response');
        return false;
      }
    } catch (error) {
      console.error('[AUTH SVC] Token refresh failed:', error);
      return false;
    }
  }
  
  /**
   * Ensure we have a valid token before making an authenticated request
   * @returns {Promise<boolean>} Whether we have a valid token
   */
  async ensureValidToken() {
    if (!this.isLoggedIn()) {
      return false;
    }
    
    if (this.isTokenExpired()) {
      return await this.refreshToken();
    }
    
    return true;
  }
  
  /**
   * Login the user with WeChat authentication flow
   * @param {string} code - The login code from wx.login
   * @param {Object} userInfo - The user profile info from wx.getUserProfile
   * @returns {Promise<Object>} The login response with token and user
   */
  async login(code, userInfo) {
    try {
      console.log('[AUTH SVC] Starting login with code and userInfo');

      const result = await ApiService.login(code, userInfo);
      
      if (result && result.token) {
        // Store token and user info consistently
        wx.setStorageSync(AUTH_TOKEN_KEY, result.token);
        wx.setStorageSync(USER_INFO_KEY, userInfo);
        
        // Set token expiry time from server response, or use default if not provided
        if (result.expiryTime) {
          wx.setStorageSync(TOKEN_EXPIRY_KEY, result.expiryTime);
          console.log('[AUTH SVC] Using server-provided token expiry time');
        } else {
          // Fallback to 24-hour expiry if server doesn't provide it
          const defaultExpiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
          wx.setStorageSync(TOKEN_EXPIRY_KEY, defaultExpiryTime);
          console.log('[AUTH SVC] Using default token expiry time (24h)');
        }
        
        // Store additional user data if provided
        if (result.user) {
          wx.setStorageSync(USER_ID_KEY, result.user.id);
          
          // Store openid if available
          if (result.user.openid) {
            wx.setStorageSync(USER_OPENID_KEY, result.user.openid);
          }
        }
        
        return result;
      } else {
        console.error('[AUTH SVC] Login response missing token');
        throw new Error('Login response missing token');
      }
    } catch (error) {
      console.error('[AUTH SVC] Login failed:', error);
      throw error;
    }
  }
  
  /**
   * Logout the current user
   */
  logout() {
    try {
      wx.removeStorageSync(AUTH_TOKEN_KEY);
      wx.removeStorageSync(USER_INFO_KEY);
      wx.removeStorageSync(USER_ID_KEY);
      wx.removeStorageSync(USER_OPENID_KEY);
      wx.removeStorageSync(TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
  
  /**
   * Handle 401 unauthorized error by clearing auth and redirecting
   * @param {Function} onComplete - Optional callback after handling
   */
  handleAuthError(onComplete) {
    // Clear authentication data
    this.logout();
    
    // Show message to user
    wx.showModal({
      title: '登录已过期',
      content: '您的登录已过期，请重新登录',
      showCancel: false,
      success: () => {
        // Redirect to a page that handles login
        wx.reLaunch({
          url: '/pages/my-posts/my-posts',
          complete: () => {
            if (typeof onComplete === 'function') {
              onComplete();
            }
          }
        });
      }
    });
  }
}

// Export a singleton instance
export default new AuthService(); 
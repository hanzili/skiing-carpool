/**
 * Authentication Service
 * Handles user authentication with consistent methods across the app
 */
import ApiService from './api';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_INFO_KEY = 'userInfo';
const USER_ID_KEY = 'user_id';
const USER_OPENID_KEY = 'user_openid';

class AuthService {
  /**
   * Check if the user is currently logged in
   * @returns {boolean} Whether the user is logged in
   */
  isLoggedIn() {
    return !!wx.getStorageSync(AUTH_TOKEN_KEY) && !!wx.getStorageSync(USER_INFO_KEY);
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
   * Login the user with WeChat authentication flow
   * @param {string} code - The login code from wx.login
   * @param {Object} userInfo - The user profile info from wx.getUserProfile
   * @returns {Promise<Object>} The login response with token and user
   */
  async login(code, userInfo) {
    try {
      const result = await ApiService.login(code, userInfo);
      
      if (result && result.token) {
        // Store token and user info consistently
        wx.setStorageSync(AUTH_TOKEN_KEY, result.token);
        wx.setStorageSync(USER_INFO_KEY, userInfo);
        
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
        throw new Error('Login response missing token');
      }
    } catch (error) {
      console.error('Login failed:', error);
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
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
}

// Export a singleton instance
export default new AuthService(); 
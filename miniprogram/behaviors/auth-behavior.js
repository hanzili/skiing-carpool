/**
 * Authentication Behavior
 * Shared authentication logic for pages that require user login
 */
import AuthService from '../services/auth';

module.exports = Behavior({
  data: {
    // User authentication data
    hasUserInfo: false,
    userInfo: null,
    showWechatPrompt: false,
    isAuthChecking: false
  },

  methods: {
    /**
     * Check if the user is logged in
     * @returns {Promise<void>}
     */
    async checkUserLogin() {
      // Prevent multiple concurrent auth checks
      if (this.data.isAuthChecking) {
        console.log('[AUTH] Auth check already in progress, skipping');
        return;
      }
      
      try {
        this.setData({ isAuthChecking: true });
        console.log('[AUTH] Checking login status');
        
        // Use AuthService to check login status
        if (AuthService.isLoggedIn()) {
          console.log('[AUTH] User is logged in according to AuthService');
          
          // Check if token needs refresh
          if (AuthService.isTokenExpired()) {
            console.log('[AUTH] Token is expired, attempting refresh');
            const refreshed = await AuthService.refreshToken();
            
            if (!refreshed) {
              console.log('[AUTH] Token refresh failed, showing login prompt');
              this.setData({
                hasUserInfo: false,
                showWechatPrompt: true,
                isAuthChecking: false
              });
              
              if (typeof this.onLoginFailed === 'function') {
                this.onLoginFailed('Token refresh failed');
              }
              return;
            }
            
            console.log('[AUTH] Token refresh successful');
          }
          
          const userInfo = AuthService.getUserInfo();
          
          // User is logged in
          this.setData({
            userInfo,
            hasUserInfo: true,
            showWechatPrompt: false,
            isAuthChecking: false
          });
          
          // Call the onLoginSuccess method if it exists
          if (typeof this.onLoginSuccess === 'function') {
            setTimeout(() => {
              this.onLoginSuccess();
            }, 100);
          }
        } else {
          console.log('[AUTH] User is not logged in according to AuthService');
          
          // No need to double-check storage directly anymore
          // If AuthService says user is not logged in, we trust it
          this.setData({
            hasUserInfo: false,
            showWechatPrompt: true,
            isAuthChecking: false
          });
          
          // Call the onLoginFailed method if it exists
          if (typeof this.onLoginFailed === 'function') {
            this.onLoginFailed('Not logged in');
          }
        }
      } catch (error) {
        console.error('[AUTH] Error checking login status:', error);
        this.setData({ 
          hasUserInfo: false,
          showWechatPrompt: true,
          isAuthChecking: false
        });
        
        // Call the onLoginError method if it exists
        if (typeof this.onLoginError === 'function') {
          this.onLoginError(error);
        }
      }
    },
    
    /**
     * Handle login event from login-modal component
     * @param {Object} e - Event object
     */
    onLogin(e) {
      const { code, userInfo } = e.detail;
      
      // Set loading state
      wx.showLoading({
        title: '登录中...',
        mask: true
      });
      
      // Use the AuthService to handle login
      AuthService.login(code, userInfo)
        .then(result => {
          wx.hideLoading();
          
          if (result && result.token) {
            this.setData({
              userInfo,
              hasUserInfo: true,
              showWechatPrompt: false
            });
            
            // Call the onLoginSuccess method if it exists
            if (typeof this.onLoginSuccess === 'function') {
              this.onLoginSuccess();
            }
          }
        })
        .catch(error => {
          wx.hideLoading();
          console.error('[AUTH] Login failed:', error);
          
          let errorMsg = '登录失败';
          if (error.message) {
            // Add more specific error messages based on error types
            if (error.message.includes('NETWORK_ERROR')) {
              errorMsg = '网络连接失败，请检查网络';
            } else if (error.message.includes('SERVER_ERROR')) {
              errorMsg = '服务器错误，请稍后再试';
            }
          }
          
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
          
          // Call the onLoginError method if it exists
          if (typeof this.onLoginError === 'function') {
            this.onLoginError(error);
          }
        });
    },
    
    /**
     * Handle login error event from login-modal
     * @param {Object} e - Event object
     */
    onLoginError(e) {
      const error = e?.detail?.error || e;
      console.error('Login error:', error);
      
      let errorMsg = '登录失败';
      if (typeof error === 'string') {
        errorMsg = error;
      } else if (error && error.message) {
        errorMsg = error.message;
      }
      
      wx.showToast({
        title: errorMsg.substring(0, 20), // Limit length for display
        icon: 'none',
        duration: 2000
      });
    },
    
    /**
     * Handle cancel event from login-modal
     */
    onLoginCancel() {
      this.setData({ showWechatPrompt: false });
      
      // Notify that login was canceled
      if (typeof this.onLoginCancelled === 'function') {
        this.onLoginCancelled();
      }
    }
  }
}); 
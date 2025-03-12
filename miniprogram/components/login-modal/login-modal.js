Component({
  /**
   * Component properties
   */
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  /**
   * Component data
   */
  data: {
    loginCode: null
  },

  /**
   * Component lifecycle
   */
  lifetimes: {
    attached() {
      // Get login code when component is attached
      this.getLoginCode();
    }
  },

  /**
   * Component methods
   */
  methods: {
    // Get fresh login code
    async getLoginCode() {
      try {
        const loginResult = await new Promise((resolve, reject) => {
          wx.login({
            success: res => resolve(res),
            fail: err => reject(err)
          });
        });
        
        if (loginResult.code) {
          this.setData({ loginCode: loginResult.code });
        }
      } catch (error) {
        console.error('Failed to get login code:', error);
      }
    },
    
    // Handle WeChat login - IMPORTANT: This must directly call getUserProfile in response to tap
    handleLogin() {
      // Call getUserProfile directly in response to the user tap
      wx.getUserProfile({
        desc: '用于显示您的昵称和头像',
        success: userProfile => {
          // After successfully getting user profile, use the stored login code
          if (!this.data.loginCode) {
            // If no login code available, get one and then proceed
            wx.login({
              success: loginResult => {
                if (loginResult.code) {
                  this.triggerEvent('login', {
                    code: loginResult.code,
                    userInfo: userProfile.userInfo
                  });
                } else {
                  console.error('Failed to get login code');
                  this.triggerEvent('loginerror', { 
                    error: new Error('No login code available') 
                  });
                }
              },
              fail: err => {
                console.error('Login failed:', err);
                this.triggerEvent('loginerror', { error: err });
              }
            });
          } else {
            // Use the existing login code
            this.triggerEvent('login', {
              code: this.data.loginCode,
              userInfo: userProfile.userInfo
            });
          }
        },
        fail: err => {
          console.log('User denied profile access or error occurred:', err);
          // Only trigger cancel for user denial
          if (err.errMsg && err.errMsg.includes('deny')) {
            this.handleCancel();
          } else {
            this.triggerEvent('loginerror', { error: err });
          }
        }
      });
    },
    
    // Cancel login and close modal (kept for compatibility)
    handleCancel() {
      this.triggerEvent('cancel');
    }
  }
}) 
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
      console.log('[DEBUG LOGIN] Beginning handleLogin method'); 
      console.log('[DEBUG LOGIN] Login code available:', this.data.loginCode);
      
      // Call getUserProfile directly in response to the user tap
      wx.getUserProfile({
        desc: '用于显示您的昵称和头像',
        success: userProfile => {
          console.log('[DEBUG LOGIN] getUserProfile SUCCESS:', JSON.stringify(userProfile));
          console.log('[DEBUG LOGIN] userInfo:', JSON.stringify(userProfile.userInfo));
          
          // After successfully getting user profile, use the stored login code
          if (!this.data.loginCode) {
            console.log('[DEBUG LOGIN] No existing loginCode, getting new one');
            // If no login code available, get one and then proceed
            wx.login({
              success: loginResult => {
                console.log('[DEBUG LOGIN] New login successful:', JSON.stringify(loginResult));
                console.log('[DEBUG LOGIN] User profile to send:', JSON.stringify(userProfile));
                if (loginResult.code) {
                  console.log('[DEBUG LOGIN] Triggering login event with NEW code');
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
                console.error('[DEBUG LOGIN] Login failed:', JSON.stringify(err));
                this.triggerEvent('loginerror', { error: err });
              }
            });
          } else {
            // Use the existing login code
            console.log('[DEBUG LOGIN] Using EXISTING login code:', this.data.loginCode);
            console.log('[DEBUG LOGIN] Triggering login event with existing code');
            this.triggerEvent('login', {
              code: this.data.loginCode,
              userInfo: userProfile.userInfo
            });
          }
        },
        fail: err => {
          console.error('[DEBUG LOGIN] getUserProfile FAILED:', JSON.stringify(err));
          // Only trigger cancel for user denial
          if (err.errMsg && err.errMsg.includes('deny')) {
            console.log('[DEBUG LOGIN] User denied access');
            this.handleCancel();
          } else {
            console.error('[DEBUG LOGIN] Other error occurred');
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
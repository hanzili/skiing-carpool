import ApiService from '../../services/api.js';

Page({
  data: {
    type: 'needCar', // default: need a car
    content: '',
    wechat: '', // This is the WeChat ID field for contact purposes
    departureTime: '',
    shareFare: false,
    departureDate: '',
    peopleChoices: [1, 2, 3, 4, 5, 6, 7, 8],
    peopleIndex: 0,
    isSubmitting: false,
    hasSubmitted: false,
    isLoggedIn: false,
    showLoginModal: false,
    loginCode: null,
    userInfo: null,
    isLoading: true
  },

  onLoad() {
    // 设置最小日期为今天
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    
    this.setData({ 
      minDate,
      isLoading: true 
    });
    
    // 检查登录状态
    this.checkUserLogin();
  },
  
  // 检查用户是否已登录 - 保持与 my-posts 页面一致的方法
  async checkUserLogin() {
    try {
      // 检查是否有认证令牌
      const token = wx.getStorageSync('auth_token');
      const userInfo = wx.getStorageSync('user_info');
      
      if (!token || !userInfo) {
        // 首先尝试微信登录获取code
        const loginResult = await new Promise((resolve, reject) => {
          wx.login({
            success: res => resolve(res),
            fail: err => reject(err)
          });
        });
        
        if (!loginResult.code) {
          wx.showToast({
            title: '登录失败',
            icon: 'error'
          });
          return;
        }
        
        // 保存code并显示登录弹窗
        this.setData({ 
          loginCode: loginResult.code,
          showLoginModal: true,
          isLoggedIn: false,
          isLoading: false
        });
      } else {
        // 已有登录信息，设置到data
        this.setData({
          userInfo: typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo,
          isLoggedIn: true,
          showLoginModal: false,
          isLoading: false,
          nickname: typeof userInfo === 'string' 
            ? JSON.parse(userInfo).nickName 
            : userInfo.nickName || userInfo.nickname || ''
        });
      }
    } catch (error) {
      console.error('Failed to check login status:', error);
      this.setData({ 
        showLoginModal: true,
        isLoggedIn: false,
        isLoading: false 
      });
    }
  },
  
  // 处理用户授权结果 - 与 my-posts 页面一致
  async handleLogin() {
    try {
      // First get a fresh login code to avoid the expired code issue
      await new Promise((resolve, reject) => {
        wx.login({
          success: res => {
            if (res.code) {
              this.setData({ loginCode: res.code });
              resolve(res);
            } else {
              reject(new Error('Failed to get login code'));
            }
          },
          fail: err => reject(err)
        });
      });
      
      if (!this.data.loginCode) {
        throw new Error('No login code available');
      }
      
      // 获取用户信息
      const userProfileRes = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于显示您的昵称和头像',
          success: res => resolve(res),
          fail: err => reject(err)
        });
      });
      
      const userInfo = userProfileRes.userInfo;
      
      // 调用登录API
      const loginResponse = await ApiService.login(this.data.loginCode, {
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      });
      
      // 保存JWT令牌和用户信息
      wx.setStorageSync('auth_token', loginResponse.token);
      wx.setStorageSync('user_info', JSON.stringify(userInfo));
      if (loginResponse.user) {
        wx.setStorageSync('user_id', loginResponse.user.id);
        wx.setStorageSync('user_openid', loginResponse.user.openid);
      }
      
      this.setData({
        userInfo: userInfo,
        isLoggedIn: true,
        showLoginModal: false
      });
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('Failed to login:', error);
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
    }
  },
  
  // 关闭登录弹窗
  closeLoginModal() {
    this.setData({ showLoginModal: false });
  },
  
  // Switch between "Need Car" and "Need People" types
  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ type });
  },

  // Close the publish page and return to the previous page
  onClose() {
    // Use navigateBack to return to the previous page
    wx.navigateBack({
      delta: 1
    });
  },

  // Increase people counter
  increasePeople() {
    const { peopleIndex, peopleChoices } = this.data;
    if (peopleIndex < peopleChoices.length - 1) {
      this.setData({
        peopleIndex: peopleIndex + 1
      });
    }
  },

  // Decrease people counter
  decreasePeople() {
    const { peopleIndex } = this.data;
    if (peopleIndex > 0) {
      this.setData({
        peopleIndex: peopleIndex - 1
      });
    }
  },

  // Content input event handler
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  // WeChat input handler (renamed from onNicknameInput)
  onWechatInput(e) {
    this.setData({ wechat: e.detail.value });
  },

  // Date picker change handler
  onDateChange(e) {
    this.setData({
      departureDate: e.detail.value
    });
    this.formatDepartureTime();
  },

  // Compile date with default time (00:00) into a single timestamp
  formatDepartureTime() {
    const { departureDate } = this.data;
    if (departureDate) {
      // Set a default time of 00:00
      const timestamp = new Date(`${departureDate}T00:00:00`).toISOString();
      this.setData({ departureTime: timestamp });
      return timestamp;
    }
    return null;
  },

  // Toggle share fare option
  toggleShareFare(e) {
    if (e && e.detail) {
      this.setData({ shareFare: e.detail.value });
    } else {
      this.setData({ shareFare: !this.data.shareFare });
    }
  },

  // Number of people picker change handler
  onPeopleChange(e) {
    this.setData({ peopleIndex: e.detail.value });
  },

  // Reset the form
  resetForm() {
    this.setData({
      content: '',
      wechat: '', // Reset WeChat field
      departureDate: '',
      departureTime: '',
      shareFare: false,
      peopleIndex: 0,
      isSubmitting: false,
      hasSubmitted: false
    });
  },

  // Validate form and submit
  onSubmit() {
    // Check if all required fields are filled
    const { content, wechat, departureTime, peopleIndex } = this.data;
    const isFormValid = content && wechat && departureTime && peopleIndex >= 0;
    
    if (!isFormValid) {
      wx.showToast({
        title: '请填写所有必填项',
        icon: 'none'
      });
      return;
    }
    
    // Check if user is logged in
    if (!this.data.isLoggedIn) {
      this.setData({ showLoginModal: true });
      return;
    }
    
    // Disable submit button to prevent double submission
    this.setData({ isSubmitting: true });
    
    // Submit data
    this.submitData();
  },
  
  // Submit data to the server
  async submitData() {
    try {
      // Show loading indicator
      this.setData({ isSubmitting: true });
      
      // Format the data for API - use the new Prisma field names and include wechat
      const carpoolData = {
        type: this.data.type,
        content: this.data.content,
        wechat: this.data.wechat, // Include WeChat contact info
        departureTime: this.formatDepartureTime(),
        shareFare: this.data.shareFare,
        numberOfPeople: this.data.peopleChoices[this.data.peopleIndex]
      };
      
      // Submit to API
      const result = await ApiService.createCarpool(carpoolData);
      
      // Reset form and show success message
      this.resetForm();
      this.setData({ 
        isSubmitting: false,
        hasSubmitted: true 
      });
      
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 2000
      });
      
      // Navigate back to the index page after a short delay
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
    } catch (error) {
      console.error('提交失败:', error);
      this.setData({ isSubmitting: false });
      
      if (error.message && error.message.includes('401')) {
        // Authentication error - prompt login again
        wx.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 2000
        });
        // Clear existing tokens as they seem invalid
        wx.removeStorageSync('auth_token');
        wx.removeStorageSync('user_info');
        this.setData({ 
          isLoggedIn: false,
          showLoginModal: true
        });
      } else {
        wx.showToast({
          title: '发布失败',
          icon: 'error',
          duration: 2000
        });
      }
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
    }
    
    // Recheck login status when page is shown
    this.checkUserLogin();
  }
});
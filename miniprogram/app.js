import ApiService from './services/api.js';

App({
  onLaunch: function () {
    // Initialize global app data
    this.testBackendConnection();
  },
  
  async testBackendConnection() {
    try {
      // Test connection to backend API
      const response = await ApiService.healthCheck();
      console.log('Backend connection successful:', response);
    } catch (error) {
      console.error('Failed to connect to backend:', error);
      
      // Show a more helpful error message
      wx.showModal({
        title: '连接后端失败',
        content: `无法连接到后端服务器。请确保：
        1. 后端服务器正在运行 (${ApiService.getBaseUrl()})
        2. 在项目设置中已经配置了正确的域名
        3. 在开发设置中启用了"不校验合法域名..."选项`,
        showCancel: false
      });
    }
  },
  
  globalData: {
    openid: null,
    hideTabBar: false
  }
}) 
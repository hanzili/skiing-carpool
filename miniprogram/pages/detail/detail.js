import ApiService from '../../services/api.js';
import CarpoolService from '../../services/carpool-service.js';
import UIStateManager from '../../utils/ui-state-manager.js';
import authBehavior from '../../behaviors/auth-behavior';
import lifecycleBehavior from '../../behaviors/lifecycle-behavior';

Page({
  /**
   * Behaviors
   */
  behaviors: [authBehavior, lifecycleBehavior],
  
  /**
   * Page data
   */
  data: {
    // Tab bar configuration
    tabBarIndex: -1, // Not in tab bar
    
    // Carpool data
    carpool: null,
    carpoolId: null,
    
    // User statistics
    userStats: null,
    carpoolCount: 0,
    
    // UI state
    isLoading: true,
    showShareModal: false,
    poster: {
      show: false,
      path: '',
      saving: false
    }
  },

  /**
   * ==============================================
   * Lifecycle methods (standard)
   * ==============================================
   */
  onLoad: function(options) {
    this.onPageLoad();
    
    // Get carpool ID from options
    if (options.id) {
      this.setData({ carpoolId: options.id });
      this.fetchCarpoolById(options.id);
    } else {
      UIStateManager.showError(this, new Error('Missing carpool ID'), null, true, '缺少拼车信息');
      
      // Go back to previous page after a delay
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  onShow: function() {
    this.onPageShow();
  },

  /**
   * ==============================================
   * Custom lifecycle methods (from behaviors)
   * ==============================================
   */
  
  /**
   * Initialize the page - called from lifecycle behavior
   */
  initialize() {
    // Already handled in onLoad
  },
  
  /**
   * Refresh page data - called from lifecycle behavior 
   */
  refreshPageData() {
    // Refresh carpool data if we have an ID
    if (this.data.carpoolId) {
      this.fetchCarpoolById(this.data.carpoolId);
    }
  },

  /**
   * ==============================================
   * API methods
   * ==============================================
   */
  
  // Fetch carpool by ID
  fetchCarpoolById: function(id) {
    // Set loading state
    this.setData({ isLoading: true });
    
    // Show loading indicator
    wx.showLoading({ title: '加载中' });
    
    ApiService.getCarpoolById(id)
      .then(data => {
        console.log('Carpool detail:', data);
        
        // Process data with carpool service
        const processedData = CarpoolService.formatCarpoolDetail(data);
        
        this.setData({
          carpool: processedData,
          isLoading: false
        });
        
        // Fetch user stats after setting carpool data
        if (data.user_id || data.userId) {
          this.fetchUserCarpoolCount(data.user_id || data.userId);
        }
        
        // Hide loading indicator
        wx.hideLoading();
      })
      .catch(err => {
        console.error('Failed to fetch carpool:', err);
        
        // Set error state
        this.setData({ 
          isLoading: false 
        });
        
        // Hide loading indicator
        wx.hideLoading();
        
        // Show error message
        wx.showToast({
          title: '获取拼车详情失败',
          icon: 'none',
          duration: 2000
        });
      });
  },
  
  // Fetch user carpool post count
  fetchUserCarpoolCount: function(userId) {
    ApiService.getUserCarpoolStats(userId)
      .then(stats => {
        console.log('User stats:', stats);
        // Set both userStats and a derived carpoolCount for the UI
        const totalCount = (stats.completedCount || 0) + (stats.upcomingCount || 0);
        this.setData({ 
          userStats: stats,
          carpoolCount: totalCount 
        });
      })
      .catch(err => {
        console.error('Failed to fetch user stats:', err);
        // Set default value in case of error
        this.setData({ carpoolCount: 0 });
      });
  },
  
  /**
   * ==============================================
   * UI interaction methods
   * ==============================================
   */
  
  // Navigate back
  goBack: function() {
    wx.navigateBack();
  },
  
  // Copy WeChat ID
  copyWechat: function() {
    const wechatId = this.data.carpool.wechat;
    
    if (wechatId) {
      wx.setClipboardData({
        data: wechatId,
        success: () => {
          UIStateManager.showSuccess('微信号已复制');
        }
      });
    } else {
      UIStateManager.showError(this, new Error('WeChat ID not available'), null, true, '微信号不可用');
    }
  },
  
  // Open share modal
  onShareTap: function() {
    this.setData({ showShareModal: true });
  },
  
  // Close share modal
  closeShareModal: function() {
    this.setData({ showShareModal: false });
  },
  
  // Generate and show poster
  generatePoster: function() {
    // First, ensure the user is logged in
    this.checkUserLogin().then(() => {
      if (this.data.hasUserInfo) {
        this.setData({
          'poster.show': true,
          'poster.saving': true
        });
        
        // Call API to generate poster
        ApiService.generateCarpoolPoster(this.data.carpoolId)
          .then(result => {
            this.setData({
              'poster.path': result.posterUrl,
              'poster.saving': false
            });
          })
          .catch(err => {
            console.error('Failed to generate poster:', err);
            this.setData({
              'poster.saving': false
            });
            
            UIStateManager.showError(this, err, null, true, '生成海报失败');
          });
      } else {
        this.setData({ showWechatPrompt: true });
      }
    }).catch(err => {
      console.error('Authentication check failed:', err);
      this.setData({ showWechatPrompt: true });
    });
  },
  
  // Share to friend
  onShareAppMessage: function() {
    const carpool = this.data.carpool;
    if (!carpool) return {};
    
    return {
      title: `${carpool.departure_date} ${carpool.type === 'needCar' ? '人找车' : '车找人'}`,
      path: `/pages/detail/detail?id=${this.data.carpoolId}`,
      imageUrl: '/images/share-default.png'
    };
  }
}); 
import ApiService from '../../services/api.js';
import CarpoolService from '../../services/carpool-service.js';
import UIStateManager from '../../utils/ui-state-manager.js';
import lifecycleBehavior from '../../behaviors/lifecycle-behavior';

Page({
  /**
   * Behaviors
   */
  behaviors: [lifecycleBehavior],
  
  /**
   * Page data
   */
  data: {
    // Tab bar configuration
    tabBarIndex: 0,
    
    // UI state
    carpools: [],
    filterType: 'all',
    searchQuery: '',
    isLoading: false,
    apiError: null
  },

  /**
   * ==============================================
   * Lifecycle methods (standard)
   * ==============================================
   */
  onLoad: function() {
    this.onPageLoad();
  },

  onShow: function() {
    this.onPageShow();
  },

  // Handle pull-down refresh
  onPullDownRefresh: function() {
    this.loadCarpools();
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
    // Test API connectivity first
    this.testApiConnection();
  },
  
  /**
   * Refresh page data - called from lifecycle behavior
   */
  refreshPageData() {
    // Refresh the data when returning to this page
    this.loadCarpools();
  },

  /**
   * ==============================================
   * UI interaction methods
   * ==============================================
   */
  // Filter tab selection handler
  setFilterType: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ 
      filterType: type 
    });
    this.loadCarpools();
  },

  // Search input handler
  onSearchInput: function(e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },

  // Search submission handler
  onSearch: function() {
    this.loadCarpools();
  },

  // View detail button handler
  viewDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    // Instead of passing the entire carpool object, just navigate with the ID
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // Navigate to publish page
  navigateToPublish: function() {
    wx.navigateTo({
      url: '/pages/publish/publish'
    });
  },

  /**
   * ==============================================
   * API methods
   * ==============================================
   */
  // Test API connection
  testApiConnection: function() {
    UIStateManager.showLoading(this, 'isLoading', true, '连接测试中');
    
    ApiService.healthCheck()
      .then(response => {
        console.log('API connection test successful:', response);
        this.setData({ apiError: null });
        this.loadCarpools();
        wx.hideLoading();
      })
      .catch(err => {
        console.error('API connection test failed:', err);
        UIStateManager.hideLoading(this);
        UIStateManager.showError(
          this, 
          err, 
          'apiError', 
          true, 
          '连接失败'
        );
      });
  },

  // Load carpools based on current filter and search
  loadCarpools: function() {
    // Set loading state directly
    this.setData({ isLoading: true });
    
    // Use direct API calls instead of the service method for better control
    let apiCall;
    
    // Select which API to call based on filter type
    if (this.data.searchQuery.trim()) {
      // If there's a search query, use search API
      apiCall = ApiService.searchCarpools(this.data.searchQuery);
    } else {
      switch (this.data.filterType) {
        case 'needCar':
          apiCall = ApiService.getNeedCarCarpools();
          break;
        case 'needPeople':
          apiCall = ApiService.getNeedPeopleCarpools();
          break;
        case 'today':
          apiCall = ApiService.getTodayCarpools();
          break;
        case 'thisweek':
          apiCall = ApiService.getThisWeekCarpools();
          break;
        default:
          apiCall = ApiService.getAllCarpools();
      }
    }
    
    // Show loading indicator
    wx.showLoading({ title: '加载中' });
    
    apiCall
      .then(data => {
        console.log('API response:', data);
        // Process the data with CarpoolService
        const processedData = CarpoolService.processCarpoolData(data);
        
        // Update UI state
        this.setData({
          carpools: processedData,
          isLoading: false,
          apiError: null
        });
        
        // Always hide loading indicator
        wx.hideLoading();
        wx.stopPullDownRefresh();
      })
      .catch(err => {
        // Log the error
        console.error('Failed to load carpools:', err);
        
        // Clear loading states
        this.setData({ 
          isLoading: false,
          apiError: '加载数据失败: ' + (err.message || err),
          carpools: [] // Clear carpools on error to avoid stale data
        });
        
        // Always hide loading indicator
        wx.hideLoading();
        
        // Show error message
        wx.showToast({
          title: '加载失败',
          icon: 'none',
          duration: 2000
        });
        
        wx.stopPullDownRefresh();
      })
      .finally(() => {
        // Ensure loading states are cleared even if something unexpected happens
        this.setData({ isLoading: false });
        wx.hideLoading();
        wx.stopPullDownRefresh();
      });
  },
  
  /**
   * ==============================================
   * Helper methods
   * ==============================================
   */
  // Process data for display
  processCarpoolData: function(data) {
    if (!Array.isArray(data)) {
      console.error('Expected array of carpools, got:', data);
      return [];
    }
    
    return data.map(item => {
      try {
        // Handle the new Prisma schema field names
        // Map departureTime -> departure_time for backward compatibility
        const adaptedItem = {
          ...item,
          departure_time: item.departureTime || item.departure_time,
          create_time: item.createdAt || item.create_time,
          number_of_people: item.numberOfPeople || item.number_of_people,
          share_fare: item.shareFare !== undefined ? item.shareFare : item.share_fare,
          // Extract nickname and avatar from user relation if available
          nickname: item.user ? item.user.nickname : item.nickname,
          avatar: item.user ? item.user.avatar : item.avatar,
          // Get wechat directly from carpool object
          wechat: item.wechat || '',
          // Add truncated content
          truncatedContent: item.content ? (item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content) : ''
        };
        
        // Format date: "3月7日 周五"
        const date = new Date(adaptedItem.departure_time);
        if (isNaN(date)) {
          console.warn('Invalid date in carpool:', item);
          return {
            ...adaptedItem,
            departure_date: '日期错误',
            departure_weekday: '',
            timeAgo: '未知'
          };
        }
        
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // Get weekday in Chinese
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()];
        
        // Calculate time ago
        const timeAgo = this.getTimeAgo(new Date(adaptedItem.create_time || Date.now()));
        
        return {
          ...adaptedItem,
          departure_date: `${month}月${day}日`,
          departure_weekday: weekday,
          timeAgo
        };
      } catch (err) {
        console.error('Error processing carpool data:', err, item);
        return {
          ...item,
          departure_date: '处理错误',
          departure_weekday: '',
          timeAgo: '未知'
        };
      }
    });
  },
  
  // Helper to format relative time
  getTimeAgo: function(date) {
    try {
      const now = new Date();
      const diffMs = now - date;
      if (isNaN(diffMs)) {
        return '未知';
      }
      
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      
      if (diffDay > 0) {
        return `${diffDay}天前`;
      } else if (diffHour > 0) {
        return `${diffHour}小时前`;
      } else if (diffMin > 0) {
        return `${diffMin}分钟前`;
      } else {
        return '刚刚';
      }
    } catch (err) {
      console.error('Error calculating time ago:', err);
      return '未知';
    }
  }
});
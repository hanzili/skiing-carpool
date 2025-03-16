import ApiService from '../../services/api.js';
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
    
    // Posts data
    posts: [],
    postType: 'all',
    
    // UI state
    isLoading: true,
    loadingMore: false,
    noMoreData: false,
    page: 1,
    pageSize: 10
  },

  /**
   * ==============================================
   * Lifecycle methods (standard)
   * ==============================================
   */
  onLoad: function(options) {
    this.onPageLoad();
    
    // Set post type from options
    if (options && options.type) {
      this.setData({ postType: options.type });
    }
    
    // Load initial posts
    this.loadPosts();
  },

  onShow: function() {
    this.onPageShow();
  },

  /**
   * Pull down refresh
   */
  onPullDownRefresh: function() {
    this.refreshPosts();
  },

  /**
   * Reach bottom event
   */
  onReachBottom: function() {
    if (this.data.loadingMore || this.data.noMoreData) return;
    
    this.loadMorePosts();
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
    this.refreshPosts();
  },

  /**
   * ==============================================
   * Data loading methods
   * ==============================================
   */
  
  /**
   * Load initial posts
   */
  loadPosts: function() {
    this.setData({ 
      isLoading: true,
      page: 1,
      noMoreData: false
    });
    
    let apiCall;
    
    switch (this.data.postType) {
      case 'needCar':
        apiCall = ApiService.getNeedCarCarpools(1, this.data.pageSize);
        break;
      case 'needPeople':
        apiCall = ApiService.getNeedPeopleCarpools(1, this.data.pageSize);
        break;
      case 'today':
        apiCall = ApiService.getTodayCarpools(1, this.data.pageSize);
        break;
      case 'thisweek':
        apiCall = ApiService.getThisWeekCarpools(1, this.data.pageSize);
        break;
      default:
        apiCall = ApiService.getAllCarpools(1, this.data.pageSize);
    }
    
    apiCall
      .then(data => {
        console.log('Posts loaded:', data);
        
        const processedPosts = this.processPostsData(data);
        
        this.setData({
          posts: processedPosts,
          isLoading: false,
          noMoreData: processedPosts.length < this.data.pageSize
        });
        
        wx.stopPullDownRefresh();
      })
      .catch(err => {
        console.error('Failed to load posts:', err);
        
        this.setData({
    isLoading: false
        });
        
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        
        wx.stopPullDownRefresh();
      });
  },
  
  /**
   * Refresh posts (reset to page 1)
   */
  refreshPosts: function() {
    this.loadPosts();
  },
  
  /**
   * Load more posts (next page)
   */
  loadMorePosts: function() {
    this.setData({ 
      loadingMore: true 
    });
    
    const nextPage = this.data.page + 1;
    
    let apiCall;
    
    switch (this.data.postType) {
      case 'needCar':
        apiCall = ApiService.getNeedCarCarpools(nextPage, this.data.pageSize);
        break;
      case 'needPeople':
        apiCall = ApiService.getNeedPeopleCarpools(nextPage, this.data.pageSize);
        break;
      case 'today':
        apiCall = ApiService.getTodayCarpools(nextPage, this.data.pageSize);
        break;
      case 'thisweek':
        apiCall = ApiService.getThisWeekCarpools(nextPage, this.data.pageSize);
        break;
      default:
        apiCall = ApiService.getAllCarpools(nextPage, this.data.pageSize);
    }
    
    apiCall
      .then(data => {
        console.log('More posts loaded:', data);
        
        const processedPosts = this.processPostsData(data);
        
        if (processedPosts.length === 0) {
          this.setData({
            loadingMore: false,
            noMoreData: true
          });
          return;
        }
        
        this.setData({
          posts: [...this.data.posts, ...processedPosts],
          page: nextPage,
          loadingMore: false,
          noMoreData: processedPosts.length < this.data.pageSize
        });
      })
      .catch(err => {
        console.error('Failed to load more posts:', err);
        
        this.setData({
          loadingMore: false
        });
        
        wx.showToast({
          title: '加载更多失败',
          icon: 'none'
        });
      });
  },
  
  /**
   * ==============================================
   * Helper methods
   * ==============================================
   */
  
  /**
   * Process post data for display
   */
  processPostsData: function(data) {
    if (!Array.isArray(data)) {
      console.error('Expected array of posts, got:', data);
      return [];
    }
    
    return data.map(item => {
      try {
        // Handle the new Prisma schema field names
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
        console.error('Error processing post data:', err);
        return {
          ...item,
          departure_date: '处理错误',
          departure_weekday: '',
          timeAgo: '未知'
        };
      }
    });
  },
  
  /**
   * Calculate time ago for display
   */
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
  },
  
  /**
   * ==============================================
   * UI interaction methods
   * ==============================================
   */
  
  /**
   * View post detail
   */
  viewDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    
    // Find the post object in our data
    const post = this.data.posts.find(item => item.id === id);
    
    if (post) {
      // Encode and pass the full post data to the detail page
      const postData = encodeURIComponent(JSON.stringify(post));
      wx.navigateTo({
        url: `/pages/detail/detail?carpoolData=${postData}`
      });
    } else {
      wx.showToast({
        title: '未找到拼车信息',
        icon: 'none'
      });
    }
  },

  /**
   * Copy WeChat ID
   */
  copyWechat: function(e) {
    // First, ensure the user is logged in
    this.checkUserLoggedIn(() => {
      const wechatId = e.currentTarget.dataset.wechat;
      
      if (wechatId) {
    wx.setClipboardData({
          data: wechatId,
      success: () => {
            wx.showToast({
              title: '微信号已复制',
              icon: 'success'
            });
          }
        });
      } else {
        wx.showToast({
          title: '微信号不可用',
          icon: 'none'
        });
      }
    });
  }
}); 
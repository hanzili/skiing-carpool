import ApiService from '../../services/api.js';

Page({
  data: {
    carpool: null,
    isLoading: true,
    showShareModal: false,
    carpoolCount: 5 // Placeholder count of completed carpools
  },

  onLoad(options) {
    if (options.carpoolData) {
      try {
        // Decode and parse the carpool data
        const carpool = JSON.parse(decodeURIComponent(options.carpoolData));
        
        // Display loading indicator briefly
        wx.showLoading({ title: '加载中' });
        
        // Format the data for display
        this.formatCarpoolData(carpool);
        
        setTimeout(() => {
          wx.hideLoading();
        }, 300);
      } catch (error) {
        console.error('Error parsing carpool data:', error);
        wx.showToast({
          title: '数据加载错误',
          icon: 'error'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } else if (options.id) {
      // If we only have an ID, fetch the carpool data
      this.fetchCarpoolById(options.id);
    } else {
      wx.showToast({
        title: '未找到拼车信息',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // Fetch carpool by ID
  fetchCarpoolById(id) {
    wx.showLoading({ title: '加载中' });
    this.setData({ isLoading: true });

    ApiService.getCarpoolById(id)
      .then(data => {
        if (data) {
          this.formatCarpoolData(data);
        } else {
          throw new Error('Carpool not found');
        }
      })
      .catch(err => {
        console.error('Failed to fetch carpool:', err);
        wx.showToast({
          title: '未找到拼车信息',
          icon: 'error'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ isLoading: false });
      });
  },

  // Format carpool data for display
  formatCarpoolData(carpool) {
    // Handle the new Prisma schema field names
    const adaptedCarpool = {
      ...carpool,
      departure_time: carpool.departureTime || carpool.departure_time,
      create_time: carpool.createdAt || carpool.create_time,
      number_of_people: carpool.numberOfPeople || carpool.number_of_people,
      share_fare: carpool.shareFare !== undefined ? carpool.shareFare : carpool.share_fare,
      // Extract nickname and avatar from user relation if available
      nickname: carpool.user ? carpool.user.nickname : carpool.nickname,
      avatar: carpool.user ? carpool.user.avatar : carpool.avatar,
      userId: carpool.user ? carpool.user.id : carpool.userId
    };
    
    // Format departure date and time
    let departure_date = adaptedCarpool.departure_date;
    let departure_weekday = adaptedCarpool.departure_weekday;
    
    // If these are not already formatted (from the index page)
    if (!departure_date || !departure_weekday) {
      const departureDate = new Date(adaptedCarpool.departure_time);
      departure_date = `${departureDate.getMonth() + 1}月${departureDate.getDate()}日`;
      
      // Get weekday name in Chinese
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      departure_weekday = weekdays[departureDate.getDay()];
    }
    
    // Format time ago if not already formatted
    let timeAgo = adaptedCarpool.timeAgo;
    if (!timeAgo && adaptedCarpool.create_time) {
      timeAgo = this.getTimeAgo(new Date(adaptedCarpool.create_time));
    }
    
    // Format carpool data
    const formattedCarpool = {
      ...adaptedCarpool,
      departure_date: departure_date,
      departure_weekday: departure_weekday,
      timeAgo: timeAgo || '刚刚'
    };
    
    this.setData({
      carpool: formattedCarpool,
      isLoading: false
    });
    
    // Fetch user's carpool count if userId is available
    if (adaptedCarpool.userId) {
      this.fetchUserCarpoolCount(adaptedCarpool.userId);
    }
  },

  // Fetch the user's completed carpool count
  fetchUserCarpoolCount(userId) {
    ApiService.getUserCarpoolStats(userId)
      .then(stats => {
        if (stats && stats.completedCount !== undefined) {
          this.setData({
            carpoolCount: stats.completedCount
          });
        }
      })
      .catch(err => {
        console.error('Failed to fetch user carpool stats:', err);
        // Keep the default count if there's an error
      });
  },

  // Calculate time ago
  getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    
    if (diffInSeconds < minute) {
      return '刚刚';
    } else if (diffInSeconds < hour) {
      const minutes = Math.floor(diffInSeconds / minute);
      return `${minutes}分钟前`;
    } else if (diffInSeconds < day) {
      const hours = Math.floor(diffInSeconds / hour);
      return `${hours}小时前`;
    } else {
      const days = Math.floor(diffInSeconds / day);
      return `${days}天前`;
    }
  },

  // Go back to previous page
  goBack() {
    wx.navigateBack();
  },

  // Copy WeChat ID to clipboard
  copyWechat() {
    if (!this.data.carpool || !this.data.carpool.nickname) {
      wx.showToast({
        title: '微信号不可用',
        icon: 'none'
      });
      return;
    }
    
    // In this example, we use nickname as wechat ID
    const wechatId = this.data.carpool.nickname;
    
    wx.setClipboardData({
      data: wechatId,
      success: () => {
        wx.showToast({
          title: '已复制微信号',
          icon: 'success'
        });
      }
    });
  },

  // Handle share button tap
  onShareTap() {
    this.setData({ showShareModal: true });
  },

  // Close share modal
  closeShareModal() {
    this.setData({ showShareModal: false });
  },

  // Generate poster for sharing
  generatePoster() {
    wx.showToast({
      title: '正在生成海报',
      icon: 'loading',
      duration: 2000
    });
    
    // In a real app, you would create a poster image here
    setTimeout(() => {
      wx.showToast({
        title: '海报生成功能开发中',
        icon: 'none'
      });
      this.closeShareModal();
    }, 2000);
  },

  // Share to WeChat friends
  onShareAppMessage() {
    const carpool = this.data.carpool;
    if (!carpool) return {};
    
    return {
      title: `${carpool.type === 'needCar' ? '人找车' : '车找人'}: ${carpool.departure_date} ${carpool.departure_weekday}`,
      path: `/pages/index/index`, // Direct to index page since we don't store the detail
      imageUrl: '' // Can add a custom share image
    };
  }
}); 
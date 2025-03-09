import ApiService from '../../services/api.js';

Page({
  data: {
    posts: [],
    type: '', // needCar 或 needPeople
    showWechatModal: false,
    currentWechat: '',
    isLoading: false
  },

  onLoad(options) {
    this.setData({ type: options.type })
    this.loadPosts()
  },

  async loadPosts() {
    this.setData({ isLoading: true });
    
    try {
      // Get all carpools from the API
      const allCarpools = await ApiService.getAllCarpools();
      
      // Filter by type
      const typeCarpools = allCarpools.filter(post => post.type === this.data.type);
      
      // Format posts with consistent data format
      const formattedPosts = typeCarpools.map(post => ({
        id: post.id,
        content: post.content,
        type: post.type,
        wechat: post.wechat,
        departure_time: post.departure_time.split('T')[0], // Just keep YYYY-MM-DD format
        number_of_people: post.number_of_people,
        share_fare: post.type === 'needPeople' ? post.share_fare : false,
        status: 'active' // Add default status
      }));
      
      // Sort by departure time
      formattedPosts.sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));
      
      this.setData({ 
        posts: formattedPosts,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to load carpools:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
      this.setData({ isLoading: false });
    }
  },

  copyWechat(e) {
    const { wechat } = e.currentTarget.dataset
    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showToast({
          title: '已复制微信号',
          icon: 'success'
        })
      }
    })
  }
}) 
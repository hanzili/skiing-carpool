Page({
  data: {
    posts: [],
    type: '', // needCar 或 needPeople
    showWechatModal: false,
    currentWechat: ''
  },

  onLoad(options) {
    this.setData({ type: options.type })
    this.loadPosts()
  },

  async loadPosts() {
    const db = wx.cloud.database()
    const _ = db.command
    const posts = await db.collection('carpools')
      .where({
        type: this.data.type,
        status: 'active',  // 未完成的拼车
        _openid: _.exists(true) // 确保帖子有发布者
      })
      .orderBy('departure_time', 'asc')
      .get()
    
    // Format posts with Montreal time
    const formattedPosts = posts.data.map(post => ({
      _id: post._id,
      content: post.content,
      type: post.type,
      wechat: post.wechat,
      status: post.status,
      departure_time: post.departure_time.split('T')[0], // Just keep YYYY-MM-DD format
      number_of_people: post.number_of_people,
      share_fare: this.data.type === 'needPeople' ? post.share_fare : null
    }))
    
    this.setData({ posts: formattedPosts })
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
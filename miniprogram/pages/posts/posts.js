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
      .orderBy('createTime', 'desc')
      .get()
    
    // 格式化时间
    const formattedPosts = posts.data.map(post => ({
      _id: post._id,
      content: post.content,
      type: post.type,
      wechat: post.wechat,
      status: post.status,
      createTime: new Date(post.createTime).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }))
    
    this.setData({ posts: formattedPosts })
  },

  showWechat(e) {
    const { wechat } = e.currentTarget.dataset
    this.setData({
      showWechatModal: true,
      currentWechat: wechat
    })
  },

  hideWechat() {
    this.setData({ showWechatModal: false })
  },

  copyWechat() {
    wx.setClipboardData({
      data: this.data.currentWechat,
      success: () => {
        wx.showToast({
          title: '已复制微信号',
          icon: 'success'
        })
        this.hideWechat()
      }
    })
  }
}) 
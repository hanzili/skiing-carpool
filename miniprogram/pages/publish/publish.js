Page({
  data: {
    content: '',
    wechat: '',
    type: 'needCar'  // 默认人找车
  },

  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ type })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onWechatInput(e) {
    this.setData({ wechat: e.detail.value })
  },

  async onSubmit() {
    if (!this.data.content || !this.data.wechat) {
      return
    }

    const db = wx.cloud.database()
    await db.collection('carpools').add({
      data: {
        type: this.data.type,
        content: this.data.content,
        wechat: this.data.wechat,
        status: 'active',
        createTime: db.serverDate()
      }
    })

    wx.showToast({ 
      title: '发布成功',
      icon: 'success'
    })
    
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }, 1500)
  },

  onShow() {
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
  }
}) 
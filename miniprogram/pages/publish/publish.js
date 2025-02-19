Page({
  data: {
    content: '',
    wechat: '',
    type: 'needCar'  // 默认人找车
  },

  onTypeChange(e) {
    this.setData({ type: e.detail.value })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onWechatInput(e) {
    this.setData({ wechat: e.detail.value })
  },

  async onSubmit() {
    if (!this.data.content || !this.data.wechat) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
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

    wx.showToast({ title: '发布成功' })
    wx.navigateBack()
  }
}) 
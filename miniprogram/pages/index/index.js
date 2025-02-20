Page({
  data: {
    categories: [
      { id: 'needCar', name: '人找车' },
      { id: 'needPeople', name: '车找人' }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },

  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/posts/posts?type=${id}`
    })
  }
}) 
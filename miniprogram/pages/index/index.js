Page({
  data: {
    categories: [
      { id: 'needCar', name: '人找车', icon: '../../images/need-car.png' },
      { id: 'needPeople', name: '车找人', icon: '../../images/need-people.png' }
    ]
  },

  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/posts/posts?type=${id}`
    })
  }
}) 
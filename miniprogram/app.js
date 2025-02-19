App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'skiiing-carpool-1gasx1t6bf6bf267',
        traceUser: true,
        throwOnNotFound: false
      })
    }
  },
  globalData: {
    openid: null
  }
}) 
Component({
  data: {
    selected: 0,
    color: "#999999",
    selectedColor: "#4080ff",
    list: [{
      pagePath: "/pages/index/index",
      text: "首页",
      iconPath: "/images/home.png",
      selectedIconPath: "/images/home-active.png"
    }, {
      pagePath: "/pages/publish/publish",
      text: "发布",
      isSpecial: true,
      iconPath: "/images/publish.png",
      selectedIconPath: "/images/publish-active.png"
    }, {
      pagePath: "/pages/my-posts/my-posts",
      text: "我的",
      iconPath: "/images/profile.png",
      selectedIconPath: "/images/profile-active.png"
    }]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({
        url
      })
      this.setData({
        selected: data.index
      })
    }
  }
}) 
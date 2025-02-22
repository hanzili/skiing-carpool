Page({
  data: {
    content: '',
    wechat: '',
    type: 'needCar',  // 默认人找车
    departureTime: '', // 出发时间
    shareFare: 'false', // 是否分担车费
    peopleRange: ['1', '2', '3', '4'],
    peopleIndex: -1,
    minDate: '',
    isFormValid: false
  },

  onLoad() {
    // 设置最小日期为今天
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    this.setData({ minDate });
  },

  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ 
      type,
      shareFare: 'false' 
    });
    this.checkFormValidity();
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
    this.checkFormValidity();
  },

  onWechatInput(e) {
    this.setData({ wechat: e.detail.value })
    this.checkFormValidity();
  },

  onDepartureTimeChange(e) {
    this.setData({ departureTime: e.detail.value });
    this.checkFormValidity();
  },

  onShareFareChange(e) {
    this.setData({ shareFare: e.detail.value });
    this.checkFormValidity();
  },

  onPeopleChange(e) {
    this.setData({ peopleIndex: parseInt(e.detail.value) });
    this.checkFormValidity();
  },

  checkFormValidity() {
    const { content, wechat, departureTime, peopleIndex } = this.data;
    const isFormValid = content.trim() && 
                       wechat.trim() && 
                       departureTime && 
                       peopleIndex !== -1;
    
    this.setData({ isFormValid });
  },

  async onSubmit() {
    if (!this.data.isFormValid) return;

    const db = wx.cloud.database();
    await db.collection('carpools').add({
      data: {
        type: this.data.type,
        content: this.data.content,
        wechat: this.data.wechat,
        departure_time: this.data.departureTime,
        share_fare: this.data.shareFare === 'true',
        number_of_people: this.data.peopleRange[this.data.peopleIndex],
        status: 'active',
        createTime: db.serverDate()
      }
    });

    // Reset all form fields
    this.setData({
      content: '',
      wechat: '',
      departureTime: '',
      shareFare: 'false',
      peopleIndex: -1,
      isFormValid: false
    });

    wx.showToast({ 
      title: '发布成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 1500);
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
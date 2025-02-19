Page({
  data: {
    posts: [],
    showEditModal: false,
    editingPost: {
      id: '',
      content: '',
      wechat: '',
      type: ''
    }
  },

  onShow() {
    this.loadMyPosts()
  },

  async loadMyPosts() {
    const db = wx.cloud.database()
    const app = getApp()
    
    // 等待获取 openid
    if (!app.globalData.openid) {
      const result = await wx.cloud.callFunction({
        name: 'login'
      })
      app.globalData.openid = result.result.openid
    }
    
    const posts = await db.collection('carpools')
      .where({
        _openid: app.globalData.openid
      })
      .orderBy('createTime', 'desc')
      .get()

    console.log('My posts:', posts.data)
    
    if (posts.data.length === 0) {
      console.log('No posts found for current user')
    }

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

  async onStatusChange(e) {
    const { id } = e.currentTarget.dataset
    const post = this.data.posts.find(p => p._id === id)
    const newStatus = post.status === 'active' ? 'completed' : 'active'

    const db = wx.cloud.database()
    await db.collection('carpools').doc(id).update({
      data: {
        status: newStatus
      }
    })

    wx.showToast({
      title: newStatus === 'active' ? '已重新激活' : '已完成',
      icon: 'success'
    })

    this.loadMyPosts()
  },

  async onDeletePost(e) {
    const { id } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条信息吗？',
      success: async (res) => {
        if (res.confirm) {
          const db = wx.cloud.database()
          await db.collection('carpools').doc(id).remove()
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
          
          this.loadMyPosts()
        }
      }
    })
  },

  onEditPost(e) {
    const { id, content, wechat, type } = e.currentTarget.dataset
    this.setData({
      showEditModal: true,
      editingPost: { id, content, wechat, type }
    })
  },

  onEditContentInput(e) {
    this.setData({
      'editingPost.content': e.detail.value
    })
  },

  onEditWechatInput(e) {
    this.setData({
      'editingPost.wechat': e.detail.value
    })
  },

  async onEditSubmit() {
    const { id, content, wechat } = this.data.editingPost
    
    if (!content || !wechat) {
      wx.showToast({ 
        title: '请填写完整信息', 
        icon: 'none' 
      })
      return
    }

    const db = wx.cloud.database()
    await db.collection('carpools').doc(id).update({
      data: {
        content,
        wechat
      }
    })

    wx.showToast({ 
      title: '更新成功', 
      icon: 'success' 
    })

    this.setData({ showEditModal: false })
    this.loadMyPosts()
  },

  onEditCancel() {
    this.setData({ showEditModal: false })
  }
}) 
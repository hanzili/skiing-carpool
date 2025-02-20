Page({
  data: {
    posts: [],
    showEditModal: false,
    isLoading: true,
    updatingPostId: null,
    deletingPostId: null,
    isSubmittingEdit: false,
    editingPost: {
      id: '',
      content: '',
      wechat: '',
      type: ''
    }
  },

  onShow() {
    this.loadMyPosts()
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
  },

  async loadMyPosts() {
    this.setData({ isLoading: true })
    
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
    
    this.setData({ 
      posts: formattedPosts,
      isLoading: false 
    })
  },

  async onStatusChange(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ updatingPostId: id })
    
    try {
      const post = this.data.posts.find(p => p._id === id)
      const newStatus = post.status === 'active' ? 'completed' : 'active'

      const db = wx.cloud.database()
      await db.collection('carpools').doc(id).update({
        data: { status: newStatus }
      })

      const updatedPosts = this.data.posts.map(post => {
        if (post._id === id) {
          return { ...post, status: newStatus }
        }
        return post
      })

      this.setData({ posts: updatedPosts })

      wx.showToast({
        title: newStatus === 'active' ? '已重新发布' : '已完成',
        icon: 'success'
      })
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      })
    } finally {
      this.setData({ updatingPostId: null })
    }
  },

  async onDeletePost(e) {
    const { id } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条信息吗？',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ deletingPostId: id })
          
          try {
            const db = wx.cloud.database()
            await db.collection('carpools').doc(id).remove()
            
            const updatedPosts = this.data.posts.filter(post => post._id !== id)
            this.setData({ posts: updatedPosts })
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } catch (error) {
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          } finally {
            this.setData({ deletingPostId: null })
          }
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

    this.setData({ isSubmittingEdit: true })

    try {
      const db = wx.cloud.database()
      await db.collection('carpools').doc(id).update({
        data: { content, wechat }
      })

      const updatedPosts = this.data.posts.map(post => {
        if (post._id === id) {
          return { ...post, content, wechat }
        }
        return post
      })

      this.setData({ 
        posts: updatedPosts,
        showEditModal: false 
      })

      wx.showToast({ 
        title: '更新成功', 
        icon: 'success' 
      })
    } catch (error) {
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      })
    } finally {
      this.setData({ isSubmittingEdit: false })
    }
  },

  onEditCancel() {
    this.setData({ showEditModal: false })
  }
}) 
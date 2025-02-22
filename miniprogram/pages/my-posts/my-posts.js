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
      type: '',
      departureTime: '',
      number_of_people: 1,
      peopleIndex: 0,
      share_fare: false
    },
    peopleRange: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
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
      .orderBy('departure_time', 'desc')
      .get()

    console.log('Raw posts from database:', posts.data) // Add this log

    // Get current time in Montreal
    const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })
    const nowDate = new Date(now)

    const formattedPosts = posts.data.map(post => {
      const departureDate = new Date(post.departure_time + 'T00:00:00') // Local time
      
      // Format the departure time in Montreal time
      const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        timeZone: 'America/Toronto' // Montreal time zone
      }
      const formattedDepartureTime = departureDate.toLocaleDateString('en-CA', options)
      
      // Check if the post is expired
      const isExpired = departureDate < nowDate

      const formatted = {
        _id: post._id,
        content: post.content,
        type: post.type,
        wechat: post.wechat,
        status: post.status,
        departureTime: formattedDepartureTime,
        number_of_people: post.number_of_people || 1,
        share_fare: post.share_fare || false,
        isExpired: isExpired,
        createTime: new Date(post.createTime).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Toronto' // Montreal time zone
        })
      }
      
      console.log('Formatted post:', formatted) // Add this log
      return formatted
    })
    
    this.setData({ 
      posts: formattedPosts,
      isLoading: false 
    })

    console.log('Final posts in data:', this.data.posts) // Add this log
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
    const { id, content, wechat, type, departureTime, number_of_people, share_fare } = e.currentTarget.dataset
    this.setData({
      showEditModal: true,
      editingPost: { 
        id, 
        content, 
        wechat, 
        type, 
        departureTime: departureTime.split(' ')[0],
        number_of_people: number_of_people || 1,
        peopleIndex: this.data.peopleRange.indexOf(number_of_people ? number_of_people : 1),
        share_fare: share_fare || false
      }
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

  onEditDepartureTimeChange(e) {
    this.setData({
      'editingPost.departureTime': e.detail.value
    })
  },

  onEditPeopleChange(e) {
    this.setData({
      'editingPost.peopleIndex': parseInt(e.detail.value),
      'editingPost.number_of_people': this.data.peopleRange[parseInt(e.detail.value)]
    })
  },

  onShareFareChange(e) {
    this.setData({
      'editingPost.share_fare': e.detail.value === 'true'
    })
  },

  async onEditSubmit() {
    const { id, content, wechat, departureTime, number_of_people, type, share_fare } = this.data.editingPost
    
    if (!content || !wechat || !departureTime) {
      wx.showToast({ 
        title: '请填写完整信息', 
        icon: 'none' 
      })
      return
    }

    this.setData({ isSubmittingEdit: true })

    try {
      const db = wx.cloud.database()
      const updateData = { 
        content, 
        wechat,
        departure_time: departureTime,
        number_of_people: parseInt(number_of_people)
      }
      
      // 只有车找人类型才更新 share_fare
      if (type === 'needPeople') {
        updateData.share_fare = share_fare
      }

      await db.collection('carpools').doc(id).update({
        data: updateData
      })

      const updatedPosts = this.data.posts.map(post => {
        if (post._id === id) {
          return { 
            ...post, 
            content, 
            wechat,
            departureTime: departureTime,
            number_of_people,
            share_fare: type === 'needPeople' ? share_fare : post.share_fare
          }
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
/**
 * My Posts Page
 * Manages user's carpool posts including active and archived posts
 */
import ApiService from '../../services/api';
import DateUtils from '../../utils/date-utils';
import AuthService from '../../services/auth';
import authBehavior from '../../behaviors/auth-behavior';
import lifecycleBehavior from '../../behaviors/lifecycle-behavior';

Page({
  /**
   * Behaviors
   */
  behaviors: [authBehavior, lifecycleBehavior],
  
  /**
   * Page data
   */
  data: {
    // Tab bar configuration
    tabBarIndex: 2,
    
    // Posts related data
    isLoading: true,
    posts: [],
    activeTab: 'active',  // 'active' or 'archived'
    
    // UI state
    expandedId: '',
    possibleSeats: [0, 1, 2, 3, 4],
    peopleRange: [1, 2, 3, 4],
    
    // Edit modal related data
    showEditModal: false,
    editingPost: null,
    isSubmittingEdit: false,
    
    // Post operation state
    deletingPostId: null,
    updatingPostId: null
  },

  /**
   * ==============================================
   * Lifecycle methods (standard)
   * ==============================================
   */
  onLoad(options) {
    this.onPageLoad(options);
  },

  onShow() {
    this.onPageShow();
  },
  
  onPullDownRefresh() {
    console.log('[LIFECYCLE] Pull down refresh on MyPosts page');
    
    if (this.data.hasUserInfo) {
      // Reload the current tab's data
      this.loadMyPosts(this.data.activeTab === 'archived')
        .then(() => {
          // Stop the pull-down refresh animation when data is loaded
          wx.stopPullDownRefresh();
        })
        .catch(() => {
          // Also stop on error
          wx.stopPullDownRefresh();
        });
    } else {
      // If not logged in, just stop the animation
      wx.stopPullDownRefresh();
      
      // Show a toast reminding the user to log in
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
    }
  },
  
  onReachBottom() {
    console.log('[LIFECYCLE] Reached bottom of MyPosts page');
    // Currently not implemented - would be used for pagination
    // if needed in the future
  },
  
  onUnload() {
    console.log('[LIFECYCLE] MyPosts page unloaded');
    // Reset expandedId to avoid state confusion if the page is reopened
    this.setData({
      expandedId: ''
    });
  },

  /**
   * ==============================================
   * Custom lifecycle methods (from behaviors)
   * ==============================================
   */
  
  /**
   * Initialize the page - called from lifecycle behavior
   */
  initialize() {
    // Check login status - from auth behavior
    this.checkUserLogin();
  },
  
  /**
   * Called after successful login - from auth behavior
   */
  onLoginSuccess() {
    // Load posts after login
    this.loadMyPosts(this.data.activeTab === 'archived');
  },
  
  /**
   * Called when login check fails - from auth behavior
   */
  onLoginFailed() {
    this.setData({ isLoading: false });
  },
  
  /**
   * Refresh page data - called from lifecycle behavior
   */
  refreshPageData() {
    // If already logged in, refresh posts
    if (this.data.hasUserInfo) {
      this.loadMyPosts(this.data.activeTab === 'archived');
    } else {
      // Otherwise check login status again
      this.checkUserLogin();
    }
  },

  /**
   * ==============================================
   * UI interaction methods
   * ==============================================
   */
  
  /**
   * Switch between active and archived tabs
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    console.log('Switching to tab:', tab);
    
    if (tab !== this.data.activeTab) {
      this.setData({ 
        activeTab: tab,
        expandedId: '',
        isLoading: true
      });
      
      this.loadMyPosts(tab === 'archived');
    }
  },
  
  /**
   * Toggle expansion for controls
   */
  toggleExpand(e) {
    const id = String(e.detail.id); // Ensure id is a string
    const currentExpandedId = this.data.expandedId;
    
    // If the same item is clicked, collapse it. Otherwise, expand the clicked item.
    if (currentExpandedId === id) {
      this.setData({ expandedId: '' });
    } else {
      this.setData({ expandedId: id });
    }
  },

  /**
   * ==============================================
   * Data loading methods
   * ==============================================
   */
  
  /**
   * Load user's carpool posts
   * @param {boolean} archived - Whether to load archived posts
   * @returns {Promise<Array>} - The loaded posts
   */
  async loadMyPosts(archived = false) {
    return new Promise(async (resolve, reject) => {
      try {
        this.setData({ isLoading: true });
        console.log('Loading posts, archived=', archived);
        
        const posts = await ApiService.getMyPosts(archived);
        
        // Client-side fix: If we're in archived mode, filter out today's posts
        let filteredPosts = posts;
        if (archived) {
          // Get today's date (start of day)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Filter out posts from today
          filteredPosts = posts.filter(post => {
            const postDate = new Date(post.departureTime || post.departure_time);
            return postDate < today; // Only include posts from before today
          });
        }
        
        // Format data for display
        const formattedPosts = this._formatPosts(filteredPosts, archived);
        
        this.setData({
          posts: formattedPosts,
          isLoading: false
        });
        
        resolve(formattedPosts);
      } catch (error) {
        console.error('Failed to load posts:', error);
        this.setData({
          isLoading: false,
          posts: []
        });
        
        // Show error message
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
        
        reject(error);
      }
    });
  },
  
  /**
   * Format posts for display
   * @private
   * @param {Array} posts - Raw posts from API
   * @param {boolean} archived - Whether these are archived posts
   * @returns {Array} - Formatted posts for display
   */
  _formatPosts(posts, archived) {
    return posts.map(post => {
      // Adapt field names from Prisma (camelCase) to the expected format (snake_case)
      const adaptedPost = {
        ...post,
        // Map Prisma field names to the expected names for backward compatibility
        id: String(post.id), // Ensure ID is a string
        type: post.type,
        content: post.content,
        wechat: post.wechat,
        departure_time: post.departureTime || post.departure_time,
        number_of_people: post.numberOfPeople || post.number_of_people,
        share_fare: post.shareFare !== undefined ? post.shareFare : post.share_fare,
        status: post.status,
        created_at: post.createdAt || post.created_at,
        updated_at: post.updatedAt || post.updated_at
      };
      
      // Ensure number_of_people is properly parsed as a number
      adaptedPost.number_of_people = parseInt(adaptedPost.number_of_people) || 0;
      
      // Format create time and departure time
      const createTime = DateUtils.formatToLocaleString(adaptedPost.created_at);
      const departureTime = DateUtils.formatToLocaleString(adaptedPost.departure_time);
      
      // Extract just the date part for the display - format should be MM-DD
      let departureDate = departureTime;
      if (departureTime.includes(' ')) {
        // If there's a space, take the part before it (the date)
        departureDate = departureTime.split(' ')[0];
      } else if (departureTime.includes('上午') || departureTime.includes('下午')) {
        // For formats like "03-08上午12:00", extract just MM-DD
        departureDate = departureTime.replace(/([0-9]{2}-[0-9]{2}).*/, '$1');
      }
      
      // Determine status text and class
      const { statusText, statusClass } = this._getPostStatus(adaptedPost, archived);
      
      // Handle both nickname and wechat fields
      const contactInfo = adaptedPost.wechat || '';
      
      return {
        id: adaptedPost.id,
        type: adaptedPost.type,
        content: adaptedPost.content,
        wechat: contactInfo,
        departure_time: departureTime,
        number_of_people: adaptedPost.number_of_people,
        share_fare: adaptedPost.share_fare,
        createTime,
        status: adaptedPost.status,
        isArchived: archived,
        statusText,
        statusClass,
        departureDate: departureDate
      };
    });
  },
  
  /**
   * Determine post status text and class
   * @private
   * @param {Object} post - The post to determine status for
   * @param {boolean} archived - Whether this is in archived mode
   * @returns {Object} - Status text and class
   */
  _getPostStatus(post, archived) {
    let statusText = '';
    let statusClass = '';
    
    // For archived tab, all posts show as expired
    if (archived) {
      return { statusText: '', statusClass: 'expired' };
    }
    
    // Handle based on post type
    if (post.type === 'needCar') {
      // 人找车类型的状态显示
      if (post.status === 'STILL_LOOKING' || post.status === 'active') {
        statusText = '仍在寻找';
        statusClass = 'searching';
      } else {
        statusText = '已找到';
        statusClass = 'found';
      }
    } else if (post.type === 'needPeople') {
      // 车找人类型的状态显示
      const seatsLeft = post.number_of_people;
      
      if (seatsLeft <= 0) {
        statusText = '已满员';
        statusClass = 'filled';
      } else {
        statusText = `剩余${seatsLeft}座`;
        statusClass = 'active';
      }
    }
    
    return { statusText, statusClass };
  },

  /**
   * ==============================================
   * Post modification methods
   * ==============================================
   */
  
  /**
   * Delete a post
   * @param {Object} e - Event with post ID
   */
  async onDeletePost(e) {
    try {
      const { id } = e.detail;
      const targetId = String(id);
      
      // Set the deletingPostId in the page data
      this.setData({ deletingPostId: targetId });
      
      // Show confirmation dialog
      const confirmResult = await new Promise((resolve) => {
        wx.showModal({
          title: '确认删除',
          content: '确定要删除这条拼车信息吗？',
          confirmText: '删除',
          cancelText: '取消',
          confirmColor: '#EF4444',
          success: resolve
        });
      });
      
      if (confirmResult.confirm) {
        // User confirmed deletion
        wx.showLoading({ title: '删除中' });
        
        await ApiService.deleteCarpool(targetId);
        
        // Remove post from local state
        const updatedPosts = this.data.posts.filter(post => String(post.id) !== targetId);
        
        this.setData({ 
          posts: updatedPosts,
          deletingPostId: '' // Clear the loading state
        });
        
        wx.hideLoading();
        wx.showToast({
          title: '已删除',
          icon: 'success'
        });
      } else {
        // User cancelled deletion - just clear the loading state
        this.setData({ deletingPostId: '' });
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      
      // Clear the loading state on error
      this.setData({ deletingPostId: '' });
      
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  },

  /**
   * Prepare edit modal for a post
   * @param {Object} e - Event with post data
   */
  onEditPost(e) {
    const { id, content, wechat, type, departure_time, number_of_people, share_fare } = e.detail;
    
    // Format departure time
    const formattedDepartureTime = DateUtils.formatToDateOnly(departure_time);
    
    // Parse the number of people
    let peopleCount = parseInt(number_of_people) || 0;
    
    // Initialize edit modal data
    const editingPost = {
      id,
      content,
      wechat,
      type,
      departure_time: formattedDepartureTime,
      number_of_people: peopleCount,
      share_fare: share_fare === true || share_fare === 'true',
      peopleIndex: peopleCount > 0 ? peopleCount - 1 : 0 // Adjust for zero-based index
    };
    
    // Hide tab bar
    if (getApp().globalData) {
      getApp().globalData.hideTabBar = true;
    }
    
    this.setData({
      editingPost,
      showEditModal: true
    });
  },

  /**
   * Update the number of seats for a post
   * @param {Object} e - Event with seats data
   */
  async updateSeats(e) {
    try {
      const { id, seats, postType } = e.detail;
      
      if (postType !== 'needPeople') {
        return;
      }
      
      // Find the post by ID
      const targetId = String(id);
      const postIndex = this.data.posts.findIndex(p => String(p.id) === targetId);
      
      if (postIndex === -1) {
        return;
      }
      
      const post = this.data.posts[postIndex];
      
      // Update UI immediately
      wx.showLoading({ title: '更新中' });
      
      // Make a copy of the current posts array
      let updatedPosts = [...this.data.posts];
      
      // Update the specific post
      updatedPosts[postIndex] = {
        ...post,
        number_of_people: seats,
        statusText: seats <= 0 ? '已满员' : `剩余${seats}座`,
        statusClass: seats <= 0 ? 'filled' : 'active'
      };
      
      // Update UI immediately
      this.setData({
        posts: updatedPosts
      });
      
      // Format the departure time correctly
      const formattedDepartureTime = DateUtils.formatToISO(post.departure_time);
      
      // Prepare API data
      const updateData = {
        type: post.type,
        content: post.content || '无详情',
        wechat: post.wechat,
        departureTime: formattedDepartureTime,
        numberOfPeople: seats,
        shareFare: post.share_fare === true,
        status: post.status === 'active' ? 'STILL_LOOKING' : post.status === 'found' ? 'FOUND' : post.status
      };
      
      // Call API to persist change
      ApiService.updateCarpool(targetId, updateData)
        .catch(error => {
          console.error('Seat update API error:', error);
          // If API fails, show error but don't revert UI (already changed)
          wx.showToast({
            title: '服务器更新失败',
            icon: 'error'
          });
        });
      
      wx.hideLoading();
      wx.showToast({
        title: '座位已更新',
        icon: 'success'
      });
    } catch (error) {
      console.error('Failed to update seats:', error);
      wx.hideLoading();
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      });
    }
  },
  
  /**
   * Update the status of a post
   * @param {Object} e - Event with status data
   */
  async updateStatus(e) {
    try {
      const { id, status } = e.detail;
      
      // Find the post by ID
      const targetId = String(id);
      const postIndex = this.data.posts.findIndex(p => String(p.id) === targetId);
      
      if (postIndex === -1) {
        return;
      }
      
      const post = this.data.posts[postIndex];
    
      // Map the frontend status names to the Prisma enum values
      let statusValue = status;
      if (status === 'active') {
        statusValue = 'STILL_LOOKING';
      } else if (status === 'found') {
        statusValue = 'FOUND';
      }
      
      // Update UI immediately
      wx.showLoading({ title: '更新中' });
      
      // Define the new status text and class
      const newStatusText = status === 'active' ? '仍在寻找' : '已找到';
      const newStatusClass = status === 'active' ? 'searching' : 'found';
      
      // Make a copy of the current posts array
      let updatedPosts = [...this.data.posts];
      
      // Update the specific post
      updatedPosts[postIndex] = {
        ...post,
        status: statusValue,
        statusText: newStatusText,
        statusClass: newStatusClass
      };
      
      // Update UI immediately
      this.setData({
        posts: updatedPosts
      });
      
      // Format the departure time correctly
      const formattedDepartureTime = DateUtils.formatToISO(post.departure_time);
      
      // Prepare API data
      const updateData = {
        type: post.type,
        content: post.content || '无详情',
        wechat: post.wechat,
        departureTime: formattedDepartureTime,
        numberOfPeople: parseInt(post.number_of_people) || 0,
        shareFare: post.share_fare === true,
        status: statusValue
      };
      
      // Call API to persist change
      ApiService.updateCarpool(targetId, updateData)
        .catch(error => {
          console.error('Status update API error:', error);
          wx.showToast({
            title: '服务器更新失败',
            icon: 'error'
          });
        });
      
      wx.hideLoading();
      wx.showToast({
        title: '状态已更新',
        icon: 'success'
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      wx.hideLoading();
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      });
    }
  },

  /**
   * ==============================================
   * Edit modal methods
   * ==============================================
   */
  
  /**
   * Handle content input in edit modal
   */
  onEditContentInput(e) {
    this.setData({
      'editingPost.content': e.detail.value
    });
  },

  /**
   * Handle WeChat ID input in edit modal
   */
  onEditWechatInput(e) {
    this.setData({
      'editingPost.wechat': e.detail.value
    });
  },

  /**
   * Handle departure time change in edit modal
   */
  onEditDepartureTimeChange(e) {
    // Format the date value
    const dateValue = DateUtils.formatToDateOnly(e.detail.value);
    
    this.setData({
      'editingPost.departure_time': dateValue
    });
  },

  /**
   * Handle people count change in edit modal
   */
  onEditPeopleChange(e) {
    // Parse the value as an integer
    let peopleCount = parseInt(e.detail.value) || 0;
    
    // Calculate peopleIndex (account for 0 value)
    const peopleIndex = peopleCount > 0 ? peopleCount - 1 : 0;
    
    this.setData({
      'editingPost.number_of_people': peopleCount,
      'editingPost.peopleIndex': peopleIndex
    });
  },

  /**
   * Handle share fare change in edit modal
   */
  onShareFareChange(e) {
    const shareFare = e.detail.value === 'true' || e.detail.value === true;
    this.setData({
      'editingPost.share_fare': shareFare
    });
  },

  /**
   * Submit edit form
   */
  async onEditSubmit() {
    try {
      if (!this.data.editingPost) return;
      
      // Validate input
      if (!this.data.editingPost.content || !this.data.editingPost.wechat) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'error'
        });
        return;
      }
      
      this.setData({ isSubmittingEdit: true });
      
      const editingPost = this.data.editingPost;
      
      // Format the departure time for API
      const formattedDepartureTime = DateUtils.formatToISO(editingPost.departure_time);
      
      // Prepare update data
      const updateData = {
        type: editingPost.type,
        content: editingPost.content,
        wechat: editingPost.wechat,
        departureTime: formattedDepartureTime,
        numberOfPeople: editingPost.number_of_people,
        shareFare: editingPost.share_fare,
        status: editingPost.status
      };
      
      // Call API
      await ApiService.updateCarpool(editingPost.id, updateData);
      
      // Show tab bar again
      if (getApp().globalData) {
        getApp().globalData.hideTabBar = false;
      }
      
      // Close modal
      this.setData({
        showEditModal: false,
        editingPost: null,
        isSubmittingEdit: false
      });
      
      // Reload posts
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });
      
      this.loadMyPosts(this.data.activeTab === 'archived');
      
    } catch (error) {
      console.error('Failed to submit edit:', error);
      
      // Show tab bar even on error
      if (getApp().globalData) {
        getApp().globalData.hideTabBar = false;
      }
      
      this.setData({ isSubmittingEdit: false });
      
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      });
    }
  },

  /**
   * Cancel edit
   */
  onEditCancel() {
    // Show tab bar
    if (getApp().globalData) {
      getApp().globalData.hideTabBar = false;
    }
    
    this.setData({
      showEditModal: false,
      editingPost: null
    });
  }
}); 
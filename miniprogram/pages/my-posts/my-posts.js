/**
 * My Posts Page
 * Manages user's carpool posts including active and archived posts
 */
import ApiService from '../../services/api';
import DateUtils from '../../utils/date-utils';

Page({
  /**
   * Page data
   */
  data: {
    // User authentication
    hasUserInfo: false,
    userInfo: null,
    showWechatPrompt: false,
    
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
   * Lifecycle methods
   * ==============================================
   */
  onLoad() {
    console.log('MyPosts page loaded');
    this.checkUserLogin();
  },

  onShow() {
    console.log('MyPosts page shown');
    
    // Set the correct tab bar selection (index 2 = "我的")
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar();
      if (tabBar) {
        tabBar.setData({ selected: 2 });
        
        // Also try calling the setSelected method if it exists
        if (typeof tabBar.setSelected === 'function') {
          tabBar.setSelected(2);
        }
      }
    }
    
    if (this.data.hasUserInfo) {
      this.loadMyPosts(this.data.activeTab === 'archived');
    }
  },

  /**
   * ==============================================
   * UI interaction methods
   * ==============================================
   */
  // Switch between active and archived tabs
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    console.log('Switching to tab:', tab);
    
    if (tab !== this.data.activeTab) {
      console.log('Tab changed - Resetting expandedId to empty string');
      
      this.setData({ 
        activeTab: tab,
        expandedId: '',
        isLoading: true
      });
      
      console.log('After tab switch - expandedId:', this.data.expandedId);
      
      this.loadMyPosts(tab === 'archived');
    }
  },
  
  // Toggle expansion for controls
  toggleExpand(e) {
    const id = String(e.detail.id); // Ensure id is a string
    const currentExpandedId = this.data.expandedId;
    
    console.log('Toggle in page - Current expandedId:', currentExpandedId, 'Clicked ID:', id);
    
    // If the same item is clicked, collapse it. Otherwise, expand the clicked item.
    if (currentExpandedId === id) {
      console.log('Collapsing item:', id);
      this.setData({ expandedId: '' });
    } else {
      console.log('Expanding item:', id);
      this.setData({ expandedId: id });
    }
    
    // Log after update to verify
    console.log('After update - expandedId:', this.data.expandedId);
  },

  /**
   * ==============================================
   * Authentication methods
   * ==============================================
   */
  // Check if user is logged in
  async checkUserLogin() {
    try {
      // Try to get user info from storage
      const userInfo = wx.getStorageSync('userInfo');
      const hasToken = !!wx.getStorageSync('auth_token') || !!wx.getStorageSync('token');
      
      if (userInfo && hasToken) {
        // User is logged in
        this.setData({
          userInfo,
          hasUserInfo: true,
          showWechatPrompt: false
        });
        console.log('User is logged in:', userInfo.nickName);
        this.loadMyPosts(this.data.activeTab === 'archived');
      } else {
        // User is not logged in, show login prompt
        this.setData({
          hasUserInfo: false,
          showWechatPrompt: true,
          isLoading: false
        });
        console.log('User not logged in, showing wechat prompt');
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      this.setData({ 
        hasUserInfo: false,
        showWechatPrompt: true,
        isLoading: false 
      });
    }
  },
  
  // Handle WeChat authorization
  async onGetUserInfo(e) {
    console.log('WeChat auth response:', e);
    if (e.detail.userInfo) {
      try {
        // User granted permission, get login code
        const { code } = await new Promise((resolve, reject) => {
          wx.login({
            success: resolve,
            fail: reject
          });
        });
        
        console.log('Got login code:', code);
        
        // Login to backend
        const result = await ApiService.login(code, e.detail.userInfo);
        console.log('Login result:', result);
        
        if (result && result.token) {
          // Store token and user info
          wx.setStorageSync('auth_token', result.token);
          wx.setStorageSync('userInfo', e.detail.userInfo);
          
          // Update state
    this.setData({
            userInfo: e.detail.userInfo,
            hasUserInfo: true,
            showWechatPrompt: false,
            isLoading: true
          });
          
          // Load posts
          this.loadMyPosts(this.data.activeTab === 'archived');
        }
      } catch (error) {
        console.error('Login error:', error);
        wx.showToast({
          title: '登录失败',
          icon: 'error'
        });
      }
    }
  },

  /**
   * ==============================================
   * Data loading methods
   * ==============================================
   */
  // Load user's carpool posts
  async loadMyPosts(archived = false) {
    try {
      this.setData({ isLoading: true });
      console.log('Loading posts, archived=', archived);
      const posts = await ApiService.getMyPosts(archived);
      console.log('Raw posts from API:', JSON.stringify(posts));
      
      // Client-side fix: If we're in archived mode, filter out today's posts
      let filteredPosts = posts;
      if (archived) {
        // Get today's date (start of day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get tomorrow's date (start of day)
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Filter out posts from today
        filteredPosts = posts.filter(post => {
          const postDate = new Date(post.departureTime || post.departure_time);
          return postDate < today; // Only include posts from before today
        });
        
        console.log('Filtered out today\'s posts from archived tab:', 
          posts.length - filteredPosts.length, 'posts removed');
      }
      
      // Format data for display
      const formattedPosts = filteredPosts.map(post => {
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
        
        console.log('Adapted post:', JSON.stringify(adaptedPost));
        console.log('number_of_people before parsing:', adaptedPost.number_of_people, 'type:', typeof adaptedPost.number_of_people);
        
        // Ensure number_of_people is properly parsed as a number
        adaptedPost.number_of_people = parseInt(adaptedPost.number_of_people) || 0;
        
        console.log('number_of_people after parsing:', adaptedPost.number_of_people, 'type:', typeof adaptedPost.number_of_people);
        
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
        
        console.log('Original departure time:', departureTime, 'Formatted date only:', departureDate);
        
        // Check if departure date is expired for UI purposes (backend already filters by date)
        const isExpiredByDate = DateUtils.isDateExpired(adaptedPost.departure_time);
        console.log('Post departure date:', new Date(adaptedPost.departure_time), 'Is expired by date:', isExpiredByDate);
        
        // Determine status text and class
        let statusText = '';
        let statusClass = '';
        
        // For archived tab, all posts should show "已过期" regardless of their original status
        if (archived) {
          statusText = '';  // No text shown
          statusClass = 'expired';
        } else if (adaptedPost.type === 'needCar') {
          // 人找车类型的状态显示 (only for active tab)
          if (adaptedPost.status === 'STILL_LOOKING' || adaptedPost.status === 'active') {
            statusText = '仍在寻找';
            statusClass = 'searching';
          } else {
            // Default to 'found' status if not explicitly 'active'
            statusText = '已找到';
            statusClass = 'found';
          }
        } else if (adaptedPost.type === 'needPeople') {
          // 车找人类型的状态显示 (only for active tab)
          // Ensure number_of_people is treated as a number
          const seatsLeft = adaptedPost.number_of_people;
          console.log('Post ID:', adaptedPost.id, 'Seats left:', seatsLeft, 'Type:', typeof seatsLeft);
          
          if (seatsLeft <= 0) {
            statusText = '已满员';
            statusClass = 'filled';
            console.log('Setting status to 已满员 (filled)');
          } else {
            // Ensure consistent spacing by using fixed format
            statusText = `剩余${seatsLeft}座`;
            statusClass = 'active';
            console.log('Setting status to 剩余座 (active)');
          }
        } else {
          // Default fallback for unknown types
          statusText = '';
          statusClass = '';
          console.log('Unknown post type:', adaptedPost.type);
        }
        
        console.log('Final status text:', statusText, 'status class:', statusClass);
        
        // Handle both nickname and wechat fields
        const contactInfo = adaptedPost.wechat || '';
        
        const result = {
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
        
        console.log('Final formatted post:', JSON.stringify(result));
        return result;
      });
      
      console.log('All formatted posts:', JSON.stringify(formattedPosts));
      
      this.setData({
        posts: formattedPosts,
        isLoading: false
      });
      
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
    }
  },

  /**
   * ==============================================
   * Post modification methods
   * ==============================================
   */
  // Delete a post
  async onDeletePost(e) {
    try {
      const { id } = e.detail;
      const targetId = String(id);
      
      console.log('Deleting post:', targetId);
      
      // Set the deletingPostId in the page data
      // This will be passed to all post-item components
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

  // Prepare edit modal for a post
  onEditPost(e) {
    const { id, content, wechat, type, departure_time, number_of_people, share_fare } = e.detail;
    
    // Format departure time using our utility function
    const formattedDepartureTime = DateUtils.formatToDateOnly(departure_time);
    
    // Parse the number of people with better error handling
    let peopleCount;
    try {
      peopleCount = parseInt(number_of_people);
      if (isNaN(peopleCount)) {
        // Try to extract numbers from a string if needed
        const numMatch = String(number_of_people).match(/\d+/);
        peopleCount = numMatch ? parseInt(numMatch[0]) : 0;
      }
    } catch (err) {
      peopleCount = 0; // Default if all parsing fails
    }
    
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

  // Update the number of seats for a post
  async updateSeats(e) {
    try {
      console.log('Page: updateSeats event received:', e.detail);
      const { id, seats, postType } = e.detail;
      
      if (postType !== 'needPeople') {
        console.error('Wrong post type for seat update:', postType);
      return;
    }
    
      // Find the post by ID (ensuring string comparison)
      const targetId = String(id);
      const postIndex = this.data.posts.findIndex(p => String(p.id) === targetId);
      
      if (postIndex === -1) {
        console.error('Post not found with ID:', targetId);
      return;
    }
    
      const post = this.data.posts[postIndex];
      console.log('Found post to update:', post);
      
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
      
      console.log('Calling API to update seat count:', updateData);
      
      // Call API to persist change (but don't wait for response)
      ApiService.updateCarpool(targetId, updateData)
        .then(result => {
          console.log('Seat update successful:', result);
        })
        .catch(error => {
          console.error('Seat update API error:', error);
          // If API fails, show error but don't revert UI (already changed)
          wx.showToast({
            title: '服务器更新失败',
            icon: 'error'
          });
        });
      
      // Don't reload all posts - keep the current order
      // await this.loadMyPosts(this.data.activeTab === 'archived');
      
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
  
  // Update the status of a post
  async updateStatus(e) {
    try {
      console.log('Page: updateStatus event received:', e.detail);
      const { id, status } = e.detail;
      
      // Find the post by ID (ensuring string comparison)
      const targetId = String(id);
      const postIndex = this.data.posts.findIndex(p => String(p.id) === targetId);
      
      if (postIndex === -1) {
        console.error('Post not found with ID:', targetId);
        return;
      }
      
      const post = this.data.posts[postIndex];
      console.log('Found post to update:', post);
    
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
      
      console.log('Calling API to update status:', updateData);
      
      // Call API to persist change (but don't wait for response)
      ApiService.updateCarpool(targetId, updateData)
        .then(result => {
          console.log('Status update successful:', result);
        })
        .catch(error => {
          console.error('Status update API error:', error);
          // If API fails, show error but don't revert UI (already changed)
          wx.showToast({
            title: '服务器更新失败',
            icon: 'error'
          });
        });
      
      // Don't reload all posts - keep the current order
      // await this.loadMyPosts(this.data.activeTab === 'archived');
      
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
  // Handle content input in edit modal
  onEditContentInput(e) {
    console.log('Content received in parent:', e.detail);
    this.setData({
      'editingPost.content': e.detail.value
    });
  },

  // Handle WeChat ID input in edit modal
  onEditWechatInput(e) {
    console.log('WeChat received in parent:', e.detail);
    this.setData({
      'editingPost.wechat': e.detail.value
    });
  },

  // Handle departure time change in edit modal
  onEditDepartureTimeChange(e) {
    console.log('Time received in parent:', e.detail);
    
    // The date picker should already be returning a YYYY-MM-DD format
    // But we'll use our utility for consistency
    const dateValue = DateUtils.formatToDateOnly(e.detail.value);
    
          this.setData({
      'editingPost.departure_time': dateValue
    });
  },

  // Handle people count change in edit modal
  onEditPeopleChange(e) {
    // Parse the value as an integer - need special handling for 0
    let peopleCount;
    if (e.detail.value === 0 || e.detail.value === '0') {
      peopleCount = 0;
    } else {
      peopleCount = parseInt(e.detail.value) || 1;
    }
    
    // Calculate peopleIndex (account for 0 value)
    const peopleIndex = peopleCount > 0 ? peopleCount - 1 : 0;
    
                this.setData({
      'editingPost.number_of_people': peopleCount,
      'editingPost.peopleIndex': peopleIndex
    });
  },

  // Handle share fare change in edit modal
  onShareFareChange(e) {
    console.log('Share fare received in parent:', e.detail);
    const shareFare = e.detail.value === 'true' || e.detail.value === true;
    this.setData({
      'editingPost.share_fare': shareFare
    });
  },

  // Submit edit form
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
      console.log('Submitting edit for post:', editingPost.id);
      
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
      
      console.log('Update data to send:', updateData);
      
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

  // Cancel edit
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
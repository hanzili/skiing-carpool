import DateUtils from '../../utils/date-utils';

Component({
  /**
   * Component properties
   */
  properties: {
    showModal: {
      type: Boolean,
      value: false
    },
    editingPost: {
      type: Object,
      value: null
    },
    isSubmitting: {
      type: Boolean,
      value: false
    },
    peopleRange: {
      type: Array,
      value: [0, 1, 2, 3, 4]
    }
  },

  /**
   * Component initial data
   */
  data: {
    // Local copy of editing post for manipulation
    localEditingPost: null,
    // Minimum date for date picker (today's date)
    minDate: ''
  },

  lifetimes: {
    attached: function() {
      // Set the minimum date to today's date in YYYY-MM-DD format
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.setData({
        minDate: `${yyyy}-${mm}-${dd}`
      });
    }
  },

  observers: {
    'showModal': function(show) {
      // When modal visibility changes, update tab bar visibility
      if (show) {
        // Hide tab bar when modal is shown
        if (getApp() && getApp().globalData) {
          console.log('Hiding tab bar from edit-modal');
          getApp().globalData.hideTabBar = true;
        }
      } else {
        // Show tab bar when modal is hidden
        if (getApp() && getApp().globalData) {
          console.log('Showing tab bar from edit-modal');
          getApp().globalData.hideTabBar = false;
        }
      }
    },

    'editingPost': function(post) {
      if (post) {
        // Format the departure time to just show date using DateUtils
        let departureTime = post.departureTime || post.departure_time || '';
        if (departureTime) {
          departureTime = DateUtils.formatToDateOnly(departureTime);
        }
        
        // Get the number of people with better error handling
        let numberOfPeople;
        
        // First try the direct extraction if we found it
        if (typeof post.number_of_people !== 'undefined' && post.number_of_people !== null) {
          numberOfPeople = parseInt(post.number_of_people);
          if (isNaN(numberOfPeople)) {
            // Try to extract a number if it's mixed with text
            const numMatch = String(post.number_of_people).match(/\d+/);
            numberOfPeople = numMatch ? parseInt(numMatch[0]) : 0;
          }
        } else if (typeof post.numberOfPeople !== 'undefined' && post.numberOfPeople !== null) {
          numberOfPeople = parseInt(post.numberOfPeople);
          if (isNaN(numberOfPeople)) {
            // Try to extract a number if it's mixed with text
            const numMatch = String(post.numberOfPeople).match(/\d+/);
            numberOfPeople = numMatch ? parseInt(numMatch[0]) : 0;
          }
        } else {
          // Last resort: try to find it in any field
          const keys = Object.keys(post);
          for (const key of keys) {
            if (key.toLowerCase().includes('people') || key.toLowerCase().includes('count')) {
              const value = post[key];
              if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseInt(value)))) {
                numberOfPeople = parseInt(value);
                break;
              }
            }
          }
          
          // If still not found, default to 0
          if (typeof numberOfPeople === 'undefined') {
            numberOfPeople = 0;
          }
        }
        
        // Normalize property names to camelCase for consistency
        const normalizedPost = {
          id: post.id || post._id || '',
          type: post.type || (post.needPeople ? 'needPeople' : 'needCar'),
          needPeople: post.type === 'needPeople' || post.needPeople === true,
          departureTime: departureTime,
          numberOfPeople: numberOfPeople,
          shareGasFee: post.shareGasFee === true || post.share_fare === true,
          content: String(post.content || ''),
          wechatID: String(post.wechatID || post.wechat || '')
        };
        
        this.setData({
          localEditingPost: normalizedPost
        });
      }
    }
  },

  /**
   * Component methods
   */
  methods: {
    // Close modal without saving
    onClose: function() {
      // Ensure tab bar is visible when modal closes
      if (getApp() && getApp().globalData) {
        getApp().globalData.hideTabBar = false;
      }
      this.triggerEvent('cancel');
    },
    
    // Cancel button handler
    onCancel: function() {
      // Ensure tab bar is visible when modal closes
      if (getApp() && getApp().globalData) {
        getApp().globalData.hideTabBar = false;
      }
      this.triggerEvent('cancel');
    },
    
    // Save button handler
    onSave: function() {
      if (this.data.isSubmitting) return;
      
      // Validate the form
      const post = this.data.localEditingPost;
      if (!post.departureTime) {
        wx.showToast({
          title: '请选择出发日期',
          icon: 'none'
        });
        return;
      }
      
      if (!post.wechatID) {
        wx.showToast({
          title: '请输入微信号',
          icon: 'none'
        });
        return;
      }
      
      if (!post.content) {
        wx.showToast({
          title: '请输入补充信息',
          icon: 'none'
        });
        return;
      }
      
      // Convert the localEditingPost back to the format expected by the parent
      const updatedPost = {
        id: post.id,
        content: post.content,
        wechat: post.wechatID,
        type: post.needPeople ? 'needPeople' : 'needCar',
        departure_time: post.departureTime,
        number_of_people: post.numberOfPeople,
        share_fare: post.shareGasFee,
      };
      
      console.log('Submitting updated post to parent:', updatedPost);
      
      // Ensure tab bar is visible when modal closes
      if (getApp() && getApp().globalData) {
        getApp().globalData.hideTabBar = false;
      }
      
      // Trigger the save event
      this.triggerEvent('submit', updatedPost);
    },
    
    // Change carpool type
    onTypeChange: function(e) {
      const type = e.currentTarget.dataset.type;
      // Only allow changing type if this is a new post
      if (!this.data.localEditingPost.id) {
        this.setData({
          'localEditingPost.needPeople': type === 'needPeople',
          'localEditingPost.type': type
        });
      } else {
        wx.showToast({
          title: '发布后无法修改拼车类型',
          icon: 'none'
        });
      }
    },
    
    // Departure time change handler
    onEditDepartureTimeChange: function(e) {
      const value = e.detail.value;
      console.log('New departure time selected:', value);
      
      // Just use the date without time
      this.setData({
        'localEditingPost.departureTime': value
      });
      
      // Also trigger the event for compatibility with parent page
      this.triggerEvent('timeChange', { value });
    },
    
    // Decrease number of people
    decreasePeople: function() {
      // Get the current value and make sure it's a valid number
      let current = this.data.localEditingPost.numberOfPeople;
      if (typeof current !== 'number' || isNaN(current)) {
        current = 1; // Default to 1 if not a valid number
      }
      
      // Now allow decreasing to 0
      if (current > 0) {
        const newValue = current - 1;
        this.setData({
          'localEditingPost.numberOfPeople': newValue
        });
        
        // Also trigger the event for compatibility with parent page
        // Make sure to explicitly use the value property
        this.triggerEvent('peopleChange', { value: newValue });
      }
    },
    
    // Increase number of people
    increasePeople: function() {
      // Get the current value and make sure it's a valid number
      let current = this.data.localEditingPost.numberOfPeople;
      if (typeof current !== 'number' || isNaN(current)) {
        current = 0; // Default to 0 if not a valid number
      }
      
      // Only increase if less than 4
      if (current < 4) {
        const newValue = current + 1;
        this.setData({
          'localEditingPost.numberOfPeople': newValue
        });
        
        // Also trigger the event for compatibility with parent page
        // Make sure to explicitly use the value property
        this.triggerEvent('peopleChange', { value: newValue });
      }
    },
    
    // Toggle fare sharing
    toggleFareSharing: function() {
      const newValue = !this.data.localEditingPost.shareGasFee;
      this.setData({
        'localEditingPost.shareGasFee': newValue
      });
      
      // Also trigger the event for compatibility with parent page
      this.triggerEvent('shareFareChange', { value: newValue.toString() });
    },
    
    // Content input handler
    onEditContentInput: function(e) {
      const value = e.detail.value;
      console.log('Content input:', value);
      
      this.setData({
        'localEditingPost.content': value
      });
      
      // Also trigger the event for compatibility with parent page
      this.triggerEvent('contentInput', { value });
    },
    
    // WeChat ID input handler
    onEditWechatInput: function(e) {
      const value = e.detail.value;
      console.log('WeChat input:', value);
      
      this.setData({
        'localEditingPost.wechatID': value
      });
      
      // Also trigger the event for compatibility with parent page
      this.triggerEvent('wechatInput', { value });
    }
  }
}); 
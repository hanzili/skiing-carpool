import ApiService from '../../services/api.js';
import AuthService from '../../services/auth.js';
import authBehavior from '../../behaviors/auth-behavior';
import lifecycleBehavior from '../../behaviors/lifecycle-behavior';
import UIStateManager from '../../utils/ui-state-manager.js';
import FormManager from '../../utils/form-manager.js';

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
    tabBarIndex: 1,
    
    // Form data
    type: 'needCar', // default: need a car
    content: '',
    wechat: '', // This is the WeChat ID field for contact purposes
    departureTime: '',
    shareFare: false,
    departureDate: '',
    peopleChoices: [1, 2, 3, 4, 5, 6, 7, 8],
    peopleIndex: 0,
    
    // UI state
    isSubmitting: false,
    hasSubmitted: false,
    isLoading: true
  },

  /**
   * ==============================================
   * Lifecycle methods (standard)
   * ==============================================
   */
  onLoad() {
    this.onPageLoad();
  },

  onShow() {
    this.onPageShow();
  },
  
  onUnload() {
    console.log('[LIFECYCLE] Publish page unloaded');
    
    // Reset any ongoing operations if the user navigates away
    if (this.data.isSubmitting) {
      console.log('[LIFECYCLE] Page unloaded while submitting - resetting state');
      this.setData({ isSubmitting: false });
    }
  },
  
  onBackPress() {
    // Check if the user has entered content but not submitted
    if ((this.data.content || this.data.wechat) && !this.data.hasSubmitted) {
      return UIStateManager.showConfirmation(
        '确认离开',
        '您已经输入了信息，离开将丢失这些内容。确定要离开吗？'
      );
    }
    // Return false to let the default back behavior happen
    return false;
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
    // 设置最小日期为今天
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    
    this.setData({ 
      minDate,
      isLoading: true 
    });
    
    // Check login status - from auth behavior
    this.checkUserLogin();
  },
  
  /**
   * Called after successful login - from auth behavior
   */
  onLoginSuccess() {
    this.setData({ isLoading: false });
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
    // No need to refresh data for publish page
    // Just ensure login status is checked
    if (!this.data.hasUserInfo) {
      this.checkUserLogin();
    }
  },

  /**
   * ==============================================
   * Form input methods
   * ==============================================
   */
  
  /**
   * Switch between "Need Car" and "Need People" types
   * @param {Object} e - Event with type data
   */
  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ type });
  },

  /**
   * Close the publish page and return to the previous page
   */
  onClose() {
    // Use navigateBack to return to the previous page
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * Increase people counter
   */
  increasePeople() {
    const { peopleIndex, peopleChoices } = this.data;
    if (peopleIndex < peopleChoices.length - 1) {
      this.setData({
        peopleIndex: peopleIndex + 1
      });
    }
  },

  /**
   * Decrease people counter
   */
  decreasePeople() {
    const { peopleIndex } = this.data;
    if (peopleIndex > 0) {
      this.setData({
        peopleIndex: peopleIndex - 1
      });
    }
  },

  /**
   * Content input event handler
   * @param {Object} e - Input event
   */
  onContentInput(e) {
    FormManager.handleInputChange(this, {
      currentTarget: { dataset: { field: 'content' } },
      detail: { value: e.detail.value }
    });
  },

  /**
   * WeChat input handler
   * @param {Object} e - Input event
   */
  onWechatInput(e) {
    FormManager.handleInputChange(this, {
      currentTarget: { dataset: { field: 'wechat' } },
      detail: { value: e.detail.value }
    });
  },

  /**
   * Date picker change handler
   * @param {Object} e - Date picker event
   */
  onDateChange(e) {
    FormManager.handleInputChange(this, {
      currentTarget: { dataset: { field: 'departureDate' } },
      detail: { value: e.detail.value }
    });
    this.formatDepartureTime();
  },

  /**
   * Compile date with default time (00:00) into a single timestamp
   * @returns {string|null} - Formatted departure time
   */
  formatDepartureTime() {
    const { departureDate } = this.data;
    if (departureDate) {
      // Set a default time of 00:00
      const timestamp = new Date(`${departureDate}T00:00:00`).toISOString();
      this.setData({ departureTime: timestamp });
      return timestamp;
    }
    return null;
  },

  /**
   * Toggle share fare option
   * @param {Object} e - Toggle event
   */
  toggleShareFare(e) {
    if (e && e.detail) {
      FormManager.handleSwitchChange(this, {
        currentTarget: { dataset: { field: 'shareFare' } },
        detail: { value: e.detail.value }
      });
    } else {
      this.setData({ shareFare: !this.data.shareFare });
    }
  },

  /**
   * Number of people picker change handler
   * @param {Object} e - Picker event
   */
  onPeopleChange(e) {
    FormManager.handleInputChange(this, {
      currentTarget: { dataset: { field: 'peopleIndex' } },
      detail: { value: e.detail.value }
    });
  },

  /**
   * Reset the form
   */
  resetForm() {
    FormManager.resetForm(this, {
      content: '',
      wechat: '',
      departureDate: '',
      departureTime: '',
      shareFare: false,
      peopleIndex: 0,
      isSubmitting: false,
      hasSubmitted: false
    });
  },

  /**
   * ==============================================
   * Form submission
   * ==============================================
   */
  
  /**
   * Validate form and submit
   */
  onSubmit() {
    // Validate form
    const { isValid, errors } = FormManager.validateForm(
      this.data,
      ['content', 'wechat', 'departureTime'],
      {}
    );
    
    if (!isValid) {
      UIStateManager.showError(this, { message: '表单验证错误' }, null, true, '请填写所有必填项');
      return;
    }
    
    // Check if user is logged in
    if (!this.data.hasUserInfo) {
      this.setData({ showWechatPrompt: true });
      return;
    }
    
    // Disable submit button to prevent double submission
    this.setData({ isSubmitting: true });
    
    // Submit data
    this.submitData();
  },
  
  /**
   * Submit data to the server
   */
  async submitData() {
    try {
      // Format the data for API
      const carpoolData = FormManager.prepareCarpoolData({
        type: this.data.type,
        content: this.data.content,
        wechat: this.data.wechat,
        departureTime: this.formatDepartureTime(),
        shareFare: this.data.shareFare,
        peopleChoices: this.data.peopleChoices,
        peopleIndex: this.data.peopleIndex
      });
      
      // Use UI state manager to handle API operation
      await UIStateManager.handleApiOperation(
        this,
        () => ApiService.createCarpool(carpoolData),
        '提交中',
        '发布成功',
        '发布失败',
        'isSubmitting',
        () => {
          // Reset form on success
          this.resetForm();
          this.setData({ hasSubmitted: true });
          
          // Navigate back to the index page after a short delay
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }, 1500);
        }
      );
    } catch (error) {
      console.error('提交失败:', error);
      this.setData({ isSubmitting: false });
      
      if (error.message && error.message.includes('401')) {
        // Authentication error - prompt login again
        UIStateManager.showError(this, error, null, true, '请先登录');
        
        // Clear existing tokens and show login prompt
        AuthService.logout();
        this.setData({ 
          hasUserInfo: false,
          showWechatPrompt: true
        });
      } else {
        UIStateManager.showError(this, error, null, true, '发布失败');
      }
    }
  }
});
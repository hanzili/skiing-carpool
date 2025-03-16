/**
 * UI State Manager
 * Handles common UI state management like loading, errors, and toast messages
 */

const UIStateManager = {
  /**
   * Show loading state
   * @param {Object} page - Page instance
   * @param {string} loadingKey - Name of the loading state in page data
   * @param {boolean} showLoadingUI - Whether to show the loading UI
   * @param {string} title - Loading message
   */
  showLoading(page, loadingKey = 'isLoading', showLoadingUI = true, title = '加载中') {
    const data = {};
    data[loadingKey] = true;
    page.setData(data);

    if (showLoadingUI) {
      wx.showLoading({ title });
    }
  },

  /**
   * Hide loading state
   * @param {Object} page - Page instance
   * @param {string} loadingKey - Name of the loading state in page data
   * @param {boolean} hideLoadingUI - Whether to hide the loading UI
   */
  hideLoading(page, loadingKey = 'isLoading', hideLoadingUI = true) {
    const data = {};
    data[loadingKey] = false;
    page.setData(data);

    if (hideLoadingUI) {
      wx.hideLoading();
    }
  },

  /**
   * Show error message
   * @param {Object} page - Page instance
   * @param {Error} error - Error object
   * @param {string} errorKey - Name of the error state in page data
   * @param {boolean} showToast - Whether to show error toast
   * @param {string} toastMessage - Toast message
   */
  showError(page, error, errorKey = 'apiError', showToast = true, toastMessage = '加载失败') {
    console.error(error);
    
    // Update page error state
    if (errorKey) {
      const data = {};
      data[errorKey] = error.message || error;
      page.setData(data);
    }
    
    // Show toast if needed
    if (showToast) {
      wx.showToast({
        title: toastMessage,
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * Show success message
   * @param {string} message - Success message
   * @param {number} duration - Toast duration in ms
   */
  showSuccess(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration
    });
  },

  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} content - Dialog content
   * @param {string} confirmText - Confirm button text
   * @param {string} cancelText - Cancel button text
   * @param {string} confirmColor - Confirm button color
   * @returns {Promise<boolean>} - Returns true if confirmed, false if canceled
   */
  async showConfirmation(title, content, confirmText = '确认', cancelText = '取消', confirmColor = '#576B95') {
    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        confirmText,
        cancelText,
        confirmColor,
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
  },

  /**
   * Handle API operation with loading and error states
   * @param {Object} page - Page instance
   * @param {Function} apiCall - Promise-returning API function
   * @param {string} loadingMessage - Loading message
   * @param {string} successMessage - Success message
   * @param {string} errorMessage - Error message
   * @param {string} loadingKey - Name of the loading state in page data
   * @param {Function} onSuccess - Callback on success
   * @returns {Promise<any>} - API result
   */
  async handleApiOperation(page, apiCall, loadingMessage, successMessage, errorMessage, loadingKey = 'isLoading', onSuccess = null) {
    let result = null;
    
    try {
      // Show loading UI
      this.showLoading(page, loadingKey, true, loadingMessage);
      
      // Call the API
      result = await apiCall();
      
      // Hide loading UI
      this.hideLoading(page, loadingKey);
      
      // Show success message if provided
      if (successMessage) {
        this.showSuccess(successMessage);
      }
      
      // Call success callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      // Always hide loading UI on error
      this.hideLoading(page, loadingKey);
      
      // Show error message
      this.showError(page, error, 'apiError', true, errorMessage);
      
      // Re-throw the error for the caller to handle if needed
      throw error;
    } finally {
      // Ensure loading states are always cleared in any case
      // This handles cases where there might be unhandled promise rejections
      this.hideLoading(page, loadingKey);
      
      // Also make sure the standard loading indicator is hidden
      try {
        wx.hideLoading();
      } catch (e) {
        // Ignore any errors from hideLoading
      }
      
      // Stop pull down refresh if it's active
      try {
        wx.stopPullDownRefresh();
      } catch (e) {
        // Ignore any errors from stopPullDownRefresh
      }
    }
  }
};

export default UIStateManager; 
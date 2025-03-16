/**
 * Lifecycle Behavior
 * Shared lifecycle methods for pages
 */
module.exports = Behavior({
  methods: {
    /**
     * Page load lifecycle hook with delayed initialization
     * @param {Object} options - Page options
     */
    onPageLoad(options) {
      console.log('[LIFECYCLE] Page loaded with options:', options);
      
      // Execute initialization with a delay to ensure storage is ready
      setTimeout(() => {
        if (typeof this.initialize === 'function') {
          this.initialize(options);
        } else {
          console.warn('[LIFECYCLE] No initialize method defined for this page');
        }
      }, 300);
    },
    
    /**
     * Page show lifecycle hook
     */
    onPageShow() {
      console.log('[LIFECYCLE] Page shown');
      
      // Set the correct tab bar selection if provided
      this.updateTabBar();
      
      // Call the refreshPageData method if it exists
      if (typeof this.refreshPageData === 'function') {
        this.refreshPageData();
      }
    },
    
    /**
     * Helper to update tab bar selected state
     * @param {Number} index - The tab index to select (optional)
     */
    updateTabBar(index) {
      const tabIndex = index || this.data.tabBarIndex;
      
      if (typeof tabIndex !== 'undefined' && typeof this.getTabBar === 'function') {
        const tabBar = this.getTabBar();
        if (tabBar) {
          tabBar.setData({ selected: tabIndex });
          
          // Also try calling the setSelected method if it exists
          if (typeof tabBar.setSelected === 'function') {
            tabBar.setSelected(tabIndex);
          }
        }
      }
    }
  }
}); 
Component({
  data: {
    selected: 0,
    color: "#999999",
    selectedColor: "#4080ff",
    hideTabBar: false,
    list: [{
      pagePath: "/pages/index/index",
      text: "首页",
      iconPath: "/images/home.png",
      selectedIconPath: "/images/home-active.png"
    }, {
      pagePath: "/pages/publish/publish",
      text: "发布",
      isSpecial: true,
      iconPath: "/images/publish.png",
      selectedIconPath: "/images/publish-active.png"
    }, {
      pagePath: "/pages/my-posts/my-posts",
      text: "我的",
      iconPath: "/images/profile.png",
      selectedIconPath: "/images/profile-active.png"
    }]
  },
  
  lifetimes: {
    attached: function() {
      // Check for global hideTabBar state when component attaches
      this.checkTabBarVisibility();
      this.setTabBarFromCurrentPage();
      
      // Set up a periodic check for tab bar visibility
      this.visibilityCheckTimer = setInterval(() => {
        this.checkTabBarVisibility();
      }, 300); // Check every 300ms
    },
    
    // Clean up when component is detached
    detached: function() {
      if (this.visibilityCheckTimer) {
        clearInterval(this.visibilityCheckTimer);
      }
    },
    
    // Check on each page show
    show: function() {
      this.checkTabBarVisibility();
      this.setTabBarFromCurrentPage();
    }
  },
  
  pageLifetimes: {
    // When page shows, check tab bar visibility
    show: function() {
      this.checkTabBarVisibility();
      this.setTabBarFromCurrentPage();
    }
  },
  
  methods: {
    // Add method to set the tab bar selected index based on current page
    setTabBarFromCurrentPage: function() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (!currentPage) return;
      
      const route = '/' + currentPage.route;
      
      // Find the matching tab index
      const tabIndex = this.data.list.findIndex(item => 
        item.pagePath === route
      );
      
      if (tabIndex !== -1 && tabIndex !== this.data.selected) {
        console.log('Setting tab bar selection to', tabIndex, 'for route', route);
        this.setData({
          selected: tabIndex
        });
      }
    },
    
    // Public method that can be called from pages
    setSelected: function(index) {
      console.log('Manually setting tab bar selection to', index);
      if (index >= 0 && index < this.data.list.length) {
        this.setData({
          selected: index
        });
      }
    },
    
    checkTabBarVisibility: function() {
      const app = getApp();
      if (app && app.globalData) {
        // Check if hideTabBar value has changed
        if (this.data.hideTabBar !== app.globalData.hideTabBar) {
          console.log('Tab bar visibility changed:', app.globalData.hideTabBar);
          this.setData({
            hideTabBar: app.globalData.hideTabBar
          });
        }
      }
    },
    
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      const index = data.index;
      
      if (index === 1) {
        // Special handling for publish button
        wx.switchTab({
          url: url,
          success: () => {
            setTimeout(() => {
              this.setData({
                selected: index
              });
            }, 100);
          }
        });
      } else {
        wx.switchTab({
          url: url
        });
        this.setData({
          selected: index
        });
      }
    },
    
    navigateToPublish() {
      // Directly use the path without getting it from dataset
      wx.navigateTo({
        url: '/pages/publish/publish'
      });
    }
  }
}) 
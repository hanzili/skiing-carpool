/**
 * Post Item Component
 * Represents a single carpool post with interactive controls
 */
Component({
  /**
   * Component properties
   */
  properties: {
    // The post data object
    post: {
      type: Object,
      value: {},
      observer: function(newVal) {
        // Ensure post.id is a string if it exists
        if (newVal && newVal.id !== undefined) {
          newVal.id = String(newVal.id);
          // Update isThisPostExpanded when post changes
          this._updateExpandedState();
        }
      }
    },
    
    // Whether the post is archived
    isArchived: {
      type: Boolean,
      value: false
    },
    
    // ID of the currently expanded post
    expandedId: {
      type: String,
      value: '',
      observer: function() {
        this._updateExpandedState();
      }
    },
    
    // Available seat options
    possibleSeats: {
      type: Array,
      value: [0, 1, 2, 3, 4]
    },
    
    // Whether this post is in the active tab
    isActive: {
      type: Boolean,
      value: true
    },
    
    // Add a new property to track which post is being deleted
    deletingPostId: {
      type: String,
      value: ''
    }
  },

  /**
   * External classes
   */
  externalClasses: ['custom-class'],
  
  /**
   * Component initial data
   */
  data: {
    updatingPostId: null,  // ID of post currently being updated
    isThisPostExpanded: false  // Flag to track if this specific post is expanded
  },
  
  /**
   * Property observers
   */
  observers: {
    'post.number_of_people, post.status': function(newNumberOfPeople, newStatus) {
      // When post properties change from the parent, clear the updating state
      console.log('Post properties changed - seats:', newNumberOfPeople, 'status:', newStatus);
      if (this.data.updatingPostId) {
        console.log('Clearing updatePostId state');
        this.setData({ updatingPostId: null });
      }
    }
  },

  /**
   * Component lifecycle
   */
  lifetimes: {
    ready() {
      // Initialize the expanded state when component is ready
      this._updateExpandedState();
      console.log('Component ready - Post ID:', this.data.post?.id, 'Expanded?', this.data.isThisPostExpanded);
    }
  },

  /**
   * Component methods
   */
  methods: {
    /**
     * Private helper methods
     */
    _updateExpandedState: function() {
      if (this.data.post && this.data.post.id) {
        const postId = String(this.data.post.id);
        const expandedId = String(this.data.expandedId);
        const isExpanded = postId === expandedId;
        
        console.log(`Post ${postId}: Setting isThisPostExpanded to ${isExpanded} (expandedId: ${expandedId})`);
        
        this.setData({
          isThisPostExpanded: isExpanded
        });
      }
    },
    
    /**
     * UI interaction methods
     */
    toggleExpand(e) {
      try {
        const id = String(e.currentTarget.dataset.id); // Ensure id is a string
        console.log('Toggle clicked, ID:', id);
        console.log('Current expandedId:', this.data.expandedId);
        this.triggerEvent('toggleExpand', { id });
      } catch (error) {
        console.error('Error in toggleExpand:', error);
      }
    },

    updateSeats(e) {
      try {
        const id = String(e.currentTarget.dataset.id);
        const seats = parseInt(e.currentTarget.dataset.seats);
        
        console.log('Component: updateSeats clicked - ID:', id, 'Seats:', seats);
        console.log('Component: Current post type:', this.data.post.type);
        
        // Set loading state locally to give UI feedback
        this.setData({
          updatingPostId: id
        });
        
        // Trigger the event with proper types
        this.triggerEvent('updateSeats', { 
          id: id, 
          seats: seats,
          postType: this.data.post.type
        });
      } catch (error) {
        console.error('Error in updateSeats component method:', error);
        this.setData({
          updatingPostId: null
        });
      }
    },

    updateStatus(e) {
      try {
        const id = String(e.currentTarget.dataset.id);
        const status = e.currentTarget.dataset.status;
        
        console.log('Component: updateStatus clicked - ID:', id, 'Status:', status);
        console.log('Component: Current post type:', this.data.post.type);
        
        // Set loading state locally to give UI feedback
        this.setData({
          updatingPostId: id
        });
        
        // Trigger the event with proper types
        this.triggerEvent('updateStatus', { 
          id: id, 
          status: status,
          postType: this.data.post.type
        });
      } catch (error) {
        console.error('Error in updateStatus component method:', error);
        this.setData({
          updatingPostId: null
        });
      }
    },

    /**
     * Action handlers
     */
    onEditPost(e) {
      try {
        const dataset = e.currentTarget.dataset;
        const id = String(dataset.id);
        
        // Get the raw data from the dataset
        let { content, wechat, type, departureTime, departure_time, number_of_people, share_fare } = dataset;
        
        // Get the post from properties to ensure we have the correct values
        const post = this.properties.post;
        
        // Use the post data directly to ensure accuracy
        // Use the appropriate departure time field
        const finalDepartureTime = departureTime || departure_time || post.departure_time;
        
        // Ensure we use the correct number of people from the post
        const finalNumberOfPeople = post.number_of_people;
        
        // Ensure data types are correct
        const editData = { 
          id, 
          content: String(content || post.content || ''),
          wechat: String(wechat || post.wechat || ''),
          type: type || post.type, 
          departure_time: String(finalDepartureTime || ''), 
          number_of_people: finalNumberOfPeople, 
          share_fare: share_fare === true || share_fare === 'true' || post.share_fare === true
        };
        
        this.triggerEvent('editPost', editData);
      } catch (error) {
        console.error('Error in onEditPost:', error);
      }
    },

    onDeletePost(e) {
      try {
        const id = String(e.currentTarget.dataset.id);
        // Instead of setting local state, we'll let the parent handle it
        this.triggerEvent('deletePost', { id });
      } catch (error) {
        console.error('Error in onDeletePost:', error);
      }
    },

    // Public method that can be called by parent to reset loading state
    resetDeleteState() {
      if (this.data.deletingPostId) {
        console.log('Resetting delete loading state by parent request');
        this.setData({ deletingPostId: null });
      }
    }
  }
}); 
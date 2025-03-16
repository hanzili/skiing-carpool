/**
 * Carpool Service
 * Handles carpool-specific business logic and data processing
 */
import ApiService from './api.js';
import DateUtils from '../utils/date-utils.js';

const CarpoolService = {
  /**
   * Process carpool data for display
   * @param {Array|Object} data - Raw carpool data from API
   * @param {Boolean} isArrayData - Whether the data is an array
   * @returns {Array|Object} - Processed carpool data
   */
  processCarpoolData(data, isArrayData = true) {
    // Handle both array and single object cases
    if (isArrayData) {
      if (!Array.isArray(data)) {
        console.error('Expected array of carpools, got:', data);
        return [];
      }
      return data.map(item => this._formatCarpoolItem(item));
    } else {
      return this._formatCarpoolItem(data);
    }
  },

  /**
   * Format a single carpool item for display
   * @private
   * @param {Object} item - Raw carpool item
   * @returns {Object} - Formatted carpool item
   */
  _formatCarpoolItem(item) {
    try {
      // Handle the new Prisma schema field names
      const adaptedItem = {
        ...item,
        departure_time: item.departureTime || item.departure_time,
        create_time: item.createdAt || item.create_time,
        number_of_people: item.numberOfPeople || item.number_of_people,
        share_fare: item.shareFare !== undefined ? item.shareFare : item.share_fare,
        // Extract nickname and avatar from user relation if available
        nickname: item.user ? item.user.nickname : item.nickname,
        avatar: item.user ? item.user.avatar : item.avatar,
        // Get wechat directly from carpool object
        wechat: item.wechat || '',
        // Add truncated content
        truncatedContent: item.content ? (item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content) : ''
      };
        
      // Format date: "3月7日 周五"
      const date = new Date(adaptedItem.departure_time);
      if (isNaN(date)) {
        console.warn('Invalid date in carpool:', item);
        return {
          ...adaptedItem,
          departure_date: '日期错误',
          departure_weekday: '',
          timeAgo: '未知'
        };
      }
        
      const month = date.getMonth() + 1;
      const day = date.getDate();
        
      // Get weekday in Chinese
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const weekday = weekdays[date.getDay()];
        
      // Calculate time ago
      const timeAgo = this.getTimeAgo(new Date(adaptedItem.create_time || Date.now()));
        
      return {
        ...adaptedItem,
        departure_date: `${month}月${day}日`,
        departure_weekday: weekday,
        timeAgo
      };
    } catch (err) {
      console.error('Error processing carpool data:', err, item);
      return {
        ...item,
        departure_date: '处理错误',
        departure_weekday: '',
        timeAgo: '未知'
      };
    }
  },

  /**
   * Process carpool data specifically for detail view
   * @param {Object} data - Raw carpool data
   * @returns {Object} - Processed carpool data
   */
  formatCarpoolDetail(data) {
    try {
      // Adapt field names for consistency
      const adaptedData = {
        ...data,
        departure_time: data.departureTime || data.departure_time,
        create_time: data.createdAt || data.create_time,
        number_of_people: data.numberOfPeople || data.number_of_people,
        share_fare: data.shareFare !== undefined ? data.shareFare : data.share_fare,
        // Extract nickname and avatar from user relation if available
        nickname: data.user ? data.user.nickname : data.nickname,
        avatar: data.user ? data.user.avatar : data.avatar,
      };
      
      // Format departure date: "3月7日 周五"
      const date = new Date(adaptedData.departure_time);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      // Format departure time: "15:30"
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      // Get weekday in Chinese
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const weekday = weekdays[date.getDay()];
      
      // Format timeAgo
      const timeAgo = this.getTimeAgo(new Date(adaptedData.create_time));
      
      return {
        ...adaptedData,
        departure_date: `${month}月${day}日 ${weekday}`,
        departure_time_formatted: `${hours}:${minutes}`,
        timeAgo
      };
    } catch (err) {
      console.error('Error formatting carpool detail data:', err);
      return data;
    }
  },

  /**
   * Process my posts data for display
   * @param {Array} posts - Raw posts from API
   * @param {boolean} archived - Whether these are archived posts
   * @returns {Array} - Formatted posts for display
   */
  formatMyPosts(posts, archived) {
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
      const { statusText, statusClass } = this.getPostStatus(adaptedPost, archived);
      
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
   * @param {Object} post - The post to determine status for
   * @param {boolean} archived - Whether this is in archived mode
   * @returns {Object} - Status text and class
   */
  getPostStatus(post, archived) {
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
   * Calculate relative time for display
   * @param {Date} date - Date to calculate time ago from
   * @returns {string} - Formatted time ago string
   */
  getTimeAgo(date) {
    try {
      const now = new Date();
      const diffMs = now - date;
      if (isNaN(diffMs)) {
        return '未知';
      }
      
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      
      if (diffDay > 0) {
        return `${diffDay}天前`;
      } else if (diffHour > 0) {
        return `${diffHour}小时前`;
      } else if (diffMin > 0) {
        return `${diffMin}分钟前`;
      } else {
        return '刚刚';
      }
    } catch (err) {
      console.error('Error calculating time ago:', err);
      return '未知';
    }
  },

  /**
   * Get carpools based on filter type
   * @param {string} filterType - The filter type
   * @param {number} page - Page number
   * @param {number} pageSize - Items per page
   * @param {string} searchQuery - Optional search query
   * @returns {Promise<Array>} - Processed carpool data
   */
  async getCarpoolsByFilter(filterType, page = 1, pageSize = 10, searchQuery = '') {
    try {
      let apiCall;
      
      // If there's a search query, use search API instead
      if (searchQuery && searchQuery.trim()) {
        apiCall = ApiService.searchCarpools(searchQuery, page, pageSize);
      } else {
        // Select which API to call based on filter type
        switch (filterType) {
          case 'needCar':
            apiCall = ApiService.getNeedCarCarpools(page, pageSize);
            break;
          case 'needPeople':
            apiCall = ApiService.getNeedPeopleCarpools(page, pageSize);
            break;
          case 'today':
            apiCall = ApiService.getTodayCarpools(page, pageSize);
            break;
          case 'thisweek':
            apiCall = ApiService.getThisWeekCarpools(page, pageSize);
            break;
          default:
            apiCall = ApiService.getAllCarpools(page, pageSize);
        }
      }
      
      try {
        const data = await apiCall;
        return this.processCarpoolData(data);
      } catch (error) {
        console.error(`API call failed for filter type ${filterType}:`, error);
        throw error; // Re-throw to allow calling code to handle it
      }
    } catch (error) {
      console.error(`Failed to get carpools with filter ${filterType}:`, error);
      // Return empty array instead of throwing to prevent UI issues
      return [];
    }
  }
};

export default CarpoolService; 
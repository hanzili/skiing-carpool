// API environment configuration
const ENV = {
  // For development using local network IP (replace with your computer's IP address on your network)
  // Example: 'http://192.168.1.100'
  LOCAL_IP: 'http://192.168.2.12:3000',
  
  // For production with your actual backend server
  PRODUCTION: 'https://api.znpdx.com'
};

// Select which environment to use
const CURRENT_ENV = ENV.LOCAL_IP;

const API_CONFIG = {
  // For WeChat mini programs, direct localhost requests don't work
  // You need to either:
  // 1. Use an HTTPS URL in production
  // 2. Enable "Do not verify valid domain names..." in project settings (for development)
  // 3. Use the IP address of your computer on the local network instead of 'localhost'
  baseUrl: CURRENT_ENV,
  endpoints: {
    // Test endpoints
    healthCheck: '/',
    dbTest: '/db-test',
    
    // Auth endpoints
    login: '/api/users/login',
    refreshToken: '/api/users/refresh-token', // Add token refresh endpoint
    
    // Carpool endpoints - updated for Prisma backend
    getAllCarpools: '/api/carpools/getall',
    getCarpoolById: '/api/carpools', // ID will be appended with a slash
    createCarpool: '/api/carpools',
    updateCarpool: '/api/carpools', // ID will be appended with a slash
    deleteCarpool: '/api/carpools', // ID will be appended with a slash
    myPosts: '/api/carpools/user/me',
    
    // Filter endpoints - updated for Prisma backend
    needCarCarpools: '/api/carpools/type/needCar',
    needPeopleCarpools: '/api/carpools/type/needPeople',
    todayCarpools: '/api/carpools/today',
    thisWeekCarpools: '/api/carpools/thisweek',
    searchCarpools: '/api/carpools/search',
    
    // User endpoints
    myInfo: '/api/users/me', // 需要JWT认证
    userCarpoolStats: '/api/users/stats' // 获取用户拼车统计信息
  }
}

export default API_CONFIG; 
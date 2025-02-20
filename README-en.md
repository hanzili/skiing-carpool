# Skiing Carpool 🎿

A platform to help skiers find and organize carpools to ski resorts.

## About

This project aims to connect skiers and snowboarders who want to share rides to ski resorts, reducing transportation costs and environmental impact.

## Setup

### Prerequisites

- Ensure you have the [WeChat Mini Program Development Tool](https://developers.weixin.qq.com/miniprogram/en/dev/devtools/download.html) installed.
- Make sure you have a WeChat Developer account and have enabled Cloud Development.

### Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/hanzili/skiing-carpool
   cd skiing-carpool
   ```

2. **Open the Project in WeChat Mini Program Development Tool**

   - Open the WeChat Mini Program Development Tool.
   - Click on "Import Project" and select the cloned repository directory.
   - Ensure the `miniprogramRoot` is set to `miniprogram/` in the project configuration.

3. **Configure Cloud Development**

   - In the WeChat Mini Program Development Tool, navigate to the "Cloud Development" section.
   - Click on "Open Cloud Development" and select the environment you want to use.
   - Copy `miniprogram/config/env.js.example` to `miniprogram/config/env.js`
   - Update the `envId` in `env.js` with your cloud environment ID:
     ```javascript
     const config = {
       envId: 'your-cloud-env-id' // Replace with your cloud environment ID
     }
     ```

4. **Install Dependencies**

   Navigate to the `cloudfunctions/login` directory and install the necessary dependencies:

   ```bash
   cd cloudfunctions/login
   npm install
   ```

5. **Deploy Cloud Functions**

   - In the WeChat Mini Program Development Tool, navigate to the "Cloud Functions" section.
   - Deploy the `login` function by right-clicking on it and selecting "Deploy".

6. **Run the Project**

   - Click on the "Compile" button in the WeChat Mini Program Development Tool to run the project.
   - Use the simulator to test the application.

### Notes

- Ensure your WeChat Mini Program Development Tool is updated to the latest version.
- Make sure your cloud environment is properly configured and active. 
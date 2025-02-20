# 滑雪拼车 🎿

一个帮助滑雪爱好者找到和组织拼车去滑雪场的平台。

## 关于

该项目旨在连接想要共享前往滑雪场车程的滑雪者和单板滑雪者，减少交通费用和环境影响。

## 设置

### 先决条件

- 确保已安装[微信小程序开发者工具](https://developers.weixin.qq.com/miniprogram/en/dev/devtools/download.html)。
- 确保您有微信开发者账号并已启用云开发。

### 步骤

1. **克隆仓库**

   ```bash
   git clone https://github.com/hanzili/skiing-carpool
   cd skiing-carpool
   ```

2. **在微信小程序开发工具中打开项目**

   - 打开微信小程序开发工具。
   - 点击"导入项目"并选择克隆的仓库目录。
   - 确保项目配置中的 `miniprogramRoot` 设置为 `miniprogram/`。

3. **配置云开发**

   - 在微信小程序开发工具中，导航到"云开发"部分。
   - 点击"开通云开发"并选择要使用的环境。
   - 复制 `miniprogram/config/env.js.example` 到 `miniprogram/config/env.js`
   - 在 `env.js` 中更新 `envId` 为您的云环境 ID：
     ```javascript
     const config = {
       envId: 'your-cloud-env-id' // 替换为您的云环境 ID
     }
     ```

4. **安装依赖**

   导航到 `cloudfunctions/login` 目录并安装必要的依赖：

   ```bash
   cd cloudfunctions/login
   npm install
   ```

5. **部署云函数**

   - 在微信小程序开发工具中，导航到"云函数"部分。
   - 右键点击 `login` 函数并选择"部署"。

6. **运行项目**

   - 点击微信小程序开发工具中的"编译"按钮运行项目。
   - 使用模拟器测试应用程序。

### 注意事项

- 确保您的微信小程序开发工具已更新到最新版本。
- 确保您的云环境已正确配置并处于活动状态。 
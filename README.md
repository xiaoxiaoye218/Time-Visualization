# 时间可视化工具

这是一个基于网页的时间可视化工具，帮助用户直观地记录和查看每天的时间分配情况。

## 功能特点

### 1. 时间轴可视化
- 24小时时间轴显示
- 实时进度条显示当前时间
- 不同颜色区分不同活动
- 精确到分钟的时间记录

### 2. 活动管理
- 自定义活动类型
- 可设置活动颜色
- 支持编辑和删除活动
- 预设活动快速启动

### 3. 时间编辑
- 可视化时间段编辑
- 精确时间段设置
- 支持恢复默认设置
- 智能时间段分割（不影响其他时间段）

### 4. 数据统计
- 当日活动时长统计
- 实时进度百分比显示
- 当前活动状态显示

### 5. 数据持久化
- 本地存储支持
- 自动保存所有更改
- 跨会话数据保持

## 使用说明

### 基本操作

1. **添加活动**
   - 在"预设活动"区域输入活动名称
   - 选择活动颜色
   - 点击"添加预设"按钮

2. **开始/结束活动**
   - 点击预设活动按钮开始该活动
   - 再次点击同一活动按钮结束该活动

3. **编辑时间段**
   - 在"编辑时间段"区域选择开始和结束时间
   - 选择要设置的活动
   - 点击"应用修改"按钮
   - 选择"恢复默认"可以清除指定时间段的活动

4. **管理活动**
   - 使用活动按钮上的编辑图标(✏️)修改活动
   - 使用删除图标(❌)移除活动

### 注意事项

- 时间段编辑时会智能处理重叠部分，不会影响其他时间段的记录
- 活动数据会自动保存在浏览器本地存储中
- 跨天时会自动结束当前活动并记录

## 技术实现

- 纯前端实现，无需后端服务
- 使用 HTML5 + CSS3 + JavaScript
- 采用 LocalStorage 进行数据持久化
- 响应式设计，支持移动设备



## 本地运行

1. 克隆项目到本地
2. 使用任意 Web 服务器托管项目文件
3. 在浏览器中访问 index.html

## 未来计划

- [ ] 添加数据导出功能
- [ ] 支持查看历史数据统计
- [ ] 添加周/月视图
- [ ] 支持自定义主题 
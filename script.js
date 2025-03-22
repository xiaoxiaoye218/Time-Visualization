// 数据结构
// 定义预设活动数组，优先从localStorage读取，若不存在则使用默认值
// 每个活动包含id（唯一标识）、name（显示名称）和color（颜色代码）
let activities = JSON.parse(localStorage.getItem('activities')) || [
    { id: 'default', name: '学习', color: '#3498db' },
    { id: 'game', name: '玩游戏', color: '#e67e22' },
    { id: 'rest', name: '休息', color: '#2ecc71' }
];

// 修改数据结构：使用对象来存储每分钟的活动，键为"日期_分钟"，值为活动ID
// {}:创建一个空对象，也就是约等于python中一个空字典        js-Object = python-dict
let minuteActivities = JSON.parse(localStorage.getItem('minuteActivities')) || {};

let currentActivity = null;
let startTime = null;

// DOM元素引用 - 获取页面上各个交互元素的引用，便于后续JavaScript操作
const progressBar = document.getElementById('progress-bar');                   // 进度条主体，显示一天中各时间段的活动
const progressPercentage = document.getElementById('progress-percentage');     // 显示当天已过去时间的百分比文本
const currentDayElement = document.getElementById('current-day');              // 显示当前日期信息（第几天）
const currentActivityElement = document.getElementById('current-activity');    // 显示当前正在进行的活动名称
const presetActivitiesContainer = document.getElementById('preset-activities-container'); // 预设活动按钮的容器
const activityNameInput = document.getElementById('activity-name');            // 添加新活动时输入活动名称的文本框
const activityColorInput = document.getElementById('activity-color');          // 添加新活动时选择活动颜色的颜色选择器
const addActivityBtn = document.getElementById('add-activity-btn');            // 添加新预设活动的按钮
const activitySelect = document.getElementById('activity-select');             // 编辑时间段时选择活动的下拉菜单
const startTimeInput = document.getElementById('start-time');                  // 编辑时间段时设置开始时间的输入框
const endTimeInput = document.getElementById('end-time');                      // 编辑时间段时设置结束时间的输入框
const applyTimeEditBtn = document.getElementById('apply-time-edit');           // 应用时间段编辑的确认按钮
const timeMarkersContainer = document.querySelector('.time-markers');          // 进度条上方显示时间刻度的容器
const activityStatsContainer = document.getElementById('activity-stats-container'); // 显示各活动统计信息的容器

// 初始化应用
function initApp() {
    // 设置当前天数和年份
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
    const year = now.getFullYear();
    currentDayElement.textContent = `第 ${dayOfYear} 天`;
    currentDayElement.textContent += ` ${year}`;

    // 创建时间刻度
    createTimeMarkers();
    
    // 渲染预设活动按钮
    renderPresetActivities();
    
    // 填充活动选择下拉框
    updateActivitySelect();

    // 初始化进度条
    initProgressBar();
    
    // 恢复当前活动状态
    restoreCurrentActivity();
    
    // 更新活动统计
    updateActivityStats();
    
    // 每秒更新进度条
    setInterval(updateProgressBar, 1000);
}

// 创建时间刻度标记 - 在进度条上方显示时间刻度（如0:00、2:00、4:00等）
function createTimeMarkers() {
    timeMarkersContainer.innerHTML = ''; // 清空时间标记容器的内容，防止重复创建
    for (let i = 0; i <= 24; i += 2) { // 从0点到24点，每隔2小时创建一个时间标记
        const marker = document.createElement('div'); // 创建新的div元素作为时间标记
        marker.className = 'time-marker'; // 设置CSS类名，用于样式控制
        marker.textContent = `${i}:00`; // 设置标记内容为"小时:00"格式
        timeMarkersContainer.appendChild(marker); // 将创建的标记添加到容器中
    }
}

// 初始化进度条 - 创建代表一天中每分钟的可视化时间轴，并设置交互功能
function initProgressBar() {
    progressBar.innerHTML = ''; // 清空进度条容器内容，防止重复创建
    
    // 创建1440个片段 (24小时 * 60分钟)
    const totalMinutes = 24 * 60;
    
    for (let i = 0; i < totalMinutes; i++) {
        const segment = document.createElement('div'); // 为每分钟创建一个div元素
        segment.className = 'progress-segment default-segment'; // 设置CSS类名，用于样式控制
        // 使用flex布局替代固定宽度百分比，确保不会有舍入误差导致的多余部分
        segment.style.flex = '1'; // 每个片段占用相等的空间，确保总长度精确分配
        segment.dataset.minute = i; // 设置自定义属性，存储该片段代表的分钟值
        progressBar.appendChild(segment); // 将片段添加到进度条容器中
    }
    
    applyMinuteActivitiesColors(); // 根据已保存的活动数据，为进度条上的每个时间片段着色
    
    updateProgressBar(); // 根据当前时间更新进度条显示状态

    // 添加点击事件监听
    progressBar.addEventListener('click', handleProgressBarClick); // 设置进度条的点击交互，允许用户编辑特定时间段
}

// 处理进度条点击事件
function handleProgressBarClick(event) {
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    // 计算点击位置对应的分钟数
    const clickedMinute = Math.floor(percentage * 24 * 60);
    
    // 获取当前日期
    const today = new Date().toISOString().split('T')[0];
    
    // 检查点击位置的活动
    const clickedActivityId = getActivityForMinute(today, clickedMinute);
    
    // 如果点击位置没有活动，则不处理
    if (!clickedActivityId) return;
    
    // 找到该活动在连续时间内的开始和结束时间
    let startMinute = clickedMinute;
    let endMinute = clickedMinute + 1;  // 初始结束为点击位置+1
    
    // 向前查找连续的相同活动
    while (startMinute > 0) {
        const prevMinute = startMinute - 1;
        const prevActivityId = getActivityForMinute(today, prevMinute);
        if (prevActivityId !== clickedActivityId) break;
        startMinute = prevMinute;
    }
    
    // 向后查找连续的相同活动
    while (endMinute < 24 * 60) {
        const nextActivityId = getActivityForMinute(today, endMinute);
        if (nextActivityId !== clickedActivityId) break;
        endMinute++;
    }
    
    // 找到对应的活动
    const activity = activities.find(a => a.id === clickedActivityId);
    if (activity) {
        // 设置时间编辑器的值
        const startHours = Math.floor(startMinute / 60);
        const startMinutes = startMinute % 60;
        const endHours = Math.floor(endMinute / 60);
        const endMinutes = endMinute % 60;
        
        // 格式化时间字符串
        startTimeInput.value = `${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`;
        endTimeInput.value = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        activitySelect.value = clickedActivityId;

        // 滚动到时间编辑区域
        document.querySelector('.time-editor-section').scrollIntoView({ behavior: 'smooth' });
    }
}

// 恢复当前活动状态
function restoreCurrentActivity() {
    const savedCurrentActivity = localStorage.getItem('currentActivity');
    const savedStartTime = localStorage.getItem('startTime');
    
    if (savedCurrentActivity && savedStartTime) {
        currentActivity = savedCurrentActivity;
        startTime = new Date(savedStartTime);
        
        // 检查活动是否仍然存在
        const activity = activities.find(a => a.id === currentActivity);
        if (activity) {
            // 检查是否是今天开始的活动
            const today = new Date().toISOString().split('T')[0];
            const startDay = startTime.toISOString().split('T')[0];
            
            if (today === startDay) {
                // 恢复UI显示
                currentActivityElement.textContent = activity.name;
                currentActivityElement.style.backgroundColor = activity.color;
                currentActivityElement.style.color = 'white';
                
                // 执行一次updateProgressBar，以便记录已过去的时间
                updateProgressBar();
            } else {
                // 如果不是今天开始的，不再自动记录前一天的活动
                // 只重置当前活动状态
                currentActivity = null;
                startTime = null;
                localStorage.removeItem('currentActivity');
                localStorage.removeItem('startTime');
                
                // 更新UI
                currentActivityElement.textContent = '无活动';
                currentActivityElement.style.backgroundColor = '#eee';
                currentActivityElement.style.color = '#333';
            }
        } else {
            // 活动已不存在，重置当前活动
            currentActivity = null;
            startTime = null;
            localStorage.removeItem('currentActivity');
            localStorage.removeItem('startTime');
            
            // 更新UI
            currentActivityElement.textContent = '无活动';
            currentActivityElement.style.backgroundColor = '#eee';
            currentActivityElement.style.color = '#333';
        }
    }
}

// 更新进度条显示
function updateProgressBar() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // 计算当前时间对应的分钟数 (0-1439)
    const currentMinute = hours * 60 + minutes;
    
    // 计算进度百分比
    const percentage = ((currentMinute * 60 + seconds) / (24 * 60 * 60) * 100).toFixed(2);
    progressPercentage.textContent = `${percentage}%`;
    
    const today = new Date().toISOString().split('T')[0];
    
    // 高亮当前时间之前的片段
    const segments = progressBar.querySelectorAll('.progress-segment');
    segments.forEach((segment, index) => {
        // 只修改默认颜色的片段
        if (segment.classList.contains('default-segment')) {
            if (index <= currentMinute) {
                segment.style.backgroundColor = '#aaa'; // 已过去的时间
            } else {
                segment.style.backgroundColor = '#ddd'; // 未来的时间
            }
        }
    });
    
    // 如果当前有活动，将过去的分钟记录为该活动（扫描指针思路）
    if (currentActivity && startTime) {
        const activity = activities.find(a => a.id === currentActivity);
        if (activity) {
            const startMinute = minuteFromDate(startTime);
            
            // 如果当前活动已经持续了一段时间，记录过去的分钟
            if (startMinute < currentMinute) {
                // 只记录之前没有被记录过的分钟
                for (let i = startMinute; i < currentMinute; i++) {
                    // 检查是否已经有其他活动
                    if (!getActivityForMinute(today, i)) {
                        // 记录该分钟的活动
                        setActivityForMinute(today, i, currentActivity);
                    }
                }
                // 保存记录
                saveMinuteActivities();
                
                // 重新应用颜色（现在所有记录都已保存）
                applyMinuteActivitiesColors();
            }
        }
    }
}

// 将data对象转换为当天的分钟数 (0-1439)
function minuteFromDate(date) {
    return date.getHours() * 60 + date.getMinutes();
}

// 应用活动颜色到进度条 - 根据minuteActivities数据为进度条上的每个时间片段设置对应活动的颜色
function applyMinuteActivitiesColors() {
    const segments = progressBar.querySelectorAll('.progress-segment'); // 获取所有进度条片段DOM元素
    const today = new Date().toISOString().split('T')[0]; // 获取当前日期字符串，格式为"YYYY-MM-DD"
    
    segments.forEach(segment => { // 重置所有片段为默认颜色，清除之前的活动颜色设置
        segment.style.backgroundColor = '#ddd'; // 设置为默认的浅灰色背景
        segment.classList.add('default-segment'); // 添加默认片段CSS类，用于后续标识未赋值的片段
    });
    
    for (let minute = 0; minute < 24 * 60; minute++) { // 遍历一天中的所有分钟(0-1439)
        const activityId = getActivityForMinute(today, minute); // 调用getActivityForMinute获取该分钟记录的活动ID
        if (activityId) { // 如果该分钟有记录的活动
            const activity = activities.find(a => a.id === activityId); // 在activities数组中查找对应ID的活动对象
            if (activity) { // 如果找到了对应的活动
                const segment = segments[minute]; // 获取对应分钟的进度条片段DOM元素
                if (segment) { // 确保DOM元素存在
                    segment.style.backgroundColor = activity.color; // 设置片段背景色为活动颜色
                    segment.classList.remove('default-segment'); // 移除默认片段标识类
                }
            }
        }
    }
}

// 渲染预设活动按钮
function renderPresetActivities() {
    presetActivitiesContainer.innerHTML = '';
    
    activities.forEach(activity => {
        const button = document.createElement('div');
        button.className = 'activity-button';
        button.style.backgroundColor = activity.color;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'activity-name';
        nameSpan.textContent = activity.name;
        button.appendChild(nameSpan);
        
        // 编辑图标
        const editIcon = document.createElement('span');
        editIcon.className = 'edit-icon';
        editIcon.innerHTML = '✏️';
        editIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            editActivity(activity.id);
        });
        button.appendChild(editIcon);
        
        // 删除图标
        const deleteIcon = document.createElement('span');
        deleteIcon.className = 'delete-icon';
        deleteIcon.innerHTML = '❌';
        deleteIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteActivity(activity.id);
        });
        button.appendChild(deleteIcon);
        
        // 点击按钮开始/停止活动
        button.addEventListener('click', () => toggleActivity(activity.id));
        
        presetActivitiesContainer.appendChild(button);
    });
}

// 更新活动选择下拉框
function updateActivitySelect() {
    // 保存当前选中的值
    const selectedValue = activitySelect.value;
    
    // 清空选项（保留第一个和第二个默认选项）
    while (activitySelect.options.length > 2) {
        activitySelect.remove(2);
    }
    
    // 添加活动选项
    activities.forEach(activity => {
        const option = document.createElement('option');
        option.value = activity.id;
        option.textContent = activity.name;
        option.style.backgroundColor = activity.color;
        activitySelect.appendChild(option);
    });
    
    // 恢复之前选中的值
    if (selectedValue && activitySelect.querySelector(`option[value="${selectedValue}"]`)) {
        activitySelect.value = selectedValue;
    }
}

// 开始或停止活动
function toggleActivity(activityId) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 如果当前没有活动，开始新活动
    if (!currentActivity) {
        currentActivity = activityId;
        startTime = now;
        
        // 保存当前活动状态到本地存储
        saveCurrentActivity();
        
        const activity = activities.find(a => a.id === activityId);
        currentActivityElement.textContent = activity.name;
        currentActivityElement.style.backgroundColor = activity.color;
        currentActivityElement.style.color = 'white';
    } 
    // 如果点击的是当前活动，停止该活动
    else if (currentActivity === activityId) {
        // 当前活动已经在updateProgressBar中被记录，这里只需要停止活动
        
        // 重置当前活动
        currentActivity = null;
        startTime = null;
        localStorage.removeItem('currentActivity');
        localStorage.removeItem('startTime');
        
        currentActivityElement.textContent = '无活动';
        currentActivityElement.style.backgroundColor = '#eee';
        currentActivityElement.style.color = '#333';
    }
    // 如果点击的是不同活动，先停止当前活动，再开始新活动
    else {
        // 当前活动已经在updateProgressBar中被记录，这里只需要切换活动
        
        // 开始新活动
        currentActivity = activityId;
        startTime = now;
        
        // 保存当前活动状态到本地存储
        saveCurrentActivity();
        
        const activity = activities.find(a => a.id === activityId);
        currentActivityElement.textContent = activity.name;
        currentActivityElement.style.backgroundColor = activity.color;
        currentActivityElement.style.color = 'white';
    }
    
    // 更新UI
    updateProgressBar();
}

// 保存当前活动状态到本地存储
function saveCurrentActivity() {
    if (currentActivity && startTime) {
        localStorage.setItem('currentActivity', currentActivity);
        localStorage.setItem('startTime', startTime.toISOString());
    } else {
        localStorage.removeItem('currentActivity');
        localStorage.removeItem('startTime');
    }
}

// 更新活动统计
function updateActivityStats() {
    activityStatsContainer.innerHTML = '';
    
    // 计算每个活动的总时间
    const activityTimes = {};
    const today = new Date().toISOString().split('T')[0];
    
    // 初始化所有活动的时间为0
    activities.forEach(activity => {
        activityTimes[activity.id] = 0;
    });
    
    // 统计每个分钟的活动
    for (let minute = 0; minute < 24 * 60; minute++) {
        const activityId = getActivityForMinute(today, minute);
        if (activityId && activityTimes[activityId] !== undefined) {
            activityTimes[activityId]++;
        }
    }
    
    // 创建统计元素
    activities.forEach(activity => {
        if (activityTimes[activity.id] > 0) {
            const minutes = activityTimes[activity.id];
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            
            const statElement = document.createElement('div');
            statElement.className = 'activity-stat';
            statElement.style.backgroundColor = activity.color;
            
            const nameElement = document.createElement('div');
            nameElement.className = 'activity-stat-name';
            nameElement.textContent = activity.name;
            
            const timeElement = document.createElement('div');
            timeElement.className = 'activity-stat-time';
            timeElement.textContent = `${hours}小时 ${remainingMinutes}分钟`;
            
            statElement.appendChild(nameElement);
            statElement.appendChild(timeElement);
            
            activityStatsContainer.appendChild(statElement);
        }
    });
    
    if (activityStatsContainer.children.length === 0) {
        const noStatsElement = document.createElement('div');
        noStatsElement.textContent = '今天还没有记录任何活动';
        noStatsElement.style.color = '#888';
        noStatsElement.style.textAlign = 'center';
        noStatsElement.style.width = '100%';
        noStatsElement.style.padding = '10px';
        activityStatsContainer.appendChild(noStatsElement);
    }
}

// 添加预设活动
function addActivity() {
    const name = activityNameInput.value.trim();
    const color = activityColorInput.value;
    
    if (!name) {
        alert('请输入活动名称');
        return;
    }
    
    // 检查是否已存在同名活动
    if (activities.some(a => a.name === name)) {
        alert('已存在同名活动');
        return;
    }
    
    // 创建新活动
    const newActivity = {
        id: Date.now().toString(),
        name: name,
        color: color
    };
    
    // 添加到活动列表
    activities.push(newActivity);
    
    // 保存到本地存储
    saveActivities();
    
    // 更新UI
    renderPresetActivities();
    updateActivitySelect();
    
    // 清空输入框
    activityNameInput.value = '';
}

// 编辑活动
function editActivity(activityId) {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    
    // 创建编辑对话框
    const editDialog = document.createElement('div');
    editDialog.style.position = 'fixed';
    editDialog.style.top = '0';
    editDialog.style.left = '0';
    editDialog.style.width = '100%';
    editDialog.style.height = '100%';
    editDialog.style.backgroundColor = 'rgba(0,0,0,0.5)';
    editDialog.style.display = 'flex';
    editDialog.style.justifyContent = 'center';
    editDialog.style.alignItems = 'center';
    editDialog.style.zIndex = '1000';
    
    const dialogContent = document.createElement('div');
    dialogContent.style.backgroundColor = 'white';
    dialogContent.style.padding = '20px';
    dialogContent.style.borderRadius = '8px';
    dialogContent.style.width = '300px';
    dialogContent.style.maxWidth = '90%';
    
    const title = document.createElement('h3');
    title.textContent = '编辑活动';
    title.style.marginBottom = '15px';
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = '活动名称:';
    nameLabel.style.display = 'block';
    nameLabel.style.marginBottom = '5px';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = activity.name;
    nameInput.style.width = '100%';
    nameInput.style.padding = '8px';
    nameInput.style.marginBottom = '15px';
    nameInput.style.borderRadius = '4px';
    nameInput.style.border = '1px solid #ddd';
    
    const colorLabel = document.createElement('label');
    colorLabel.textContent = '活动颜色:';
    colorLabel.style.display = 'block';
    colorLabel.style.marginBottom = '5px';
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = activity.color;
    colorInput.style.width = '100%';
    colorInput.style.height = '40px';
    colorInput.style.marginBottom = '15px';
    colorInput.style.padding = '0';
    colorInput.style.border = '1px solid #ddd';
    colorInput.style.borderRadius = '4px';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.style.padding = '8px 15px';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.backgroundColor = '#ddd';
    cancelButton.style.cursor = 'pointer';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = '保存';
    saveButton.style.padding = '8px 15px';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '4px';
    saveButton.style.backgroundColor = '#2ecc71';
    saveButton.style.color = 'white';
    saveButton.style.cursor = 'pointer';
    
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);
    
    dialogContent.appendChild(title);
    dialogContent.appendChild(nameLabel);
    dialogContent.appendChild(nameInput);
    dialogContent.appendChild(colorLabel);
    dialogContent.appendChild(colorInput);
    dialogContent.appendChild(buttonContainer);
    
    editDialog.appendChild(dialogContent);
    document.body.appendChild(editDialog);
    
    // 添加事件监听
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editDialog);
    });
    
    saveButton.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        const newColor = colorInput.value;
        
        if (!newName) {
            alert('活动名称不能为空');
            return;
        }
        
        // 检查是否已存在同名活动（排除自身）
        if (activities.some(a => a.name === newName && a.id !== activityId)) {
            alert('已存在同名活动');
            return;
        }
        
        // 更新活动
        activity.name = newName;
        activity.color = newColor;
        
        // 保存到本地存储
        saveActivities();
        
        // 更新UI
        renderPresetActivities();
        updateActivitySelect();
        applyMinuteActivitiesColors();
        updateProgressBar();
        updateActivityStats();
        
        // 如果是当前活动，更新当前活动显示
        if (currentActivity === activityId) {
            currentActivityElement.textContent = activity.name;
            currentActivityElement.style.backgroundColor = activity.color;
        }
        
        // 关闭对话框
        document.body.removeChild(editDialog);
    });
}

// 删除活动
function deleteActivity(activityId) {
    if (!confirm('确定要删除这个活动吗？')) return;
    
    // 从活动列表中移除
    activities = activities.filter(a => a.id !== activityId);
    
    // 移除相关的时间记录
    const today = new Date().toISOString().split('T')[0];
    
    // 遍历所有分钟，删除与该活动相关的记录
    Object.keys(minuteActivities).forEach(key => {
        if (minuteActivities[key] === activityId) {
            delete minuteActivities[key];
        }
    });
    
    // 如果删除的是当前活动，重置当前活动
    if (currentActivity === activityId) {
        currentActivity = null;
        startTime = null;
        localStorage.removeItem('currentActivity');
        localStorage.removeItem('startTime');
        currentActivityElement.textContent = '无活动';
        currentActivityElement.style.backgroundColor = '#eee';
        currentActivityElement.style.color = '#333';
    }
    
    // 保存到本地存储
    saveActivities();
    saveMinuteActivities();
    
    // 更新UI
    renderPresetActivities();
    updateActivitySelect();
    applyMinuteActivitiesColors();
    updateProgressBar();
    updateActivityStats();
}

// 应用时间段编辑
function applyTimeEdit() {
    const startTimeValue = startTimeInput.value;
    const endTimeValue = endTimeInput.value;
    const activityId = activitySelect.value;
    
    if (!startTimeValue || !endTimeValue) {
        alert('请选择开始和结束时间');
        return;
    }
    
    if (!activityId) {
        alert('请选择活动或恢复默认');
        return;
    }
    
    // 计算分钟数
    const [startHours, startMinutes] = startTimeValue.split(':').map(Number);
    const [endHours, endMinutes] = endTimeValue.split(':').map(Number);
    
    const startMinute = startHours * 60 + startMinutes;
    const endMinute = endHours * 60 + endMinutes;
    
    if (startMinute > endMinute) {
        alert('开始时间不能晚于结束时间');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMinute = minuteFromDate(now);

    // 如果编辑的时间段包含当前时间，且当前有活动，需要重置当前活动
    if (currentActivity && startTime) {
        const currentStartMinute = minuteFromDate(startTime);
        // 如果编辑时间段与当前活动的开始时间有重叠，则停止当前活动
        if (startMinute <= currentStartMinute && endMinute > currentStartMinute) {
            // 重置当前活动
            currentActivity = null;
            startTime = null;
            localStorage.removeItem('currentActivity');
            localStorage.removeItem('startTime');
            
            // 更新UI
            currentActivityElement.textContent = '无活动';
            currentActivityElement.style.backgroundColor = '#eee';
            currentActivityElement.style.color = '#333';
        }
    }

    // 更新每个分钟的活动
    for (let minute = startMinute; minute < endMinute; minute++) {
        if (activityId === 'default-reset') {
            setActivityForMinute(today, minute, null);
        } else {
            setActivityForMinute(today, minute, activityId);
        }
    }
    
    // 保存到本地存储
    saveMinuteActivities();
    
    // 更新UI
    applyMinuteActivitiesColors();
    updateProgressBar();
    updateActivityStats();
    
    // 重置输入
    startTimeInput.value = '';
    endTimeInput.value = '';
    activitySelect.value = '';
}

// 保存活动到本地存储
function saveActivities() {
    localStorage.setItem('activities', JSON.stringify(activities));
}

// 保存分钟活动数据到本地存储
function saveMinuteActivities() {
    localStorage.setItem('minuteActivities', JSON.stringify(minuteActivities));
}

// 获取指定日期和分钟的活动
function getActivityForMinute(date, minute) {
    const key = `${date}_${minute}`;
    return minuteActivities[key];
}

// 设置指定日期和分钟的活动
function setActivityForMinute(date, minute, activityId) {
    const key = `${date}_${minute}`;
    if (activityId) {
        minuteActivities[key] = activityId;
    } else {
        delete minuteActivities[key];
    }
}

// 事件监听
// 给 DOM 元素添加点击事件监听器。当用户点击对应的按钮时，会触发绑定的函数
addActivityBtn.addEventListener('click', addActivity);          //"添加预设"增加活动按钮
applyTimeEditBtn.addEventListener('click', applyTimeEdit);      //"应用修改"时间段编辑按钮

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp); 
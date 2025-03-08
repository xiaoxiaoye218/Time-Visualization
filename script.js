// 数据结构
let activities = JSON.parse(localStorage.getItem('activities')) || [
    { id: 'default', name: '学习', color: '#3498db' },
    { id: 'game', name: '玩游戏', color: '#e67e22' },
    { id: 'rest', name: '休息', color: '#2ecc71' }
];

let timeSegments = JSON.parse(localStorage.getItem('timeSegments')) || [];
let currentActivity = null;
let startTime = null;

// DOM元素引用
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const currentDayElement = document.getElementById('current-day');
const currentActivityElement = document.getElementById('current-activity');
const presetActivitiesContainer = document.getElementById('preset-activities-container');
const activityNameInput = document.getElementById('activity-name');
const activityColorInput = document.getElementById('activity-color');
const addActivityBtn = document.getElementById('add-activity-btn');
const activitySelect = document.getElementById('activity-select');
const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');
const applyTimeEditBtn = document.getElementById('apply-time-edit');
const timeMarkersContainer = document.querySelector('.time-markers');
const activityStatsContainer = document.getElementById('activity-stats-container');

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

// 创建时间刻度标记
function createTimeMarkers() {
    timeMarkersContainer.innerHTML = '';
    for (let i = 0; i <= 24; i += 2) {
        const marker = document.createElement('div');
        marker.className = 'time-marker';
        marker.textContent = `${i}:00`;
        timeMarkersContainer.appendChild(marker);
    }
}

// 初始化进度条
function initProgressBar() {
    progressBar.innerHTML = '';
    
    // 创建1440个片段 (24小时 * 60分钟)
    const totalMinutes = 24 * 60;
    
    for (let i = 0; i < totalMinutes; i++) {
        const segment = document.createElement('div');
        segment.className = 'progress-segment default-segment';
        segment.style.width = `${100 / totalMinutes}%`;
        segment.dataset.minute = i;
        progressBar.appendChild(segment);
    }
    
    // 应用已记录的活动颜色
    applyTimeSegmentsColors();
    
    // 初始更新进度条
    updateProgressBar();
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
            } else {
                // 如果不是今天开始的，自动结束这个活动
                const endOfPreviousDay = new Date(startDay + 'T23:59:59');
                
                // 添加到时间段记录
                timeSegments.push({
                    id: Date.now().toString() + '-auto',
                    activityId: currentActivity,
                    startMinute: minuteFromDate(startTime),
                    endMinute: 23 * 60 + 59, // 23:59
                    date: startDay
                });
                
                // 重置当前活动
                currentActivity = null;
                startTime = null;
                localStorage.removeItem('currentActivity');
                localStorage.removeItem('startTime');
                
                // 更新UI
                currentActivityElement.textContent = '无活动';
                currentActivityElement.style.backgroundColor = '#eee';
                currentActivityElement.style.color = '#333';
                
                // 保存到本地存储
                saveTimeSegments();
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
    
    // 如果当前有活动，更新最近的片段颜色
    if (currentActivity && startTime) {
        const activity = activities.find(a => a.id === currentActivity);
        if (activity) {
            const startMinute = minuteFromDate(startTime);
            for (let i = startMinute; i <= currentMinute; i++) {
                const segment = progressBar.querySelector(`[data-minute="${i}"]`);
                if (segment) {
                    segment.style.backgroundColor = activity.color;
                    segment.classList.remove('default-segment');
                }
            }
        }
    }
}

// 将日期转换为当天的分钟数 (0-1439)
function minuteFromDate(date) {
    return date.getHours() * 60 + date.getMinutes();
}

// 应用已记录的时间段颜色
function applyTimeSegmentsColors() {
    // 重置所有片段为默认颜色
    const segments = progressBar.querySelectorAll('.progress-segment');
    segments.forEach(segment => {
        segment.style.backgroundColor = '#ddd';
        segment.classList.add('default-segment');
    });
    
    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0];
    
    // 为今天记录的时间段设置颜色
    timeSegments
        .filter(segment => segment.date === today)
        .forEach(segment => {
            const activity = activities.find(a => a.id === segment.activityId);
            if (activity) {
                for (let i = segment.startMinute; i <= segment.endMinute; i++) {
                    const segmentElement = progressBar.querySelector(`[data-minute="${i}"]`);
                    if (segmentElement) {
                        segmentElement.style.backgroundColor = activity.color;
                        segmentElement.classList.remove('default-segment');
                    }
                }
            }
        });
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
        // 记录活动时间段
        const startMinute = minuteFromDate(startTime);
        const endMinute = minuteFromDate(now);
        
        // 添加到时间段记录
        if (startMinute <= endMinute) {
            timeSegments.push({
                id: Date.now().toString(),
                activityId: currentActivity,
                startMinute: startMinute,
                endMinute: endMinute,
                date: new Date().toISOString().split('T')[0]
            });
            
            // 保存到本地存储
            saveTimeSegments();
            
            // 更新活动统计
            updateActivityStats();
        }
        
        // 重置当前活动
        currentActivity = null;
        startTime = null;
        
        // 清除本地存储中的当前活动
        localStorage.removeItem('currentActivity');
        localStorage.removeItem('startTime');
        
        currentActivityElement.textContent = '无活动';
        currentActivityElement.style.backgroundColor = '#eee';
        currentActivityElement.style.color = '#333';
    }
    // 如果点击的是不同活动，先停止当前活动，再开始新活动
    else {
        // 记录活动时间段
        const startMinute = minuteFromDate(startTime);
        const endMinute = minuteFromDate(now);
        
        // 添加到时间段记录
        if (startMinute <= endMinute) {
            timeSegments.push({
                id: Date.now().toString(),
                activityId: currentActivity,
                startMinute: startMinute,
                endMinute: endMinute,
                date: new Date().toISOString().split('T')[0]
            });
            
            // 保存到本地存储
            saveTimeSegments();
            
            // 更新活动统计
            updateActivityStats();
        }
        
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
    
    // 应用时间段颜色
    applyTimeSegmentsColors();
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
    const todayDate = new Date().toISOString().split('T')[0];
    
    // 初始化所有活动的时间为0
    activities.forEach(activity => {
        activityTimes[activity.id] = 0;
    });
    
    // 计算今天每个活动的总时间（分钟）
    timeSegments
        .filter(segment => segment.date === todayDate)
        .forEach(segment => {
            const duration = segment.endMinute - segment.startMinute;
            if (activityTimes[segment.activityId] !== undefined) {
                activityTimes[segment.activityId] += duration;
            }
        });
    
    // 如果当前有活动，添加当前活动的进行时间
    if (currentActivity && startTime) {
        const now = new Date();
        const startMinute = minuteFromDate(startTime);
        const currentMinute = minuteFromDate(now);
        const duration = currentMinute - startMinute;
        
        if (duration > 0 && activityTimes[currentActivity] !== undefined) {
            activityTimes[currentActivity] += duration;
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
    
    // 如果没有活动统计，显示提示信息
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
        applyTimeSegmentsColors();
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
    
    // 移除相关的时间段
    timeSegments = timeSegments.filter(segment => segment.activityId !== activityId);
    
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
    saveTimeSegments();
    
    // 更新UI
    renderPresetActivities();
    updateActivitySelect();
    applyTimeSegmentsColors();
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
    
    // 处理恢复默认选项
    if (activityId === 'default-reset') {
        // 移除该时间段内的所有记录
        timeSegments = timeSegments.filter(segment => {
            // 保留与当前编辑时间段没有重叠的记录
            return !(segment.startMinute <= endMinute && segment.endMinute >= startMinute);
        });
    } else {
        // 先移除该时间段内的所有记录
        timeSegments = timeSegments.filter(segment => {
            // 保留与当前编辑时间段没有重叠的记录
            return !(segment.startMinute <= endMinute && segment.endMinute >= startMinute);
        });
        
        // 创建新的时间段
        const newSegment = {
            id: Date.now().toString(),
            activityId: activityId,
            startMinute: startMinute,
            endMinute: endMinute,
            date: new Date().toISOString().split('T')[0]
        };
        
        // 添加到时间段记录
        timeSegments.push(newSegment);
    }
    
    // 保存到本地存储
    saveTimeSegments();
    
    // 更新UI
    applyTimeSegmentsColors();
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

// 保存时间段到本地存储
function saveTimeSegments() {
    localStorage.setItem('timeSegments', JSON.stringify(timeSegments));
}

// 事件监听
addActivityBtn.addEventListener('click', addActivity);
applyTimeEditBtn.addEventListener('click', applyTimeEdit);

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp); 
// js/script.js
const OpticsSchemeApp = {
    data: {
        crosses: [],
        connections: [],
        splices: [],
        crossPositions: {},
        portPositions: {},
        splicePositions: {}
    },
    
    currentView: 'editor',
    graph: null,
    
    // Инициализация приложения
    init: function() {
        this.bindEvents();
        this.loadData();
        this.renderEditorTables();
        
        // Инициализируем граф
        if (this.data.crosses.length > 0 && this.data.connections.length > 0) {
            GraphProcessor.buildGraph(this.data.crosses, this.data.connections, this.data.splices);
        }
    },
    
    // Привязка событий
    bindEvents: function() {
        // Переключение между вкладками
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Кнопки управления
        document.getElementById('btn-editor').addEventListener('click', () => this.showView('editor'));
        document.getElementById('btn-generate').addEventListener('click', () => this.generateScheme());
        document.getElementById('btn-save').addEventListener('click', () => this.saveData());
        document.getElementById('btn-load').addEventListener('click', () => this.loadData());
        document.getElementById('btn-search').addEventListener('click', () => this.toggleSearch());
        document.getElementById('btn-export').addEventListener('click', () => this.exportSVG());
        
        // Управление масштабом
        document.getElementById('zoom-in').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());
        document.getElementById('auto-layout').addEventListener('click', () => this.autoLayout());
        
        // Поиск пути
        document.getElementById('execute-search').addEventListener('click', () => this.findPath());
        document.getElementById('clear-search').addEventListener('click', () => this.clearSearch());
        
        // Модальное окно
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-save').addEventListener('click', () => this.saveModalData());
        
        // Добавление строк в таблицы
        document.querySelectorAll('.add-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.addNewRow(e.target.dataset.table);
            });
        });
        
        // Глобальные обработчики
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    },
    
    // Загрузка данных
    loadData: function() {
        this.showStatus('Загрузка данных...', 'loading');
        
        $.ajax({
            url: 'php/load_data.php',
            type: 'GET',
            dataType: 'json',
            success: (data) => {
                if (data.error) {
                    this.showStatus('Ошибка загрузки: ' + data.error, 'error');
                    return;
                }
                
                this.data.crosses = data.crosses || [];
                this.data.connections = data.connections || [];
                this.data.splices = data.splices || [];
                
                this.renderEditorTables();
                this.showStatus('Данные успешно загружены', 'success');
                
                // Перестраиваем граф
                GraphProcessor.buildGraph(this.data.crosses, this.data.connections, this.data.splices);
            },
            error: (xhr, status, error) => {
                this.showStatus('Ошибка загрузки: ' + error, 'error');
            }
        });
    },
    
    // Сохранение данных
    saveData: function() {
        this.showStatus('Сохранение данных...', 'loading');
        
        // Собираем данные из таблиц
        this.collectTableData();
        
        // Валидация данных
        const validationErrors = this.validateAllData();
        if (validationErrors.length > 0) {
            this.showStatus('Ошибки валидации: ' + validationErrors.join('; '), 'error');
            return;
        }
        
        $.ajax({
            url: 'php/save_data.php',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(this.data),
            success: (response) => {
                if (response.error) {
                    this.showStatus('Ошибка сохранения: ' + response.error, 'error');
                    return;
                }
                
                this.showStatus('Данные успешно сохранены', 'success');
                
                // Перестраиваем граф
                GraphProcessor.buildGraph(this.data.crosses, this.data.connections, this.data.splices);
            },
            error: (xhr, status, error) => {
                this.showStatus('Ошибка сохранения: ' + error, 'error');
            }
        });
    },
    
    // Сбор данных из таблиц редактора
    collectTableData: function() {
        const crossesData = [];
        const crossesRows = document.querySelectorAll('#crosses-table tbody tr');
        
        crossesRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 12) {
                crossesData.push({
                    id: cells[0].textContent,
                    name: cells[1].textContent,
                    type: cells[2].textContent,
                    location: cells[3].textContent,
                    rack_position: cells[4].textContent,
                    total_ports: cells[5].textContent,
                    used_ports: cells[6].textContent,
                    vendor: cells[7].textContent,
                    model: cells[8].textContent,
                    install_date: cells[9].textContent,
                    status: cells[10].textContent,
                    comments: cells[11].textContent
                });
            }
        });
        
        this.data.crosses = crossesData;
        console.log('Collected crosses data:', crossesData);
    },
    
    // Валидация всех данных
    validateAllData: function() {
        const errors = [];
        
        // Валидация кроссов
        this.data.crosses.forEach((cross, index) => {
            const crossErrors = DataValidator.validateCross(cross);
            if (crossErrors.length > 0) {
                errors.push(`Кросс ${index + 1}: ${crossErrors.join(', ')}`);
            }
        });
        
        // Валидация соединений
        this.data.connections.forEach((connection, index) => {
            const connectionErrors = DataValidator.validateConnection(connection, this.data.crosses);
            if (connectionErrors.length > 0) {
                errors.push(`Связь ${index + 1}: ${connectionErrors.join(', ')}`);
            }
        });
        
        // Валидация муфт
        this.data.splices.forEach((splice, index) => {
            const spliceErrors = DataValidator.validateSplice(splice, this.data.connections);
            if (spliceErrors.length > 0) {
                errors.push(`Муфта ${index + 1}: ${spliceErrors.join(', ')}`);
            }
        });
        
        return errors;
    },
    
    // Генерация схемы
    generateScheme: function() {
        this.showView('scheme');
        this.renderScheme();
    },
    
    // Отрисовка схемы в SVG
    renderScheme: function() {
        const svg = document.getElementById('scheme-svg');
        svg.innerHTML = '';
        
        // Добавляем маркеры для стрелок
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#333');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        
        // Автоматическое размещение, если позиции не заданы
        if (Object.keys(this.data.crossPositions).length === 0) {
            this.autoLayout();
        }
        
        // Отрисовка групп
        this.renderGroups(svg);
        
        // Отрисовка кроссов
        this.renderCrosses(svg);
        
        // Отрисовка соединений
        this.renderConnections(svg);
        
        // Отрисовка муфт
        this.renderSplices(svg);
        
        // Включаем перетаскивание
        LayoutEngine.enableDragging(svg);
        
        // Отрисовка легенды групп
        this.renderGroupLegend();
        
        this.showStatus('Схема сгенерирована', 'success');
    },
    
    // Отрисовка групп
    renderGroups: function(svg) {
        const groups = this.getGroups();
        
        Object.keys(groups).forEach(location => {
            const groupCrosses = groups[location];
            if (groupCrosses.length === 0) return;
            
            // Вычисляем границы группы
            const bounds = this.calculateGroupBounds(groupCrosses);
            if (!bounds) return;
            
            // Прямоугольник группы
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'group-rect');
            rect.setAttribute('data-group', location);
            rect.setAttribute('x', bounds.x - 20);
            rect.setAttribute('y', bounds.y - 40);
            rect.setAttribute('width', bounds.width + 40);
            rect.setAttribute('height', bounds.height + 60);
            rect.setAttribute('rx', '10');
            rect.setAttribute('ry', '10');
            svg.appendChild(rect);
            
            // Название группы
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'group-label');
            text.setAttribute('x', bounds.x + bounds.width / 2);
            text.setAttribute('y', bounds.y - 15);
            text.textContent = location;
            svg.appendChild(text);
            
            // Количество элементов в группе
            const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            countText.setAttribute('class', 'group-count');
            countText.setAttribute('x', bounds.x + bounds.width / 2);
            countText.setAttribute('y', bounds.y - 5);
            countText.textContent = `(${groupCrosses.length} кроссов)`;
            svg.appendChild(countText);
        });
    },
    
    // Получение групп кроссов
    getGroups: function() {
        const groups = {};
        
        this.data.crosses.forEach(cross => {
            const location = cross.location || 'Не указана';
            if (!groups[location]) {
                groups[location] = [];
            }
            groups[location].push(cross);
        });
        
        return groups;
    },
    
    // Вычисление границ группы
    calculateGroupBounds: function(crosses) {
        if (crosses.length === 0) return null;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasPositions = false;
        
        crosses.forEach(cross => {
            const position = this.data.crossPositions[cross.id];
            if (position) {
                hasPositions = true;
                minX = Math.min(minX, position.x);
                minY = Math.min(minY, position.y);
                maxX = Math.max(maxX, position.x + LayoutEngine.config.crossWidth);
                
                const crossHeight = LayoutEngine.config.crossHeight + 
                                  (cross.total_ports * LayoutEngine.config.portSpacing);
                maxY = Math.max(maxY, position.y + crossHeight);
            }
        });
        
        if (!hasPositions) return null;
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    },
    
    // Отрисовка кроссов
    renderCrosses: function(svg) {
        this.data.crosses.forEach(cross => {
            const position = this.data.crossPositions[cross.id] || { x: 100, y: 100 };
            const crossHeight = LayoutEngine.config.crossHeight + (cross.total_ports * LayoutEngine.config.portSpacing);
            
            // Прямоугольник кросса
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'cross-rect');
            rect.setAttribute('data-cross-id', cross.id);
            rect.setAttribute('x', position.x);
            rect.setAttribute('y', position.y);
            rect.setAttribute('width', LayoutEngine.config.crossWidth);
            rect.setAttribute('height', crossHeight);
            svg.appendChild(rect);
            
            // Название кросса
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'cross-label');
            text.setAttribute('x', position.x + LayoutEngine.config.crossWidth / 2);
            text.setAttribute('y', position.y + 20);
            text.textContent = cross.name;
            svg.appendChild(text);
            
            // Локация (под названием)
            const locationText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            locationText.setAttribute('class', 'cross-location');
            locationText.setAttribute('x', position.x + LayoutEngine.config.crossWidth / 2);
            locationText.setAttribute('y', position.y + 35);
            locationText.textContent = cross.location || 'Не указана';
            svg.appendChild(locationText);
            
            // Отрисовка портов
            this.renderPorts(svg, cross, position);
        });
    },
    
    // Отрисовка портов
    renderPorts: function(svg, cross, crossPosition) {
        if (!this.data.portPositions[cross.id]) {
            this.data.portPositions[cross.id] = LayoutEngine.calculatePortPositions(cross, crossPosition);
        }
        
        const portPositions = this.data.portPositions[cross.id];
        
        for (let i = 1; i <= cross.total_ports; i++) {
            const position = portPositions[i];
            if (!position) continue;
            
            // Круг порта
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'port-circle');
            circle.setAttribute('data-cross-id', cross.id);
            circle.setAttribute('data-port-num', i);
            circle.setAttribute('cx', position.x);
            circle.setAttribute('cy', position.y);
            circle.setAttribute('r', 4);
            
            // Проверяем занят ли порт
            const isUsed = this.data.connections.some(conn => 
                (conn.from_cross_id == cross.id && conn.from_port == i) ||
                (conn.to_cross_id == cross.id && conn.to_port == i)
            );
            
            if (isUsed) {
                circle.classList.add('used');
            } else {
                circle.classList.add('free');
            }
            
            svg.appendChild(circle);
            
            // Номер порта
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'port-label');
            text.setAttribute('x', position.x - 10);
            text.setAttribute('y', position.y + 4);
            text.textContent = i;
            svg.appendChild(text);
        }
    },
    
    // Отрисовка соединений
// В методе renderConnections заменяем прямые линии на изогнутые
renderConnections: function(svg) {
    this.data.connections.forEach(connection => {
        const fromCross = this.data.crosses.find(c => c.id == connection.from_cross_id);
        const toCross = this.data.crosses.find(c => c.id == connection.to_cross_id);
        
        if (!fromCross || !toCross) return;
        
        const fromPosition = this.data.portPositions[fromCross.id]?.[connection.from_port];
        const toPosition = this.data.portPositions[toCross.id]?.[connection.to_port];
        
        if (!fromPosition || !toPosition) return;
        
        // Создаем изогнутый путь вместо прямой линии
        const pathData = LayoutEngine.createCurvedPath(
            fromPosition.x, 
            fromPosition.y, 
            toPosition.x, 
            toPosition.y
        );
        
        // Линия соединения
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', `connection-path fiber-${this.getFiberColorClass(connection.fiber_color_end)}`);
        path.setAttribute('data-connection-id', connection.id);
        path.setAttribute('d', pathData);
        path.setAttribute('marker-end', 'url(#arrowhead)');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
    });
},
    
    // Отрисовка муфт
    renderSplices: function(svg) {
        this.data.splices.forEach(splice => {
            const connection = this.data.connections.find(c => c.id == splice.connection_id);
            if (!connection) return;
            
            let position;
            if (this.data.splicePositions && this.data.splicePositions[splice.id]) {
                position = this.data.splicePositions[splice.id];
            } else {
                // Автоматическое вычисление позиции
                const fromCross = this.data.crosses.find(c => c.id == connection.from_cross_id);
                const toCross = this.data.crosses.find(c => c.id == connection.to_cross_id);
                
                if (!fromCross || !toCross) return;
                
                const fromPosition = this.data.portPositions[fromCross.id]?.[connection.from_port];
                const toPosition = this.data.portPositions[toCross.id]?.[connection.to_port];
                
                if (!fromPosition || !toPosition) return;
                
                const t = parseFloat(splice.position) || 0.5;
                position = {
                    x: fromPosition.x + (toPosition.x - fromPosition.x) * t,
                    y: fromPosition.y + (toPosition.y - fromPosition.y) * t
                };
            }
            
            // Круг муфты
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'splice-circle');
            circle.setAttribute('data-splice-id', splice.id);
            circle.setAttribute('cx', position.x);
            circle.setAttribute('cy', position.y);
            circle.setAttribute('r', LayoutEngine.config.spliceRadius);
            svg.appendChild(circle);
            
            // Название муфты
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'splice-label');
            text.setAttribute('x', position.x);
            text.setAttribute('y', position.y - LayoutEngine.config.spliceRadius - 5);
            text.textContent = splice.name;
            svg.appendChild(text);
        });
    },
    
    // Отрисовка легенды групп
    renderGroupLegend: function() {
        const groups = this.getGroups();
        const legendContainer = document.createElement('div');
        legendContainer.className = 'group-legend';
        legendContainer.innerHTML = '<h4>Локации:</h4>';
        
        Object.keys(groups).forEach(location => {
            if (groups[location].length > 0) {
                const colorClass = this.getGroupColorClass(location);
                const item = document.createElement('div');
                item.className = 'legend-item';
                item.innerHTML = `
                    <div class="legend-color ${colorClass}"></div>
                    <span>${location} (${groups[location].length})</span>
                `;
                legendContainer.appendChild(item);
            }
        });
        
        // Добавляем легенду к схеме
        const schemeView = document.getElementById('scheme-view');
        const existingLegend = schemeView.querySelector('.group-legend');
        if (existingLegend) {
            existingLegend.remove();
        }
        schemeView.appendChild(legendContainer);
    },
    
    // Получение класса цвета для группы
    getGroupColorClass: function(location) {
        // Простое преобразование для основных типов локаций
        if (location.includes('ЦОД')) return 'group-ЦОД';
        if (location.includes('Уличный')) return 'group-Уличный';
        if (location.includes('Здание')) return 'group-Здание';
        if (location.includes('Этаж')) return 'group-Этаж';
        if (location.includes('Колодец')) return 'group-Колодец';
        if (location.includes('Промзона')) return 'group-Промзона';
        if (location.includes('Жилой')) return 'group-Жилой';
        if (location.includes('Бизнес')) return 'group-Бизнес';
        if (location.includes('Торговый')) return 'group-Торговый';
        if (location.includes('Медицин')) return 'group-Медицин';
        return 'group-Не указана';
    },
    
    // Получение класса CSS для цвета волокна
    getFiberColorClass: function(color) {
        const colorMap = {
            'синий': 'blue',
            'оранжевый': 'orange',
            'зеленый': 'green',
            'коричневый': 'brown',
            'серый': 'slate',
            'белый': 'white',
            'красный': 'red',
            'черный': 'black',
            'желтый': 'yellow',
            'фиолетовый': 'violet',
            'розовый': 'rose',
            'аква': 'aqua'
        };
        
        return colorMap[color] || 'blue';
    },
    
    // Поиск пути между точками
    findPath: function() {
        const fromInput = document.getElementById('search-from').value;
        const toInput = document.getElementById('search-to').value;
        
        if (!fromInput || !toInput) {
            this.showStatus('Укажите начальную и конечную точки', 'error');
            return;
        }
        
        // Разбор входных данных (формат: "кросс:порт")
        const [fromCrossId, fromPort] = fromInput.split(':').map(item => item.trim());
        const [toCrossId, toPort] = toInput.split(':').map(item => item.trim());
        
        if (!fromCrossId || !fromPort || !toCrossId || !toPort) {
            this.showStatus('Неверный формат. Используйте: ID_кросса:номер_порта', 'error');
            return;
        }
        
        this.showStatus('Поиск пути...', 'loading');
        
        // Ищем путь
        const path = GraphProcessor.findPath(fromCrossId, fromPort, toCrossId, toPort);
        
        if (path) {
            this.highlightPath(path);
            this.showStatus('Путь найден', 'success');
        } else {
            this.showStatus('Путь не найден', 'error');
        }
    },
    
    // Подсветка найденного пути
    highlightPath: function(path) {
        // Сначала сбрасываем все подсветки
        this.clearHighlights();
        
        // Подсвечиваем элементы пути
        path.forEach(item => {
            let element;
            if (item.type === 'edge') {
                element = document.querySelector(`[data-connection-id="${item.id}"]`);
            } else if (item.type === 'node') {
                const parts = item.id.split('_');
                if (parts[0] === 'cross') {
                    element = document.querySelector(`[data-cross-id="${parts[1]}"][data-port-num="${parts[2]}"]`);
                } else if (parts[0] === 'splice') {
                    element = document.querySelector(`[data-splice-id="${parts[1]}"]`);
                }
            }
            
            if (element) {
                element.classList.add('highlighted');
            }
        });
    },
    
    // Очистка подсветки
    clearHighlights: function() {
        document.querySelectorAll('.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
    },
    
    // Очистка поиска
    clearSearch: function() {
        document.getElementById('search-from').value = '';
        document.getElementById('search-to').value = '';
        this.clearHighlights();
        this.showStatus('Поиск очищен', 'info');
    },
    
    // Автоматическое размещение
    autoLayout: function() {
        this.showStatus('Автоматическое размещение...', 'loading');
        
        const layout = LayoutEngine.autoLayout(
            this.data.crosses, 
            this.data.connections, 
            this.data.splices
        );
        
        this.data.crossPositions = layout.crosses;
        this.data.portPositions = layout.ports;
        this.data.splicePositions = layout.splices;
        
        this.renderScheme();
        this.showStatus('Размещение завершено', 'success');
    },
    
    // Управление масштабом
    zoom: function(factor) {
        const svg = document.getElementById('scheme-svg');
        let viewBox = svg.getAttribute('viewBox');
        
        if (!viewBox) {
            const bbox = svg.getBBox();
            viewBox = `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;
            svg.setAttribute('viewBox', viewBox);
        }
        
        const [x, y, width, height] = viewBox.split(' ').map(Number);
        
        // Расчет нового viewBox
        const newWidth = width / factor;
        const newHeight = height / factor;
        const newX = x + (width - newWidth) / 2;
        const newY = y + (height - newHeight) / 2;
        
        svg.setAttribute('viewBox', `${newX} ${newY} ${newWidth} ${newHeight}`);
    },
    
    // Сброс viewBox
    resetView: function() {
        const svg = document.getElementById('scheme-svg');
        const bbox = svg.getBBox();
        svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        this.showStatus('Вид сброшен', 'info');
    },
    
    // Показать статус
    showStatus: function(message, type = 'info') {
        const statusBar = document.getElementById('status-info');
        statusBar.textContent = message;
        statusBar.className = 'status-bar ' + type;
    },
    
    // Переключение между представлениями
    showView: function(viewName) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        
        if (viewName === 'editor') {
            document.getElementById('editor-view').classList.remove('hidden');
            this.currentView = 'editor';
        } else if (viewName === 'scheme') {
            document.getElementById('scheme-view').classList.remove('hidden');
            this.currentView = 'scheme';
        }
    },
    
    // Переключение вкладок редактора
    switchTab: function(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    },
    
    // Показать/скрыть панель поиска
    toggleSearch: function() {
        const panel = document.getElementById('search-panel');
        panel.classList.toggle('hidden');
    },
    
    // Рендер таблиц в редакторе
    renderEditorTables: function() {
        this.renderCrossesTable();
        this.renderConnectionsTable();
        this.renderSplicesTable();
    },
    
    // Рендер таблицы кроссов
    renderCrossesTable: function() {
        const tbody = document.querySelector('#crosses-table tbody');
        tbody.innerHTML = '';
        
        this.data.crosses.forEach(cross => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cross.id}</td>
                <td>${cross.name}</td>
                <td>${cross.type}</td>
                <td>${cross.location}</td>
                <td>${cross.rack_position}</td>
                <td>${cross.total_ports}</td>
                <td>${cross.used_ports}</td>
                <td>${cross.vendor}</td>
                <td>${cross.model}</td>
                <td>${cross.install_date}</td>
                <td>${cross.status}</td>
                <td>${cross.comments}</td>
                <td>
                    <button class="edit-btn" data-id="${cross.id}">✏️</button>
                    <button class="delete-btn" data-id="${cross.id}">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },
    
    // Рендер таблицы соединений
    renderConnectionsTable: function() {
        const tbody = document.querySelector('#connections-table tbody');
        tbody.innerHTML = '';
        
        this.data.connections.forEach(conn => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${conn.id}</td>
                <td>${conn.from_cross_id}</td>
                <td>${conn.from_port}</td>
                <td>${conn.to_cross_id}</td>
                <td>${conn.to_port}</td>
                <td>${conn.fiber_color_start}</td>
                <td>${conn.fiber_color_end}</td>
                <td>${conn.length}</td>
                <td>${conn.status}</td>
                <td>${conn.cable_type}</td>
                <td>${conn.loss_db}</td>
                <td>${conn.wavelength}</td>
                <td>${conn.test_date}</td>
                <td>${conn.comments}</td>
                <td>
                    <button class="edit-btn" data-id="${conn.id}">✏️</button>
                    <button class="delete-btn" data-id="${conn.id}">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },
    
    // Рендер таблицы муфт
    renderSplicesTable: function() {
        const tbody = document.querySelector('#splices-table tbody');
        tbody.innerHTML = '';
        
        this.data.splices.forEach(splice => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${splice.id}</td>
                <td>${splice.name}</td>
                <td>${splice.location}</td>
                <td>${splice.connection_id}</td>
                <td>${splice.position}</td>
                <td>${splice.fiber_color_in}</td>
                <td>${splice.fiber_color_out}</td>
                <td>${splice.splice_type}</td>
                <td>${splice.loss_db}</td>
                <td>${splice.comments}</td>
                <td>
                    <button class="edit-btn" data-id="${splice.id}">✏️</button>
                    <button class="delete-btn" data-id="${splice.id}">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },
    
    // Добавление новой строки
    addNewRow: function(tableType) {
        let newId = 1;
        
        if (tableType === 'crosses' && this.data.crosses.length > 0) {
            newId = Math.max(...this.data.crosses.map(c => parseInt(c.id))) + 1;
        } else if (tableType === 'connections' && this.data.connections.length > 0) {
            newId = Math.max(...this.data.connections.map(c => parseInt(c.id))) + 1;
        } else if (tableType === 'splices' && this.data.splices.length > 0) {
            newId = Math.max(...this.data.splices.map(s => parseInt(s.id))) + 1;
        }
        
        const newItem = {
            id: newId.toString(),
            name: 'Новый элемент',
            type: '',
            location: '',
            rack_position: '',
            total_ports: '24',
            used_ports: '0',
            vendor: '',
            model: '',
            install_date: new Date().toISOString().split('T')[0],
            status: 'active',
            comments: ''
        };
        
        if (tableType === 'crosses') {
            this.data.crosses.push(newItem);
            this.renderCrossesTable();
        } else if (tableType === 'connections') {
            this.data.connections.push({
                ...newItem,
                from_cross_id: '',
                from_port: '',
                to_cross_id: '',
                to_port: '',
                fiber_color_start: 'синий',
                fiber_color_end: 'синий',
                length: '0',
                cable_type: 'SMF',
                loss_db: '0',
                wavelength: '1310',
                test_date: new Date().toISOString().split('T')[0]
            });
            this.renderConnectionsTable();
        } else if (tableType === 'splices') {
            this.data.splices.push({
                ...newItem,
                connection_id: '',
                position: '0.5',
                fiber_color_in: 'синий',
                fiber_color_out: 'синий',
                splice_type: 'fusion',
                loss_db: '0'
            });
            this.renderSplicesTable();
        }
        
        this.showStatus('Добавлена новая строка', 'success');
    },
    
    // Открытие модального окна редактирования
    openModal: function(title, formHtml) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('edit-form').innerHTML = formHtml;
        document.getElementById('edit-modal').classList.remove('hidden');
    },
    
    // Закрытие модального окна
    closeModal: function() {
        document.getElementById('edit-modal').classList.add('hidden');
    },
    
    // Сохранение данных из модального окна
    saveModalData: function() {
        // Логика сохранения данных из формы
        this.closeModal();
    },
    
    // Экспорт SVG
    exportSVG: function() {
        this.showStatus('Экспорт SVG...', 'loading');
        
        // Отправляем запрос на экспорт
        $.ajax({
            url: 'php/export_svg.php',
            type: 'GET',
            success: function(data) {
                const blob = new Blob([data], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = 'optical-scheme.svg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                OpticsSchemeApp.showStatus('SVG экспортирован', 'success');
            },
            error: function(xhr, status, error) {
                OpticsSchemeApp.showStatus('Ошибка экспорта: ' + error, 'error');
            }
        });
    }
};

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    OpticsSchemeApp.init();
});
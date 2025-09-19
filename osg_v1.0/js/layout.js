// js/layout.js
const LayoutEngine = {
    // Конфигурация layout
    config: {
        crossWidth: 80, // Уменьшили ширину кросса
        crossHeight: 120, // Уменьшили высоту кросса
        portSpacing: 8, // Уменьшили расстояние между портами
        margin: 30,
        spliceRadius: 10,
        minDistance: 80,
        groupSpacing: 150,
        groupPadding: 50,
        portRadius: 3,
        leftPortOffset: 5,
        rightPortOffset: 75 // crossWidth - 5
    },
    
    // Размещение кроссов с группировкой по локациям
    layoutCrosses: function(crosses, connections) {
        // Группируем кроссы по локациям
        const groups = this.groupCrossesByLocation(crosses);
        
        // Вычисляем позиции для каждой группы
        const groupPositions = this.calculateGroupPositions(groups);
        
        // Размещаем кроссы внутри групп с избеганием наложений
        const nodes = [];
        const groupMap = {};
        
        Object.keys(groups).forEach((location, groupIndex) => {
            const groupCrosses = groups[location];
            const groupPos = groupPositions[groupIndex];
            
            // Размещаем кроссы внутри группы с учетом избегания наложений
            const groupLayout = this.layoutCrossesInGroup(groupCrosses, groupPos);
            
            groupCrosses.forEach((cross, index) => {
                const nodePos = groupLayout[index];
                nodes.push({
                    id: cross.id,
                    x: nodePos.x,
                    y: nodePos.y,
                    width: this.config.crossWidth,
                    height: this.config.crossHeight + (cross.total_ports * this.config.portSpacing),
                    fixed: false,
                    group: location
                });
                
                groupMap[cross.id] = location;
            });
        });
        
        const edges = connections.map(conn => ({
            source: conn.from_cross_id,
            target: conn.to_cross_id,
            groupFrom: groupMap[conn.from_cross_id],
            groupTo: groupMap[conn.to_cross_id]
        }));
        
        // Оптимизируем размещение между группами
        this.optimizeGroupLayout(nodes, edges, groups);
        
        // Применяем вычисленные позиции
        const positionedCrosses = {};
        nodes.forEach(node => {
            positionedCrosses[node.id] = {
                x: node.x,
                y: node.y,
                group: node.group
            };
        });
        
        return positionedCrosses;
    },
    
    // Группировка кроссов по локациям
    groupCrossesByLocation: function(crosses) {
        const groups = {};
        
        crosses.forEach(cross => {
            const location = cross.location || 'Не указана';
            if (!groups[location]) {
                groups[location] = [];
            }
            groups[location].push(cross);
        });
        
        return groups;
    },
    
    // Вычисление позиций для групп
    calculateGroupPositions: function(groups) {
        const groupNames = Object.keys(groups);
        const positions = [];
        const cols = Math.ceil(Math.sqrt(groupNames.length));
        const rows = Math.ceil(groupNames.length / cols);
        
        const groupWidth = 400; // Ширина группы
        const groupHeight = 300; // Высота группы
        
        for (let i = 0; i < groupNames.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            positions.push({
                x: this.config.margin + col * (groupWidth + this.config.groupSpacing),
                y: this.config.margin + row * (groupHeight + this.config.groupSpacing)
            });
        }
        
        return positions;
    },
    
    // Размещение кроссов внутри группы с избеганием наложений
    layoutCrossesInGroup: function(crosses, groupPosition) {
        const positions = [];
        const maxInRow = 3; // Максимальное количество кроссов в ряду
        
        // Сортируем кроссы по количеству портов (большие сначала)
        const sortedCrosses = [...crosses].sort((a, b) => b.total_ports - a.total_ports);
        
        let currentX = groupPosition.x + this.config.groupPadding;
        let currentY = groupPosition.y + this.config.groupPadding;
        let maxHeightInRow = 0;
        let rowItems = 0;
        
        sortedCrosses.forEach((cross, index) => {
            const crossHeight = this.config.crossHeight + (cross.total_ports * this.config.portSpacing);
            
            if (rowItems >= maxInRow) {
                // Переход на новую строку
                currentX = groupPosition.x + this.config.groupPadding;
                currentY += maxHeightInRow + 20;
                maxHeightInRow = 0;
                rowItems = 0;
            }
            
            // Проверяем наложения и корректируем позицию
            let adjustedX = currentX;
            let adjustedY = currentY;
            
            // Простая проверка наложения (можно улучшить)
            const overlapping = positions.some(pos => {
                return Math.abs(pos.x - currentX) < this.config.crossWidth + 20 &&
                       Math.abs(pos.y - currentY) < crossHeight + 20;
            });
            
            if (overlapping) {
                // Сдвигаем позицию если есть наложение
                adjustedX += 40;
                adjustedY += 20;
            }
            
            positions.push({
                x: adjustedX,
                y: adjustedY,
                width: this.config.crossWidth,
                height: crossHeight
            });
            
            currentX += this.config.crossWidth + 40;
            maxHeightInRow = Math.max(maxHeightInRow, crossHeight);
            rowItems++;
        });
        
        return positions;
    },
    
    // Вычисление позиций портов на кроссе (с двух сторон)
    calculatePortPositions: function(cross, crossPosition) {
        const portPositions = {};
        const portCount = cross.total_ports;
        
        // Распределяем порты на две стороны
        const portsPerSide = Math.ceil(portCount / 2);
        
        for (let i = 1; i <= portCount; i++) {
            const side = i <= portsPerSide ? 'left' : 'right';
            const indexInSide = i <= portsPerSide ? i : i - portsPerSide;
            
            const portY = crossPosition.y + 25 + (indexInSide * this.config.portSpacing);
            
            if (side === 'left') {
                portPositions[i] = {
                    x: crossPosition.x + this.config.leftPortOffset,
                    y: portY,
                    side: 'left'
                };
            } else {
                portPositions[i] = {
                    x: crossPosition.x + this.config.rightPortOffset,
                    y: portY,
                    side: 'right'
                };
            }
        }
        
        return portPositions;
    },
    
    // Вычисление позиций муфт на соединении с изогнутыми линиями
    calculateSplicePositions: function(connection, fromPosition, toPosition, splices) {
        const splicePositions = {};
        
        // Вычисляем контрольные точки для изогнутой линии
        const dx = toPosition.x - fromPosition.x;
        const dy = toPosition.y - fromPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Угол линии
        const angle = Math.atan2(dy, dx);
        
        // Смещение для изгиба (перпендикулярно основной линии)
        const curveOffset = Math.min(50, distance / 3);
        
        splices.forEach(splice => {
            const t = splice.position; // позиция от 0 до 1
            
            // Базовые координаты
            let x = fromPosition.x + dx * t;
            let y = fromPosition.y + dy * t;
            
            // Добавляем изгиб (синусоидальное смещение)
            const curve = Math.sin(t * Math.PI) * curveOffset;
            x += curve * Math.sin(angle + Math.PI/2);
            y -= curve * Math.cos(angle + Math.PI/2);
            
            splicePositions[splice.id] = { x, y };
        });
        
        return splicePositions;
    },
    
    // Создание изогнутого пути для соединения
    createCurvedPath: function(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Контрольные точки для изгиба
        const controlOffset = Math.min(40, distance / 4);
        
        // Средняя точка с небольшим смещением
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        
        // Перпендикулярное смещение
        const angle = Math.atan2(dy, dx);
        const offsetX = controlOffset * Math.sin(angle + Math.PI/2);
        const offsetY = -controlOffset * Math.cos(angle + Math.PI/2);
        
        // Кривая Безье с контрольными точками
        return `M ${fromX} ${fromY} 
                Q ${midX + offsetX} ${midY + offsetY}, 
                ${toX} ${toY}`;
    },
    
    // Оптимизация размещения между группами
    optimizeGroupLayout: function(nodes, edges, groups) {
        const groupCenters = this.calculateGroupCenters(nodes, groups);
        const iterations = 100;
        
        for (let i = 0; i < iterations; i++) {
            this.applyInterGroupForces(nodes, edges, groupCenters);
            this.applyIntraGroupForces(nodes, groups);
            this.applyBoundaryConstraints(nodes);
            
            // Дополнительная оптимизация для избегания пересечений
            this.avoidOverlaps(nodes);
        }
    },
    
    // Избегание наложений
    avoidOverlaps: function(nodes) {
        const padding = 20;
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const node1 = nodes[i];
                const node2 = nodes[j];
                
                if (node1.fixed || node2.fixed) continue;
                
                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const minDistance = (node1.width + node2.width) / 2 + padding;
                
                if (distance < minDistance) {
                    // Отталкиваем узлы
                    const force = (minDistance - distance) / distance;
                    const fx = force * dx * 0.1;
                    const fy = force * dy * 0.1;
                    
                    node1.x -= fx;
                    node1.y -= fy;
                    node2.x += fx;
                    node2.y += fy;
                }
            }
        }
    },
    
    // Вычисление центров групп
    calculateGroupCenters: function(nodes, groups) {
        const centers = {};
        
        Object.keys(groups).forEach(location => {
            const groupNodes = nodes.filter(n => n.group === location);
            if (groupNodes.length === 0) return;
            
            const centerX = groupNodes.reduce((sum, n) => sum + n.x, 0) / groupNodes.length;
            const centerY = groupNodes.reduce((sum, n) => sum + n.y, 0) / groupNodes.length;
            
            centers[location] = { x: centerX, y: centerY };
        });
        
        return centers;
    },
    
    // Применение сил между группами
    applyInterGroupForces: function(nodes, edges, groupCenters) {
        const forceConstant = 0.1;
        
        // Силы между группами на основе связей
        edges.forEach(edge => {
            const fromGroup = edge.groupFrom;
            const toGroup = edge.groupTo;
            
            if (fromGroup && toGroup && fromGroup !== toGroup && groupCenters[fromGroup] && groupCenters[toGroup]) {
                const fromCenter = groupCenters[fromGroup];
                const toCenter = groupCenters[toGroup];
                
                const dx = toCenter.x - fromCenter.x;
                const dy = toCenter.y - fromCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                // Сила притяжения между связанными группами
                const force = distance * 0.01;
                const fx = force * dx / distance;
                const fy = force * dy / distance;
                
                // Применяем силу ко всем узлам в группах
                nodes.filter(n => n.group === fromGroup && !n.fixed).forEach(node => {
                    node.x += fx * forceConstant;
                    node.y += fy * forceConstant;
                });
            }
        });
    },
    
    // Применение сил внутри групп
    applyIntraGroupForces: function(nodes, groups) {
        const repulsionConstant = 2000;
        const forceConstant = 0.05;
        
        Object.keys(groups).forEach(location => {
            const groupNodes = nodes.filter(n => n.group === location && !n.fixed);
            
            // Отталкивание внутри группы
            for (let i = 0; i < groupNodes.length; i++) {
                for (let j = i + 1; j < groupNodes.length; j++) {
                    const node1 = groupNodes[i];
                    const node2 = groupNodes[j];
                    
                    const dx = node2.x - node1.x;
                    const dy = node2.y - node1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    const minDistance = (node1.width + node2.width) / 2 + 20;
                    
                    if (distance < minDistance) {
                        const force = repulsionConstant / (distance * distance);
                        const fx = force * dx / distance;
                        const fy = force * dy / distance;
                        
                        node1.x -= fx * forceConstant;
                        node1.y -= fy * forceConstant;
                        node2.x += fx * forceConstant;
                        node2.y += fy * forceConstant;
                    }
                }
            }
        });
    },
    
    // Ограничение границ
    applyBoundaryConstraints: function(nodes) {
        const padding = this.config.margin;
        const maxX = 2500;
        const maxY = 2000;
        
        nodes.forEach(node => {
            if (!node.fixed) {
                node.x = Math.max(padding, Math.min(maxX - node.width - padding, node.x));
                node.y = Math.max(padding, Math.min(maxY - node.height - padding, node.y));
            }
        });
    },
    
    // Автоматическое размещение всех элементов
    autoLayout: function(crosses, connections, splices) {
        const crossPositions = this.layoutCrosses(crosses, connections);
        const portPositions = {};
        const splicePositions = {};
        
        // Вычисляем позиции портов
        crosses.forEach(cross => {
            if (crossPositions[cross.id]) {
                portPositions[cross.id] = this.calculatePortPositions(cross, crossPositions[cross.id]);
            }
        });
        
        // Вычисляем позиции муфт
        connections.forEach(connection => {
            const fromCross = crosses.find(c => c.id == connection.from_cross_id);
            const toCross = crosses.find(c => c.id == connection.to_cross_id);
            
            if (fromCross && toCross && portPositions[fromCross.id] && portPositions[toCross.id]) {
                const fromPortPos = portPositions[fromCross.id][connection.from_port];
                const toPortPos = portPositions[toCross.id][connection.to_port];
                
                const connectionSplices = splices.filter(s => s.connection_id == connection.id);
                if (connectionSplices.length > 0) {
                    const positions = this.calculateSplicePositions(
                        connection, 
                        fromPortPos, 
                        toPortPos, 
                        connectionSplices
                    );
                    
                    Object.assign(splicePositions, positions);
                }
            }
        });
        
        return {
            crosses: crossPositions,
            ports: portPositions,
            splices: splicePositions
        };
    },
    
    // Ручное перемещение элементов
    enableDragging: function(svgElement) {
        let selectedElement = null;
        let offset = { x: 0, y: 0 };
        
        svgElement.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('cross-rect') || 
                e.target.classList.contains('splice-circle')) {
                selectedElement = e.target;
                const rect = selectedElement.getBoundingClientRect();
                offset.x = e.clientX - rect.left;
                offset.y = e.clientY - rect.top;
                
                selectedElement.classList.add('selected');
            }
        });
        
        svgElement.addEventListener('mousemove', (e) => {
            if (selectedElement) {
                const svgPoint = svgElement.createSVGPoint();
                svgPoint.x = e.clientX;
                svgPoint.y = e.clientY;
                const cursorPoint = svgPoint.matrixTransform(svgElement.getScreenCTM().inverse());
                
                const newX = cursorPoint.x - offset.x;
                const newY = cursorPoint.y - offset.y;
                
                if (selectedElement.classList.contains('cross-rect')) {
                    const crossId = selectedElement.getAttribute('data-cross-id');
                    this.moveCross(crossId, newX, newY);
                } else if (selectedElement.classList.contains('splice-circle')) {
                    const spliceId = selectedElement.getAttribute('data-splice-id');
                    this.moveSplice(spliceId, newX, newY);
                }
            }
        });
        
        svgElement.addEventListener('mouseup', () => {
            if (selectedElement) {
                selectedElement.classList.remove('selected');
                selectedElement = null;
            }
        });
        
        svgElement.addEventListener('mouseleave', () => {
            if (selectedElement) {
                selectedElement.classList.remove('selected');
                selectedElement = null;
            }
        });
    },
    
    // Перемещение кросса
    moveCross: function(crossId, x, y) {
        // Обновляем позицию в данных и перерисовываем схему
        OpticsSchemeApp.data.crossPositions[crossId] = { x, y };
        OpticsSchemeApp.renderScheme();
    },
    
    // Перемещение муфты
    moveSplice: function(spliceId, x, y) {
        // Для муфт нужно пересчитать позицию на соединении
        if (!OpticsSchemeApp.data.splicePositions) {
            OpticsSchemeApp.data.splicePositions = {};
        }
        OpticsSchemeApp.data.splicePositions[spliceId] = { x, y };
        OpticsSchemeApp.renderScheme();
    }
};
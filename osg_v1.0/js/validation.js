// js/validation.js
const DataValidator = {
    // Цвета волокон
    fiberColors: ['синий', 'оранжевый', 'зеленый', 'коричневый', 'серый', 
                 'белый', 'красный', 'черный', 'желтый', 'фиолетовый', 
                 'розовый', 'аква'],
    
    // Статусы
    statuses: ['active', 'inactive', 'planned', 'broken', 'maintenance'],
    
    // Типы кроссов
    crossTypes: ['ODF', 'Wall-mounted', 'Rack-mounted', 'Outdoor', 'Indoor'],
    
    // Типы кабелей
    cableTypes: ['SMF', 'MMF', 'DSF', 'NZDSF'],
    
    // Типы спайков
    spliceTypes: ['fusion', 'mechanical', 'connector'],
    
    // Валидация кросса
    validateCross: function(cross) {
        const errors = [];
        
        if (!cross.name || cross.name.trim().length < 2) {
            errors.push('Название кросса должно содержать минимум 2 символа');
        }
        
        if (!this.crossTypes.includes(cross.type)) {
            errors.push(`Тип кросса должен быть одним из: ${this.crossTypes.join(', ')}`);
        }
        
        if (!cross.total_ports || cross.total_ports < 1) {
            errors.push('Количество портов должно быть положительным числом');
        }
        
        if (cross.used_ports < 0 || cross.used_ports > cross.total_ports) {
            errors.push('Количество использованных портов не может превышать общее количество портов');
        }
        
        if (cross.install_date && !this.isValidDate(cross.install_date)) {
            errors.push('Неверный формат даты установки (ожидается YYYY-MM-DD)');
        }
        
        if (!this.statuses.includes(cross.status)) {
            errors.push(`Статус должен быть одним из: ${this.statuses.join(', ')}`);
        }
        
        return errors;
    },
    
    // Валидация связи
    validateConnection: function(connection, crosses) {
        const errors = [];
        
        const fromCross = crosses.find(c => c.id == connection.from_cross_id);
        const toCross = crosses.find(c => c.id == connection.to_cross_id);
        
        if (!fromCross) {
            errors.push('Начальный кросс не найден');
        }
        
        if (!toCross) {
            errors.push('Конечный кросс не найден');
        }
        
        if (fromCross && connection.from_port) {
            const portNum = parseInt(connection.from_port);
            if (portNum < 1 || portNum > fromCross.total_ports) {
                errors.push(`Номер порта начального кросса должен быть в диапазоне 1-${fromCross.total_ports}`);
            }
        }
        
        if (toCross && connection.to_port) {
            const portNum = parseInt(connection.to_port);
            if (portNum < 1 || portNum > toCross.total_ports) {
                errors.push(`Номер порта конечного кросса должен быть в диапазоне 1-${toCross.total_ports}`);
            }
        }
        
        if (!this.fiberColors.includes(connection.fiber_color_start)) {
            errors.push(`Цвет начального волокна должен быть одним из: ${this.fiberColors.join(', ')}`);
        }
        
        if (!this.fiberColors.includes(connection.fiber_color_end)) {
            errors.push(`Цвет конечного волокна должен быть одним из: ${this.fiberColors.join(', ')}`);
        }
        
        if (connection.length && (connection.length < 0 || connection.length > 10000)) {
            errors.push('Длина соединения должна быть в диапазоне 0-10000 метров');
        }
        
        if (connection.loss_db && (connection.loss_db < 0 || connection.loss_db > 10)) {
            errors.push('Потери должны быть в диапазоне 0-10 дБ');
        }
        
        if (!this.statuses.includes(connection.status)) {
            errors.push(`Статус должен быть одним из: ${this.statuses.join(', ')}`);
        }
        
        if (!this.cableTypes.includes(connection.cable_type)) {
            errors.push(`Тип кабеля должен быть одним из: ${this.cableTypes.join(', ')}`);
        }
        
        if (connection.test_date && !this.isValidDate(connection.test_date)) {
            errors.push('Неверный формат даты теста (ожидается YYYY-MM-DD)');
        }
        
        return errors;
    },
    
    // Валидация муфты
    validateSplice: function(splice, connections) {
        const errors = [];
        
        const connection = connections.find(c => c.id == splice.connection_id);
        
        if (!connection) {
            errors.push('Связь не найдена');
        }
        
        if (!splice.name || splice.name.trim().length < 2) {
            errors.push('Название муфты должно содержать минимум 2 символа');
        }
        
        if (splice.position && (splice.position < 0 || splice.position > 1)) {
            errors.push('Позиция муфты должна быть в диапазоне 0-1 (0-100%)');
        }
        
        if (!this.fiberColors.includes(splice.fiber_color_in)) {
            errors.push(`Цвет входного волокна должен быть одним из: ${this.fiberColors.join(', ')}`);
        }
        
        if (!this.fiberColors.includes(splice.fiber_color_out)) {
            errors.push(`Цвет выходного волокна должен быть одним из: ${this.fiberColors.join(', ')}`);
        }
        
        if (!this.spliceTypes.includes(splice.splice_type)) {
            errors.push(`Тип спайки должен быть одним из: ${this.spliceTypes.join(', ')}`);
        }
        
        if (splice.loss_db && (splice.loss_db < 0 || splice.loss_db > 5)) {
            errors.push('Потери спайки должны быть в диапазоне 0-5 дБ');
        }
        
        return errors;
    },
    
    // Проверка даты
    isValidDate: function(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    },
    
    // Проверка числа
    isNumber: function(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },
    
    // Проверка целого числа
    isInteger: function(value) {
        return this.isNumber(value) && Number.isInteger(parseFloat(value));
    },
    
    // Санитизация данных
    sanitize: function(data) {
        if (typeof data === 'string') {
            return data.trim().replace(/\|/g, '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        return data;
    }
};
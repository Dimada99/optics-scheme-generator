<!-- php/validate.php -->

<?php
header('Content-Type: application/json');

// Функция валидации данных
function validateData($data) {
    $errors = [];
    
    // Валидация кроссов
    if (isset($data['crosses'])) {
        foreach ($data['crosses'] as $index => $cross) {
            if (empty($cross['name'])) {
                $errors[] = "Кросс {$index}: отсутствует название";
            }
            
            if (empty($cross['type']) || !in_array($cross['type'], ['ODF', 'Wall-mounted', 'Rack-mounted', 'Outdoor', 'Indoor'])) {
                $errors[] = "Кросс {$index}: неверный тип";
            }
            
            if (!is_numeric($cross['total_ports']) || $cross['total_ports'] < 1) {
                $errors[] = "Кросс {$index}: неверное количество портов";
            }
            
            if (!is_numeric($cross['used_ports']) || $cross['used_ports'] < 0 || $cross['used_ports'] > $cross['total_ports']) {
                $errors[] = "Кросс {$index}: неверное количество использованных портов";
            }
        }
    }
    
    // Валидация соединений
    if (isset($data['connections'])) {
        $crossIds = array_column($data['crosses'] ?? [], 'id');
        
        foreach ($data['connections'] as $index => $connection) {
            if (!in_array($connection['from_cross_id'], $crossIds)) {
                $errors[] = "Соединение {$index}: начальный кросс не существует";
            }
            
            if (!in_array($connection['to_cross_id'], $crossIds)) {
                $errors[] = "Соединение {$index}: конечный кросс не существует";
            }
            
            $validColors = ['синий', 'оранжевый', 'зеленый', 'коричневый', 'серый', 
                           'белый', 'красный', 'черный', 'желтый', 'фиолетовый', 
                           'розовый', 'аква'];
            
            if (!in_array($connection['fiber_color_start'], $validColors)) {
                $errors[] = "Соединение {$index}: неверный цвет начального волокна";
            }
            
            if (!in_array($connection['fiber_color_end'], $validColors)) {
                $errors[] = "Соединение {$index}: неверный цвет конечного волокна";
            }
            
            if (!is_numeric($connection['length']) || $connection['length'] < 0) {
                $errors[] = "Соединение {$index}: неверная длина";
            }
        }
    }
    
    // Валидация муфт
    if (isset($data['splices'])) {
        $connectionIds = array_column($data['connections'] ?? [], 'id');
        
        foreach ($data['splices'] as $index => $splice) {
            if (!in_array($splice['connection_id'], $connectionIds)) {
                $errors[] = "Муфта {$index}: соединение не существует";
            }
            
            if (empty($splice['name'])) {
                $errors[] = "Муфта {$index}: отсутствует название";
            }
            
            if (!is_numeric($splice['position']) || $splice['position'] < 0 || $splice['position'] > 1) {
                $errors[] = "Муфта {$index}: неверная позиция (должна быть от 0 до 1)";
            }
        }
    }
    
    return $errors;
}

// Основная логика
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input']);
        exit;
    }
    
    $errors = validateData($input);
    
    if (count($errors) > 0) {
        http_response_code(422);
        echo json_encode(['errors' => $errors]);
    } else {
        echo json_encode(['success' => true]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
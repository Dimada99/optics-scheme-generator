<!-- php/save_data.php -->

<?php
header('Content-Type: application/json');

// Проверяем, что запрос POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Получаем данные из тела запроса
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

// Сохраняем данные в файлы
$dataDir = __DIR__ . '/../data/';

try {
    // Сохраняем данные о кроссах
    if (isset($input['crosses'])) {
        $crossesContent = "id|name|type|location|rack_position|total_ports|used_ports|vendor|model|install_date|status|comments\n";
        foreach ($input['crosses'] as $cross) {
            $crossesContent .= implode('|', array_map(function($value) {
                return str_replace('|', '', $value); // Убираем разделители из данных
            }, $cross)) . "\n";
        }
        file_put_contents($dataDir . 'crosses.txt', $crossesContent);
    }
    
    // Сохраняем данные о связях
    if (isset($input['connections'])) {
        $connectionsContent = "id|from_cross_id|from_port|to_cross_id|to_port|fiber_color_start|fiber_color_end|length|status|comments|cable_type|loss_db|wavelength|test_date\n";
        foreach ($input['connections'] as $connection) {
            $connectionsContent .= implode('|', array_map(function($value) {
                return str_replace('|', '', $value);
            }, $connection)) . "\n";
        }
        file_put_contents($dataDir . 'connections.txt', $connectionsContent);
    }
    
    // Сохраняем данные о муфтах
    if (isset($input['splices'])) {
        $splicesContent = "id|name|location|connection_id|position|fiber_color_in|fiber_color_out|splice_type|loss_db|comments\n";
        foreach ($input['splices'] as $splice) {
            $splicesContent .= implode('|', array_map(function($value) {
                return str_replace('|', '', $value);
            }, $splice)) . "\n";
        }
        file_put_contents($dataDir . 'splices.txt', $splicesContent);
    }
    
    echo json_encode(['success' => true]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Save failed: ' . $e->getMessage()]);
}
?>
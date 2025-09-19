<!-- php/load_data.php -->

<?php
header('Content-Type: application/json');

$dataDir = __DIR__ . '/../data/';
$result = [];

// Функция для чтения TSV-like файлов
function readDataFile($filename) {
    $data = [];
    if (!file_exists($filename)) {
        return $data;
    }
    
    $lines = file($filename, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (count($lines) < 2) {
        return $data;
    }
    
    $headers = explode('|', $lines[0]);
    
    for ($i = 1; $i < count($lines); $i++) {
        $values = explode('|', $lines[$i]);
        $row = [];
        foreach ($headers as $index => $header) {
            $row[$header] = $values[$index] ?? '';
        }
        $data[] = $row;
    }
    
    return $data;
}

try {
    $result['crosses'] = readDataFile($dataDir . 'crosses.txt');
    $result['connections'] = readDataFile($dataDir . 'connections.txt');
    $result['splices'] = readDataFile($dataDir . 'splices.txt');
    
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Load failed: ' . $e->getMessage()]);
}
?>
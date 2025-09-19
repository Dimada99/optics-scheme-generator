<!-- php/export_svg.php -->

<?php
header('Content-Type: image/svg+xml');
header('Content-Disposition: attachment; filename="optical-scheme.svg"');

// Загрузка данных
$dataDir = __DIR__ . '/../data/';

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

$crosses = readDataFile($dataDir . 'crosses.txt');
$connections = readDataFile($dataDir . 'connections.txt');
$splices = readDataFile($dataDir . 'splices.txt');

// В функции создания соединений добавляем изогнутые линии
function createCurvedPath($fromX, $fromY, $toX, $toY) {
    $dx = $toX - $fromX;
    $dy = $toY - $fromY;
    $distance = sqrt($dx * $dx + $dy * $dy);
    
    $controlOffset = min(40, $distance / 4);
    $midX = ($fromX + $toX) / 2;
    $midY = ($fromY + $toY) / 2;
    
    $angle = atan2($dy, $dx);
    $offsetX = $controlOffset * sin($angle + M_PI/2);
    $offsetY = -$controlOffset * cos($angle + M_PI/2);
    
    return sprintf('M %.1f %.1f Q %.1f %.1f, %.1f %.1f', 
        $fromX, $fromY,
        $midX + $offsetX, $midY + $offsetY,
        $toX, $toY
    );
}

// Функция для получения класса цвета волокна
function getFiberColorClass($color) {
    $colorMap = [
        'синий' => 'blue',
        'оранжевый' => 'orange',
        'зеленый' => 'green',
        'коричневый' => 'brown',
        'серый' => 'slate',
        'белый' => 'white',
        'красный' => 'red',
        'черный' => 'black',
        'желтый' => 'yellow',
        'фиолетовый' => 'violet',
        'розовый' => 'rose',
        'аква' => 'aqua'
    ];
    
    return $colorMap[$color] ?? 'blue';
}

// Функция для получения класса цвета группы
function getGroupColorClass($location) {
    if (strpos($location, 'ЦОД') !== false) return 'group-ЦОД';
    if (strpos($location, 'Уличный') !== false) return 'group-Уличный';
    if (strpos($location, 'Здание') !== false) return 'group-Здание';
    if (strpos($location, 'Этаж') !== false) return 'group-Этаж';
    if (strpos($location, 'Колодец') !== false) return 'group-Колодец';
    if (strpos($location, 'Промзона') !== false) return 'group-Промзона';
    if (strpos($location, 'Жилой') !== false) return 'group-Жилой';
    if (strpos($location, 'Бизнес') !== false) return 'group-Бизнес';
    if (strpos($location, 'Торговый') !== false) return 'group-Торговый';
    if (strpos($location, 'Медицин') !== false) return 'group-Медицин';
    return 'group-Не указана';
}

// Генерация SVG
echo '<?xml version="1.0" encoding="UTF-8"?>';
?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3000 2000" width="3000" height="2000">
    <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#333"/>
        </marker>
        <style>
            .cross-rect { stroke: #333; stroke-width: 2; fill: #fff; }
            .port-circle { stroke: #666; stroke-width: 1; fill: #fff; }
            .port-circle.used { fill: #4CAF50; }
            .port-circle.free { fill: #f8f8f8; }
            .connection-path { stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
            .splice-circle { stroke: #333; stroke-width: 2; fill: #ffeb3b; }
            .cross-label { font-size: 12px; text-anchor: middle; font-weight: bold; font-family: Arial, sans-serif; }
            .cross-location { font-size: 10px; text-anchor: middle; fill: #666; font-family: Arial, sans-serif; }
            .port-label { font-size: 10px; text-anchor: middle; font-family: Arial, sans-serif; }
            .splice-label { font-size: 10px; text-anchor: middle; font-family: Arial, sans-serif; }
            .group-rect { stroke: #666; stroke-width: 2; stroke-dasharray: 5,5; fill: none; }
            .group-label { font-size: 16px; font-weight: bold; text-anchor: middle; fill: #333; font-family: Arial, sans-serif; }
            .group-count { font-size: 12px; text-anchor: middle; fill: #666; font-family: Arial, sans-serif; }
            
            /* Цвета волокон */
            .fiber-blue { stroke: #2196F3; }
            .fiber-orange { stroke: #FF9800; }
            .fiber-green { stroke: #4CAF50; }
            .fiber-brown { stroke: #795548; }
            .fiber-slate { stroke: #607D8B; }
            .fiber-white { stroke: #FFFFFF; stroke-dasharray: 5,5; }
            .fiber-red { stroke: #F44336; }
            .fiber-black { stroke: #000000; }
            .fiber-yellow { stroke: #FFEB3B; }
            .fiber-violet { stroke: #9C27B0; }
            .fiber-rose { stroke: #E91E63; }
            .fiber-aqua { stroke: #00BCD4; }
            
            /* Цвета групп */
            .group-ЦОД { stroke: #2196F3; }
            .group-Уличный { stroke: #4CAF50; }
            .group-Здание { stroke: #FF9800; }
            .group-Этаж { stroke: #9C27B0; }
            .group-Колодец { stroke: #795548; }
            .group-Промзона { stroke: #607D8B; }
            .group-Жилой { stroke: #E91E63; }
            .group-Бизнес { stroke: #3F51B5; }
            .group-Торговый { stroke: #FF5722; }
            .group-Медицин { stroke: #009688; }
            .group-Не указана { stroke: #9E9E9E; }
        </style>
    </defs>
    
    <?php
    // Группировка кроссов по локациям
    $groups = [];
    foreach ($crosses as $cross) {
        $location = $cross['location'] ?: 'Не указана';
        if (!isset($groups[$location])) {
            $groups[$location] = [];
        }
        $groups[$location][] = $cross;
    }
    
    $groupX = 100;
    $groupY = 100;
    $groupWidth = 500;
    $groupHeight = 400;
    
    $crossWidth = 120;
    $crossHeightBase = 200;
    $portSpacing = 15;
    
    // Рисуем группы
    foreach ($groups as $location => $groupCrosses) {
        $groupColorClass = getGroupColorClass($location);
        
        // Рисуем прямоугольник группы
        ?>
        <rect class="group-rect <?php echo $groupColorClass; ?>" 
              x="<?php echo $groupX; ?>" 
              y="<?php echo $groupY; ?>" 
              width="<?php echo $groupWidth; ?>" 
              height="<?php echo $groupHeight; ?>" 
              rx="10" ry="10"/>
        
        <text class="group-label" 
              x="<?php echo $groupX + $groupWidth / 2; ?>" 
              y="<?php echo $groupY + 25; ?>">
            <?php echo htmlspecialchars($location); ?>
        </text>
        
        <text class="group-count" 
              x="<?php echo $groupX + $groupWidth / 2; ?>" 
              y="<?php echo $groupY + 40; ?>">
            (<?php echo count($groupCrosses); ?> кроссов)
        </text>
        <?php
        
        // Распределяем кроссы внутри группы
        $crossesPerRow = 2;
        $crossX = $groupX + 50;
        $crossY = $groupY + 80;
        $maxCrossHeight = 0;
        
        foreach ($groupCrosses as $index => $cross) {
            if ($index > 0 && $index % $crossesPerRow === 0) {
                $crossX = $groupX + 50;
                $crossY += $maxCrossHeight + 40;
                $maxCrossHeight = 0;
            }
            
            $totalPorts = intval($cross['total_ports']);
            $crossHeight = $crossHeightBase + ($totalPorts * $portSpacing);
            $maxCrossHeight = max($maxCrossHeight, $crossHeight);
            
            // Рисуем кросс
            ?>
            <rect class="cross-rect" 
                  x="<?php echo $crossX; ?>" 
                  y="<?php echo $crossY; ?>" 
                  width="<?php echo $crossWidth; ?>" 
                  height="<?php echo $crossHeight; ?>"/>
            
            <text class="cross-label" 
                  x="<?php echo $crossX + $crossWidth / 2; ?>" 
                  y="<?php echo $crossY + 20; ?>">
                <?php echo htmlspecialchars($cross['name']); ?>
            </text>
            
            <text class="cross-location" 
                  x="<?php echo $crossX + $crossWidth / 2; ?>" 
                  y="<?php echo $crossY + 35; ?>">
                <?php echo htmlspecialchars($cross['location'] ?: 'Не указана'); ?>
            </text>
            <?php
            
            // Рисуем порты
            for ($i = 1; $i <= $totalPorts; $i++) {
                $portY = $crossY + 30 + ($i * $portSpacing);
                $isUsed = false;
                
                // Проверяем, используется ли порт
                foreach ($connections as $conn) {
                    if (($conn['from_cross_id'] == $cross['id'] && $conn['from_port'] == $i) ||
                        ($conn['to_cross_id'] == $cross['id'] && $conn['to_port'] == $i)) {
                        $isUsed = true;
                        break;
                    }
                }
                ?>
                <circle class="port-circle <?php echo $isUsed ? 'used' : 'free'; ?>" 
                        cx="<?php echo $crossX + $crossWidth; ?>" 
                        cy="<?php echo $portY; ?>" 
                        r="4"/>
                
                <text class="port-label" 
                      x="<?php echo $crossX + $crossWidth - 10; ?>" 
                      y="<?php echo $portY + 4; ?>">
                    <?php echo $i; ?>
                </text>
                <?php
            }
            
            $crossX += $crossWidth + 100;
        }
        
        // Переходим к следующей группе
        $groupX += $groupWidth + 100;
        if ($groupX > 2000) {
            $groupX = 100;
            $groupY += $groupHeight + 100;
        }
    }
    
    // Рисуем соединения между кроссами (упрощенно)
    foreach ($connections as $connection) {
        $fromCross = null;
        $toCross = null;
        
        // Находим кроссы
        foreach ($crosses as $cross) {
            if ($cross['id'] == $connection['from_cross_id']) {
                $fromCross = $cross;
            }
            if ($cross['id'] == $connection['to_cross_id']) {
                $toCross = $cross;
            }
        }
        
        if (!$fromCross || !$toCross) continue;
        
        // Находим позиции кроссов
        $fromGroup = $fromCross['location'] ?: 'Не указана';
        $toGroup = $toCross['location'] ?: 'Не указана';
        
        // Упрощенное определение позиций (в реальности нужно вычислять точные координаты)
        $fromX = 500 + (intval($fromCross['id']) * 20);
        $fromY = 300 + (intval($fromCross['id']) * 15);
        $toX = 500 + (intval($toCross['id']) * 20);
        $toY = 300 + (intval($toCross['id']) * 15);
        
        $fiberColorClass = getFiberColorClass($connection['fiber_color_end']);
        ?>
        <path class="connection-path fiber-<?php echo $fiberColorClass; ?>" 
              d="M <?php echo $fromX; ?> <?php echo $fromY; ?> L <?php echo $toX; ?> <?php echo $toY; ?>" 
              marker-end="url(#arrowhead)"/>
        <?php
    }
    
    // Рисуем муфты (упрощенно)
    foreach ($splices as $splice) {
        $connection = null;
        foreach ($connections as $conn) {
            if ($conn['id'] == $splice['connection_id']) {
                $connection = $conn;
                break;
            }
        }
        
        if (!$connection) continue;
        
        // Упрощенное позиционирование муфт
        $fromId = intval($connection['from_cross_id']);
        $toId = intval($connection['to_cross_id']);
        $position = floatval($splice['position']);
        
        $x = 500 + (($fromId + $toId) / 2 * 20) + (rand(-50, 50));
        $y = 300 + (($fromId + $toId) / 2 * 15) + (rand(-50, 50));
        ?>
        <circle class="splice-circle" 
                cx="<?php echo $x; ?>" 
                cy="<?php echo $y; ?>" 
                r="15"/>
        
        <text class="splice-label" 
              x="<?php echo $x; ?>" 
              y="<?php echo $y - 20; ?>">
            <?php echo htmlspecialchars($splice['name']); ?>
        </text>
        <?php
    }
    ?>
    
    <!-- Легенда -->
    <rect x="2400" y="50" width="500" height="400" fill="white" stroke="#ccc" stroke-width="1" rx="5" ry="5"/>
    <text x="2650" y="80" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle">Легенда</text>
    
    <?php
    $legendY = 120;
    $groupsCount = 0;
    
    foreach ($groups as $location => $groupCrosses) {
        if ($groupsCount >= 8) break;
        
        $groupColorClass = getGroupColorClass($location);
        ?>
        <rect x="2420" y="<?php echo $legendY; ?>" width="20" height="4" class="<?php echo $groupColorClass; ?>"/>
        <text x="2450" y="<?php echo $legendY + 4; ?>" font-family="Arial" font-size="12">
            <?php echo htmlspecialchars($location); ?> (<?php echo count($groupCrosses); ?>)
        </text>
        <?php
        $legendY += 25;
        $groupsCount++;
    }
    ?>
</svg>
<?php
exit;
?>
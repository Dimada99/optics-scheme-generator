// js/graph.js
const GraphProcessor = {
    graph: null,
    
    // Построение графа
    buildGraph: function(crosses, connections, splices) {
        this.graph = {
            nodes: {},
            edges: {}
        };
        
        // Добавляем кроссы как узлы
        crosses.forEach(cross => {
            this.graph.nodes[`cross_${cross.id}`] = {
                type: 'cross',
                id: cross.id,
                ports: {}
            };
            
            // Добавляем порты
            for (let i = 1; i <= cross.total_ports; i++) {
                this.graph.nodes[`cross_${cross.id}`].ports[i] = {
                    connected: false,
                    connection: null
                };
            }
        });
        
        // Добавляем муфты как узлы
        splices.forEach(splice => {
            this.graph.nodes[`splice_${splice.id}`] = {
                type: 'splice',
                id: splice.id,
                connection_id: splice.connection_id
            };
        });
        
        // Добавляем связи как ребра
        connections.forEach(connection => {
            const edgeId = `connection_${connection.id}`;
            
            this.graph.edges[edgeId] = {
                type: 'connection',
                id: connection.id,
                from: `cross_${connection.from_cross_id}_${connection.from_port}`,
                to: `cross_${connection.to_cross_id}_${connection.to_port}`,
                splices: [],
                data: connection
            };
            
            // Помечаем порты как занятые
            if (this.graph.nodes[`cross_${connection.from_cross_id}`]) {
                this.graph.nodes[`cross_${connection.from_cross_id}`].ports[connection.from_port] = {
                    connected: true,
                    connection: connection.id
                };
            }
            
            if (this.graph.nodes[`cross_${connection.to_cross_id}`]) {
                this.graph.nodes[`cross_${connection.to_cross_id}`].ports[connection.to_port] = {
                    connected: true,
                    connection: connection.id
                };
            }
            
            // Добавляем муфты на это соединение
            const connectionSplices = splices.filter(s => s.connection_id == connection.id);
            connectionSplices.forEach(splice => {
                this.graph.edges[edgeId].splices.push({
                    id: splice.id,
                    position: parseFloat(splice.position),
                    color_in: splice.fiber_color_in,
                    color_out: splice.fiber_color_out
                });
            });
            
            // Сортируем муфты по позиции
            this.graph.edges[edgeId].splices.sort((a, b) => a.position - b.position);
        });
        
        return this.graph;
    },
    
    // Поиск пути между портами
    findPath: function(fromCrossId, fromPort, toCrossId, toPort) {
        if (!this.graph) {
            console.error('Граф не построен');
            return null;
        }
        
        const startNode = `cross_${fromCrossId}_${fromPort}`;
        const endNode = `cross_${toCrossId}_${toPort}`;
        
        // BFS для поиска пути
        const queue = [{ node: startNode, path: [] }];
        const visited = new Set();
        
        while (queue.length > 0) {
            const { node, path } = queue.shift();
            
            if (visited.has(node)) continue;
            visited.add(node);
            
            if (node === endNode) {
                return path;
            }
            
            // Находим все ребра, связанные с этим узлом
            const edges = this.findEdgesForNode(node);
            
            for (const edge of edges) {
                const nextNode = this.getOtherNode(edge, node);
                if (nextNode && !visited.has(nextNode)) {
                    queue.push({
                        node: nextNode,
                        path: [...path, { type: 'edge', id: edge.id }, { type: 'node', id: nextNode }]
                    });
                }
            }
        }
        
        return null; // Путь не найден
    },
    
    // Поиск ребер для узла
    findEdgesForNode: function(nodeId) {
        const edges = [];
        
        for (const edgeId in this.graph.edges) {
            const edge = this.graph.edges[edgeId];
            if (edge.from === nodeId || edge.to === nodeId) {
                edges.push(edge);
            }
        }
        
        return edges;
    },
    
    // Получение противоположного узла в ребре
    getOtherNode: function(edge, currentNode) {
        if (edge.from === currentNode) {
            return edge.to;
        } else if (edge.to === currentNode) {
            return edge.from;
        }
        return null;
    },
    
    // Получение информации о соединении
    getConnectionInfo: function(connectionId) {
        if (!this.graph || !this.graph.edges[`connection_${connectionId}`]) {
            return null;
        }
        return this.graph.edges[`connection_${connectionId}`];
    },
    
    // Получение информации о кроссе
    getCrossInfo: function(crossId) {
        if (!this.graph || !this.graph.nodes[`cross_${crossId}`]) {
            return null;
        }
        return this.graph.nodes[`cross_${crossId}`];
    },
    
    // Получение информации о муфте
    getSpliceInfo: function(spliceId) {
        if (!this.graph || !this.graph.nodes[`splice_${spliceId}`]) {
            return null;
        }
        return this.graph.nodes[`splice_${spliceId}`];
    },
    
    // Проверка доступности порта
    isPortAvailable: function(crossId, portNumber) {
        const cross = this.getCrossInfo(crossId);
        if (!cross || !cross.ports[portNumber]) {
            return false;
        }
        return !cross.ports[portNumber].connected;
    },
    
    // Получение всех соединений для кросса
    getCrossConnections: function(crossId) {
        const connections = [];
        
        for (const edgeId in this.graph.edges) {
            const edge = this.graph.edges[edgeId];
            const fromParts = edge.from.split('_');
            const toParts = edge.to.split('_');
            
            if (fromParts[1] == crossId || toParts[1] == crossId) {
                connections.push(edge);
            }
        }
        
        return connections;
    }
};
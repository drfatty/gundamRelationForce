// 拖動事件處理函數
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// 其他常用函數也可以放到這裡，這樣可以在主文件中簡化代碼
// 比如 updateDisplayMode 或其他通用函數

function updateDisplayMode() {
    const showOpacity = d3.select("#toggle-opacity").property("checked");

    if (showOpacity) {
        d3.selectAll("text.node-text").text(d => {
            const layer = layers[d.id] || 0;
            const opacity = (1 - layer * 0.25).toFixed(2);
            const linkCount = linkCounts[d.id] || 0;
            return `${opacity}；層數: ${layer}；連線數: ${linkCount}`;
        });

        d3.selectAll("text.link-text").text(d => {
            const sourceLayer = layers[d.source.id] || 0;
            const targetLayer = layers[d.target.id] || 0;
            const avgLayer = ((sourceLayer + targetLayer) / 2).toFixed(0);
            const opacity = (1 - avgLayer * 0.25).toFixed(2);
            return `${opacity}；層數: ${avgLayer}`;
        });
    } else {
        d3.selectAll("text.node-text").text(d => d.id);
        d3.selectAll("text.link-text").text(d => d.relationComment);
    }
}

function calculateLayersAndSetOpacity(centralNode, nodesData, linksData) {
    layers = {}; 
    const visitedNodes = new Set();
    const queue = [[centralNode, 0]]; 

    linkCounts = {}; // 重置 linkCounts
    nodesData.forEach(node => {
        linkCounts[node.id] = 0;
    });
    linksData.forEach(link => {
        linkCounts[link.source.id]++;
        linkCounts[link.target.id]++;
    });

    while (queue.length > 0) {
        const [node, layer] = queue.shift();

        if (!visitedNodes.has(node.id)) {
            visitedNodes.add(node.id);
            layers[node.id] = layer;

            linksData.forEach(link => {
                if (link.source.id === node.id && !visitedNodes.has(link.target.id)) {
                    queue.push([link.target, layer + 1]);
                } else if (link.target.id === node.id && !visitedNodes.has(link.source.id)) {
                    queue.push([link.source, layer + 1]);
                }
            });
        }
    }

    d3.selectAll("circle.node").style("opacity", d => {
        const layer = layers[d.id] || 0;
        const linkCount = linkCounts[d.id] || 0;
        return linkCount === 0 ? 0.3 : 1 - layer * 0.25;
    });

    d3.selectAll("text.node-text").style("opacity", d => {
        const layer = layers[d.id] || 0;
        const linkCount = linkCounts[d.id] || 0;
        return linkCount === 0 ? 0.3 : 1 - layer * 0.25;
    });

    d3.selectAll("line.link-text").style("stroke-opacity", d => {
        const sourceLayer = layers[d.source.id] || 0;
        const targetLayer = layers[d.target.id] || 0;
        const avgLayer = (sourceLayer + targetLayer) / 2;
        return 0.8 - avgLayer * 0.25;
    });

    d3.selectAll("text.link-text").style("opacity", d => {
        const sourceLayer = layers[d.source.id] || 0;
        const targetLayer = layers[d.target.id] || 0;
        const avgLayer = (sourceLayer + targetLayer) / 2;
        return 1 - avgLayer * 0.1;
    });

    updateDisplayMode();
}

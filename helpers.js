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
    // 如果該節點的 checkbox 是選中的，保持固定
    if (!d3.select(`#checkbox-${d.id}`).property("checked")) {
        d.fx = null;
        d.fy = null;
    }
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

    // 初始化 linkCounts
    linkCounts = {}; 
    nodesData.forEach(node => {
        linkCounts[node.id] = 0;
    });

    // 计算连线计数
    linksData.forEach(link => {
        if (link.source && link.target) {
            linkCounts[link.source.id] = (linkCounts[link.source.id] || 0) + 1;
            linkCounts[link.target.id] = (linkCounts[link.target.id] || 0) + 1;
        }
    });

    // 将连线计数保存到节点对象
    nodesData.forEach(node => {
        node.linkCount = linkCounts[node.id] || 0;
    });


    // 使用 BFS 算法計算節點層數
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

    // 設置節點的透明度並將其存儲在節點對象上
    d3.selectAll("circle.node").style("opacity", d => {
        const layer = layers[d.id] || 0;
        const linkCount = linkCounts[d.id] || 0;
        const opacity = linkCount === 0 ? 0.3 : 1 - layer * 0.2;

        // 在節點數據對象上直接設置 opacity
        d.opacity = opacity;
        
        // 動態設置模糊濾鏡
        const blurValue = (1 - opacity) * 10;
        const filterId = `blur-${d.id}`;
        
        let filter = d3.select("defs").select(`#${CSS.escape(filterId)}`);
        if (filter.empty()) {
            filter = d3.select("defs")
                .append("filter")
                .attr("id", filterId)
                .attr("x", "-30%")
                .attr("y", "-30%")
                .attr("width", "160%")
                .attr("height", "160%");
                
            filter.append("feGaussianBlur").attr("stdDeviation", blurValue);
        } else {
            filter.select("feGaussianBlur").attr("stdDeviation", blurValue);
        }

        d3.select(`#${CSS.escape(d.id)}`).style("filter", `url(#${filterId})`);
        
        return opacity;
    });

    // 設置文本透明度和模糊濾鏡
    d3.selectAll("text.node-text").style("opacity", d => {
        const layer = layers[d.id] || 0;
        const linkCount = linkCounts[d.id] || 0;
        const opacity = linkCount === 0 ? 0.3 : 1 - layer * 0.2;

        // 動態設置文本模糊濾鏡
        const blurValue = (1 - opacity) * 10;
        const filterId = `blur-text-${d.id}`;
        
        let filter = d3.select("defs").select(`#${CSS.escape(filterId)}`);
        if (filter.empty()) {
            filter = d3.select("defs")
                .append("filter")
                .attr("id", filterId)
                .attr("x", "-30%")
                .attr("y", "-30%")
                .attr("width", "160%")
                .attr("height", "160%");
                
            filter.append("feGaussianBlur").attr("stdDeviation", blurValue);
        } else {
            filter.select("feGaussianBlur").attr("stdDeviation", blurValue);
        }

        d3.select(`#${CSS.escape(d.id)}`).style("filter", `url(#${filterId})`);
        
        return opacity;
    });

    // 更新顯示模式
    updateDisplayMode();
	console.log(nodesData.map(node => ({ id: node.id, linkCount: node.linkCount })));

}


// 生成節點列表
function createNodeList(nodesData) {
    nodesData.sort((a, b) => (linkCounts[b.id] || 0) - (linkCounts[a.id] || 0));

    const nodeList = d3.select("#node-list");
    nodeList.selectAll("li").remove();

    nodesData.forEach(node => {
        const listItem = nodeList.append("li");

        // 添加 checkbox 作為開關
        listItem.append("input")
            .attr("type", "checkbox")
            .attr("id", `checkbox-${node.id}`)
            .on("change", function() {
                const isChecked = d3.select(this).property("checked");
                toggleNodeFixedState(node, isChecked);
            });

        // 顯示節點 ID 和連線數
        listItem.append("label")
            .attr("for", `checkbox-${node.id}`)
            .text(`${node.id} (${linkCounts[node.id] || 0})`);
    });
}

function toggleNodeFixedState(node, isFixed) {
    if (isFixed) {
        // 設置 fx 和 fy 固定位置
        node.fx = node.x;
        node.fy = node.y;
    } else {
        // 解除 fx 和 fy，使其再次受力導向影響
        node.fx = null;
        node.fy = null;
    }
}

// 將選定節點移動到垂直居中
function centerNode(selectedNode, nodesData, isFixed) {
    if (isFixed) {
        // 將選定節點的 Y 值固定在畫面垂直居中
        selectedNode.fy = height / 2;
    } else {
        // 取消 Y 值固定
        selectedNode.fy = null;
    }

    // 保持其他節點的 Y 值未固定
    nodesData.forEach(node => {
        if (node !== selectedNode && !d3.select(`#checkbox-${node.id}`).property("checked")) {
            node.fy = null;
        }
    });

    // 重新啟動模擬
    simulation.alpha(1).restart();
}


// 顯示/隱藏側邊欄
d3.select("#toggle-sidebar").on("click", () => {
    const sidebar = d3.select("#sidebar");
    sidebar.classed("visible", !sidebar.classed("visible"));
});

function updateNodeList() {
    // 获取按 linkCount 排序的节点数据
    const sortedNodes = [...nodesData].sort((a, b) => b.linkCount - a.linkCount);

    // 选择节点列表容器
    const nodeList = d3.select("#node-list"); // 确保容器 ID 为 node-list
    nodeList.selectAll("*").remove(); // 清空现有内容

    // 生成每个节点项
    sortedNodes.forEach(node => {
        nodeList.append("div")
            .attr("class", "node-item")
            .text(`${node.id} (連線數: ${node.linkCount || 0})`)
            .on("click", () => {
                centerNode(node); // 将节点居中
            });
    });
}

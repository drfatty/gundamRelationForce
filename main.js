const svg = d3.select("svg");
let width = window.innerWidth;
let height = window.innerHeight;

let simulation;
let layers = {}; // 全局變數來存儲層數信息

svg.attr("width", width).attr("height", height);

window.addEventListener("resize", () => {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width).attr("height", height);
    if (simulation) {
        simulation.force("center", d3.forceCenter(width / 2, height / 2));
        simulation.alpha(1).restart();
    }
});

// 定義 updateDisplayMode 函數，控制顯示模式
function updateDisplayMode() {
    const showOpacity = d3.select("#toggle-opacity").property("checked");

    if (showOpacity) {
        // 顯示節點的透明度
        d3.selectAll("text.node-text").text(function(d) {
            const opacity = d3.select(`circle#${CSS.escape(d.id)}`).style("opacity"); // 使用CSS.escape來處理特殊字符
            return parseFloat(opacity).toFixed(2);
        d3.selectAll("text.node-text").text(d => {
        });

        // 顯示線段的透明度
        d3.selectAll("text.link-text").text(function(d) {
            const opacity = d3.select(`line#${CSS.escape(d.source.id)}-${CSS.escape(d.target.id)}`).style("stroke-opacity"); // 使用CSS.escape來處理特殊字符
            return parseFloat(opacity).toFixed(2);
        });
    } else {
        // 恢復為原本的ID和關係文字
        d3.selectAll("text.node-text").text(d => d.id);
        d3.selectAll("text.link-text").text(d => d.relationComment);
    }
}



Promise.all([
    d3.json("invData.json"),
    d3.json("relationData.json")
]).then(([nodesData, linksData]) => {

    const relationTypes = Array.from(new Set(linksData.map(link => link.relation)));
    const filtersDiv = d3.select("#relation-filters");
    relationTypes.forEach(type => {
        const label = filtersDiv.append("label");
        label.append("input")
            .attr("type", "checkbox")
            .attr("value", type)
            .property("checked", true)
            .on("change", updateGraph);
        label.append("span").text(type);
    });

    // 初始化 opacityToggle 的事件監聽
    d3.select("#toggle-opacity").on("change", updateDisplayMode);

    function updateGraph() {
    svg.selectAll("*").remove();

    const selectedRelations = relationTypes.filter(type => {
        return d3.select(`input[value="${type}"]`).property("checked");
    });
    const filteredLinks = linksData.filter(link => selectedRelations.includes(link.relation));

    simulation = d3.forceSimulation(nodesData)
        .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(0.1))
        .force("y", d3.forceY(height / 2).strength(0.1));

    const link = svg.append("g")
        .selectAll("line")
        .data(filteredLinks)
        .enter().append("line")
        .attr("stroke-width", 2)
        .attr("stroke", "#999")
        .style("stroke-opacity", 0.3)
        .attr("class", "link-text")
        .attr("id", d => `${d.source.id}-${d.target.id}`)
        .on("click", function(event, d) {
            const opacity = d3.select(this).style("stroke-opacity");
            console.log(`Link from ${d.source.id} to ${d.target.id} - Opacity: ${opacity}`);
        });

    const linkText = svg.append("g")
        .selectAll("text")
        .data(filteredLinks)
        .enter().append("text")
        .attr("dy", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#555")
        .attr("class", "link-text")
        .text(d => d.relationComment);

    const node = svg.append("g")
        .selectAll("circle")
        .data(nodesData)
        .enter().append("circle")
        .attr("r", 10)
        .attr("fill", "#69b3a2")
        .style("opacity", 0.3)
        .attr("class", "node")
        .attr("id", d => d.id)
        .on("click", function(event, d) {
            const opacity = d3.select(this).style("opacity");
            console.log(`Node ${d.id} - Opacity: ${opacity}`);
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    const nodeText = svg.append("g")
        .selectAll("text")
        .data(nodesData)
        .enter().append("text")
        .attr("dy", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#000")
        .attr("class", "node-text")
        .attr("data-id", d => d.id)
        .text(d => d.id)
        .style("opacity", 0.3)
        .on("click", function(event, d) {
            d3.select("#search-input").property("value", d.id);
        });

    simulation.on("tick", () => {
        link
            .attr("x1", d => Math.max(0, Math.min(width, d.source.x)))
            .attr("y1", d => Math.max(0, Math.min(height, d.source.y)))
            .attr("x2", d => Math.max(0, Math.min(width, d.target.x)))
            .attr("y2", d => Math.max(0, Math.min(height, d.target.y)));

        node
            .attr("cx", d => Math.max(0, Math.min(width, d.x)))
            .attr("cy", d => Math.max(0, Math.min(height, d.y)));

        linkText
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);

        nodeText
            .attr("x", d => d.x)
            .attr("y", d => d.y - 15);
    });

    // 搜尋並將節點置中和強調顯示
    d3.select("#search-button").on("click", () => {
        const searchTerm = d3.select("#search-input").property("value");
        const targetNode = nodesData.find(node => node.id === searchTerm);

        if (targetNode) {
            // 將節點鎖定在畫面中央
            targetNode.fx = width / 2;
            targetNode.fy = height / 2;

            // 更新模擬，以便將節點移動到中央
            simulation.alpha(1).restart();

            // 在一段時間後釋放節點
            setTimeout(() => {
                targetNode.fx = null;
                targetNode.fy = null;
            }, 2000);
        } else {
            alert("未找到該ID的節點");
        }
    });

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
}

	
    updateGraph();

}).catch(error => {
    console.error("Error loading data:", error);
});

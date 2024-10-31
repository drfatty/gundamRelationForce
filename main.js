// main.js

// 設定SVG元素
const svg = d3.select("svg");
const width = +svg.attr("width");
const height = +svg.attr("height");

// 加載資料
Promise.all([
    d3.json("invData.json"),
    d3.json("relationData.json")
]).then(([nodesData, linksData]) => {

    // 建立模擬器
    const simulation = d3.forceSimulation(nodesData)
        .force("link", d3.forceLink(linksData).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // 渲染連線
    const link = svg.append("g")
        .selectAll("line")
        .data(linksData)
        .enter().append("line")
        .attr("stroke-width", 2)
        .attr("stroke", "#999");

    // 渲染節點
    const node = svg.append("g")
        .selectAll("circle")
        .data(nodesData)
        .enter().append("circle")
        .attr("r", 10)
        .attr("fill", "#69b3a2")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // 模擬更新時更新位置
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

    // 拖曳事件處理
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

}).catch(error => {
    console.error("Error loading data:", error);
});

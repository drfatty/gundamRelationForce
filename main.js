const svg = d3.select("svg");
let width = window.innerWidth;
let height = window.innerHeight;

let simulation;
let layers = {}; // 全局變數來存儲層數信息
let linkCounts = {}; // 全局變數來存儲連線數信息

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

Promise.all([
    d3.json("invData.json"),
    d3.json("relationData.json")
]).then(([nodesData, linksData]) => {
	// 在這裡傳入 `nodesData`，生成節點列表
    createNodeList(nodesData);
    
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

    d3.select("#toggle-opacity").on("change", updateDisplayMode);

    function updateGraph() {
    // 清除並更新節點和連線，但保留 <defs>
    svg.selectAll("g.nodes, g.links, g.texts").remove();

    const selectedRelations = relationTypes.filter(type => {
        return d3.select(`input[value="${type}"]`).property("checked");
    });
    const filteredLinks = linksData.filter(link => selectedRelations.includes(link.relation));

    // 設置力導向模擬
    simulation = d3.forceSimulation(nodesData)
        .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(d => {
            const linkCount = linkCounts[d.id] || 0;
            return (-linkCount * 100) - 100; // 斥力強度根據連線數設定
        }))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(0.1))
        .force("y", d3.forceY(height / 2).strength(0.1));

   const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(filteredLinks)
        .enter().append("line")
        .attr("stroke-width", 2)
        .attr("stroke", "#999")
        .style("stroke-opacity", d => {
            const sourceNode = d3.select(`#${CSS.escape(d.source.id)}`);
            const sourceOpacity = sourceNode.empty() ? 0.3 : sourceNode.attr("data-opacity");
            return sourceOpacity;
        })
        .attr("class", "link-text")
        .attr("id", d => `${CSS.escape(d.source.id)}-${CSS.escape(d.target.id)}`)
        .attr("marker-end", d => {
            if (d.direction === "AB" || d.direction === "ABBA") {
                return "url(#arrow-end)";
            }
            return null;
        })
        .attr("marker-start", d => {
            if (d.direction === "ABBA") {
                return "url(#arrow-start)";
            }
            return null;
        });

    const linkText = svg.append("g")
        .attr("class", "texts")
        .selectAll("text")
        .data(filteredLinks)
        .enter().append("text")
        .attr("dy", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#555")
        .attr("class", "link-text")
        .text(d => d.relationComment);

    // 更新節點
    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodesData)
        .enter().append("circle")
        .attr("r", 10)
        .attr("fill", "#69b3a2")
        .attr("class", "node")
        .attr("id", d => d.id)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // 更新節點文字
    const nodeText = svg.append("g")
        .attr("class", "texts")
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
        .on("click", function(event, d) {
            d3.select("#search-input").property("value", d.id);
        });

    // 設置中央節點
    const centralNodeId = "阿姆羅·雷";
    const centralNode = nodesData.find(node => node.id === centralNodeId);
    if (centralNode) {
        centralNode.fx = width / 2;
        centralNode.fy = height / 2;
        calculateLayersAndSetOpacity(centralNode, nodesData, filteredLinks); 
    }

    // 設置模擬 "tick" 事件，讓圖表更新位置
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

    // 搜索按鈕事件處理
    d3.select("#search-button").on("click", () => {
        const searchTerm = d3.select("#search-input").property("value");
        const targetNode = nodesData.find(node => node.id === searchTerm);

        if (targetNode) {
            targetNode.fx = width / 2;
            targetNode.fy = height / 2;

            calculateLayersAndSetOpacity(targetNode, nodesData, filteredLinks);
            simulation.alpha(1).restart();

            setTimeout(() => {
                targetNode.fx = null;
                targetNode.fy = null;
            }, 2000);
        } else {
            alert("未找到該ID的節點");
        }
    });
}

    initializeFilters(); // 初始化濾鏡，確保濾鏡在節點渲染之前已經設置
	initializeArrows();  // 定義箭頭
    updateGraph();

}).catch(error => {
    console.error("Error loading data:", error);
});

function initializeFilters() {
    const defs = d3.select("svg").append("defs");
	
	//console.log("模糊預設值啟動");
	
    for (let i = 1; i <= 10; i++) {
        const opacityLevel = i / 10;
        const blurValue = (1 - opacityLevel) * 10; // 透明度越低模糊越高

        defs.append("filter")
            .attr("id", `blur-${i}`)
            .append("feGaussianBlur")
            .attr("stdDeviation", blurValue);
    }
}

function initializeArrows() {
    let defs = d3.select("svg").select("defs");

    // 如果 defs 不存在，先創建它
    if (defs.empty()) {
        defs = d3.select("svg").append("defs");
    }

    // 定義箭頭標記，讓 refX 為 15 以遠離節點
    defs.append("marker")
        .attr("id", "arrow-end")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)  // 增大 refX 讓箭頭遠離節點
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#999");

    defs.append("marker")
        .attr("id", "arrow-start")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", -5)  // 調整 refX 讓箭頭在起點遠離節點
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M10,-5L0,0L10,5")
        .attr("fill", "#999");
}

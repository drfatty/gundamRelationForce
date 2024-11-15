const svg = d3.select("svg");
let width = window.innerWidth;
let height = window.innerHeight;

let simulation;
let layers = {}; // 全局變數來存儲層數信息
let linkCounts = {}; // 全局變數來存儲連線數信息

// 将 nodesData 和 linksData 声明为全局变量
let nodesData, linksData;


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
]).then(([loadedNodesData, loadedLinksData]) => {
    nodesData = loadedNodesData;
    linksData = loadedLinksData;

    parseLinksData(linksData, nodesData); // 确保 linksData 解析正确

    const centralNode = nodesData.find(node => node.id === "阿姆羅·雷");
    
    if (centralNode) {
        calculateLayersAndSetOpacity(centralNode, nodesData, linksData); // 更新连线数和透明度
        updateNodeList(); // 更新节点列表
    } else {
        console.error("未找到中央节点");
    }
	
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
		const inputElement = d3.select(`input[value="${type}"]`);
		if (!inputElement.empty()) {
			return inputElement.property("checked");
		}
		return false; // 如果找不到元素，则返回默认未选中状态
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

	// 更新连线
    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(filteredLinks)
        .enter().append("line")
        .attr("stroke-width", 2)
        .attr("stroke", "#999")
        .style("stroke-opacity", d => {
            const targetOpacity = d.target.opacity !== undefined ? d.target.opacity : 0.3;
            return targetOpacity;  // 使用 target 节点的透明度
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
	
	// 强制重新应用透明度到已存在的线段
    svg.selectAll("line.link-text")
        .style("stroke-opacity", d => {
            const targetOpacity = d.target.opacity !== undefined ? d.target.opacity : 0.3;
            return targetOpacity;  // 使用 target 节点的透明度
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
		updateNodeList();  // 更新列表显示
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
			updateNodeList();  // 更新列表显示
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

    // 如果 defs 不存在，創建一個
    if (defs.empty()) {
        defs = d3.select("svg").append("defs");
    }

    // 小實心三角形箭頭（終點箭頭）
    defs.append("marker")
        .attr("id", "arrow-end")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 6)  // 調整 refX 值讓箭頭更貼合線段
        .attr("refY", 0)
        .attr("markerWidth", 4)  // 更小的 marker 寬度
        .attr("markerHeight", 4)  // 更小的 marker 高度
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-3L6,0L0,3")  // 簡單的三角形形狀
        .attr("fill", "#666");

    // 小實心三角形箭頭（起點箭頭）
    defs.append("marker")
        .attr("id", "arrow-start")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 4)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M6,-3L0,0L6,3")
        .attr("fill", "#666");
}

function parseLinksData(linksData, nodesData) {
    const nodesById = new Map(nodesData.map(node => [node.id, node]));

    linksData.forEach(link => {
        if (typeof link.source === "string") {
            link.source = nodesById.get(link.source);
        }
        if (typeof link.target === "string") {
            link.target = nodesById.get(link.target);
        }
    });
}

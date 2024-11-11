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
        svg.selectAll("*").remove();

        const selectedRelations = relationTypes.filter(type => {
            return d3.select(`input[value="${type}"]`).property("checked");
        });
        const filteredLinks = linksData.filter(link => selectedRelations.includes(link.relation));

        simulation = d3.forceSimulation(nodesData)
            .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(d => {
                if (d.id === "阿姆羅·雷") {
                    return -500;  // 特定節點的更強斥力
                } else if (d.group === 1) {
                    return -200;  // 特定組別的中等斥力
                } else {
                    return -100;  // 其他節點的標準斥力
                }
            }))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX(width / 2).strength(0.1))
            .force("y", d3.forceY(height / 2).strength(0.1));
		simulation = d3.forceSimulation(nodesData)
			.force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(100))
			.force("charge", d3.forceManyBody().strength(d => {
				/*if (d.id === "阿姆羅·雷") {
                    return -500;  // 特定節點的更強斥力
                } else if (d.group === 1) {
                    return -200;  // 特定組別的中等斥力
                } else {
                    return -100;  // 其他節點的標準斥力
                } */
				const linkCount = linkCounts[d.id] || 0;
				return (-linkCount * 100)-100; // 斥力強度根據連線數 * 100 設定
				
			}))
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
            .attr("id", d => `${d.source.id}-${d.target.id}`);

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
            .attr("class", "node")
            .attr("id", d => d.id)
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
            .on("click", function(event, d) {
                d3.select("#search-input").property("value", d.id);
            });

        const centralNodeId = "阿姆羅·雷";
        const centralNode = nodesData.find(node => node.id === centralNodeId);
        
        if (centralNode) {
            centralNode.fx = width / 2;
            centralNode.fy = height / 2;
            calculateLayersAndSetOpacity(centralNode, nodesData, filteredLinks); 
        }

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

    updateGraph();

}).catch(error => {
    console.error("Error loading data:", error);
});

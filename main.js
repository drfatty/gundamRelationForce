const svg = d3.select("svg");
const width = +svg.attr("width");
const height = +svg.attr("height");

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

    function updateGraph() {
        svg.selectAll("*").remove();

        const selectedRelations = relationTypes.filter(type => {
            return d3.select(`input[value="${type}"]`).property("checked");
        });
        const filteredLinks = linksData.filter(link => selectedRelations.includes(link.relation));

        const simulation = d3.forceSimulation(nodesData)
            .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = svg.append("g")
            .selectAll("line")
            .data(filteredLinks)
            .enter().append("line")
            .attr("stroke-width", 2)
            .attr("stroke", "#999");

        const linkText = svg.append("g")
            .selectAll("text")
            .data(filteredLinks)
            .enter().append("text")
            .attr("dy", -5)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "#555")
            .text(d => d.relationComment);

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

        const nodeText = svg.append("g")
            .selectAll("text")
            .data(nodesData)
            .enter().append("text")
            .attr("dy", -15)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "#000")
            .text(d => d.id);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            linkText
                .attr("x", d => (d.source.x + d.target.x) / 2)
                .attr("y", d => (d.source.y + d.target.y) / 2);

            nodeText
                .attr("x", d => d.x)
                .attr("y", d => d.y - 15);
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

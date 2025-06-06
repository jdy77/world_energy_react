import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import '../css/world.css';

const World = ({ 
  currentYear, 
  countriesData, 
  world, 
  globalMaxSelfSufficiency, 
  getCountryData,
  showAllCountries,
  setShowAllCountries,
  handleCountryClick,
  tooltipRef
}) => {
  const mapRef = useRef();
  const horizontalChartRef = useRef();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    
    const svg = d3.select(mapRef.current);
    const width = svg.node().clientWidth || 800;
    const height = svg.node().clientHeight || 500;
    
    svg.selectAll("*").remove(); // Clear previous content
    
    const projection = d3.geoNaturalEarth1().fitSize([width, height], feature(world, world.objects.countries));
    const path = d3.geoPath(projection);
    
    const land = feature(world, world.objects.countries);
    
    svg.append('g')
      .selectAll('path')
      .data(land.features)
      .join('path')
      .attr('d', path)
      .attr('fill', '#eee')
      .attr('stroke', '#999')
      .style('cursor', 'pointer')
      .on('click', (event, d) => handleCountryClick(event, d))
      .on('mouseover', (event, d) => handleMouseOver(event, d))
      .on('mouseout', handleMouseOut);
    
    updateChoropleth();
  }, [currentYear, getCountryData]);

  // Update choropleth colors
  const updateChoropleth = useCallback(() => {
    if (!mapRef.current) return;
    
    const svg = d3.select(mapRef.current);
    const currentMetric = 'self_sufficiency_rate';
    
    // Collect all values for the current metric and year
    const values = [];
    Object.values(countriesData).forEach(country => {
      const value = country[currentMetric]?.[currentYear];
      if (value != null && !isNaN(value)) {
        values.push(value);
      }
    });
    
    if (values.length === 0) return;
    
    // Create color scale for self-sufficiency rate
    const colorScale = value => {
      const redColor = "#d73027";
      const yellowColor = "#fee08b";
      const greenColor = "#1a9850";
      
      if (value <= 100) {
        return d3.scaleLinear()
          .domain([0, 100])
          .range([redColor, yellowColor])
          .interpolate(d3.interpolateHcl)
          (value);
      } else {
        return d3.scaleLinear()
          .domain([100, globalMaxSelfSufficiency])
          .range([yellowColor, greenColor])
          .interpolate(d3.interpolateHcl)
          (Math.min(value, globalMaxSelfSufficiency));
      }
    };
    
    // Update country colors
    svg.selectAll('path')
      .attr('fill', d => {
        const countryName = d.properties.name;
        const countryData = getCountryData(countryName);
        
        if (!countryData || !countryData[currentMetric] || countryData[currentMetric][currentYear] == null) {
          return '#eee';
        }
        
        const value = countryData[currentMetric][currentYear];
        return colorScale(value);
      });
  }, [currentYear, getCountryData, globalMaxSelfSufficiency]);

  // Initialize horizontal chart
  useEffect(() => {
    const timer = setTimeout(() => {
      if (horizontalChartRef.current) {
        if (horizontalChartRef.current.parentElement) {
          horizontalChartRef.current.parentElement.scrollTop = 0;
        }
        drawHorizontalChart();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentYear, showAllCountries]);

  const drawHorizontalChart = useCallback(() => {
    if (!horizontalChartRef.current) return;
    
    const svg = d3.select(horizontalChartRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    const width = container.clientWidth || 800;
    
    svg.selectAll("*").remove();
    
    const margin = { top: 20, right: 120, bottom: 50, left: 150 };
    const chartWidth = width - margin.left - margin.right;
    
    // Prepare data
    const allChartData = [];
    Object.values(countriesData).forEach(country => {
      const generation = country.net_generation?.[currentYear];
      const consumption = country.net_consumption?.[currentYear];
      const imports = country.imports?.[currentYear];
      
      if (generation != null && consumption != null && imports != null &&
          !isNaN(generation) && !isNaN(consumption) && !isNaN(imports)) {
        allChartData.push({
          country: country.name,
          generation: generation,
          consumption: consumption,
          imports: imports,
          total: generation + imports
        });
      }
    });
    
    // Sort by consumption (largest to smallest)
    allChartData.sort((a, b) => b.consumption - a.consumption);
    
    // Filter based on showAllCountries state
    const chartData = showAllCountries ? allChartData : allChartData.slice(0, 30);
    
    if (chartData.length === 0) {
      svg.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .text('No data available for this year')
        .style('font-size', '16px')
        .style('fill', '#666');
      return;
    }
    
    // Calculate bar height
    const barHeight = 8;
    const barSpacing = 24;
    
    // 전체 차트 높이 계산
    const totalChartHeight = chartData.length * barSpacing + margin.top + margin.bottom;
    
    // SVG 높이를 항상 필요한 전체 높이로 설정
    svg.attr('width', width).attr('height', totalChartHeight);
    
    // Create scales
    const maxValue = d3.max(chartData, d => Math.max(d.consumption, d.total));
    const xScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, chartWidth]);
    
    // Y 스케일을 일정한 간격으로 설정
    const yScale = (i) => margin.top + i * barSpacing;
    
    // Create chart group
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`);
    
    // Add grid lines
    const gridHeight = chartData.length * barSpacing;
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickSize(-gridHeight);
    
    chartGroup.append('g')
      .attr('class', 'chart-grid')
      .attr('transform', `translate(0, ${margin.top + gridHeight})`)
      .call(xAxis)
      .selectAll('text').remove();
    
    // Draw bars
    chartData.forEach((country, i) => {
      const y = yScale(i);
      
      // Consumption bar (background, gray)
      chartGroup.append('rect')
        .attr('class', 'consumption-bar')
        .attr('data-country-index', i)
        .attr('data-country-name', country.country)
        .attr('x', 0)
        .attr('y', y - 3)
        .attr('width', xScale(country.consumption))
        .attr('height', barHeight + 6)
        .attr('fill', '#333')
        .attr('fill-opacity', 0.3)
        .style('cursor', 'pointer');
      
      // Generation bar (blue)
      chartGroup.append('rect')
        .attr('class', 'generation-bar')
        .attr('data-country-index', i)
        .attr('data-country-name', country.country)
        .attr('x', 0)
        .attr('y', y)
        .attr('width', xScale(country.generation))
        .attr('height', barHeight)
        .attr('fill', '#2196F3')
        .attr('fill-opacity', 0.7)
        .style('cursor', 'pointer');
      
      // Imports bar (red)
      if (country.imports > 0) {
        chartGroup.append('rect')
          .attr('class', 'imports-bar')
          .attr('data-country-index', i)
          .attr('data-country-name', country.country)
          .attr('x', xScale(country.generation))
          .attr('y', y)
          .attr('width', xScale(country.imports))
          .attr('height', barHeight)
          .attr('fill', '#e53e3e')
          .attr('fill-opacity', 0.8)
          .style('cursor', 'pointer');
      }
    });
    
    // Add country labels
    chartData.forEach((country, i) => {
      chartGroup.append('text')
        .attr('class', 'country-label')
        .attr('data-country-name', country.country)
        .attr('x', -5)
        .attr('y', yScale(i) + barHeight / 2)
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .style('font-size', '9px')
        .style('fill', '#333')
        .style('cursor', 'pointer')
        .text(country.country);
    });
    
    // Add x-axis
    const axisY = margin.top + gridHeight;
    chartGroup.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0, ${axisY})`)
      .call(d3.axisBottom(xScale).ticks(5));
    
    // Add x-axis label
    chartGroup.append('text')
      .attr('class', 'chart-axis')
      .attr('x', chartWidth / 2)
      .attr('y', axisY + 35)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .text('Energy (TWh)');
    
    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 110}, 15)`);
    
    const legendData = [
      { label: 'Consumption', color: '#333', opacity: 0.3 },
      { label: 'Generation', color: '#2196F3', opacity: 0.7 },
      { label: 'Imports', color: '#e53e3e', opacity: 0.8 }
    ];
    
    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 15})`);
      
      legendItem.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', item.color)
        .attr('fill-opacity', item.opacity);
      
      legendItem.append('text')
        .attr('x', 15)
        .attr('y', 8)
        .style('font-size', '11px')
        .style('fill', '#333')
        .text(item.label);
    });
    
    // Add toggle button
    const buttonWidth = 130;
    const buttonX = Math.min(width - buttonWidth - 10, width - 140);
    
    const buttonGroup = svg.append('g')
      .attr('transform', `translate(${buttonX}, 70)`);
    
    buttonGroup.append('rect')
      .attr('class', 'toggle-button')
      .attr('width', buttonWidth)
      .attr('height', 25)
      .attr('rx', 3)
      .attr('fill', '#f0f0f0')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', () => setShowAllCountries(!showAllCountries))
      .on('mouseover', function() { d3.select(this).attr('fill', '#e0e0e0'); })
      .on('mouseout', function() { d3.select(this).attr('fill', '#f0f0f0'); });
    
    buttonGroup.append('text')
      .attr('class', 'toggle-button-text')
      .attr('x', buttonWidth / 2)
      .attr('y', 16) 
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('font-size', '10px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .style('cursor', 'pointer')
      .text(showAllCountries ? 'Show Top 30' : 'Show All Countries')
      .on('click', () => setShowAllCountries(!showAllCountries));
      
  }, [currentYear, showAllCountries, getCountryData]);

  const handleMouseOver = (event, d) => {
    const countryName = d.properties.name;
    const countryData = getCountryData(countryName);
    
    if (tooltipRef.current) {
      const tooltip = d3.select(tooltipRef.current);
      if (countryData) {
        const selfSufficiency = countryData.self_sufficiency_rate?.[currentYear];
        
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div><strong>${countryName}</strong></div>
            <div>Self-Sufficiency: ${selfSufficiency ? selfSufficiency.toFixed(1) + '%' : 'N/A'}</div>
          `);
      } else {
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div><strong>${countryName}</strong></div>
            <div>No data available</div>
          `);
      }
    }
  };

  const handleMouseOut = () => {
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  };

  return (
    <div id="world-view" className="view-container">
      <div id="left-panel">
        <div id="map-section">
          <svg ref={mapRef} id="map"></svg>
        </div>
      </div>
      
      <div id="right-panel">
        <div id="horizontal-chart-container">
          <svg ref={horizontalChartRef} id="horizontal-chart"></svg>
        </div>
      </div>
    </div>
  );
};

export default World;

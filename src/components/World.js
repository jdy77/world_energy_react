import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import '../css/world.css';

const World = ({ 
  currentYear, 
  countriesData, 
  world, 
  globalMaxTradeBalance, 
  globalMinTradeBalance,
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
    const currentMetric = 'trade_balance';
    
    // Collect all values for the current metric and year
    const values = [];
    Object.values(countriesData).forEach(country => {
      const value = country[currentMetric]?.[currentYear];
      if (value != null && !isNaN(Number(value))) {
        values.push(Number(value));
      }
    });
    
    if (values.length === 0) return;
    
    // Create color scale for trade balance (negative = imports, positive = exports)
    const colorScale = value => {
      const yellowColor = "#ffd700";     // Strong imports (negative values)
      const lightYellowColor = "#ffeb80"; // Moderate imports
      const whiteColor = "#ffffff";      // Neutral/balanced
      const lightGreenColor = "#90ee90"; // Moderate exports
      const greenColor = "#228b22";      // Strong exports (positive values)
      
      if (value < 0) {
        // Negative values (imports) - use yellow scale
        return d3.scaleLinear()
          .domain([globalMinTradeBalance, 0])
          .range([yellowColor, whiteColor])
          .interpolate(d3.interpolateHcl)
          (Math.max(value, globalMinTradeBalance));
      } else {
        // Positive values (exports) - use green scale
        return d3.scaleLinear()
          .domain([0, globalMaxTradeBalance])
          .range([whiteColor, greenColor])
          .interpolate(d3.interpolateHcl)
          (Math.min(value, globalMaxTradeBalance));
      }
    };
    
    // Update country colors
    svg.selectAll('path')
      .attr('fill', d => {
        const countryName = d.properties.name;
        const countryData = getCountryData(countryName);
        
        if (!countryData) {
          // Country not in dataset at all - keep light grey
          return '#eee';
        }
        
        if (!countryData[currentMetric] || countryData[currentMetric][currentYear] == null) {
          // Country exists in data but has N/A trade balance - darker grey
          return '#999999';
        }
        
        const value = Number(countryData[currentMetric][currentYear]);
        if (isNaN(value)) {
          // Country exists but trade balance value is invalid - darker grey
          return '#999999';
        }
        return colorScale(value);
      });
  }, [currentYear, getCountryData, globalMaxTradeBalance, globalMinTradeBalance]);

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
    
    // Set minimum width to ensure chart readability with horizontal scroll
    const containerWidth = container.clientWidth || 800;
    const width = Math.max(containerWidth, 800); // Minimum width of 800px
    
    svg.selectAll("*").remove();
    
    const margin = { top: 40, right: 120, bottom: 80, left: 180 }; // Increased margins for better positioning
    const chartWidth = width - margin.left - margin.right;
    
    // Prepare data
    const allChartData = [];
    Object.values(countriesData).forEach(country => {
      const generation = Number(country.net_generation?.[currentYear]);
      const consumption = Number(country.net_consumption?.[currentYear]);
      const tradeBalance = Number(country.trade_balance?.[currentYear]);
      
      if (!isNaN(generation) && !isNaN(consumption) && !isNaN(tradeBalance)) {
        allChartData.push({
          country: country.name,
          generation: generation,
          consumption: consumption,
          tradeBalance: tradeBalance
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
    
    // Calculate bar height for grouped bars - minimal gaps within countries
    const barHeight = 12; // Width of each bar
    const barSpacing = 28; // Space between countries (must be > barHeight*2 + groupSpacing)
    const groupSpacing = 1; // Minimal space between generation and consumption bars (1px)
    
    // Calculate total chart height with proper padding
    const chartHeight = chartData.length * barSpacing;
    const totalSvgHeight = chartHeight + margin.top + margin.bottom;
    
    // Set SVG dimensions
    svg.attr('width', width).attr('height', totalSvgHeight);
    
    // Create scales
    const maxValue = d3.max(chartData, d => Math.max(d.consumption, d.generation));
    const xScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, chartWidth]);
    
    // Y scale function - position from top with proper spacing
    const getYPosition = (index) => margin.top + (index * barSpacing);
    
    // Create chart group
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`);
    
    // Add grid lines
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickSize(-chartHeight)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-grid')
      .attr('transform', `translate(0, ${margin.top + chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666');
    
    // Remove grid line labels (keep only grid lines)
    chartGroup.select('.chart-grid')
      .selectAll('text').remove();
    
    // Draw grouped bars for each country
    chartData.forEach((country, i) => {
      const baseY = getYPosition(i);
      
      // Top bar: Generation - positioned above center
      const generationY = baseY - (barHeight/2 + groupSpacing/2);
      
      // Generation bar (blue)
      chartGroup.append('rect')
        .attr('class', 'generation-bar')
        .attr('data-country-index', i)
        .attr('data-country-name', country.country)
        .attr('x', 0)
        .attr('y', generationY)
        .attr('width', xScale(country.generation))
        .attr('height', barHeight)
        .attr('fill', '#2196F3')
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showBarTooltip(event, country, 'generation');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // Trade balance arrow - starts from the end of generation bar
      const tradeBalance = country.tradeBalance;
      const generationEnd = xScale(country.generation);
      const arrowY = generationY + barHeight/2; // Center vertically within the generation bar
      const arrowThickness = barHeight * 0.6; // Arrow thickness (60% of bar height)
      
      if (tradeBalance !== 0 && !isNaN(tradeBalance)) {
        const arrowLength = xScale(Math.abs(tradeBalance));
        const arrowColor = tradeBalance > 0 ? '#228b22' : '#ffd700'; // Green for exports, yellow for imports
        const arrowDirection = tradeBalance > 0 ? 1 : -1; // Right for positive, left for negative
        
        // Arrow shaft (horizontal line)
        chartGroup.append('line')
          .attr('class', 'trade-arrow-shaft')
          .attr('data-country-index', i)
          .attr('data-country-name', country.country)
          .attr('x1', generationEnd)
          .attr('y1', arrowY)
          .attr('x2', generationEnd + (arrowLength * arrowDirection))
          .attr('y2', arrowY)
          .attr('stroke', arrowColor)
          .attr('stroke-width', arrowThickness * 0.4)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', arrowThickness * 0.5);
            showBarTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', arrowThickness * 0.4);
            hideTooltip();
          });
        
        // Arrow head (triangle)
        const headSize = arrowThickness * 0.5;
        const arrowHeadX = generationEnd + (arrowLength * arrowDirection);
        const arrowHeadPoints = tradeBalance > 0 
          ? `${arrowHeadX},${arrowY} ${arrowHeadX - headSize},${arrowY - headSize/2} ${arrowHeadX - headSize},${arrowY + headSize/2}`
          : `${arrowHeadX},${arrowY} ${arrowHeadX + headSize},${arrowY - headSize/2} ${arrowHeadX + headSize},${arrowY + headSize/2}`;
        
        chartGroup.append('polygon')
          .attr('class', 'trade-arrow-head')
          .attr('data-country-index', i)
          .attr('data-country-name', country.country)
          .attr('points', arrowHeadPoints)
          .attr('fill', arrowColor)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('fill-opacity', 0.8);
            showBarTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('fill-opacity', 1);
            hideTooltip();
          });
      }
      
      // Bottom bar: Consumption - positioned below center
      const consumptionY = baseY + (barHeight/2 + groupSpacing/2);
      
      chartGroup.append('rect')
        .attr('class', 'consumption-bar')
        .attr('data-country-index', i)
        .attr('data-country-name', country.country)
        .attr('x', 0)
        .attr('y', consumptionY)
        .attr('width', xScale(country.consumption))
        .attr('height', barHeight)
        .attr('fill', '#ffc107')
        .attr('fill-opacity', 0.7)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showBarTooltip(event, country, 'consumption');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
    });
    
    // Add country labels (centered between grouped bars)
    chartData.forEach((country, i) => {
      const baseY = getYPosition(i);
      
      chartGroup.append('text')
        .attr('class', 'country-label')
        .attr('data-country-name', country.country)
        .attr('x', -10)
        .attr('y', baseY + barHeight/2) // Center vertically between the grouped bars
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .style('font-size', '10px')
        .style('fill', '#333')
        .style('cursor', 'pointer')
        .text(country.country.length > 15 ? country.country.substring(0, 15) + '...' : country.country);
    });
    
    // Add x-axis at bottom
    const axisY = margin.top + chartHeight;
    chartGroup.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0, ${axisY})`)
      .call(d3.axisBottom(xScale)
        .ticks(6)
        .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d))
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#333');
    
    // Add x-axis label
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('x', chartWidth / 2)
      .attr('y', axisY + 50)
      .attr('text-anchor', 'middle')
      .style('font-size', '13px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Energy (TWh)');
    
    // Add legend - positioned at top right
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 110}, 20)`);
    
    const legendData = [
      { label: 'Generation', color: '#2196F3', opacity: 0.8 },
      { label: 'Consumption', color: '#ffc107', opacity: 0.7 }
    ];
    
    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 18})`);
      
      legendItem.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', item.color)
        .attr('fill-opacity', item.opacity);
      
      legendItem.append('text')
        .attr('x', 16)
        .attr('y', 9)
        .style('font-size', '12px')
        .style('fill', '#333')
        .text(item.label);
    });
    
    // Add toggle button - positioned at top right, below legend
    const buttonWidth = 130;
    const buttonX = width - buttonWidth - 10;
    
    const buttonGroup = svg.append('g')
      .attr('transform', `translate(${buttonX}, 80)`);
    
    buttonGroup.append('rect')
      .attr('class', 'toggle-button')
      .attr('width', buttonWidth)
      .attr('height', 30)
      .attr('rx', 4)
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
      .attr('y', 20) 
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .style('cursor', 'pointer')
      .text(showAllCountries ? 'Show Top 30' : 'Show All Countries')
      .on('click', () => setShowAllCountries(!showAllCountries));

    // Tooltip functions
    function showBarTooltip(event, country, type) {
      if (!tooltipRef.current) return;
      
      const tooltip = d3.select(tooltipRef.current);
      let content = `<div><strong>${country.country}</strong></div>`;
      
      if (type === 'generation') {
        content += `<div>Generation: ${country.generation.toFixed(1)} TWh</div>`;
      } else if (type === 'consumption') {
        content += `<div>Consumption: ${country.consumption.toFixed(1)} TWh</div>`;
      } else if (type === 'trade') {
        const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
        content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
        content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
      }
      
      tooltip.style('opacity', 1)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(content);
    }
    
    function hideTooltip() {
      if (tooltipRef.current) {
        d3.select(tooltipRef.current).style('opacity', 0);
      }
    }
      
  }, [currentYear, showAllCountries, getCountryData]);

  const handleMouseOver = (event, d) => {
    const countryName = d.properties.name;
    const countryData = getCountryData(countryName);
    
    if (tooltipRef.current) {
      const tooltip = d3.select(tooltipRef.current);
      if (countryData) {
        const tradeBalanceValue = countryData.trade_balance?.[currentYear];
        const tradeBalance = (tradeBalanceValue != null && !isNaN(Number(tradeBalanceValue))) ? Number(tradeBalanceValue) : null;
        
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div><strong>${countryName}</strong></div>
            <div>Trade Balance: ${tradeBalance !== null ? tradeBalance.toFixed(1) + ' TWh' : 'N/A'}</div>
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

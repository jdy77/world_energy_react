import React, { useEffect, useRef, useCallback, useState } from 'react';
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
  handleCountryClick,
  tooltipRef
}) => {
  const mapRef = useRef();
  const horizontalChartRef = useRef();
  const comparisonChartRef = useRef();
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCountry, setDragStartCountry] = useState(null);
  const [dragMode, setDragMode] = useState('select'); // 'select' or 'deselect'

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
  }, [currentYear, selectedCountries]);

  const drawHorizontalChart = useCallback(() => {
    if (!horizontalChartRef.current) return;
    
    const svg = d3.select(horizontalChartRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    // Set dimensions for vertical bar chart
    const containerWidth = container.clientWidth || 1200;
    const containerHeight = container.clientHeight || 300;
    const width = Math.max(containerWidth - 40, 1200);
    const height = Math.max(containerHeight - 40, 300);
    
    svg.selectAll("*").remove();
    
    const margin = { top: 40, right: 40, bottom: 140, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Prepare data - include ALL countries (no filtering)
    const allChartData = [];
    Object.values(countriesData).forEach(country => {
      const generation = Number(country.net_generation?.[currentYear]);
      const consumption = Number(country.net_consumption?.[currentYear]);
      const tradeBalanceValue = country.trade_balance?.[currentYear];
      
      // Include countries if they have valid generation and consumption data
      if (!isNaN(generation) && !isNaN(consumption)) {
        const tradeBalance = (tradeBalanceValue != null && !isNaN(Number(tradeBalanceValue))) 
          ? Number(tradeBalanceValue) 
          : null;
        
        allChartData.push({
          country: country.name,
          generation: generation,
          consumption: consumption,
          tradeBalance: tradeBalance,
          hasValidTradeBalance: tradeBalance !== null
        });
      }
    });
    
    // Sort by consumption (largest to smallest) and use ALL countries
    const chartData = allChartData.sort((a, b) => b.consumption - a.consumption);
    
    if (chartData.length === 0) {
      svg.attr('width', width).attr('height', height);
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text('No data available for this year')
        .style('font-size', '16px')
        .style('fill', '#666');
      return;
    }
    
    // Calculate bar dimensions
    const barWidth = Math.max(chartWidth / chartData.length - 4, 8); // Minimum 8px width
    const barSpacing = chartWidth / chartData.length;
    
    // Set SVG dimensions
    svg.attr('width', width).attr('height', height);
    
    // Create scales
    const maxValue = d3.max(chartData, d => Math.max(d.consumption, d.generation));
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([chartHeight, 0]);
    
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.country))
      .range([0, chartWidth])
      .padding(0.1);
    
    // Create chart group
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Add grid lines (horizontal)
    const yAxis = d3.axisLeft(yScale)
      .ticks(8)
      .tickSize(-chartWidth)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-grid')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666');
    
    // Remove grid line labels (keep only grid lines)
    chartGroup.select('.chart-grid')
      .selectAll('text').remove();
    
    // Draw bars for each country
    chartData.forEach((country, i) => {
      const xPos = xScale(country.country);
      const barWidthAdjusted = Math.max(xScale.bandwidth() * 0.8, 4);
      const barOffset = (xScale.bandwidth() - barWidthAdjusted) / 2;
      
      // Generation bar (blue)
      const generationHeight = chartHeight - yScale(country.generation);
      chartGroup.append('rect')
        .attr('class', 'generation-bar')
        .attr('data-country-index', i)
        .attr('data-country-name', country.country)
        .attr('x', xPos + barOffset)
        .attr('y', yScale(country.generation))
        .attr('width', barWidthAdjusted / 2 - 1)
        .attr('height', generationHeight)
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
      
      // Consumption bar (yellow)
      const consumptionHeight = chartHeight - yScale(country.consumption);
      chartGroup.append('rect')
        .attr('class', 'consumption-bar')
        .attr('data-country-index', i)
        .attr('data-country-name', country.country)
        .attr('x', xPos + barOffset + barWidthAdjusted / 2)
        .attr('y', yScale(country.consumption))
        .attr('width', barWidthAdjusted / 2 - 1)
        .attr('height', consumptionHeight)
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
      
      // Trade balance arrow (only if valid trade balance)
      if (country.hasValidTradeBalance && country.tradeBalance !== 0) {
        const tradeBalance = country.tradeBalance;
        const arrowLength = Math.abs(yScale(0) - yScale(Math.abs(tradeBalance)));
        const arrowColor = tradeBalance > 0 ? '#228b22' : '#ffd700';
        const generationTop = yScale(country.generation);
        
        // Arrow shaft (vertical line)
        const arrowX = xPos + barOffset + barWidthAdjusted / 4;
        const arrowStartY = generationTop;
        const arrowEndY = tradeBalance > 0 ? generationTop - arrowLength : generationTop + arrowLength;
        
        chartGroup.append('line')
          .attr('class', 'trade-arrow-shaft')
          .attr('data-country-index', i)
          .attr('data-country-name', country.country)
          .attr('x1', arrowX)
          .attr('y1', arrowStartY)
          .attr('x2', arrowX)
          .attr('y2', arrowEndY)
          .attr('stroke', arrowColor)
          .attr('stroke-width', 3)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 4);
            showBarTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 3);
            hideTooltip();
          });
        
        // Arrow head (triangle)
        const headSize = 4;
        const arrowHeadY = arrowEndY;
        const arrowHeadPoints = tradeBalance > 0 
          ? `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY + headSize} ${arrowX + headSize},${arrowHeadY + headSize}`
          : `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY - headSize} ${arrowX + headSize},${arrowHeadY - headSize}`;
        
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
    });
    
    // Add x-axis with country names and selection buttons
    const xAxisGroup = chartGroup.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale));
    
    // Style the x-axis text
    xAxisGroup.selectAll('text')
      .style('font-size', '8px')
      .style('fill', '#333')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');
    
    // Add selection buttons/areas for each country (below country names)
    chartData.forEach((country, i) => {
      const xPos = xScale(country.country);
      const isSelected = selectedCountries.includes(country.country);
      const buttonY = chartHeight + 30; // Position below the country names
      
      // Create a button group to handle all events together
      const buttonGroup = chartGroup.append('g')
        .attr('class', 'country-selector-group')
        .attr('data-country', country.country)
        .style('cursor', 'pointer')
        .style('user-select', 'none');
      
      // Add selection button background
      const button = buttonGroup.append('rect')
        .attr('class', 'country-selector')
        .attr('x', xPos - 5)
        .attr('y', buttonY)
        .attr('width', xScale.bandwidth() + 10)
        .attr('height', 25)
        .attr('fill', isSelected ? '#4CAF50' : '#666666')
        .attr('fill-opacity', isSelected ? 1.0 : 0.1)
        .attr('stroke', isSelected ? '#2E7D32' : '#999')
        .attr('stroke-opacity', isSelected ? 1.0 : 0.3)
        .attr('stroke-width', 1)
        .attr('rx', 4);
      
      // Add selection button text
      const buttonText = buttonGroup.append('text')
        .attr('class', 'country-selector-text')
        .attr('x', xPos + xScale.bandwidth() / 2)
        .attr('y', buttonY + 16)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '700')
        .style('fill', isSelected ? 'white' : '#666')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .text(isSelected ? '✓' : '+');
      
      // Event handlers - Simple and clean
      buttonGroup
        .on('mousedown', function(event) {
          event.preventDefault();
          event.stopPropagation();
          
          const currentlySelected = selectedCountries.includes(country.country);
          
          // Start drag mode - determine if we're selecting or deselecting
          setIsDragging(true);
          setDragMode(currentlySelected ? 'deselect' : 'select');
          
          // Toggle this country immediately
          toggleCountrySelection(country.country);
        })
        .on('mouseenter', function(event) {
          if (isDragging) {
            // During drag - apply drag mode to this country
            const currentlySelected = selectedCountries.includes(country.country);
            
            if (dragMode === 'select' && !currentlySelected) {
              toggleCountrySelection(country.country);
            } else if (dragMode === 'deselect' && currentlySelected) {
              toggleCountrySelection(country.country);
            }
          } else {
            // Hover effect when not dragging
            button.attr('fill-opacity', isSelected ? 0.8 : 0.2);
          }
        })
        .on('mouseleave', function(event) {
          if (!isDragging) {
            // Reset hover effect
            button.attr('fill-opacity', isSelected ? 1.0 : 0.1);
          }
        });
    });
    
    // Add y-axis label
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .style('font-size', '13px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Energy (TWh)');
    
    // Add legend - positioned at top right
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 140}, 20)`);
    
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
        if (country.hasValidTradeBalance) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: N/A</div>`;
        }
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
  }, [currentYear, getCountryData, selectedCountries, isDragging, dragMode]);

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

  const drawComparisonChart = useCallback(() => {
    if (!comparisonChartRef.current || selectedCountries.length === 0) {
      // Clear the chart if no countries selected
      if (comparisonChartRef.current) {
        d3.select(comparisonChartRef.current).selectAll("*").remove();
      }
      return;
    }
    
    const svg = d3.select(comparisonChartRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    // Set dimensions for comparison chart - use full container width
    const containerWidth = container.clientWidth || 400;
    const containerHeight = container.clientHeight || 300;
    const width = containerWidth; // Use full container width
    const height = Math.max(containerHeight - 10, 250);
    
    svg.selectAll("*").remove();
    
    const margin = { top: 30, right: 10, bottom: 80, left: 50 }; // Reduced margins
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Prepare comparison data for selected countries
    const comparisonData = [];
    selectedCountries.forEach(countryName => {
      Object.values(countriesData).forEach(country => {
        if (country.name === countryName) {
          const generation = Number(country.net_generation?.[currentYear]);
          const consumption = Number(country.net_consumption?.[currentYear]);
          const tradeBalanceValue = country.trade_balance?.[currentYear];
          
          if (!isNaN(generation) && !isNaN(consumption)) {
            const tradeBalance = (tradeBalanceValue != null && !isNaN(Number(tradeBalanceValue))) 
              ? Number(tradeBalanceValue) 
              : null;
            
            comparisonData.push({
              country: country.name,
              generation: generation,
              consumption: consumption,
              tradeBalance: tradeBalance,
              hasValidTradeBalance: tradeBalance !== null
            });
          }
        }
      });
    });
    
    // Sort by generation (big to small)
    comparisonData.sort((a, b) => b.generation - a.generation);
    
    if (comparisonData.length === 0) {
      svg.attr('width', width).attr('height', height);
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text('Select countries to compare')
        .style('font-size', '14px')
        .style('fill', '#666');
      return;
    }
    
    // Set SVG dimensions
    svg.attr('width', width).attr('height', height);
    
    // Create scales
    const maxValue = d3.max(comparisonData, d => Math.max(d.consumption, d.generation));
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([chartHeight, 0]);
    
    const xScale = d3.scaleBand()
      .domain(comparisonData.map(d => d.country))
      .range([0, chartWidth])
      .padding(0.1); // Reduced padding for wider bars
    
    // Create chart group
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Add grid lines (horizontal)
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickSize(-chartWidth)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-grid')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '9px')
      .style('fill', '#666');
    
    // Remove grid line labels (keep only grid lines)
    chartGroup.select('.chart-grid')
      .selectAll('text').remove();
    
    // Draw bars for each country
    comparisonData.forEach((country, i) => {
      const xPos = xScale(country.country);
      const barWidth = xScale.bandwidth();
      
      // Generation bar (blue) - left half
      const generationHeight = chartHeight - yScale(country.generation);
      chartGroup.append('rect')
        .attr('class', 'generation-bar')
        .attr('x', xPos)
        .attr('y', yScale(country.generation))
        .attr('width', barWidth * 0.45)
        .attr('height', generationHeight)
        .attr('fill', '#2196F3')
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showComparisonTooltip(event, country, 'generation');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // Consumption bar (yellow) - right half
      const consumptionHeight = chartHeight - yScale(country.consumption);
      chartGroup.append('rect')
        .attr('class', 'consumption-bar')
        .attr('x', xPos + barWidth * 0.55)
        .attr('y', yScale(country.consumption))
        .attr('width', barWidth * 0.45)
        .attr('height', consumptionHeight)
        .attr('fill', '#ffc107')
        .attr('fill-opacity', 0.7)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showComparisonTooltip(event, country, 'consumption');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // Trade balance arrow (only if valid trade balance)
      if (country.hasValidTradeBalance && country.tradeBalance !== 0) {
        const tradeBalance = country.tradeBalance;
        const arrowLength = Math.abs(yScale(0) - yScale(Math.abs(tradeBalance)));
        const arrowColor = tradeBalance > 0 ? '#228b22' : '#ffd700';
        const generationTop = yScale(country.generation);
        
        // Arrow shaft (vertical line)
        const arrowX = xPos + barWidth * 0.225;
        const arrowStartY = generationTop;
        const arrowEndY = tradeBalance > 0 ? generationTop - arrowLength : generationTop + arrowLength;
        
        chartGroup.append('line')
          .attr('class', 'trade-arrow-shaft')
          .attr('x1', arrowX)
          .attr('y1', arrowStartY)
          .attr('x2', arrowX)
          .attr('y2', arrowEndY)
          .attr('stroke', arrowColor)
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 3);
            showComparisonTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 2);
            hideTooltip();
          });
        
        // Arrow head (triangle)
        const headSize = 3;
        const arrowHeadY = arrowEndY;
        const arrowHeadPoints = tradeBalance > 0 
          ? `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY + headSize} ${arrowX + headSize},${arrowHeadY + headSize}`
          : `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY - headSize} ${arrowX + headSize},${arrowHeadY - headSize}`;
        
        chartGroup.append('polygon')
          .attr('class', 'trade-arrow-head')
          .attr('points', arrowHeadPoints)
          .attr('fill', arrowColor)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('fill-opacity', 0.8);
            showComparisonTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('fill-opacity', 1);
            hideTooltip();
          });
      }
    });
    
    // Add x-axis with country names
    chartGroup.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#333')
      .attr('transform', 'rotate(-35)')
      .style('text-anchor', 'end');
    
    // Add y-axis label
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Energy (TWh)');
    
    // Add title
    chartGroup.append('text')
      .attr('class', 'chart-title')
      .attr('x', chartWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text(`Country Comparison (${comparisonData.length} selected)`);

    // Tooltip functions for comparison chart
    function showComparisonTooltip(event, country, type) {
      if (!tooltipRef.current) return;
      
      const tooltip = d3.select(tooltipRef.current);
      let content = `<div><strong>${country.country}</strong></div>`;
      
      if (type === 'generation') {
        content += `<div>Generation: ${country.generation.toFixed(1)} TWh</div>`;
      } else if (type === 'consumption') {
        content += `<div>Consumption: ${country.consumption.toFixed(1)} TWh</div>`;
      } else if (type === 'trade') {
        if (country.hasValidTradeBalance) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: N/A</div>`;
        }
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
      
  }, [currentYear, selectedCountries, countriesData, tooltipRef]);

  // Initialize comparison chart
  useEffect(() => {
    const timer = setTimeout(() => {
      if (comparisonChartRef.current) {
        drawComparisonChart();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [drawComparisonChart]);

  // Toggle country selection
  const toggleCountrySelection = useCallback((countryName) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryName)) {
        // Remove if already selected
        return prev.filter(name => name !== countryName);
      } else {
        // Add if not selected (no limit now)
        return [...prev, countryName];
      }
    });
  }, []);

  // End drag mode
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStartCountry(null);
  }, []);

  // Add global mouse up listener for drag end
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging, handleDragEnd]);

  return (
    <div id="world-view" className="view-container">
      <div id="upper-left-panel">
        <div id="map-section">
          <svg ref={mapRef} id="map"></svg>
        </div>
      </div>
      
      <div id="upper-right-panel">
        <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '10px', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#333' }}>
              Country Comparison
            </h4>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>
              Click or drag + buttons below countries to compare
            </div>
            {selectedCountries.length > 0 && (
              <button 
                onClick={() => setSelectedCountries([])}
                style={{
                  fontSize: '10px',
                  padding: '4px 8px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Clear All ({selectedCountries.length})
              </button>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg ref={comparisonChartRef} style={{ width: '100%', height: '100%' }}></svg>
          </div>
        </div>
      </div>
      
      <div id="lower-panel">
        <div id="horizontal-chart-container">
          <svg ref={horizontalChartRef} id="horizontal-chart"></svg>
        </div>
      </div>
    </div>
  );
};

export default World;

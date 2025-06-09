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
  const trendChartRef = useRef();
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCountry, setDragStartCountry] = useState(null);
  const [dragMode, setDragMode] = useState('select'); // 'select' or 'deselect'
  const hasInitialized = useRef(false);
  
  // Add ref for immediate drag state access
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef('select');

  // Country name mapping to handle differences between data and map
  const getMapCountryName = useCallback((dataCountryName) => {
    const nameMapping = {
      'United States': 'United States of America',
      'USA': 'United States of America',
      'Russia': 'Russian Federation',
      'South Korea': 'Republic of Korea',
      'North Korea': 'Democratic People\'s Republic of Korea',
      'Iran': 'Iran (Islamic Republic of)',
      'Venezuela': 'Venezuela (Bolivarian Republic of)',
      'Bolivia': 'Bolivia (Plurinational State of)',
      'Tanzania': 'United Republic of Tanzania',
      'Democratic Republic of the Congo': 'Democratic Republic of the Congo',
      'Congo': 'Republic of the Congo',
      'Czech Republic': 'Czechia',
      'Macedonia': 'North Macedonia',
      'Moldova': 'Republic of Moldova',
      'Syria': 'Syrian Arab Republic',
      'Laos': 'Lao People\'s Democratic Republic',
      'Vietnam': 'Viet Nam',
      'Brunei': 'Brunei Darussalam'
    };
    
    return nameMapping[dataCountryName] || dataCountryName;
  }, []);

  // Reverse mapping to convert map country names back to data country names
  const getDataCountryName = useCallback((mapCountryName) => {
    const reverseMapping = {
      'United States of America': 'United States',
      'Russian Federation': 'Russia',
      'Republic of Korea': 'South Korea',
      'Democratic People\'s Republic of Korea': 'North Korea',
      'Iran (Islamic Republic of)': 'Iran',
      'Venezuela (Bolivarian Republic of)': 'Venezuela',
      'Bolivia (Plurinational State of)': 'Bolivia',
      'United Republic of Tanzania': 'Tanzania',
      'Republic of the Congo': 'Congo',
      'Czechia': 'Czech Republic',
      'North Macedonia': 'Macedonia',
      'Republic of Moldova': 'Moldova',
      'Syrian Arab Republic': 'Syria',
      'Lao People\'s Democratic Republic': 'Laos',
      'Viet Nam': 'Vietnam',
      'Brunei Darussalam': 'Brunei'
    };
    
    return reverseMapping[mapCountryName] || mapCountryName;
  }, []);

  // Initialize selectedCountries with all valid countries on first load only
  useEffect(() => {
    if (!hasInitialized.current) {
      const allValidCountries = [];
      Object.values(countriesData).forEach(country => {
        const generation = Number(country.net_generation?.[currentYear]);
        const consumption = Number(country.net_consumption?.[currentYear]);
        
        // Include countries if they have valid generation and consumption data
        if (!isNaN(generation) && !isNaN(consumption)) {
          allValidCountries.push(country.name);
        }
      });
      setSelectedCountries(allValidCountries);
      hasInitialized.current = true;
    }
  }, [currentYear, countriesData]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    
    const svg = d3.select(mapRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    svg.selectAll("*").remove(); // Clear previous content
    
    const land = feature(world, world.objects.countries);
    
    // 고정 크기로 지도 렌더링 (여백 없이)
    const mapWidth = 600;  // 적당한 크기
    const mapHeight = 400;
    
    const projection = d3.geoNaturalEarth1().fitSize([mapWidth, mapHeight], land);
    const path = d3.geoPath(projection);
    
    // SVG 크기를 고정 크기로 설정
    svg.attr('width', mapWidth).attr('height', mapHeight);
    
    // g 요소에 transform 없이 렌더링
    const mapGroup = svg.append('g');
    
    mapGroup.selectAll('path')
      .data(land.features)
      .join('path')
      .attr('d', path)
      .attr('fill', '#eee')
      .attr('stroke', '#999')
      .style('cursor', 'pointer')
      .on('click', (event, d) => handleCountryClick(event, d))
      .on('mouseover', (event, d) => handleMouseOver(event, d))
      .on('mouseout', handleMouseOut);
    

    // Add vertical gradient legend
    const legend = svg.append('g')
      .attr('class', 'map-legend')
      .attr('transform', `translate(30, ${mapHeight - 120})`);
    
    // Create gradient definition
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    
    // Add gradient stops
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#388e3c'); // High exports (green)
    
    gradient.append('stop')
      .attr('offset', '25%')
      .attr('stop-color', '#e8f5e8'); // Low exports (light green)
    
    gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#ffffff'); // Balanced (white)
    
    gradient.append('stop')
      .attr('offset', '75%')
      .attr('stop-color', '#ffccbc'); // Low imports (light brownish orange)
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#d84315'); // High imports (brownish orange)
    
    // Legend background
    legend.append('rect')
      .attr('class', 'legend-background')
      .attr('x', -8)
      .attr('y', -15)
      .attr('width', 80)
      .attr('height', 90)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 1)
      .attr('rx', 4);
    
    // Gradient bar
    legend.append('rect')
      .attr('class', 'legend-gradient-bar')
      .attr('x', 0)
      .attr('y', 15)
      .attr('width', 15)
      .attr('height', 50)
      .attr('fill', 'url(#legend-gradient)')
      .attr('stroke', '#999')
      .attr('stroke-width', 0.5);
    
    // Legend title
    legend.append('text')
      .attr('class', 'legend-title')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '10px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Trade Balance');
    
    // High label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 20)
      .style('font-size', '9px')
      .style('fill', '#333')
      .text('High');
    
    // Export label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 30)
      .style('font-size', '8px')
      .style('fill', '#666')
      .text('Export');
    
    // Balanced label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 42)
      .style('font-size', '8px')
      .style('fill', '#666')
      .text('Balanced');
    
    // Import label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 54)
      .style('font-size', '8px')
      .style('fill', '#666')
      .text('Import');
    
    // Low label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 64)
      .style('font-size', '9px')
      .style('fill', '#333')
      .text('Low');
    
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
      const deepBrownOrangeColor = "#d84315"; // Strong imports (negative values) - Brownish Orange
      const lightBrownOrangeColor = "#ffccbc"; // Moderate imports - Light Brownish Orange
      const whiteColor = "#ffffff";          // Neutral/balanced
      const lightGreenColor = "#e8f5e8";     // Moderate exports - Natural Light Green
      const greenColor = "#388e3c";          // Strong exports (positive values) - Green
      
      if (value < 0) {
        // Negative values (imports) - use brownish orange scale
        return d3.scaleLinear()
          .domain([globalMinTradeBalance, 0])
          .range([deepBrownOrangeColor, whiteColor])
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
    
    // Update country colors and highlighting
    svg.select('g').selectAll('path')
      .attr('fill', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const countryData = getCountryData(dataCountryName);
        
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
      })
      .attr('fill-opacity', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const isSelected = selectedCountries.includes(dataCountryName);
        const hasSelections = selectedCountries.length > 0;
        
        if (hasSelections) {
          return isSelected ? 1.0 : 0.2; // Make unselected countries less opaque but still visible
        }
        return 1.0; // Normal opacity when no countries selected
      })
      .attr('stroke', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const isSelected = selectedCountries.includes(dataCountryName);
        return isSelected ? '#2E7D32' : '#999';
      })
      .attr('stroke-width', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const isSelected = selectedCountries.includes(dataCountryName);
        return isSelected ? 2 : 0.5;
      })
      .attr('stroke-opacity', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const isSelected = selectedCountries.includes(dataCountryName);
        const hasSelections = selectedCountries.length > 0;
        
        if (hasSelections) {
          return isSelected ? 1.0 : 0.4; // Make unselected countries stroke less opaque but still visible
        }
        return 1.0; // Normal stroke opacity when no countries selected
      });
  }, [currentYear, getCountryData, globalMaxTradeBalance, globalMinTradeBalance, selectedCountries, getDataCountryName]);

  // Update choropleth when selectedCountries changes
  useEffect(() => {
    updateChoropleth();
  }, [updateChoropleth]);

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
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const width = containerWidth;
    const height = containerHeight;
    
    svg.selectAll("*").remove();
    
    const margin = { top: 50, right: 25, bottom: 55, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = Math.min(height - margin.top - margin.bottom, 450); // Cap max height at 450px
    
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
    
    // Create scales - adjust max value to include generation + imports
    let maxValue = 0;
    chartData.forEach(country => {
      const generationValue = country.generation;
      const importValue = country.hasValidTradeBalance && country.tradeBalance < 0 ? Math.abs(country.tradeBalance) : 0;
      const totalValue = generationValue + importValue;
      maxValue = Math.max(maxValue, country.consumption, totalValue);
    });
    maxValue += 10; // Add 10 TWh buffer
    
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
      .ticks(4)
      .tickSize(-chartWidth)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-grid')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '8px')
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
          showBarTooltip(event, country, 'generation-with-trade');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // Consumption bar (grey)
      const consumptionHeight = chartHeight - yScale(country.consumption);
      chartGroup.append('rect')
        .attr('class', 'consumption-bar')
        .attr('data-country-index', i)
        .attr('data-country-name', country.country)
        .attr('x', xPos + barOffset + barWidthAdjusted / 2)
        .attr('y', yScale(country.consumption))
        .attr('width', barWidthAdjusted / 2 - 1)
        .attr('height', consumptionHeight)
        .attr('fill', '#999')
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showBarTooltip(event, country, 'consumption');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // Trade balance box (only if valid trade balance and not zero)
      if (country.hasValidTradeBalance && Math.abs(country.tradeBalance) > 0.01) {
        const tradeBalance = country.tradeBalance;
        const tradeAmount = Math.abs(tradeBalance);
        const boxHeight = Math.abs(yScale(0) - yScale(tradeAmount));
        const generationTop = yScale(country.generation);
        const boxX = xPos + barOffset;
        const boxWidth = barWidthAdjusted / 2 - 1;
        
        // Import (negative trade balance): deep orange, above generation bar
        // Export (positive trade balance): teal, below generation bar
        const isImport = tradeBalance < 0;
        const boxColor = isImport ? '#ff5722' : '#00897b';
        const boxY = isImport ? generationTop - boxHeight : generationTop;
        
        // Dashed rectangle for trade amount
        chartGroup.append('rect')
          .attr('class', 'trade-balance-box')
          .attr('data-country-index', i)
          .attr('data-country-name', country.country)
          .attr('x', boxX)
          .attr('y', boxY)
          .attr('width', boxWidth)
          .attr('height', boxHeight)
          .attr('fill', boxColor)
          .attr('fill-opacity', 0.5)
          .attr('stroke', boxColor)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 2);
            showBarTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 1);
            hideTooltip();
          });
        
        // Arrow spanning the full height of the trade box
        const arrowX = boxX + boxWidth / 2;
        const arrowStartY = isImport ? boxY + boxHeight : boxY;
        const arrowEndY = isImport ? boxY : boxY + boxHeight;
        
        // Adjust arrow head size based on box height
        const headSize = Math.min(6, boxHeight * 0.4);
        
        // Arrow shaft - full height
        chartGroup.append('line')
          .attr('class', 'trade-arrow-shaft')
          .attr('data-country-index', i)
          .attr('data-country-name', country.country)
          .attr('x1', arrowX)
          .attr('y1', arrowStartY)
          .attr('x2', arrowX)
          .attr('y2', arrowEndY)
          .attr('stroke', boxColor)
          .attr('stroke-width', 3)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 5);
            showBarTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 3);
            hideTooltip();
          });
        
        // Arrow head at the direction end
        if (headSize > 1) { // Only draw arrow head if big enough
          const arrowHeadY = isImport ? boxY : boxY + boxHeight;
          const arrowHeadPoints = isImport
            ? `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY + headSize} ${arrowX + headSize},${arrowHeadY + headSize}`
            : `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY - headSize} ${arrowX + headSize},${arrowHeadY - headSize}`;
          
          chartGroup.append('polygon')
            .attr('class', 'trade-arrow-head')
            .attr('data-country-index', i)
            .attr('data-country-name', country.country)
            .attr('points', arrowHeadPoints)
            .attr('fill', boxColor)
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
      }
    });
    
    // Add x-axis with country names and selection buttons
    const xAxisGroup = chartGroup.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale));
    
    // Style the x-axis text and color based on selection
    xAxisGroup.selectAll('text')
      .style('font-size', '8px')
      .style('fill', d => {
        const isSelected = selectedCountries.includes(d);
        return isSelected ? '#2196F3' : '#333';
      })
      .style('font-weight', d => {
        const isSelected = selectedCountries.includes(d);
        return isSelected ? '600' : 'normal';
      })
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dy', '0.7em');
    
    // Add selection buttons/areas for each country (below country names)
    chartData.forEach((country, i) => {
      const xPos = xScale(country.country);
      const isSelected = selectedCountries.includes(country.country);
      const buttonY = chartHeight + 35; // Position further below the country names
      
      // Create a button group to handle all events together
      const buttonGroup = chartGroup.append('g')
        .attr('class', 'country-selector-group')
        .attr('data-country', country.country)
        .style('cursor', 'pointer')
        .style('user-select', 'none');
      
      // Add checkbox icon only - no background
      const iconSize = 10;
      const iconX = xPos + xScale.bandwidth() / 2 - iconSize / 2;
      const iconY = buttonY;
      
      const checkboxIcon = buttonGroup.append('rect')
        .attr('class', 'country-checkbox-icon')
        .attr('x', iconX)
        .attr('y', iconY)
        .attr('width', iconSize)
        .attr('height', iconSize)
        .attr('fill', isSelected ? '#2196F3' : 'white')
        .attr('stroke', isSelected ? '#2196F3' : '#999')
        .attr('stroke-width', 1)
        .attr('rx', 2);
      
      // Add checkmark if selected
      if (isSelected) {
        buttonGroup.append('text')
          .attr('class', 'country-checkbox-checkmark')
          .attr('x', iconX + iconSize / 2)
          .attr('y', iconY + iconSize / 2 + 2)
          .attr('text-anchor', 'middle')
          .style('font-size', '7px')
          .style('font-weight', '900')
          .style('fill', 'white')
          .style('pointer-events', 'none')
          .text('✓');
      }
      
      // Event handlers - Simple and clean
      buttonGroup
        .on('mousedown', function(event) {
          event.preventDefault();
          event.stopPropagation();
          
          const currentlySelected = selectedCountries.includes(country.country);
          
          // Start drag mode - determine if we're selecting or deselecting
          const newDragMode = currentlySelected ? 'deselect' : 'select';
          
          setIsDragging(true);
          setDragMode(newDragMode);
          isDraggingRef.current = true;
          dragModeRef.current = newDragMode;
          
          // Toggle this country immediately
          toggleCountrySelection(country.country);
        })
        .on('mouseenter', function(event) {
          if (isDraggingRef.current) {
            // During drag - apply drag mode to this country
            const currentlySelected = selectedCountries.includes(country.country);
            
            if (dragModeRef.current === 'select' && !currentlySelected) {
              toggleCountrySelection(country.country);
            } else if (dragModeRef.current === 'deselect' && currentlySelected) {
              toggleCountrySelection(country.country);
            }
          } else {
            // Hover effect when not dragging - highlight checkbox
            checkboxIcon.attr('stroke-width', 2);
          }
        })
        .on('mouseleave', function(event) {
          if (!isDraggingRef.current) {
            // Reset hover effect
            checkboxIcon.attr('stroke-width', 1);
          }
        });
    });
    
    // Add Select All / Clear All buttons
    const buttonY = chartHeight + 55; // Position below the checkboxes
    const buttonGroup = chartGroup.append('g')
      .attr('class', 'bulk-action-buttons');
    
    // Select All button
    const selectAllButton = buttonGroup.append('g')
      .attr('class', 'bulk-action-button select-all')
      .style('cursor', 'pointer');
    
    selectAllButton.append('rect')
      .attr('x', chartWidth / 2 - 60)
      .attr('y', buttonY)
      .attr('width', 50)
      .attr('height', 20)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', '#2196F3')
      .attr('stroke-width', 1)
      .attr('rx', 4);
    
    selectAllButton.append('text')
      .attr('x', chartWidth / 2 - 35)
      .attr('y', buttonY + 13)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('font-weight', '500')
      .style('fill', '#2196F3')
      .style('pointer-events', 'none')
      .text('Select All');
    
    // Clear All button
    const clearAllButton = buttonGroup.append('g')
      .attr('class', 'bulk-action-button clear-all')
      .style('cursor', 'pointer');
    
    clearAllButton.append('rect')
      .attr('x', chartWidth / 2 + 10)
      .attr('y', buttonY)
      .attr('width', 50)
      .attr('height', 20)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', '#f44336')
      .attr('stroke-width', 1)
      .attr('rx', 4);
    
    clearAllButton.append('text')
      .attr('x', chartWidth / 2 + 35)
      .attr('y', buttonY + 13)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('font-weight', '500')
      .style('fill', '#f44336')
      .style('pointer-events', 'none')
      .text('Clear All');
    
    // Add event handlers
    selectAllButton
      .on('click', function() {
        const allCountries = chartData.map(d => d.country);
        setSelectedCountries(allCountries);
      })
      .on('mouseenter', function() {
        d3.select(this).select('rect')
          .attr('fill', '#e3f2fd')
          .attr('stroke', '#1976D2');
        d3.select(this).select('text')
          .style('fill', '#1976D2');
      })
      .on('mouseleave', function() {
        d3.select(this).select('rect')
          .attr('fill', 'rgba(255, 255, 255, 0.9)')
          .attr('stroke', '#2196F3');
        d3.select(this).select('text')
          .style('fill', '#2196F3');
      });
    
    clearAllButton
      .on('click', function() {
        setSelectedCountries([]);
      })
      .on('mouseenter', function() {
        d3.select(this).select('rect')
          .attr('fill', '#ffebee')
          .attr('stroke', '#d32f2f');
        d3.select(this).select('text')
          .style('fill', '#d32f2f');
      })
      .on('mouseleave', function() {
        d3.select(this).select('rect')
          .attr('fill', 'rgba(255, 255, 255, 0.9)')
          .attr('stroke', '#f44336');
        d3.select(this).select('text')
          .style('fill', '#f44336');
      });
    
    // Add chart title
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text(`Global Electricity Overview ${currentYear}`);
    
    // Add y-axis label
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -28)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Electricity (TWh)');
    
    // Add legend - positioned at top right
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 120}, 65)`);
    
    const legendData = [
      { label: 'Generation', color: '#2196F3', opacity: 0.8 },
      { label: 'Consumption', color: '#999', opacity: 0.8 },
      { label: 'Net Import', color: '#ff5722', opacity: 0.3 },
      { label: 'Net Export', color: '#00897b', opacity: 0.3 }
    ];
    
    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 12})`);
      
      legendItem.append('rect')
        .attr('width', 8)
        .attr('height', 8)
        .attr('fill', item.color)
        .attr('fill-opacity', item.opacity);
      
      legendItem.append('text')
        .attr('x', 12)
        .attr('y', 7)
        .style('font-size', '9px')
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
      } else if (type === 'generation-with-trade') {
        content += `<div>Generation: ${country.generation.toFixed(1)} TWh</div>`;
        if (country.hasValidTradeBalance && Math.abs(country.tradeBalance) > 0.01) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: Data not available</div>`;
        }
      } else if (type === 'consumption') {
        content += `<div>Consumption: ${country.consumption.toFixed(1)} TWh</div>`;
      } else if (type === 'trade') {
        if (country.hasValidTradeBalance) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: Data not available</div>`;
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
    const mapCountryName = d.properties.name;
    const dataCountryName = getDataCountryName(mapCountryName);
    const countryData = getCountryData(dataCountryName);
    
    if (tooltipRef.current) {
      const tooltip = d3.select(tooltipRef.current);
      if (countryData) {
        const tradeBalanceValue = countryData.trade_balance?.[currentYear];
        const tradeBalance = (tradeBalanceValue != null && !isNaN(Number(tradeBalanceValue))) ? Number(tradeBalanceValue) : null;
        
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div><strong>${dataCountryName}</strong></div>
            <div>Trade Balance: ${tradeBalance !== null ? tradeBalance.toFixed(1) + ' TWh' : 'Data not available'}</div>
          `);
      } else {
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div><strong>${mapCountryName}</strong></div>
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
    
    // Set dimensions for comparison chart - use full container
    const containerWidth = container.clientWidth || 400;
    const containerHeight = container.clientHeight || 300;
    const width = containerWidth;
    const height = containerHeight - 5; // Use almost full container height
    
    svg.selectAll("*").remove();
    
    const margin = { top: 30, right: 10, bottom: 70, left: 50 }; // Optimized margins to fill space
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
    
    // Create scales - adjust max value to include generation + imports
    let maxValue = 0;
    comparisonData.forEach(country => {
      const generationValue = country.generation;
      const importValue = country.hasValidTradeBalance && country.tradeBalance < 0 ? Math.abs(country.tradeBalance) : 0;
      const totalValue = generationValue + importValue;
      maxValue = Math.max(maxValue, country.consumption, totalValue);
    });
    maxValue += 10; // Add 10 TWh buffer
    
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
    
    // Add y-axis with labels
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '9px')
      .style('fill', '#666');
    
    // Add grid lines (horizontal) - separate from y-axis
    const gridAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickSize(-chartWidth)
      .tickFormat('');
    
    chartGroup.append('g')
      .attr('class', 'chart-grid')
      .call(gridAxis);
    
    // Draw bars for each country
    comparisonData.forEach((country, i) => {
      const xPos = xScale(country.country);
      const barWidth = xScale.bandwidth();
      
      // Generation bar (blue) - left half, closer together
      const generationHeight = chartHeight - yScale(country.generation);
      chartGroup.append('rect')
        .attr('class', 'generation-bar')
        .attr('x', xPos + barWidth * 0.1)
        .attr('y', yScale(country.generation))
        .attr('width', barWidth * 0.38)
        .attr('height', generationHeight)
        .attr('fill', '#2196F3')
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showComparisonTooltip(event, country, 'generation-with-trade');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // Consumption bar (grey) - right half, closer together
      const consumptionHeight = chartHeight - yScale(country.consumption);
      chartGroup.append('rect')
        .attr('class', 'consumption-bar')
        .attr('x', xPos + barWidth * 0.52)
        .attr('y', yScale(country.consumption))
        .attr('width', barWidth * 0.38)
        .attr('height', consumptionHeight)
        .attr('fill', '#999')
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showComparisonTooltip(event, country, 'consumption');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // Trade balance box (only if valid trade balance and not zero)
      if (country.hasValidTradeBalance && Math.abs(country.tradeBalance) > 0.01) {
        const tradeBalance = country.tradeBalance;
        const tradeAmount = Math.abs(tradeBalance);
        const boxHeight = Math.abs(yScale(0) - yScale(tradeAmount));
        const generationTop = yScale(country.generation);
        const boxX = xPos + barWidth * 0.1;
        const boxWidth = barWidth * 0.38;
        
        // Import (negative trade balance): deep orange, above generation bar
        // Export (positive trade balance): teal, below generation bar
        const isImport = tradeBalance < 0;
        const boxColor = isImport ? '#ff5722' : '#00897b';
        const boxY = isImport ? generationTop - boxHeight : generationTop;
        
        // Dashed rectangle for trade amount
        chartGroup.append('rect')
          .attr('class', 'trade-balance-box')
          .attr('x', boxX)
          .attr('y', boxY)
          .attr('width', boxWidth)
          .attr('height', boxHeight)
          .attr('fill', boxColor)
          .attr('fill-opacity', 0.5)
          .attr('stroke', boxColor)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 2);
            showComparisonTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 1);
            hideTooltip();
          });
        
        // Arrow spanning the full height of the trade box
        const arrowX = boxX + boxWidth / 2;
        const arrowStartY = isImport ? boxY + boxHeight : boxY;
        const arrowEndY = isImport ? boxY : boxY + boxHeight;
        
        // Adjust arrow head size based on box height
        const headSize = Math.min(5, boxHeight * 0.4);
        
        // Arrow shaft - full height
        chartGroup.append('line')
          .attr('class', 'trade-arrow-shaft')
          .attr('x1', arrowX)
          .attr('y1', arrowStartY)
          .attr('x2', arrowX)
          .attr('y2', arrowEndY)
          .attr('stroke', boxColor)
          .attr('stroke-width', 3)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 5);
            showComparisonTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 3);
            hideTooltip();
          });
        
        // Arrow head at the direction end
        if (headSize > 1) { // Only draw arrow head if big enough
          const arrowHeadY = isImport ? boxY : boxY + boxHeight;
          const arrowHeadPoints = isImport
            ? `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY + headSize} ${arrowX + headSize},${arrowHeadY + headSize}`
            : `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY - headSize} ${arrowX + headSize},${arrowHeadY - headSize}`;
          
          chartGroup.append('polygon')
            .attr('class', 'trade-arrow-head')
            .attr('points', arrowHeadPoints)
            .attr('fill', boxColor)
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
      }
    });
    
    // Add x-axis with country names
    chartGroup.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', comparisonData.length > 20 ? '7px' : '10px')
      .style('fill', d => {
        const isSelected = selectedCountries.includes(d);
        return isSelected ? '#2196F3' : '#333';
      })
      .style('font-weight', d => {
        const isSelected = selectedCountries.includes(d);
        return isSelected ? '600' : 'normal';
      })
      .attr('transform', 'rotate(-35)')
      .style('text-anchor', 'end')
      .attr('dy', '0.7em');
    
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
      .text('Electricity (TWh)');
    
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
      } else if (type === 'generation-with-trade') {
        content += `<div>Generation: ${country.generation.toFixed(1)} TWh</div>`;
        if (country.hasValidTradeBalance && Math.abs(country.tradeBalance) > 0.01) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: Data not available</div>`;
        }
      } else if (type === 'consumption') {
        content += `<div>Consumption: ${country.consumption.toFixed(1)} TWh</div>`;
      } else if (type === 'trade') {
        if (country.hasValidTradeBalance) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: Data not available</div>`;
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

  // Draw global trend chart
  const drawTrendChart = useCallback(() => {
    if (!trendChartRef.current) return;
    
    const svg = d3.select(trendChartRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    // Set dimensions
    const containerWidth = container.clientWidth || 800;
    const containerHeight = container.clientHeight || 350;
    const width = containerWidth;
    const height = containerHeight;
    
    svg.selectAll("*").remove();
    
    const margin = { top: 50, right: 120, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Calculate global totals for each year
    const years = [];
    for (let year = 1990; year <= 2023; year++) {
      years.push(year);
    }
    
    const trendData = years.map(year => {
      let totalGeneration = 0;
      let totalConsumption = 0;
      let totalTrade = 0; // absolute sum of all trade (imports + exports)
      
      Object.values(countriesData).forEach(country => {
        const generation = Number(country.net_generation?.[year]);
        const consumption = Number(country.net_consumption?.[year]);
        const tradeBalance = Number(country.trade_balance?.[year]);
        
        if (!isNaN(generation)) totalGeneration += generation;
        if (!isNaN(consumption)) totalConsumption += consumption;
        if (!isNaN(tradeBalance)) totalTrade += Math.abs(tradeBalance);
      });
      
      return {
        year,
        generation: totalGeneration,
        consumption: totalConsumption,
        trade: totalTrade
      };
    });
    
    // Set SVG dimensions
    svg.attr('width', width).attr('height', height);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([0, chartWidth]);
    
    const maxValue = d3.max(trendData, d => Math.max(d.generation, d.consumption, d.trade));
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([chartHeight, 0]);
    
    // Create chart group
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Add grid lines
    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
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
    
    // Add y-axis with labels
    const yAxisLabels = d3.axisLeft(yScale)
      .ticks(6)
      .tickSize(0)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-y-axis')
      .call(yAxisLabels)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666');
    
    // Add x-axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(8)
      .tickFormat(d => d.toString());
    
    chartGroup.append('g')
      .attr('class', 'chart-x-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666');
    
    // Create line generators
    const lineGeneration = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.generation))
      .curve(d3.curveMonotoneX);
    
    const lineConsumption = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.consumption))
      .curve(d3.curveMonotoneX);
    
    const lineTrade = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.trade))
      .curve(d3.curveMonotoneX);
    
    // Draw lines
    chartGroup.append('path')
      .datum(trendData)
      .attr('class', 'trend-line-generation')
      .attr('d', lineGeneration)
      .attr('fill', 'none')
      .attr('stroke', '#2196F3')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8);
    
    chartGroup.append('path')
      .datum(trendData)
      .attr('class', 'trend-line-consumption')
      .attr('d', lineConsumption)
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8);
    
    chartGroup.append('path')
      .datum(trendData)
      .attr('class', 'trend-line-trade')
      .attr('d', lineTrade)
      .attr('fill', 'none')
      .attr('stroke', '#ab47bc')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8);
    
    // Add dots for data points (always visible)
    const colors = ['#2196F3', '#999', '#ab47bc'];
    ['generation', 'consumption', 'trade'].forEach((metric, index) => {
      chartGroup.selectAll(`.dot-${metric}`)
        .data(trendData)
        .join('circle')
        .attr('class', `dot-${metric}`)
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d[metric]))
        .attr('r', 3)
        .attr('fill', colors[index])
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('opacity', 1);
    });

    // Add invisible overlay for mouse interaction
    const overlay = chartGroup.append('rect')
      .attr('class', 'chart-overlay')
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .style('cursor', 'crosshair');

    // Add vertical line for hover
    const hoverLine = chartGroup.append('line')
      .attr('class', 'hover-line')
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0);

    // Mouse interaction
    overlay
      .on('mousemove', function(event) {
        const [mouseX] = d3.pointer(event, this);
        const year = Math.round(xScale.invert(mouseX));
        
        // Find closest data point
        const closestData = trendData.find(d => d.year === year) || 
                           trendData.reduce((prev, curr) => 
                             Math.abs(curr.year - year) < Math.abs(prev.year - year) ? curr : prev);
        
        if (closestData) {
          const x = xScale(closestData.year);
          
          // Update hover line position
          hoverLine
            .attr('x1', x)
            .attr('x2', x)
            .style('opacity', 1);
          
          // Highlight dots at hover position
          ['generation', 'consumption', 'trade'].forEach(metric => {
            chartGroup.selectAll(`.dot-${metric}`)
              .attr('r', d => d.year === closestData.year ? 5 : 3)
              .attr('stroke-width', d => d.year === closestData.year ? 2 : 1);
          });
          
          // Show tooltip with all values
          showAllValuesTooltip(event, closestData);
        }
      })
      .on('mouseout', function() {
        hoverLine.style('opacity', 0);
        // Reset all dots to normal size
        chartGroup.selectAll('[class^="dot-"]')
          .attr('r', 3)
          .attr('stroke-width', 1);
        hideTooltip();
      });
    
    // Add current year indicator
    const currentYearLine = chartGroup.append('line')
      .attr('class', 'current-year-line')
      .attr('x1', xScale(currentYear))
      .attr('x2', xScale(currentYear))
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', '#ff4444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.7);
    
    // Add chart title
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Global Electricity Trends (1990-2023)');
    
    // Add y-axis label
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Electricity (TWh)');
    
    // Add x-axis label
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 45)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Year');
    
    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 110}, 60)`);
    
    const legendData = [
      { label: 'Generation', color: '#2196F3' },
      { label: 'Consumption', color: '#999' },
      { label: 'Total Trade', color: '#ab47bc' }
    ];
    
    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendItem.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', item.color)
        .attr('stroke-width', 3);
      
      legendItem.append('circle')
        .attr('cx', 7.5)
        .attr('cy', 0)
        .attr('r', 3)
        .attr('fill', item.color)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
      
      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 4)
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(item.label);
    });

    // Tooltip functions
    function showAllValuesTooltip(event, data) {
      if (!tooltipRef.current) return;
      
      const tooltip = d3.select(tooltipRef.current);
      
      let content = `<div style="font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">${data.year}</div>`;
      content += `<div style="display: flex; align-items: center; margin-bottom: 4px;">`;
      content += `<div style="width: 10px; height: 10px; background: #2196F3; margin-right: 6px; border-radius: 50%;"></div>`;
      content += `Generation: <strong>${data.generation.toLocaleString()} TWh</strong></div>`;
      content += `<div style="display: flex; align-items: center; margin-bottom: 4px;">`;
      content += `<div style="width: 10px; height: 10px; background: #999; margin-right: 6px; border-radius: 50%;"></div>`;
      content += `Consumption: <strong>${data.consumption.toLocaleString()} TWh</strong></div>`;
      content += `<div style="display: flex; align-items: center;">`;
      content += `<div style="width: 10px; height: 10px; background: #ab47bc; margin-right: 6px; border-radius: 50%;"></div>`;
      content += `Total Trade: <strong>${data.trade.toLocaleString()} TWh</strong></div>`;
      
      tooltip.style('opacity', 1)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(content);
    }
    
    function hideTooltip() {
      if (tooltipRef.current) {
        d3.select(tooltipRef.current).style('opacity', 0);
      }
    }
      
  }, [currentYear, countriesData, tooltipRef]);

  // Initialize comparison chart
  useEffect(() => {
    const timer = setTimeout(() => {
      if (comparisonChartRef.current) {
        drawComparisonChart();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [drawComparisonChart]);

  // Initialize trend chart
  useEffect(() => {
    const timer = setTimeout(() => {
      if (trendChartRef.current) {
        drawTrendChart();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentYear]);

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

  // End drag mode - now immediately updates refs
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStartCountry(null);
    isDraggingRef.current = false;
    dragModeRef.current = 'select';
  }, []);

  // Add global mouse up listener for drag end - improved
  useEffect(() => {
    const handleGlobalMouseUp = (event) => {
      if (isDraggingRef.current) {
        handleDragEnd();
      }
    };

    // Use capture phase for immediate handling
    document.addEventListener('mouseup', handleGlobalMouseUp, true);
    document.addEventListener('touchend', handleGlobalMouseUp, true);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp, true);
      document.removeEventListener('touchend', handleGlobalMouseUp, true);
    };
  }, [handleDragEnd]);

  // Handle window resize for charts
  useEffect(() => {
    const handleResize = () => {
      const timer = setTimeout(() => {
        if (horizontalChartRef.current) {
          drawHorizontalChart();
        }
        if (comparisonChartRef.current) {
          drawComparisonChart();
        }
        if (trendChartRef.current) {
          drawTrendChart();
        }
      }, 100);
      return () => clearTimeout(timer);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawHorizontalChart, drawComparisonChart, drawTrendChart]);

  return (
    <div id="world-view" className="view-container">
      <div id="upper-left-panel">
        <div className="map-wrapper">
          <div id="map-section">
            <svg ref={mapRef} id="map"></svg>
          </div>
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
      
      <div id="middle-panel">
        <div id="horizontal-chart-container">
          <div className="chart-wrapper">
            <svg ref={horizontalChartRef} id="horizontal-chart"></svg>
          </div>
        </div>
      </div>
      
      <div id="bottom-panel">
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <svg ref={trendChartRef} style={{ width: '100%', height: '100%' }}></svg>
        </div>
      </div>
    </div>
  );
};

export default World;

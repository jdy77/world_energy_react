import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import '../css/overview.css';

// 데이터 import
import world from '../data/countries-110m.json';
import countriesData from '../data/countries.js';
import koreaEnergySource from '../data/json/korea_energy_source.json';
import energyPrice from '../data/json/south_korea_energy_price_24_avg.json';
import southKoreaEnergyAll from '../data/json/south_korea_energy_all.json';
import southKoreaEnergyProduction from '../data/json/south_korea_energy_production.json';

// 파일 상단 import 부분에 추가
import InfoPopup from './PopupBackup';

const Overview = () => {
  // State variables
  const [currentYear, setCurrentYear] = useState(2018);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [currentView, setCurrentView] = useState('world'); // 'world' or 'korea'
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailCountry, setDetailCountry] = useState(null);
  const [showAllCountries, setShowAllCountries] = useState(false); // 차트에서 모든 국가 표시 여부
  const [energyMixPercentages, setEnergyMixPercentages] = useState({
    nuclear: 6.0,
    fossil: 12.0,
    renewable: 71.0,
    hydro: 1.0,
    other: 10.0
  });
  const [neededEnergy, setNeededEnergy] = useState(300000);
  const [isSliderActive, setIsSliderActive] = useState(false); // 슬라이더 활성 상태 추적
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  // Refs for D3 elements
  const mapRef = useRef();
  const horizontalChartRef = useRef();
  const koreaSmallMapRef = useRef();
  const koreaPieChartRef = useRef();
  const koreaLineChartRef = useRef();
  const koreaStackedChartRef = useRef();
  const neededEnergyPieRef = useRef();
  const tooltipRef = useRef();

  // Calculate global maximum self-sufficiency rate
  const globalMaxSelfSufficiency = React.useMemo(() => {
    let max = 0;
    Object.values(countriesData).forEach(country => {
      if (country.self_sufficiency_rate) {
        Object.values(country.self_sufficiency_rate).forEach(value => {
          if (!isNaN(value) && value > max) {
            max = value;
          }
        });
      }
    });
    return Math.ceil(max / 100) * 100;
  }, []);

  // Create country name mapping
  const countryNameToData = React.useMemo(() => {
    const mapping = {};
    Object.values(countriesData).forEach(country => {
      mapping[country.name] = country;
    });
    return mapping;
  }, []);

  // Helper function to find country data
  const getCountryData = useCallback((countryName) => {
    if (countryNameToData[countryName]) {
      return countryNameToData[countryName];
    }
    
    const nameVariations = {
      'United States of America': 'United States',
      'Russian Federation': 'Russia',
      'United Kingdom': 'United Kingdom',
      'Democratic Republic of the Congo': 'Dem. Rep. Congo',
      'Central African Republic': 'Central African Rep.',
      'Dominican Rep.': 'Dominican Republic',
      'Eq. Guinea': 'Equatorial Guinea',
      'W. Sahara': 'Western Sahara',
      'eSwatini': 'Eswatini',
      'S. Sudan': 'South Sudan',
      'Côte d\'Ivoire': 'Cote d\'Ivoire',
      'Bosnia and Herz.': 'Bosnia and Herzegovina',
      'Falkland Is.': 'Falkland Islands',
      'Solomon Is.': 'Solomon Islands',
      'Turkiye': 'Turkey'
    };
    
    if (nameVariations[countryName] && countryNameToData[nameVariations[countryName]]) {
      return countryNameToData[nameVariations[countryName]];
    }
    
    return null;
  }, [countryNameToData]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || currentView !== 'world') return;
    
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
  }, [currentYear, currentView, getCountryData]);

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

  // Initialize horizontal chart with better data handling
  useEffect(() => {
    const timer = setTimeout(() => {
      if (horizontalChartRef.current && currentView === 'world') {
        // showAllCountries 변경 시 스크롤 위치 리셋
        if (horizontalChartRef.current.parentElement) {
          horizontalChartRef.current.parentElement.scrollTop = 0;
        }
        drawHorizontalChart();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentYear, currentView, showAllCountries]);

  const drawHorizontalChart = useCallback(() => {
    if (!horizontalChartRef.current) return;
    
    const svg = d3.select(horizontalChartRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    const width = container.clientWidth || 800;
    
    svg.selectAll("*").remove();
    
    const margin = { top: 20, right: 120, bottom: 50, left: 150 };
    const chartWidth = width - margin.left - margin.right;
    
    // Prepare data - 기존 main.js 로직 그대로 사용
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
    
    // Calculate bar height - 일정한 간격으로 만들기
    const barHeight = 8; // 바 두께 줄임
    const barSpacing = 24; // 바 간격 늘림 (바 높이 + 여백)
    
    // 전체 차트 높이 계산 (스크롤 가능하도록)
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
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          handleBarHover(country.country);
        })
        .on('mouseout', function(event) {
          handleBarMouseOut();
        });
      
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
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          handleBarHover(country.country);
        })
        .on('mouseout', function(event) {
          handleBarMouseOut();
        });
      
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
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            handleBarHover(country.country);
          })
          .on('mouseout', function(event) {
            handleBarMouseOut();
          });
      }
    });
    
    // Add country labels - 모든 국가에 대해 라벨 표시 (이벤트 추가)
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
        .text(country.country)
        .on('mouseover', function(event) {
          handleBarHover(country.country);
        })
        .on('mouseout', function(event) {
          handleBarMouseOut();
        });
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
    
    // Add legend - 더 안전한 위치
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
    
    // Add toggle button - 더 안전한 위치 (버튼이 화면 밖으로 나가지 않도록)
    const buttonWidth = 130; // 버튼 너비 줄임
    const buttonX = Math.min(width - buttonWidth - 10, width - 140); // 화면 밖으로 나가지 않도록
    
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
      .style('font-size', '10px') // 폰트 크기 조금 줄임
      .style('font-weight', '600')
      .style('fill', '#333')
      .style('cursor', 'pointer')
      .text(showAllCountries ? 'Show Top 30' : 'Show All Countries')
      .on('click', () => setShowAllCountries(!showAllCountries));
      
  }, [currentYear, showAllCountries, getCountryData]);

  // Country bar highlighting functions
  const highlightCountryBar = useCallback((countryName) => {
    if (!horizontalChartRef.current) return;
    
    const svg = d3.select(horizontalChartRef.current);
    
    // Remove any existing highlights
    svg.selectAll('.consumption-bar, .generation-bar, .imports-bar')
      .classed('highlighted', false);
    svg.selectAll('.value-label').remove();
    
    if (!countryName) return;
    
         // Find the country data
    const countryData = getCountryData(countryName);
    if (!countryData) return;
    
    const generation = countryData.net_generation?.[currentYear];
    const consumption = countryData.net_consumption?.[currentYear];
    const imports = countryData.imports?.[currentYear];
    
    if (generation == null || consumption == null || imports == null ||
        isNaN(generation) || isNaN(consumption) || isNaN(imports)) {
      return;
    }
    
    // Find the index of this country in the current chart data
    const allChartData = [];
    Object.values(countriesData).forEach(country => {
      const gen = country.net_generation?.[currentYear];
      const cons = country.net_consumption?.[currentYear];
      const imp = country.imports?.[currentYear];
      
      if (gen != null && cons != null && imp != null &&
          !isNaN(gen) && !isNaN(cons) && !isNaN(imp)) {
        allChartData.push({
          country: country.name,
          generation: gen,
          consumption: cons,
          imports: imp,
          total: gen + imp
        });
      }
    });
    
    // Sort countries by net consumption (largest to smallest)
    allChartData.sort((a, b) => b.consumption - a.consumption);
    
    // Use the same filtering logic as drawHorizontalChart
    const chartData = showAllCountries ? allChartData : allChartData.slice(0, 30);
    const countryIndex = chartData.findIndex(d => d.country === countryName);
    
    if (countryIndex === -1) return; // Country not in current view
    
    // Highlight the bars for this country
    svg.selectAll('.consumption-bar')
      .filter(function() { return d3.select(this).attr('data-country-index') == countryIndex; })
      .classed('highlighted', true);
      
    svg.selectAll('.generation-bar')
      .filter(function() { return d3.select(this).attr('data-country-index') == countryIndex; })
      .classed('highlighted', true);
      
    svg.selectAll('.imports-bar')
      .filter(function() { return d3.select(this).attr('data-country-index') == countryIndex; })
      .classed('highlighted', true);
    
    // Add value labels
    const container = horizontalChartRef.current.parentElement;
    if (!container) return;
    
    const containerWidth = container.clientWidth - 16;
    const containerHeight = container.clientHeight - 16;
    const margin = { top: 20, right: 120, bottom: 50, left: 150 }; // Match drawHorizontalChart margin
    const chartWidth = containerWidth - margin.left - margin.right;
    
    const maxValue = d3.max(chartData, d => Math.max(d.consumption, d.total));
    const xScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, chartWidth]);
    
    // 동일한 yScale 함수 사용
    const yScale = (i) => margin.top + i * 24; // 동일한 barSpacing 사용
    const barHeight = 8; // 동일한 barHeight 사용
    
    const chartGroup = svg.select('g');
    
    // Add labels for the highlighted country
    const yPos = yScale(countryIndex) + barHeight / 2;
    const labelYPos = yPos + barHeight + 8; // Position labels below the bars with more spacing
    
    // Consumption label (gray) - positioned to the right of the bar
    if (consumption > 0) {
      chartGroup.append('text')
        .attr('class', 'value-label')
        .attr('x', xScale(consumption) + 15)
        .attr('y', yPos)
        .attr('alignment-baseline', 'middle')
        .style('fill', '#666')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .text(`${consumption.toFixed(1)} TWh`);
    }
    
    // Generation label (blue)
    if (generation > 0) {
      chartGroup.append('text')
        .attr('class', 'value-label')
        .attr('x', xScale(generation / 2))
        .attr('y', labelYPos)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .style('fill', '#2196F3')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .text(`${generation.toFixed(1)}`);
    }
    
    // Imports label (red)
    if (imports > 0) {
      chartGroup.append('text')
        .attr('class', 'value-label')
        .attr('x', xScale(generation) + xScale(imports / 2))
        .attr('y', labelYPos)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .style('fill', '#e53e3e')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .text(`${imports.toFixed(1)}`);
    }
  }, [currentYear, showAllCountries, getCountryData]);

  const removeCountryBarHighlight = useCallback(() => {
    if (!horizontalChartRef.current) return;
    
    const svg = d3.select(horizontalChartRef.current);
    // Remove highlights
    svg.selectAll('.consumption-bar, .generation-bar, .imports-bar')
      .classed('highlighted', false);
    // Remove value labels
    svg.selectAll('.value-label').remove();
  }, []);

  // Event handlers
  const handleCountryClick = (event, d) => {
    const countryName = d.properties.name;
    const countryData = getCountryData(countryName);
    
    if (countryName === 'South Korea') {
      setCurrentView('korea');
      setSelectedCountry('South Korea');
    } else if (countryData) {
      setDetailCountry({ name: countryName, data: countryData });
      setShowDetailPanel(true);
    }
  };

  const handleMouseOver = (event, d) => {
    const countryName = d.properties.name;
    const countryData = getCountryData(countryName);
    
    // 바 차트에서 해당 국가 강조
    highlightCountryBar(countryName);
    
    // Check if country is in current chart view and make button glow if not
    if (!showAllCountries && countryData && horizontalChartRef.current) {
      // Get the current top 30 countries
      const allChartData = [];
      Object.values(countriesData).forEach(country => {
        const generation = country.net_generation?.[currentYear];
        const consumption = country.net_consumption?.[currentYear];
        const imports = country.imports?.[currentYear];
        
        if (generation != null && consumption != null && imports != null &&
            !isNaN(generation) && !isNaN(consumption) && !isNaN(imports)) {
          allChartData.push({
            country: country.name,
            consumption: consumption
          });
        }
      });
      
      allChartData.sort((a, b) => b.consumption - a.consumption);
      const top30Countries = allChartData.slice(0, 30);
      const isInTop30 = top30Countries.some(c => c.country === countryName);
      
      // Make button glow if country is not in top 30
      if (!isInTop30) {
        const svg = d3.select(horizontalChartRef.current);
        svg.selectAll('.toggle-button')
          .attr('fill', '#ffeb3b')
          .attr('stroke', '#ffc107')
          .attr('stroke-width', 2)
          .style('filter', 'drop-shadow(0 0 8px #ffc107)')
          .style('cursor', 'pointer');
        
        svg.selectAll('.toggle-button-text')
          .style('fill', '#333')
          .style('font-weight', 'bold')
          .style('cursor', 'pointer');
      }
    }
    
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
    // Remove bar highlighting when tooltip is hidden
    removeCountryBarHighlight();
    
    // Remove button glow effect
    if (horizontalChartRef.current) {
      const svg = d3.select(horizontalChartRef.current);
      svg.selectAll('.toggle-button')
        .attr('fill', '#f0f0f0')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1)
        .style('filter', null);
      
      svg.selectAll('.toggle-button-text')
        .style('fill', '#333')
        .style('font-weight', '600');
    }
    
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  };

  const handleYearChange = (event) => {
    setCurrentYear(parseInt(event.target.value));
  };

  const handleCountrySelect = (event) => {
    const country = event.target.value;
    setSelectedCountry(country);
    if (country === 'South Korea') {
      setCurrentView('korea');
    } else if (country === '') {
      setCurrentView('world');
    }
  };

  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    setDetailCountry(null);
  };

  // Korea visualizations effects
  useEffect(() => {
    if (currentView === 'korea') {
      const timer = setTimeout(() => {
        drawKoreaSmallMap();
        drawKoreaPieChart();
        drawKoreaLineChart();
        drawKoreaStackedChart();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentView, currentYear]);

  // Needed Energy Pie Chart - 실시간 업데이트
  useEffect(() => {
    if (currentView === 'korea') {
      updateNeededEnergyPie();
    }
  }, [currentView, energyMixPercentages]);

  const drawKoreaSmallMap = () => {
    if (!koreaSmallMapRef.current) return;
    
    const svg = d3.select(koreaSmallMapRef.current);
    svg.selectAll("*").remove();
    
    // viewBox를 사용한 반응형 설정
    const viewBoxWidth = 200;
    const viewBoxHeight = 120;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const width = viewBoxWidth;
    const height = viewBoxHeight;
    
    const projection = d3.geoMercator()
      .center([128, 36])
      .scale(Math.min(width, height) * 1) // 줌 레벨을 낮춰서 주변국들도 보이게 조정
      .translate([width/2, height/2]);
      
    const path = d3.geoPath(projection);
    const land = feature(world, world.objects.countries);
    
    svg.append('g')
      .selectAll('path')
      .data(land.features)
      .join('path')
      .attr('d', path)
      .attr('fill', '#eee')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.3);
    
    svg.append('g')
      .selectAll('path')
      .data(land.features.filter(d => d.properties.name === 'South Korea'))
      .join('path')
      .attr('d', path)
      .attr('fill', '#2196F3')
      .attr('stroke', '#1976D2')
      .attr('stroke-width', 1);
  };

  const drawKoreaPieChart = () => {
    if (!koreaPieChartRef.current) return;
    
    const svg = d3.select(koreaPieChartRef.current);
    svg.selectAll("*").remove();
    
    // 현재 연도에 해당하는 데이터 찾기 (새로운 생산 데이터 사용)
    const yearData = southKoreaEnergyProduction.find(d => d.시점 === currentYear);
    if (!yearData) return;
    
    const data = [
      { name: '원자력', value: yearData.원자력, color: '#1f77b4' },
      { name: '신재생에너지', value: yearData.신재생에너지, color: '#2ca02c' },
      { name: '화석연료', value: yearData.화석연료, color: '#ff7f0e' },
      { name: '수력', value: yearData.수력, color: '#17a2b8' },
      { name: '기타', value: yearData.기타, color: '#9467bd' }
    ];
    
    // 총합 계산
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    // viewBox를 사용한 반응형 설정
    const viewBoxWidth = 200;
    const viewBoxHeight = 200;
    const width = viewBoxWidth;
    const height = viewBoxHeight;
    const radius = Math.min(width, height) / 2 - 10;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const g = svg.append('g')
      .attr('transform', `translate(${width/2}, ${height/2})`);
    
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);
    
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);
    
    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter().append('g')
      .attr('class', 'arc');
    
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const percent = ((d.data.value / total) * 100).toFixed(1);
        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
              <div><strong>${d.data.name}</strong></div>
              <div>비율: ${percent}%</div>
              <div>실제값: ${d.data.value.toLocaleString()} (1000toe)</div>
            `);
        }
      })
      .on('mouseout', () => {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
      });
    
    // Add percentage labels (only for values >= 10%)
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .text(d => {
        const percent = ((d.data.value / total) * 100);
        return percent >= 10 ? `${percent.toFixed(1)}%` : '';
      });
  };

  const drawKoreaLineChart = () => {
    if (!koreaLineChartRef.current) return;
    
    const svg = d3.select(koreaLineChartRef.current);
    svg.selectAll("*").remove();
    
    // viewBox를 사용한 반응형 설정
    const viewBoxWidth = 600;
    const viewBoxHeight = 280;
    const margin = { top: 15, right: 70, bottom: 35, left: 50 };
    const width = viewBoxWidth - margin.left - margin.right;
    const height = viewBoxHeight - margin.top - margin.bottom;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 새로운 데이터 사용 (1000toe 단위)
    const lineData = {
      production: southKoreaEnergyAll.map(d => ({ year: d.시점, value: d.생산 })),
      imports: southKoreaEnergyAll.map(d => ({ year: d.시점, value: d.순수입 })),
      consumption: southKoreaEnergyAll.map(d => ({ year: d.시점, value: d.소비 }))
    };
    
    const years = southKoreaEnergyAll.map(d => d.시점);
    
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([0, width]);
    
    const maxValue = d3.max([
      d3.max(lineData.production, d => d.value),
      d3.max(lineData.imports, d => d.value),
      d3.max(lineData.consumption, d => d.value)
    ]);
    
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([height, 0]);
    
    const line = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    // 축 그리기
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d3.format('.0s')))
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 15)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#666')
      .text('Energy (1000toe)');
    
    const colors = { production: '#2196F3', imports: '#e53e3e', consumption: '#666' };
    const labels = { production: '생산', imports: '순수입', consumption: '소비' };
    
    // 선 그리기
    Object.keys(lineData).forEach(key => {
      g.append('path')
        .datum(lineData[key])
        .attr('fill', 'none')
        .attr('stroke', colors[key])
        .attr('stroke-width', 2)
        .attr('d', line);
    });
    
    // 범례
    const legend = svg.append('g')
      .attr('transform', `translate(${viewBoxWidth - margin.right + 5}, ${margin.top + 5})`);
    
    Object.keys(labels).forEach((key, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendItem.append('line')
        .attr('x1', 0)
        .attr('x2', 18)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', colors[key])
        .attr('stroke-width', 3);
      
      legendItem.append('text')
        .attr('x', 22)
        .attr('y', 4)
        .style('font-size', '11px')
        .style('fill', '#333')
        .text(labels[key]);
    });
    
    // 상호작용을 위한 투명한 오버레이 추가
    const overlay = g.append('rect')
      .attr('class', 'overlay')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all');
    
    // 세로선과 점들을 위한 그룹 생성
    const focus = g.append('g')
      .attr('class', 'focus')
      .style('display', 'none');
    
    // 세로선 추가
    focus.append('line')
      .attr('class', 'x-hover-line hover-line')
      .attr('y1', 0)
      .attr('y2', height)
      .style('stroke', '#666')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.8);
    
    // 각 선에 대한 점과 툴팁 추가
    Object.keys(lineData).forEach(key => {
      const circle = focus.append('circle')
        .attr('class', `circle-${key}`)
        .attr('r', 4)
        .style('fill', colors[key])
        .style('stroke', 'white')
        .style('stroke-width', 2);
      
      const text = focus.append('text')
        .attr('class', `text-${key}`)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', colors[key])
        .style('text-anchor', 'middle')
        .attr('dy', '-8px');
    });
    
    // 연도 표시 텍스트
    const yearText = focus.append('text')
      .attr('class', 'year-text')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .style('text-anchor', 'middle')
      .attr('y', height + 15);
    
    // 마우스 이벤트 핸들러
    const mousemove = function(event) {
      const [mouseX] = d3.pointer(event);
      const x0 = xScale.invert(mouseX);
      
      // 가장 가까운 연도 찾기
      const bisect = d3.bisector(d => d.year).left;
      const i = bisect(lineData.production, x0, 1);
      const d0 = lineData.production[i - 1];
      const d1 = lineData.production[i];
      
      if (!d0 || !d1) return;
      
      const selectedData = x0 - d0.year > d1.year - x0 ? d1 : d0;
      const selectedYear = selectedData.year;
      
      // 세로선 위치 설정
      focus.select('.x-hover-line')
        .attr('x1', xScale(selectedYear))
        .attr('x2', xScale(selectedYear));
      
      // 연도 텍스트 업데이트
      yearText
        .attr('x', xScale(selectedYear))
        .text(selectedYear);
      
      // 각 선의 해당 연도 데이터 찾아서 점과 텍스트 위치 설정
      Object.keys(lineData).forEach((key, index) => {
        const dataPoint = lineData[key].find(d => d.year === selectedYear);
        if (dataPoint) {
          const circle = focus.select(`.circle-${key}`);
          const text = focus.select(`.text-${key}`);
          
          circle
            .attr('cx', xScale(dataPoint.year))
            .attr('cy', yScale(dataPoint.value));
          
          text
            .attr('x', xScale(dataPoint.year))
            .attr('y', yScale(dataPoint.value))
            .text(`${dataPoint.value.toFixed(1)}`);
        }
      });
      
      focus.style('display', null);
    };
    
    const mouseout = function() {
      focus.style('display', 'none');
    };
    
    // 오버레이에 이벤트 연결
    overlay
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', mouseout)
      .on('mousemove', mousemove);
  };

  const drawKoreaStackedChart = () => {
    if (!koreaStackedChartRef.current) return;
    
    const svg = d3.select(koreaStackedChartRef.current);
    svg.selectAll("*").remove();
    
    // viewBox를 사용한 반응형 설정
    const viewBoxWidth = 600;
    const viewBoxHeight = 320;
    const margin = { top: 30, right: 15, bottom: 40, left: 50 };
    const width = viewBoxWidth - margin.left - margin.right;
    const height = viewBoxHeight - margin.top - margin.bottom;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 새로운 생산 데이터 사용
    const allData = southKoreaEnergyProduction;
    const keys = ['원자력', '신재생에너지', '화석연료', '수력', '기타'];
    const colors = ['#1f77b4', '#2ca02c', '#ff7f0e', '#17a2b8', '#9467bd'];
    
    const stack = d3.stack().keys(keys);
    const stackedData = stack(allData);
    
    const xScale = d3.scaleBand()
      .domain(allData.map(d => d.시점))
      .range([0, width])
      .padding(0.08);
    
    // 총합을 동적으로 계산
    const maxTotal = d3.max(allData, d => d.원자력 + d.신재생에너지 + d.화석연료 + d.수력 + d.기타);
    
    const yScale = d3.scaleLinear()
      .domain([0, maxTotal])
      .nice()
      .range([height, 0]);
    
    const colorScale = d3.scaleOrdinal()
      .domain(keys)
      .range(colors);
    
    g.append('g')
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('fill', d => colorScale(d.key))
      .selectAll('rect')
      .data(d => d)
      .join('rect')
      .attr('x', d => xScale(d.data.시점))
      .attr('y', d => yScale(d[1]))
      .attr('height', d => yScale(d[0]) - yScale(d[1]))
      .attr('width', xScale.bandwidth())
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const year = d.data.시점;
        const yearData = allData.find(item => item.시점 === year);
        
        // 모든 바를 반투명하게 만들고, 현재 hover된 연도의 바들만 불투명하게 유지
        g.selectAll('rect')
          .style('opacity', function() {
            const rectData = d3.select(this).datum();
            return rectData && rectData.data && rectData.data.시점 === year ? 1 : 0.3;
          });
        
        if (tooltipRef.current && yearData) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
              <div><strong>${year}년 (단위: 1000toe)</strong></div>
              <div>원자력: ${yearData.원자력.toLocaleString()}</div>
              <div>신재생에너지: ${yearData.신재생에너지.toLocaleString()}</div>
              <div>화석연료: ${yearData.화석연료.toLocaleString()}</div>
              <div>수력: ${yearData.수력.toLocaleString()}</div>
              <div>기타: ${yearData.기타.toLocaleString()}</div>
              <div><strong>총합: ${(yearData.원자력 + yearData.신재생에너지 + yearData.화석연료 + yearData.수력 + yearData.기타).toLocaleString()}</strong></div>
            `);
        }
      })
      .on('mouseout', () => {
        // 모든 바의 opacity를 원래대로 되돌림
        g.selectAll('rect').style('opacity', 1);
        
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
      })
      .on('click', function(event, d) {
        const year = d.data.시점;
        setCurrentYear(year);
      });
    
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale)
        .tickValues(allData.map(d => d.시점).filter((d, i) => i % 4 === 0 || i === allData.length - 1))
        .tickFormat(d => d.toString())
      )
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => {
          if (d >= 1000000) return (d / 1000000).toFixed(0) + 'M';
          if (d >= 1000) return (d / 1000).toFixed(0) + 'k';
          return d;
        })
      )
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 15)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#666')
      .text('Energy (1000toe)');
    
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(5, -25)`);
    
    keys.forEach((key, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(${i * 85}, 0)`);
      
      legendItem.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', colorScale(key));
      
      legendItem.append('text')
        .attr('x', 13)
        .attr('y', 8)
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(key);
    });
    
    if (allData.find(d => d.시점 === currentYear)) {
      g.append('line')
        .attr('x1', xScale(currentYear) + xScale.bandwidth() / 2)
        .attr('x2', xScale(currentYear) + xScale.bandwidth() / 2)
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.7);
    }
  };

  const updateNeededEnergyPie = () => {
    if (!neededEnergyPieRef.current) return;
    
    const svg = d3.select(neededEnergyPieRef.current);
    svg.selectAll("*").remove();
    
    const data = [
      { name: '원자력', value: energyMixPercentages.nuclear, color: '#1f77b4' },
      { name: '신재생', value: energyMixPercentages.renewable, color: '#2ca02c' },
      { name: '화석연료', value: energyMixPercentages.fossil, color: '#ff7f0e' },
      { name: '수력', value: energyMixPercentages.hydro, color: '#17a2b8' },
      { name: '기타', value: energyMixPercentages.other, color: '#9467bd' }
    ];
    
    // viewBox를 사용한 반응형 설정
    const viewBoxWidth = 200;
    const viewBoxHeight = 200;
    const width = viewBoxWidth;
    const height = viewBoxHeight;
    const radius = Math.min(width, height) / 2 - 10;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const g = svg.append('g')
      .attr('transform', `translate(${width/2}, ${height/2})`);
    
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);
    
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);
    
    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter().append('g')
      .attr('class', 'arc');
    
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color);
    
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .text(d => d.data.value >= 10 ? `${d.data.value.toFixed(1)}%` : '');
  };

  // 퍼센트 정규화 함수 (합이 100%가 되도록 조정)
  const normalizePercentages = (changedType, newValue) => {
    const minValue = 0.1; // 최소값 설정
    const maxValue = 99.6; // 최대값 설정 (다른 4개가 최소 0.1씩 가져야 하므로)
    
    // 입력값을 범위 내로 제한
    const clampedValue = Math.max(minValue, Math.min(maxValue, newValue));
    
    const newPercentages = { ...energyMixPercentages };
    newPercentages[changedType] = clampedValue;
    
    // 나머지 값들의 총합 계산
    const otherTypes = Object.keys(newPercentages).filter(type => type !== changedType);
    const remainingTotal = 100 - clampedValue;
    const currentOtherTotal = otherTypes.reduce((sum, type) => sum + energyMixPercentages[type], 0);
    
    if (currentOtherTotal > 0) {
      // 나머지 값들을 비례적으로 조정하되 최소값 보장
      otherTypes.forEach(type => {
        const ratio = energyMixPercentages[type] / currentOtherTotal;
        const newVal = ratio * remainingTotal;
        newPercentages[type] = Math.max(minValue, newVal);
      });
      
      // 최소값 보장 후 다시 정규화
      const finalTotal = Object.values(newPercentages).reduce((sum, val) => sum + val, 0);
      if (finalTotal !== 100) {
        const finalDiff = 100 - finalTotal;
        const adjustableTypes = otherTypes.filter(type => newPercentages[type] > minValue);
        
        if (adjustableTypes.length > 0) {
          const adjustableTotal = adjustableTypes.reduce((sum, type) => sum + newPercentages[type], 0);
          adjustableTypes.forEach(type => {
            const ratio = newPercentages[type] / adjustableTotal;
            const adjustment = ratio * finalDiff;
            newPercentages[type] = Math.max(minValue, newPercentages[type] + adjustment);
          });
        }
      }
    }
    
    setEnergyMixPercentages(newPercentages);
  };

  const handleSliderChange = (type, value) => {
    const newValue = parseFloat(value);
    normalizePercentages(type, newValue);
  };

  // 예산 계산 함수
  const calculateBudget = () => {
    if (neededEnergy === 0) return '0';
    
    // 각 에너지원별 필요량 계산 (1000toe)
    const energyAmounts = {
      nuclear: (neededEnergy * energyMixPercentages.nuclear) / 100,
      fossil: (neededEnergy * energyMixPercentages.fossil) / 100,
      renewable: (neededEnergy * energyMixPercentages.renewable) / 100,
      hydro: (neededEnergy * energyMixPercentages.hydro) / 100,
      other: (neededEnergy * energyMixPercentages.other) / 100
    };
    
    // 단가 매핑 (백만원/1000toe)
    const priceMapping = {
      nuclear: energyPrice.원자력,
      fossil: energyPrice.화석연료,
      renewable: energyPrice.신재생,
      hydro: energyPrice.수력,
      other: energyPrice.기타
    };
    
    // 총 비용 계산 (백만원)
    let totalCost = 0;
    Object.keys(energyAmounts).forEach(type => {
      totalCost += energyAmounts[type] * priceMapping[type];
    });
    
    // 백만원을 억원으로 변환
    return (totalCost / 100).toFixed(2);
  };

  // 바 차트에서 지도로의 상호작용 함수들 추가
  const highlightMapCountry = useCallback((countryName) => {
    if (!mapRef.current) return;
    
    const svg = d3.select(mapRef.current);
    
    // 모든 국가를 옅게 만들기
    svg.selectAll('path')
      .classed('dimmed', true)
      .classed('highlighted', false);
    
    // 해당 국가 찾아서 강조하기
    svg.selectAll('path')
      .filter(d => {
        if (!d || !d.properties) return false;
        const mapCountryName = d.properties.name;
        
        // 국가 이름 매칭 (기존 getCountryData 함수의 로직 활용)
        if (mapCountryName === countryName) return true;
        
        const nameVariations = {
          'United States': 'United States of America',
          'Russia': 'Russian Federation',
          'United Kingdom': 'United Kingdom',
          'Dem. Rep. Congo': 'Democratic Republic of the Congo',
          'Central African Rep.': 'Central African Republic',
          'Dominican Republic': 'Dominican Rep.',
          'Equatorial Guinea': 'Eq. Guinea',
          'Western Sahara': 'W. Sahara',
          'Eswatini': 'eSwatini',
          'South Sudan': 'S. Sudan',
          'Cote d\'Ivoire': 'Côte d\'Ivoire',
          'Bosnia and Herzegovina': 'Bosnia and Herz.',
          'Falkland Islands': 'Falkland Is.',
          'Solomon Islands': 'Solomon Is.',
          'Turkey': 'Turkiye'
        };
        
        if (nameVariations[countryName] && mapCountryName === nameVariations[countryName]) {
          return true;
        }
        
        return false;
      })
      .classed('dimmed', false)
      .classed('highlighted', true);
  }, []);

  const removeMapHighlight = useCallback(() => {
    if (!mapRef.current) return;
    
    const svg = d3.select(mapRef.current);
    
    // 모든 강조 효과 제거
    svg.selectAll('path')
      .classed('dimmed', false)
      .classed('highlighted', false);
  }, []);

  // 바 차트 hover 이벤트 핸들러
  const handleBarHover = useCallback((countryName) => {
    // 지도에서 국가 강조
    highlightMapCountry(countryName);
    
    // 바 차트에서도 강조 (기존 기능)
    highlightCountryBar(countryName);
    
    // 툴팁 표시
    const countryData = getCountryData(countryName);
    if (tooltipRef.current && countryData) {
      const selfSufficiency = countryData.self_sufficiency_rate?.[currentYear];
      const tooltip = d3.select(tooltipRef.current);
      
      tooltip.style('opacity', 1)
        .html(`
          <div><strong>${countryName}</strong></div>
          <div>Self-Sufficiency: ${selfSufficiency ? selfSufficiency.toFixed(1) + '%' : 'N/A'}</div>
          <div>Generation: ${countryData.net_generation?.[currentYear]?.toFixed(1) || 'N/A'} TWh</div>
          <div>Consumption: ${countryData.net_consumption?.[currentYear]?.toFixed(1) || 'N/A'} TWh</div>
        `);
    }
  }, [highlightMapCountry, highlightCountryBar, getCountryData, currentYear]);

  const handleBarMouseOut = useCallback(() => {
    // 지도와 바 차트의 모든 강조 효과 제거
    removeMapHighlight();
    removeCountryBarHighlight();
    
    // 툴팁 숨기기
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  }, [removeMapHighlight, removeCountryBarHighlight]);

  // 툴팁이 마우스를 따라다니도록 하는 이벤트 추가
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (tooltipRef.current) {
        const tooltip = d3.select(tooltipRef.current);
        if (tooltip.style('opacity') > 0) {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        }
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div id="app-container">
      {/* Header with controls */}
      <header>
        <h1>World Energy Data Explorer</h1>
        <div id="controls">
          <div id="year-control">
            <label htmlFor="year-slider">Year: <span id="year-value">{currentYear}</span></label>
            <input 
              id="year-slider" 
              type="range" 
              min="1980" 
              max="2021" 
              value={currentYear} 
              step="1"
              onChange={handleYearChange}
              onInput={handleYearChange}
            />
            <div className="slider-labels">
              <span>1980</span>
              <span>2021</span>
            </div>
          </div>
          
          <div id="country-control">
            <label htmlFor="country-select">Country</label>
            <select id="country-select" value={selectedCountry} onChange={handleCountrySelect}>
              <option value="">-</option>
              <option value="South Korea">South Korea</option>
            </select>
          </div>
        </div>
      </header>

      {/* World view */}
      {currentView === 'world' && (
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
      )}

      {/* Korea view */}
      {currentView === 'korea' && (
        <div id="korea-view" className="view-container">
          <div className="korea-layout">
            <div className="chart-section small-map" style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
              <div className="map-container">
                <h3>Selected Country: South Korea</h3>
                <svg ref={koreaSmallMapRef} id="korea-small-map"></svg>
              </div>
              <div className="source-container">
                <h3>Energy Source</h3>
                <svg ref={koreaPieChartRef} id="korea-pie-chart"></svg>
                <div className="pie-legend">
                  <div className="legend-item"><span className="legend-color nuclear"></span>원자력</div>
                  <div className="legend-item"><span className="legend-color renewable"></span>신재생에너지</div>
                  <div className="legend-item"><span className="legend-color fossil"></span>화석연료</div>
                  <div className="legend-item"><span className="legend-color hydro"></span>수력</div>
                  <div className="legend-item"><span className="legend-color other"></span>기타</div>
                </div>
              </div>
            </div>
            
            <div className="chart-section">
              <h3 onClick={() => setShowInfoPopup(true)} style={{cursor: 'pointer', margin: '0 0 10px 0', color: '#333', fontSize: '15px', fontWeight: '600'}}>
                Energy Changes 
                <svg 
                  viewBox="0 0 16 16" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg" 
                  style={{
                    width: '10px !important',
                    height: '10px !important', 
                    minWidth: '10px',
                    minHeight: '10px',
                    maxWidth: '10px',
                    maxHeight: '10px',
                    marginLeft: '6px', 
                    marginRight: '3px', 
                    verticalAlign: 'middle',
                    display: 'inline-block',
                    flexShrink: '0'
                  }}
                >
                  <path d="M7.37516 11.9582H8.62512V7.16657H7.37516V11.9582ZM8.00014 5.74029C8.19085 5.74029 8.35071 5.67579 8.47971 5.54679C8.60871 5.41779 8.67321 5.25794 8.67321 5.06723C8.67321 4.87654 8.60871 4.71668 8.47971 4.58767C8.35071 4.45867 8.19085 4.39417 8.00014 4.39417C7.80943 4.39417 7.64958 4.45867 7.52058 4.58767C7.39158 4.71668 7.32708 4.87654 7.32708 5.06723C7.32708 5.25794 7.39158 5.41779 7.52058 5.54679C7.64958 5.67579 7.80943 5.74029 8.00014 5.74029ZM8.00154 15.9165C6.90659 15.9165 5.8774 15.7088 4.91396 15.2932C3.9505 14.8777 3.11243 14.3137 2.39975 13.6013C1.68705 12.889 1.12284 12.0513 0.7071 11.0882C0.291364 10.1252 0.0834961 9.09624 0.0834961 8.00129C0.0834961 6.90635 0.291274 5.87716 0.70683 4.91371C1.12239 3.95025 1.68634 3.11218 2.3987 2.3995C3.11108 1.68681 3.94878 1.12259 4.91181 0.706857C5.87482 0.291121 6.9038 0.083252 7.99875 0.083252C9.09369 0.083252 10.1229 0.291031 11.0863 0.706586C12.0498 1.12214 12.8879 1.6861 13.6005 2.39846C14.3132 3.11084 14.8774 3.94854 15.2932 4.91157C15.7089 5.87458 15.9168 6.90356 15.9168 7.9985C15.9168 9.09345 15.709 10.1226 15.2935 11.0861C14.8779 12.0495 14.3139 12.8876 13.6016 13.6003C12.8892 14.313 12.0515 14.8772 11.0885 15.2929C10.1255 15.7087 9.09648 15.9165 8.00154 15.9165ZM8.00014 14.6666C9.86125 14.6666 11.4376 14.0207 12.7293 12.7291C14.021 11.4374 14.6668 9.86101 14.6668 7.9999C14.6668 6.13879 14.021 4.5624 12.7293 3.27073C11.4376 1.97907 9.86125 1.33323 8.00014 1.33323C6.13903 1.33323 4.56264 1.97907 3.27098 3.27073C1.97931 4.5624 1.33348 6.13879 1.33348 7.9999C1.33348 9.86101 1.97931 11.4374 3.27098 12.7291C4.56264 14.0207 6.13903 14.6666 8.00014 14.6666Z" fill="#888888"/>
                </svg>
                <span style={{
                  fontSize: '10px', 
                  color: '#888888', 
                  fontWeight: 'normal',
                  marginLeft: '0px',
                  display: 'inline',
                  verticalAlign: 'middle'
                }}>
                  생산량이 소비량보다 많은 이유
                </span>
              </h3>
              <svg ref={koreaLineChartRef} id="korea-line-chart"></svg>
            </div>
            
            <div className="chart-section">
              <h3>Energy Source Changes</h3>
              <svg ref={koreaStackedChartRef} id="korea-stacked-chart"></svg>
            </div>
            
            <div className="chart-section energy-calculator">
              <h3>Energy Budget Simulation</h3>
              <div className="calculator-content">
                <div className="energy-input">
                  <label>Needed Energy: </label>
                  <input 
                    type="number" 
                    id="needed-energy" 
                    placeholder="300000" 
                    min="0"
                    value={neededEnergy}
                    onChange={(e) => setNeededEnergy(parseInt(e.target.value) || 0)}
                  />
                  <label>1000toe</label>
                </div>
                
                <div className="energy-controls">
                  <div className="energy-sliders">
                    {['nuclear', 'renewable', 'fossil', 'hydro', 'other'].map((type) => {
                      const value = energyMixPercentages[type];
                      const colors = {
                        nuclear: '#1f77b4', 
                        renewable: '#2ca02c', 
                        fossil: '#ff7f0e', 
                        hydro: '#17a2b8', 
                        other: '#9467bd' 
                      };
                      const labels = { 
                        nuclear: '원자력', 
                        renewable: '신재생', 
                        fossil: '화석연료', 
                        hydro: '수력', 
                        other: '기타' 
                      };
                      
                      return (
                        <div key={type} className="slider-group">
                          <label>
                            <span 
                              className="energy-type-indicator" 
                              style={{ backgroundColor: colors[type] }}
                            ></span>
                                {labels[type]} <span style={{ marginLeft: '8px' }}>{value.toFixed(1)}</span>%
                          </label>
                          <input 
                            type="range" 
                            min="0.1" 
                            max="99.6" 
                            step="0.1"
                            value={value}
                            onChange={(e) => handleSliderChange(type, e.target.value)}
                            onInput={(e) => handleSliderChange(type, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="energy-pie-container">
                    <svg ref={neededEnergyPieRef} id="needed-energy-pie"></svg>
                  </div>
                </div>
                
                <div className="budget-result">
                  <h4>Needed Energy Budget: <span id="calculated-budget">{calculateBudget()}억</span> KRW</h4>
                </div>
              </div>
            </div>
          </div>
          
          {/* 정보 팝업 */}
          <InfoPopup 
            showPopup={showInfoPopup} 
            onClose={() => setShowInfoPopup(false)} 
          />
        </div>
      )}

      {/* Detail Panel */}
      {showDetailPanel && detailCountry && (
        <div id="detail-panel">
          <button id="close-detail" onClick={closeDetailPanel}>×</button>
          <h2 id="country-name">{detailCountry.name}</h2>
          <div className="chart-container">
            <h3>Self-Sufficiency Trend</h3>
            <div id="bar-chart"></div>
          </div>
          <div className="data-summary">
            <h3>Key Statistics for <span id="year-value-detail">{currentYear}</span></h3>
            <div id="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Generation</span>
                <span className="stat-value">
                  {detailCountry.data.net_generation?.[currentYear] 
                    ? `${detailCountry.data.net_generation[currentYear].toLocaleString()} TWh` 
                    : '-'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Consumption</span>
                <span className="stat-value">
                  {detailCountry.data.net_consumption?.[currentYear] 
                    ? `${detailCountry.data.net_consumption[currentYear].toLocaleString()} TWh` 
                    : '-'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Imports</span>
                <span className="stat-value">
                  {detailCountry.data.imports?.[currentYear] 
                    ? `${detailCountry.data.imports[currentYear].toLocaleString()} TWh` 
                    : '-'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Self-Sufficiency</span>
                <span className="stat-value">
                  {detailCountry.data.self_sufficiency_rate?.[currentYear] 
                    ? `${detailCountry.data.self_sufficiency_rate[currentYear].toFixed(1)}%` 
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      <div ref={tooltipRef} id="map-tooltip" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '5px', fontSize: '12px' }}>
      </div>
    </div>
  );
};

export default Overview;
